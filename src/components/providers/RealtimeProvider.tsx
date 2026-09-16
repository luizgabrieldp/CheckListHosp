"use client";

import React, { useEffect, useRef } from "react";
import { registerSocket, useAppStore } from "@/store/useAppStore";
import { WebSocketMessage } from "@/types/hospital";

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

    function connect() {
      if (!isMounted) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      registerSocket(socket);

      socket.onopen = () => {
        if (!isMounted) return;
        setConnected(true, 12);

        // Iniciar Heartbeat para medir latência com precisão
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
        setConnected(false, 0);
        registerSocket(null);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Tentar reconectar em 2 segundos
        reconnectTimeout = setTimeout(connect, 2000);
      };

      socket.onerror = (err) => {
        console.warn("WebSocket status:", err);
        socket.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
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
