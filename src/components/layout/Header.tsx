"use client";

import React from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  Activity,
  AlertCircle,
  Clock,
  ClipboardList,
  LogOut,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  Stethoscope,
  Calendar,
  FileCode,
  BarChart3,
  Flame,
  CheckCircle,
} from "lucide-react";

export function Header() {
  const isConnected = useAppStore((s) => s.isConnected);
  const latencyMs = useAppStore((s) => s.latencyMs);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const logout = useAppStore((s) => s.logout);
  const pendencias = useAppStore((s) => s.permanencia?.pendencias || []);

  const totalPendencias = pendencias.length;
  const feitas = pendencias.filter((p) => p.status === "Feito").length;
  const urgentesNaoFeitas = pendencias.filter(
    (p) => p.prioridade === "Urgente" && p.status !== "Feito"
  ).length;

  const tabs = [
    { id: "admissoes", label: "Admissões", icon: ClipboardList },
    { id: "altas", label: "Altas & Feridas", icon: Activity },
    { id: "permanencia", label: "Permanência", icon: Users },
    { id: "passagem", label: "Passagem & ATB", icon: Stethoscope },
    { id: "ambulantes", label: "Ambulatório", icon: Calendar },
    { id: "modelos", label: "Modelos", icon: FileCode },
    { id: "metricas", label: "Métricas LGPD", icon: BarChart3 },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full no-print">
      {/* BANNER REGULATÓRIO PERMANENTE */}
      <div className="bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-amber-700/90 text-white text-[11px] py-1 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2 shadow-sm">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>
          <strong>AVISO OBRIGATÓRIO:</strong> Sistema de agilização de fluxo interno da enfermaria.
          <strong> NÃO SUBSTITUI O PRONTUÁRIO OFICIAL.</strong>
        </span>
      </div>

      {/* BARRA PRINCIPAL */}
      <div className="glass-panel border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* LOGO & STATUS TEMPO REAL */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-500/20">
                CL
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-tight leading-none">
                    CheckList Hospitalar
                  </h1>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold uppercase">
                    Cirurgia
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Rotina Cirúrgica & Enfermarias</p>
              </div>
            </div>

            {/* REALTIME BADGE (Mobile) */}
            <div className="flex md:hidden items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-400 shadow-xs shadow-emerald-400/50" : "bg-rose-400 animate-pulse"
                  }`}
                />
                <span>{isConnected ? `${latencyMs}ms` : "Offline"}</span>
              </div>
            </div>
          </div>

          {/* MONITOR DE URGÊNCIAS & PENDÊNCIAS */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* BADGE DE ALERTA URGENTE */}
            {urgentesNaoFeitas > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/25 border border-rose-500/60 text-rose-200 font-bold shadow-md shadow-rose-500/20">
                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                <span>⚠️ {urgentesNaoFeitas} Urgente{urgentesNaoFeitas > 1 ? "s" : ""} pendente!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nenhuma urgência crítica pendente</span>
              </div>
            )}

            {/* CONTADOR GERAL DE PENDÊNCIAS */}
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                <strong className="text-cyan-400 font-bold">
                  {feitas}/{totalPendencias}
                </strong>{" "}
                Pendências - Equipe em ação
              </span>
            </div>

            {/* REALTIME BADGE (Desktop) */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
              title={isConnected ? `Conexão Realtime ativa (${latencyMs}ms)` : "Reconectando..."}
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="relative">Ao Vivo ({latencyMs}ms)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reconectando...</span>
                </>
              )}
            </div>

            {/* LOGOUT */}
            <button
              onClick={logout}
              title="Sair do plantão"
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/50 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max pb-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
