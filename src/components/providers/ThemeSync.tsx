"use client";

import React, { useLayoutEffect, useEffect } from "react";
import { useAppStore, aplicarTemaNoDocumento, ThemeMode, resolverTemaEfetivo } from "@/store/useAppStore";

/**
 * Componente guardião de tema (ThemeSync)
 * Garante que:
 * 1. O tema seja re-aplicado imediatamente após a hidratação do React (evitando que o reconciliador do React limpe a classe .dark).
 * 2. O tema acompanhe mudanças do prefers-color-scheme no sistema operacional com suporte duplo (addEventListener + addListener).
 * 3. Um MutationObserver no <html> restaure a classe .dark instantaneamente caso qualquer processo tente removê-la indevidamente.
 * 4. Alterações de tema em outra aba sejam sincronizadas em tempo real via storage event.
 */
export function ThemeSync() {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  // Executa antes da pintura da tela no cliente para re-aplicar o tema pós-hidratação sem FOUC
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      aplicarTemaNoDocumento(themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1. Re-aplicação garantida no mount
    aplicarTemaNoDocumento(themeMode);

    // 2. Ouvinte de preferências do sistema operacional (prefers-color-scheme: dark)
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSistemaChange() {
      const modoAtual = useAppStore.getState().themeMode;
      if (modoAtual === "auto") {
        aplicarTemaNoDocumento("auto");
      }
    }

    if (mql.addEventListener) {
      mql.addEventListener("change", handleSistemaChange);
    } else if ((mql as any).addListener) {
      (mql as any).addListener(handleSistemaChange);
    }

    // 3. Sincronização entre abas
    function handleStorage(e: StorageEvent) {
      if (e.key === "checklist_theme_mode" && e.newValue) {
        const novoModo = e.newValue.replace(/['"]/g, "").trim() as ThemeMode;
        if (novoModo === "auto" || novoModo === "light" || novoModo === "dark") {
          if (useAppStore.getState().themeMode !== novoModo) {
            setThemeMode(novoModo);
          }
        }
      }
    }
    window.addEventListener("storage", handleStorage);

    // 4. Guardião contínuo via MutationObserver: restaura a classe se a hidratação ou scripts externos a removerem
    const observer = new MutationObserver(() => {
      const modoAtual = useAppStore.getState().themeMode;
      const sistemaIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const deveSerEscuro = resolverTemaEfetivo(modoAtual, sistemaIsDark) === "dark";
      const temClasseEscura = document.documentElement.classList.contains("dark");

      if (deveSerEscuro && !temClasseEscura) {
        document.documentElement.classList.add("dark");
      } else if (!deveSerEscuro && temClasseEscura) {
        document.documentElement.classList.remove("dark");
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleSistemaChange);
      } else if ((mql as any).removeListener) {
        (mql as any).removeListener(handleSistemaChange);
      }
      window.removeEventListener("storage", handleStorage);
      observer.disconnect();
    };
  }, [themeMode, setThemeMode]);

  return null;
}
