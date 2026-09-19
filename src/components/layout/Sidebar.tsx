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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const logout = useAppStore((s) => s.logout);
  const isConnected = useAppStore((s) => s.isConnected);
  const latencyMs = useAppStore((s) => s.latencyMs);
  const isSidebarCollapsed = useAppStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);

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
      {/* HEADER FIXO SUPERIOR PARA MOBILE (< 768px) OTIMIZADO PARA GPU */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/98 backdrop-blur-xs border-b border-slate-200/90 px-3.5 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between no-print shadow-2xs">
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
              isConnected ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-rose-400 animate-pulse"
            }`}
          />
          <span className="text-[10px]">{isConnected ? "Ao vivo" : "Offline"}</span>
        </div>
      </header>

      {/* OVERLAY MOBILE */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
        />
      )}

      {/* ASIDE SIDEBAR COM MODO ENCOLHIDO PARA PC E TABLET */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-200 no-print pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
          // No mobile (< 768px): sempre drawer de 240px deslizante
          // No tablet e PC (>= 768px): fixo com largura condicional (68px encolhido vs 240px expandido)
          mobileOpen
            ? "translate-x-0 shadow-2xl w-60"
            : "-translate-x-full md:translate-x-0 " + (isSidebarCollapsed ? "md:w-[68px]" : "md:w-60")
        }`}
      >
        <div>
          {/* LOGO & NOME + BOTÃO DE RECOLHER/EXPANDIR */}
          {isSidebarCollapsed ? (
            // CABEÇALHO COMPACTO (SOMENTE ÍCONE E TOGGLE NO PC/TABLET)
            <div className="p-3 border-b border-slate-100 flex flex-col items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <button
                onClick={toggleSidebarCollapsed}
                title="Expandir menu lateral"
                aria-label="Expandir menu lateral"
                className="hidden md:flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // CABEÇALHO EXPANDIDO (COMPLETO COM LOGO E TEXTO)
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div className="min-w-0 truncate">
                  <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                    CheckList
                  </h1>
                  <p className="text-xs font-semibold text-emerald-600 leading-tight">
                    Hospitalar
                  </p>
                </div>
              </div>

              {/* Botão de recolher visível no PC e Tablet */}
              <button
                onClick={toggleSidebarCollapsed}
                title="Recolher menu lateral"
                aria-label="Recolher menu lateral"
                className="hidden md:flex min-h-[36px] min-w-[36px] items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>

              {/* Botão de fechar visível no mobile dentro do drawer */}
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu lateral"
                className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STATUS REALTIME */}
          {isSidebarCollapsed ? (
            <div
              className="py-2 border-b border-slate-100 flex items-center justify-center bg-slate-50/50"
              title={isConnected ? `Sincronizado (${latencyMs}ms)` : "Reconectando..."}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-rose-500 animate-pulse"
                }`}
              />
            </div>
          ) : (
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] bg-slate-50/50">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-rose-500 animate-pulse"
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
          )}

          {/* ITENS DE NAVEGAÇÃO */}
          <nav className={`p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)] ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (isSidebarCollapsed) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setMobileOpen(false);
                    }}
                    title={item.label}
                    aria-label={item.label}
                    className={`min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer group relative ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-300 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                  </button>
                );
              }

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
        <div className={`p-3 border-t border-slate-100 space-y-1.5 bg-slate-50/40 ${isSidebarCollapsed ? "flex flex-col items-center p-2" : ""}`}>
          {isSidebarCollapsed ? (
            <>
              <button
                onClick={() => alert("Para alterar a senha mestre da enfermaria, contate o administrador.")}
                title="Alterar senha"
                aria-label="Alterar senha"
                className="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <KeyRound className="w-5 h-5 text-slate-400 shrink-0" />
              </button>

              <button
                onClick={logout}
                title="Sair da sessão"
                aria-label="Sair da sessão"
                className="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5 text-rose-500 shrink-0" />
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </aside>
    </>
  );
}
