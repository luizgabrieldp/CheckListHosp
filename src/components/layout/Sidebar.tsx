"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  LayoutDashboard,
  ClipboardList,
  Activity,
  Users,
  Stethoscope,
  FileCode,
  Calendar,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";

export function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const logout = useAppStore((s) => s.logout);
  const isConnected = useAppStore((s) => s.isConnected);
  const latencyMs = useAppStore((s) => s.latencyMs);

  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: "metricas", label: "Painel", icon: LayoutDashboard },
    { id: "admissoes", label: "Admissões", icon: ClipboardList },
    { id: "altas", label: "Altas", icon: Activity },
    { id: "permanencia", label: "Permanência", icon: Users },
    { id: "passagem", label: "Passagem", icon: Stethoscope },
    { id: "modelos", label: "Modelos", icon: FileCode },
    { id: "ambulantes", label: "Agenda", icon: Calendar },
    { id: "config", label: "Config", icon: Settings },
  ] as const;

  return (
    <>
      {/* HEADER FIXO SUPERIOR PARA MOBILE (NÃO COBRE CONTEÚDO) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 z-30 px-3.5 flex items-center justify-between no-print shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center justify-center cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">CheckList</span>
            <span className="text-xs font-semibold text-emerald-600">Hospitalar</span>
          </div>
        </div>

        {/* Indicador de Conexão no Header Mobile */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-400"
            }`}
          />
          <span className="text-[10px]">{isConnected ? "Ao vivo" : "Offline"}</span>
        </div>
      </header>

      {/* OVERLAY MOBILE */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
        />
      )}

      {/* ASIDE SIDEBAR */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 no-print pb-[env(safe-area-inset-bottom,0px)] ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* LOGO & NOME COM BOTÃO FECHAR NO MOBILE */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30 shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">
                  CheckList
                </h1>
                <p className="text-xs font-semibold text-emerald-600 leading-tight">
                  Hospitalar
                </p>
              </div>
            </div>

            {/* BOTÃO DE FECHAR VISÍVEL SOMENTE NO MOBILE DENTRO DO DRAWER */}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu lateral"
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STATUS REALTIME NO TOPO DA SIDEBAR */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="font-semibold text-slate-600">
                {isConnected ? "Sincronizado" : "Reconectando"}
              </span>
            </div>
            {isConnected && (
              <span className="text-[10px] text-slate-400 font-mono">{latencyMs}ms</span>
            )}
          </div>

          {/* ITENS DE NAVEGAÇÃO COM TOUCH TARGET >= 44PX */}
          <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setMobileOpen(false);
                  }}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* RODAPÉ DA SIDEBAR */}
        <div className="p-3 border-t border-slate-100 space-y-1 bg-slate-50/40">
          <button
            onClick={() => alert("Para alterar a senha mestre da enfermaria, contate o administrador.")}
            className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Alterar senha</span>
          </button>

          <button
            onClick={logout}
            className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
