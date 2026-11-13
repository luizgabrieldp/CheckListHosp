"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store/useAppStore";
import { useUiStore } from "@/store/useUiStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { GatekeeperModal } from "@/components/auth/GatekeeperModal";
import { LgpdConsentModal } from "@/components/auth/LgpdConsentModal";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";

const ViewLoadingFallback = () => (
  <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
    Carregando módulo...
  </div>
);

const AdmissoesView = dynamic(
  () => import("@/components/admissions/AdmissoesView").then((m) => m.AdmissoesView),
  { ssr: false, loading: ViewLoadingFallback }
);
const AltasView = dynamic(
  () => import("@/components/discharges/AltasView").then((m) => m.AltasView),
  { ssr: false, loading: ViewLoadingFallback }
);
const PermanenciaView = dynamic(
  () => import("@/components/permanence/PermanenciaView").then((m) => m.PermanenciaView),
  { ssr: false, loading: ViewLoadingFallback }
);
const PassagemPlantaoView = dynamic(
  () => import("@/components/handover/PassagemPlantaoView").then((m) => m.PassagemPlantaoView),
  { ssr: false, loading: ViewLoadingFallback }
);
const AmbulatorioView = dynamic(
  () => import("@/components/outpatient/AmbulatorioView").then((m) => m.AmbulatorioView),
  { ssr: false, loading: ViewLoadingFallback }
);
const ModelosTextoView = dynamic(
  () => import("@/components/templates/ModelosTextoView").then((m) => m.ModelosTextoView),
  { ssr: false, loading: ViewLoadingFallback }
);
const MetricasLgpdView = dynamic(
  () => import("@/components/metrics/MetricasLgpdView").then((m) => m.MetricasLgpdView),
  { ssr: false, loading: ViewLoadingFallback }
);
const ConfigView = dynamic(
  () => import("@/components/config/ConfigView").then((m) => m.ConfigView),
  { ssr: false, loading: ViewLoadingFallback }
);

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
      if (!useAppStore.getState().isAuthenticated) return;
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

    const handleAtividadeUsuario = () => resetarTimerInatividade(false);

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
      window.addEventListener(evento, handleAtividadeUsuario, { passive: true });
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
        window.removeEventListener(evento, handleAtividadeUsuario);
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

  // Atalho global Cmd/Ctrl + K para Busca Unificada
  useEffect(() => {
    if (!isAuthenticated) return;
    function handleGlobalShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useUiStore.getState().toggleGlobalSearch();
      }
    }
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex print:m-0 print:p-0">
        {/* MODAL GATEKEEPER (SENHA MESTRE "cgimip") */}
        <GatekeeperModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex print:m-0 print:p-0">
      {/* SKIP LINK ACESSÍVEL PARA NAVEGAÇÃO RÁPIDA POR TECLADO E LEITORES DE TELA (WCAG 2.4.1) */}
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("main-content");
          if (main) {
            main.focus();
            main.scrollIntoView({ behavior: "smooth" });
          }
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-emerald-700 focus:text-white focus:font-bold focus:text-xs focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition-all"
      >
        Pular para o conteúdo principal
      </a>

      {/* MODAL LGPD DIÁRIO */}
      <LgpdConsentModal />

      {/* BUSCA GLOBAL UNIFICADA (CMD/CTRL + K) */}
      <GlobalSearchModal />

      {/* SIDEBAR LATERAL À ESQUERDA */}
      <div className="transition-all duration-300">
        <Sidebar />
      </div>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (COM MARGEM DINÂMICA PARA A SIDEBAR E ESPAÇAMENTO PARA HEADER MOBILE) */}
      <div
        className={`flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden transition-all duration-200 print:m-0 print:p-0 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-0 ${
          isSidebarCollapsed ? "md:ml-[68px]" : "md:ml-60"
        }`}
      >
        {/* CONTAINER DO MÓDULO ATIVO COM FOCO ACESSÍVEL */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-full p-4 sm:p-6 md:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] print:p-0 print:m-0 focus:outline-none"
        >
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
