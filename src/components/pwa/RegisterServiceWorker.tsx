"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registrar = async () => {
      try {
        // Detecta se está rodando no GitHub Pages sob /CheckListHosp/ ou em domínio próprio/localhost
        const pathname = window.location.pathname;
        const isGhPages = pathname.startsWith("/CheckListHosp");
        const basePath = isGhPages ? "/CheckListHosp" : "";
        const swUrl = `${basePath}/sw.js`;
        const swScope = `${basePath}/`;

        const registration = await navigator.serviceWorker.register(swUrl, {
          scope: swScope,
        });

        // Verifica atualizações em background
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("[PWA] Nova versão disponível em background.");
              }
            });
          }
        });
      } catch (err) {
        console.warn("[PWA] Falha ao registrar Service Worker:", err);
      }
    };

    // Registra após o carregamento inicial da página para não disputar banda com a hidratação
    if (document.readyState === "complete") {
      registrar();
    } else {
      window.addEventListener("load", registrar);
      return () => window.removeEventListener("load", registrar);
    }
  }, []);

  return null;
}
