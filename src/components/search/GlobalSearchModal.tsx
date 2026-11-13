"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useUiStore } from "@/store/useUiStore";
import { useModalA11y } from "@/lib/useFocusTrap";
import { buscarGlobal, ResultadoBuscaGlobal } from "@/lib/patient-flow";
import { Search, X, ArrowRight, FileText, Users, ClipboardList, Activity, Stethoscope } from "lucide-react";

const TAB_ICON_MAP = {
  passagem: Stethoscope,
  admissoes: ClipboardList,
  altas: Activity,
  permanencia: Users,
  modelos: FileText,
} as const;

export function GlobalSearchModal() {
  const isOpen = useUiStore((s) => s.isGlobalSearchOpen);
  const closeGlobalSearch = useUiStore((s) => s.closeGlobalSearch);

  const admissoes = useAppStore((s) => s.admissoes);
  const passagem = useAppStore((s) => s.passagem);
  const altas = useAppStore((s) => s.altas);
  const pendencias = useAppStore((s) => s.permanencia.pendencias);
  const modelos = useAppStore((s) => s.modelos);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [termo, setTermo] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const modalRef = useModalA11y<HTMLDivElement>({
    isOpen,
    onClose: closeGlobalSearch,
  });

  useEffect(() => {
    if (isOpen) {
      setTermo("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const resultados = useMemo(() => {
    return buscarGlobal(termo, {
      admissoes,
      passagem,
      altas,
      pendencias,
      modelos,
    });
  }, [termo, admissoes, passagem, altas, pendencias, modelos]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [resultados.length]);

  if (!isOpen) return null;

  function selecionarResultado(item: ResultadoBuscaGlobal) {
    setActiveTab(item.tab);
    closeGlobalSearch();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (resultados.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % resultados.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const escolhido = resultados[selectedIndex];
      if (escolhido) {
        selecionarResultado(escolhido);
      }
    }
  }

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeGlobalSearch();
        }
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 no-print print:hidden"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <label htmlFor="global-search-input" id="global-search-title" className="sr-only">
            Busca Global no CheckList Hospitalar
          </label>
          <input
            id="global-search-input"
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar paciente, leito, enfermaria, pendência ou modelo..."
            className="flex-1 bg-transparent text-base md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
          <button
            type="button"
            onClick={closeGlobalSearch}
            aria-label="Fechar busca global"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
          {!termo.trim() ? (
            <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Digite o nome do paciente, número do leito, enfermaria, pendência ou título de modelo de texto.
            </div>
          ) : resultados.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhum resultado encontrado para &ldquo;{termo}&rdquo;.
            </div>
          ) : (
            <ul role="listbox" aria-label="Resultados da busca">
              {resultados.map((item, idx) => {
                const Icon = TAB_ICON_MAP[item.tab];
                const isSelected = idx === selectedIndex;
                return (
                  <li key={item.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => selecionarResultado(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/50"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.titulo}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              {item.categoriaLabel}
                            </span>
                            {item.badge && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.subtitulo && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {item.subtitulo}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
