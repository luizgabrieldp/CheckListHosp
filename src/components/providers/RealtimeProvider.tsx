"use client";

import React, { useEffect, useRef } from "react";
import {
  registerSocket,
  useAppStore,
  ENFERMARIAS_PADRAO,
  CATEGORIAS_MODELOS_PADRAO,
} from "@/store/useAppStore";
import { WebSocketMessage } from "@/types/hospital";
import {
  escutarAlteracoesFirestore,
  isFirebaseConfigured,
  sincronizarComFirestore,
} from "@/lib/firebase";
import { SEED_AMBULATORIO_PADRAO, SEED_MODELOS_PADRAO } from "@/lib/seeds";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const syncFullState = useAppStore((s) => s.syncFullState);
  const setConnected = useAppStore((s) => s.setConnected);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Inicialização de sessão e proteção de viewport/gestos (sem expor dados nem abrir conexões)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("checklist_auth");
      const lastActivity = sessionStorage.getItem("checklist_last_activity");
      const TEMPO_LIMITE_INATIVIDADE = 5 * 60 * 1000; // 5 minutos

      if (auth === "true" && lastActivity) {
        const decorrido = Date.now() - Number(lastActivity);
        if (decorrido < TEMPO_LIMITE_INATIVIDADE) {
          // Sessão ativa e recente: hidrata dados locais, restaura acesso e renova timestamp
          useAppStore.getState().hidratarDadosLocais();
          useAppStore.setState({ isAuthenticated: true });
          sessionStorage.setItem("checklist_last_activity", Date.now().toString());
        } else {
          // Mais de 5 minutos inativo: sessão expirada, limpa dados e exige senha na tela de bloqueio
          useAppStore.getState().logout();
        }
      } else {
        sessionStorage.removeItem("checklist_auth");
        sessionStorage.removeItem("checklist_last_activity");
        useAppStore.setState({ isAuthenticated: false });
      }

      const lgpdData = localStorage.getItem("checklist_lgpd_date");
      if (lgpdData) {
        useAppStore.setState({ lgpdAcceptedDate: lgpdData });
      }
    }
  }, []);

  // 2. Conexões em tempo real (Firestore & WebSocket) e expurgo LGPD apenas após autenticação
  useEffect(() => {
    if (!isAuthenticated) {
      setConnected(false, 0);
      return;
    }

    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let unsubscribeFirestore: (() => void) | null = null;
    let retryAttempt = 0;
    const RETRY_DELAYS = [3000, 6000, 15000, 30000, 60000];

    // Expurgo automático LGPD imediato pós-autenticação
    try {
      useAppStore.getState().executarExpurgoAutomatico();
    } catch {}

    // Expurgo periódico em segundo plano a cada 30 minutos
    const intervaloExpurgo = setInterval(() => {
      if (!isMounted) return;
      try {
        useAppStore.getState().executarExpurgoAutomatico();
      } catch {}
    }, 30 * 60 * 1000);

    // 1. Conexão em tempo real via Firebase Firestore (se configurado)
    if (isFirebaseConfigured()) {
      unsubscribeFirestore = escutarAlteracoesFirestore(
        (dados) => {
          if (!isMounted) return;
          syncFullState(dados as any);
          setConnected(true, 18, "firestore");

          // Auto-reparação: Se o Firestore estiver vazio em modelos, ambulatório, enfermarias ou categorias,
          // restaura imediatamente na nuvem usando os dados locais ou as sementes oficiais
          const atual = useAppStore.getState();
          if ((!dados.ambulantes || dados.ambulantes.length === 0) && atual.ambulantes.length > 0) {
            sincronizarComFirestore({ ambulantes: atual.ambulantes });
          }
          if ((!dados.modelos || dados.modelos.length === 0) && atual.modelos.length > 0) {
            sincronizarComFirestore({ modelos: atual.modelos });
          }
          if ((!dados.enfermarias || dados.enfermarias.length === 0) && atual.enfermarias.length > 0) {
            sincronizarComFirestore({ enfermarias: atual.enfermarias });
          }
          if ((!dados.categoriasModelos || dados.categoriasModelos.length === 0) && atual.categoriasModelos.length > 0) {
            sincronizarComFirestore({ categoriasModelos: atual.categoriasModelos });
          }

          // Executa expurgo automático LGPD (48h após a data do evento)
          try {
            useAppStore.getState().executarExpurgoAutomatico();
          } catch {}
        },
        () => {
          // Se for o primeiro acesso e a coleção ainda estiver vazia no Firestore,
          // inicializa o documento com os dados locais ou padrão da aplicação
          if (!isMounted) return;
          const current = useAppStore.getState();
          sincronizarComFirestore({
            admissoes: current.admissoes,
            altas: current.altas,
            permanencia: current.permanencia,
            passagem: current.passagem,
            ambulantes: current.ambulantes.length > 0 ? current.ambulantes : SEED_AMBULATORIO_PADRAO,
            modelos: current.modelos.length > 0 ? current.modelos : SEED_MODELOS_PADRAO,
            metricas: current.metricas,
            enfermarias: current.enfermarias.length > 0 ? current.enfermarias : ENFERMARIAS_PADRAO,
            categoriasModelos: current.categoriasModelos.length > 0 ? current.categoriasModelos : CATEGORIAS_MODELOS_PADRAO,
          });
          setConnected(true, 25, "firestore");
        }
      );
    }

    // 2. Conexão em tempo real via WebSocket (servidor local / VPS)
    function connectWs() {
      if (!isMounted) return;

      const isLocalHost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.hostname === "::1" ||
          window.location.hostname.endsWith(".local") ||
          /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.hostname));

      const isStaticHost =
        process.env.NEXT_PUBLIC_IS_GH_PAGES === "true" ||
        (typeof window !== "undefined" &&
          !isLocalHost &&
          process.env.NEXT_PUBLIC_ENABLE_WS !== "true");

      // Não tenta WebSocket em hospedagem estática (GitHub Pages / deploy estático sem servidor WS)
      if (isStaticHost) {
        if (!isFirebaseConfigured()) {
          setConnected(true, 1, "local");
        }
        return;
      }

      // Se a aba estiver oculta ou tela bloqueada, adia a conexão para economizar bateria
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;
        registerSocket(socket);

        socket.onopen = () => {
          if (!isMounted) return;
          retryAttempt = 0;
          setConnected(true, 12, isFirebaseConfigured() ? "firestore" : "websocket");

          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: "PING",
                  timestamp: Date.now(),
                })
              );
            }
          }, 8000);
        };

        socket.onmessage = (event) => {
          try {
            const msg: WebSocketMessage = JSON.parse(event.data);

            if (msg.type === "PONG") {
              const sent = msg.clientSent ?? msg.payload?.clientSent ?? msg.timestamp;
              const rtt = Date.now() - sent;
              setConnected(true, Math.max(2, Math.min(rtt, 300)), isFirebaseConfigured() ? "firestore" : "websocket");
              return;
            }

            if (msg.type === "INIT" || msg.type === "SYNC_STATE") {
              if (msg.payload) {
                syncFullState(msg.payload);
              }
            } else if (msg.type === "UPDATE_ADMISSOES") {
              useAppStore.setState({ admissoes: msg.payload, lastSyncTime: Date.now() });
            } else if (msg.type === "UPDATE_ALTAS") {
              useAppStore.setState({ altas: msg.payload, lastSyncTime: Date.now() });
            } else if (msg.type === "UPDATE_PERMANENCIA") {
              useAppStore.setState({ permanencia: msg.payload, lastSyncTime: Date.now() });
            } else if (msg.type === "UPDATE_PASSAGEM") {
              useAppStore.setState({ passagem: msg.payload, lastSyncTime: Date.now() });
            } else if (msg.type === "UPDATE_AMBULATORIO") {
              useAppStore.setState({ ambulantes: msg.payload, lastSyncTime: Date.now() });
            } else if (msg.type === "UPDATE_MODELOS") {
              useAppStore.setState({ modelos: msg.payload, lastSyncTime: Date.now() });
            } else if (msg.type === "UPDATE_METRICAS") {
              useAppStore.setState({ metricas: msg.payload, lastSyncTime: Date.now() });
            } else if (msg.type === "UPDATE_ENFERMARIAS") {
              const lista = Array.isArray(msg.payload) && msg.payload.length > 0 ? msg.payload : ENFERMARIAS_PADRAO;
              useAppStore.setState({ enfermarias: lista, lastSyncTime: Date.now() });
              try { localStorage.setItem("checklist_enfermarias", JSON.stringify(lista)); } catch {}
            } else if (msg.type === "UPDATE_CATEGORIAS_MODELOS") {
              const lista = Array.isArray(msg.payload) && msg.payload.length > 0 ? msg.payload : CATEGORIAS_MODELOS_PADRAO;
              useAppStore.setState({ categoriasModelos: lista, lastSyncTime: Date.now() });
              try { localStorage.setItem("checklist_categorias_modelos", JSON.stringify(lista)); } catch {}
            }
          } catch (err) {
            console.error("Erro ao processar mensagem do servidor:", err);
          }
        };

        socket.onclose = () => {
          if (!isMounted) return;
          if (!isFirebaseConfigured()) {
            setConnected(false, 0);
          }
          registerSocket(null);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

          // Backoff exponencial para poupar bateria e tráfego de rede
          const delay = RETRY_DELAYS[Math.min(retryAttempt, RETRY_DELAYS.length - 1)];
          retryAttempt++;

          // Não reconecta se o dispositivo estiver com tela bloqueada ou aba em segundo plano
          if (typeof document !== "undefined" && document.hidden) {
            return;
          }
          reconnectTimeout = setTimeout(connectWs, delay);
        };

        socket.onerror = (err) => {
          console.warn("WebSocket status:", err);
          socket.close();
        };
      } catch (err) {
        console.warn("Não foi possível iniciar WebSocket:", err);
      }
    }

    const handleVisibilidade = () => {
      if (typeof document !== "undefined" && !document.hidden && isMounted) {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          connectWs();
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilidade);
    }

    connectWs();

    return () => {
      isMounted = false;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilidade);
      }
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (intervaloExpurgo) clearInterval(intervaloExpurgo);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      registerSocket(null);
    };
  }, [isAuthenticated, setConnected, syncFullState]);

  return <>{children}</>;
}
