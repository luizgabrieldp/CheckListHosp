"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useUiStore, toast } from "@/store/useUiStore";
import {
  LayoutDashboard,
  ClipboardList,
  Activity,
  Users,
  Stethoscope,
  FileText,
  Calendar,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Monitor,
  Search,
  UserCheck,
} from "lucide-react";

export function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const logout = useAppStore((s) => s.logout);
  const isConnected = useAppStore((s) => s.isConnected);
  const latencyMs = useAppStore((s) => s.latencyMs);
  const syncOrigin = useAppStore((s) => s.syncOrigin);
  const saveStatus = useAppStore((s) => s.saveStatus);
  const plantonista = useAppStore((s) => s.plantonista);
  const onlineUsers = useAppStore((s) => s.onlineUsers);
  const isSidebarCollapsed = useAppStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const openGlobalSearch = useUiStore((s) => s.openGlobalSearch);

  const originLabel =
    !isConnected || syncOrigin === "offline"
      ? "Offline"
      : syncOrigin === "firestore"
        ? "Firestore"
        : syncOrigin === "websocket"
          ? "WS Local"
          : "Local";

  const saveLabel =
    saveStatus === "saving"
      ? "Salvando..."
      : saveStatus === "saved"
        ? "Salvo"
        : saveStatus === "error"
          ? "Erro"
          : "";

  const [mobileOpen, setMobileOpen] = useState(false);

  // Fechar menu mobile com tecla ESC para acessibilidade
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  function alternarTema() {
    if (themeMode === "auto") {
      setThemeMode("light");
    } else if (themeMode === "light") {
      setThemeMode("dark");
    } else {
      setThemeMode("auto");
    }
  }

  function getThemeInfo() {
    if (themeMode === "dark") {
      return { label: "Modo Escuro", icon: Moon, desc: "Escuro", color: "text-indigo-400" };
    }
    if (themeMode === "light") {
      return { label: "Modo Claro", icon: Sun, desc: "Claro", color: "text-amber-500" };
    }
    return { label: "Tema: Sistema", icon: Monitor, desc: "Auto", color: "text-cyan-500 dark:text-cyan-400" };
  }

  const currentTheme = getThemeInfo();
  const ThemeIcon = currentTheme.icon;

  const menuItems = [
    { id: "metricas", label: "Painel", icon: LayoutDashboard },
    { id: "admissoes", label: "Admissões", icon: ClipboardList },
    { id: "altas", label: "Altas", icon: Activity },
    { id: "permanencia", label: "Permanência", icon: Users },
    { id: "passagem", label: "Passagem", icon: Stethoscope },
    { id: "modelos", label: "Modelos", icon: FileText },
    { id: "ambulantes", label: "Agenda", icon: Calendar },
    { id: "config", label: "Config", icon: Settings },
  ] as const;

  return (
    <>
      {/* HEADER FIXO SUPERIOR PARA MOBILE (< 768px) - EFEITO VIDRO LÍQUIDO */}
      <header className="md:hidden fixed top-0 left-0 right-0 w-full max-w-full box-border z-30 liquid-glass-header border-b border-slate-200/80 dark:border-slate-800 px-3.5 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between no-print shadow-sm transition-colors">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-center cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">CheckList</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Hospitalar</span>
          </div>
        </div>

        {/* Ações Direitas: Busca Global + Botão de Tema Rápido + Indicador de Conexão no Header Mobile */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openGlobalSearch}
            aria-label="Busca global (Ctrl+K)"
            title="Busca global (Ctrl+K)"
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-center cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            onClick={alternarTema}
            aria-label={`Alternar tema: atualmente ${currentTheme.label}`}
            title={`Tema: ${currentTheme.label} (toque para alternar)`}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-center cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ThemeIcon className={`w-4 h-4 ${currentTheme.color}`} aria-hidden="true" />
          </button>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200/50 dark:bg-slate-800/50 border border-slate-300/40 dark:border-slate-700/40 text-[11px] font-medium text-slate-700 dark:text-slate-300"
            role="status"
            title={
              onlineUsers.length > 0
                ? `Online agora: ${onlineUsers.map((u) => u.nome).join(", ")}`
                : isConnected
                  ? "Conectado ao vivo"
                  : "Offline"
            }
            aria-label={isConnected ? "Status: Conectado ao vivo" : "Status: Desconectado offline"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-rose-500"
              }`}
              aria-hidden="true"
            />
            <span className="text-[10px] font-semibold">
              {isConnected
                ? onlineUsers.length > 1
                  ? `${onlineUsers.length} online`
                  : "Ao vivo"
                : "Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* OVERLAY MOBILE */}
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Fechar menu lateral"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMobileOpen(false);
            }
          }}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm cursor-pointer"
        />
      )}

      {/* ASIDE SIDEBAR COM MODO ENCOLHIDO PARA PC E TABLET */}
      <aside
        id="mobile-navigation"
        aria-label="Menu principal de navegação"
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-200 no-print pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
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
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <Stethoscope className="w-5 h-5" aria-hidden="true" />
              </div>
              <button
                onClick={toggleSidebarCollapsed}
                title="Expandir menu lateral"
                aria-label="Expandir menu lateral"
                className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <PanelLeftOpen className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            // CABEÇALHO EXPANDIDO (COMPLETO COM LOGO E TEXTO)
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Stethoscope className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 truncate">
                  <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                    CheckList
                  </h1>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 leading-tight">
                    Hospitalar
                  </p>
                </div>
              </div>

              {/* Botão de recolher visível no PC e Tablet */}
              <button
                onClick={toggleSidebarCollapsed}
                title="Recolher menu lateral"
                aria-label="Recolher menu lateral"
                className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <PanelLeftClose className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Botão de fechar visível no mobile dentro do drawer */}
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu lateral"
                className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* STATUS REALTIME & SALVAMENTO */}
          {isSidebarCollapsed ? (
            <div
              className="py-2 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center gap-1.5 bg-slate-50/50 dark:bg-slate-950/30"
              title={`${originLabel}${isConnected ? ` (${latencyMs}ms)` : ""}${saveLabel ? ` · ${saveLabel}` : ""}`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <button
                type="button"
                onClick={openGlobalSearch}
                title="Busca global (Ctrl+K)"
                aria-label="Busca global"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="px-4 py-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5" role="status" aria-label={`Conexão: ${originLabel}`}>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {originLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {saveLabel && (
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {saveLabel}
                    </span>
                  )}
                  {isConnected && (
                    <span className="text-[10px] text-slate-400 font-mono">{latencyMs}ms</span>
                  )}
                </div>
              </div>
              <div className="px-3 pb-2">
                <button
                  type="button"
                  onClick={openGlobalSearch}
                  className="w-full min-h-[36px] flex items-center justify-between px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Buscar...</span>
                  </span>
                  <kbd className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    ⌘K
                  </kbd>
                </button>
              </div>
              {plantonista && (
                <div className="px-4 pb-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="truncate font-medium">Plantão: {plantonista}</span>
                </div>
              )}
              {isConnected && onlineUsers.length > 0 && (
                <div
                  className="px-4 pb-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300"
                  title={`Conectados agora: ${onlineUsers.map((u) => u.nome).join(", ")}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                    <span className="truncate font-medium">
                      {onlineUsers.length === 1
                        ? "1 usuário online"
                        : `${onlineUsers.length} usuários online`}
                    </span>
                  </div>
                  <div className="flex -space-x-1.5 shrink-0">
                    {onlineUsers.slice(0, 4).map((u) => (
                      <span
                        key={u.sessionId}
                        className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-[9px] font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-center uppercase"
                      >
                        {u.nome.trim().slice(0, 2)}
                      </span>
                    ))}
                    {onlineUsers.length > 4 && (
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[9px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center">
                        +{onlineUsers.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ITENS DE NAVEGAÇÃO */}
          <nav
            aria-label="Menu principal"
            className={`p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-270px)] ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}
          >
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
                    aria-current={isActive ? "page" : undefined}
                    className={`min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-600/50 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                      }`}
                      aria-hidden="true"
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
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/80 dark:border-emerald-700/50 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* RODAPÉ DA SIDEBAR: TEMA + SENHA + SAIR */}
        <div className={`p-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 bg-slate-50/40 dark:bg-slate-950/40 ${isSidebarCollapsed ? "flex flex-col items-center p-2" : ""}`}>
          {isSidebarCollapsed ? (
            <>
              {/* Botão de Tema Compacto */}
              <button
                onClick={alternarTema}
                title={`Tema atual: ${currentTheme.label} (clique para alternar)`}
                aria-label={`Tema atual: ${currentTheme.label}`}
                className="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <ThemeIcon className={`w-5 h-5 shrink-0 ${currentTheme.color}`} aria-hidden="true" />
              </button>

              <button
                onClick={() => toast.info("Para alterar a senha mestre da enfermaria, contate o administrador.")}
                title="Alterar senha"
                aria-label="Alterar senha"
                className="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <KeyRound className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
              </button>

              <button
                onClick={logout}
                title="Sair da sessão"
                aria-label="Sair da sessão"
                className="min-h-[44px] min-w-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <LogOut className="w-5 h-5 text-rose-500 shrink-0" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              {/* Botão de Tema Expandido */}
              <button
                onClick={alternarTema}
                className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                title="Alternar entre Sistema (Auto), Claro e Escuro"
                aria-label={`Alternar tema: atualmente ${currentTheme.label}`}
              >
                <div className="flex items-center gap-2.5">
                  <ThemeIcon className={`w-4 h-4 shrink-0 ${currentTheme.color}`} aria-hidden="true" />
                  <span>{currentTheme.label}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {currentTheme.desc}
                </span>
              </button>

              <button
                onClick={() => toast.info("Para alterar a senha mestre da enfermaria, contate o administrador.")}
                className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <KeyRound className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span>Alterar senha</span>
              </button>

              <button
                onClick={logout}
                className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <LogOut className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
                <span>Sair</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
