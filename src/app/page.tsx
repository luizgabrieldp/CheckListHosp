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

  // Monitoramento contínuo de inatividade (5 minutos)
  useEffect(() => {
    if (!isAuthenticated) return;

    function resetarTimerInatividade() {
      if (timerInatividadeRef.current) {
        clearTimeout(timerInatividadeRef.current);
      }
      timerInatividadeRef.current = setTimeout(() => {
        // Bloqueio de segurança: exige login novamente e redireciona ao painel
        useAppStore.setState({ isAuthenticated: false, activeTab: "metricas" });
      }, TEMPO_INATIVIDADE_MS);
    }

    const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

    eventos.forEach((evento) => {
      window.addEventListener(evento, resetarTimerInatividade, { passive: true });
    });

    // Iniciar contagem
    resetarTimerInatividade();

    return () => {
      if (timerInatividadeRef.current) {
        clearTimeout(timerInatividadeRef.current);
      }
      eventos.forEach((evento) => {
        window.removeEventListener(evento, resetarTimerInatividade);
      });
    };
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex print:m-0 print:p-0">
      {/* MODAL GATEKEEPER (SENHA MESTRE "cgimip") */}
      <GatekeeperModal />

      {/* MODAL LGPD DIÁRIO */}
      <LgpdConsentModal />

      {/* SIDEBAR LATERAL À ESQUERDA (ESTILO BASE44) */}
      <div className={!isAuthenticated ? "filter blur-sm select-none pointer-events-none transition-all duration-300" : "transition-all duration-300"}>
        <Sidebar />
      </div>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (COM MARGEM PARA A SIDEBAR E ESPAÇAMENTO PARA HEADER MOBILE) */}
      <div className={`flex-1 flex flex-col lg:ml-60 min-w-0 transition-all duration-300 print:m-0 print:p-0 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:pt-0 ${!isAuthenticated ? "filter blur-sm select-none pointer-events-none" : ""}`}>
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
