"use client";

import React, { useEffect, useRef } from "react";
import { registerSocket, useAppStore } from "@/store/useAppStore";
import { WebSocketMessage } from "@/types/hospital";
import {
  escutarAlteracoesFirestore,
  isFirebaseConfigured,
  sincronizarComFirestore,
} from "@/lib/firebase";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const syncFullState = useAppStore((s) => s.syncFullState);
  const setConnected = useAppStore((s) => s.setConnected);
  const login = useAppStore((s) => s.login);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Restaurar sessão se já autenticado na aba
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("checklist_auth");
      if (auth === "true") {
        useAppStore.setState({ isAuthenticated: true });
      }
      const lgpdData = localStorage.getItem("checklist_lgpd_date");
      if (lgpdData) {
        useAppStore.setState({ lgpdAcceptedDate: lgpdData });
      }
    }

    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let unsubscribeFirestore: (() => void) | null = null;

    // 1. Conexão em tempo real via Firebase Firestore (se configurado)
    if (isFirebaseConfigured()) {
      unsubscribeFirestore = escutarAlteracoesFirestore(
        (dados) => {
          if (!isMounted) return;
          syncFullState(dados as any);
          setConnected(true, 18);
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
            ambulantes: current.ambulantes,
            modelos: current.modelos,
            metricas: current.metricas,
          });
          setConnected(true, 25);
        }
      );
    }

    // 2. Conexão em tempo real via WebSocket (servidor local / VPS)
    function connectWs() {
      if (!isMounted) return;
      // Não tenta WebSocket se estiver explicitamente no GitHub Pages
      if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
        // No GitHub Pages, se o Firebase não estiver configurado, marca como pronto em modo offline local
        if (!isFirebaseConfigured()) {
          setConnected(true, 1);
        }
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
          setConnected(true, 12);

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
              const rtt = Date.now() - (msg.payload?.clientSent || msg.timestamp);
              setConnected(true, Math.max(2, Math.min(rtt, 300)));
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
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        socket.onerror = (err) => {
          console.warn("WebSocket status:", err);
          socket.close();
        };
      } catch (err) {
        console.warn("Não foi possível iniciar WebSocket:", err);
      }
    }

    connectWs();

    return () => {
      isMounted = false;
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      registerSocket(null);
    };
  }, [setConnected, syncFullState]);

  return <>{children}</>;
}
