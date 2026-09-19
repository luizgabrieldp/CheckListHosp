"use client";

import React, { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { GatekeeperModal } from "@/components/auth/GatekeeperModal";
import { LgpdConsentModal } from "@/components/auth/LgpdConsentModal";
import { AdmissoesView } from "@/components/admissions/AdmissoesView";
import { AltasView } from "@/components/discharges/AltasView";
import { PermanenciaView } from "@/components/permanence/PermanenciaView";
import { PassagemPlantaoView } from "@/components/handover/PassagemPlantaoView";
import { AmbulatorioView } from "@/components/outpatient/AmbulatorioView";
import { ModelosTextoView } from "@/components/templates/ModelosTextoView";
import { MetricasLgpdView } from "@/components/metrics/MetricasLgpdView";
import { ConfigView } from "@/components/config/ConfigView";

const TEMPO_INATIVIDADE_MS = 5 * 60 * 1000; // 5 minutos

export default function HomePage() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const activeTab = useAppStore((s) => s.activeTab);
  const timerInatividadeRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityLoggedRef = useRef<number>(0);

  // Monitoramento de inatividade (5 minutos) de alta eficiência energética com proteção anti-F5
  useEffect(() => {
    if (!isAuthenticated) return;

    const THROTTLE_ATIVIDADE_MS = 4000; // Throttle de 4s: evita acordar CPU 120x/s durante rolagem/toques

    function resetarTimerInatividade(force = false) {
      const agora = Date.now();
      if (force || agora - lastActivityLoggedRef.current >= THROTTLE_ATIVIDADE_MS) {
        lastActivityLoggedRef.current = agora;
        useAppStore.getState().registrarAtividade();
        if (timerInatividadeRef.current) {
          clearTimeout(timerInatividadeRef.current);
        }
        timerInatividadeRef.current = setTimeout(() => {
          // Bloqueio de segurança irrestrito: limpa memória e sessionStorage exigindo senha mesmo com F5
          useAppStore.getState().logout();
        }, TEMPO_INATIVIDADE_MS);
      }
    }

    function verificarExpiracaoSegundoPlano() {
      if (typeof window !== "undefined") {
        const lastStr = sessionStorage.getItem("checklist_last_activity");
        if (lastStr) {
          const decorrido = Date.now() - Number(lastStr);
          if (decorrido >= TEMPO_INATIVIDADE_MS) {
            useAppStore.getState().logout();
            return;
          }
        }
      }
      resetarTimerInatividade(true);
    }

    function handleMudancaVisibilidade() {
      if (typeof document !== "undefined") {
        if (document.hidden) {
          // Modo Standby ultra-econômico: congela animações e shaders de GPU
          document.body.classList.add("app-background");
        } else {
          document.body.classList.remove("app-background");
          verificarExpiracaoSegundoPlano();
        }
      }
    }

    const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

    eventos.forEach((evento) => {
      window.addEventListener(evento, () => resetarTimerInatividade(false), { passive: true });
    });

    window.addEventListener("visibilitychange", handleMudancaVisibilidade);
    window.addEventListener("focus", verificarExpiracaoSegundoPlano);

    // Iniciar contagem e verificar se já não estava expirado
    verificarExpiracaoSegundoPlano();

    return () => {
      if (timerInatividadeRef.current) {
        clearTimeout(timerInatividadeRef.current);
      }
      if (typeof document !== "undefined") {
        document.body.classList.remove("app-background");
      }
      eventos.forEach((evento) => {
        window.removeEventListener(evento, () => resetarTimerInatividade(false));
      });
      window.removeEventListener("visibilitychange", handleMudancaVisibilidade);
      window.removeEventListener("focus", verificarExpiracaoSegundoPlano);
    };
  }, [isAuthenticated]);

  // Inicialização inteligente do estado da sidebar: PC expandido, Tablet encolhido, ou valor salvo no localStorage
  const isSidebarCollapsed = useAppStore((s) => s.isSidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const salvo = localStorage.getItem("checklist_sidebar_collapsed");
      if (salvo !== null) {
        setSidebarCollapsed(salvo === "true");
      } else {
        // Se for tablet (768px <= width < 1024px), inicia encolhido (true); se for desktop (>= 1024px), inicia expandido (false)
        const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        setSidebarCollapsed(isTablet);
      }
    } catch {}
  }, [setSidebarCollapsed]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex print:m-0 print:p-0">
      {/* MODAL GATEKEEPER (SENHA MESTRE "cgimip") */}
      <GatekeeperModal />

      {/* MODAL LGPD DIÁRIO */}
      <LgpdConsentModal />

      {/* SIDEBAR LATERAL À ESQUERDA (ESTILO BASE44 COM MODO ENCOLHIDO) */}
      <div className={!isAuthenticated ? "filter blur-sm select-none pointer-events-none transition-all duration-300" : "transition-all duration-300"}>
        <Sidebar />
      </div>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (COM MARGEM DINÂMICA PARA A SIDEBAR E ESPAÇAMENTO PARA HEADER MOBILE) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 print:m-0 print:p-0 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-0 ${
          isSidebarCollapsed ? "md:ml-[68px]" : "md:ml-60"
        } ${!isAuthenticated ? "filter blur-sm select-none pointer-events-none" : ""}`}
      >
        {/* CONTAINER DO MÓDULO ATIVO */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] print:p-0 print:m-0">
          {activeTab === "admissoes" && <AdmissoesView />}
          {activeTab === "altas" && <AltasView />}
          {activeTab === "permanencia" && <PermanenciaView />}
          {activeTab === "passagem" && <PassagemPlantaoView />}
          {activeTab === "ambulantes" && <AmbulatorioView />}
          {activeTab === "modelos" && <ModelosTextoView />}
          {activeTab === "metricas" && <MetricasLgpdView />}
          {activeTab === "config" && <ConfigView />}
        </main>
      </div>
    </div>
  );
}
