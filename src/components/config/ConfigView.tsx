"use client";

import React, { useState } from "react";
import { useAppStore, ThemeMode } from "@/store/useAppStore";
import {
  Hospital,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react";

export function ConfigView() {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  const enfermarias = useAppStore((s) => s.enfermarias);
  const adicionarEnfermaria = useAppStore((s) => s.adicionarEnfermaria);
  const removerEnfermaria = useAppStore((s) => s.removerEnfermaria);

  const categoriasModelos = useAppStore((s) => s.categoriasModelos);
  const adicionarCategoriaModelo = useAppStore((s) => s.adicionarCategoriaModelo);
  const removerCategoriaModelo = useAppStore((s) => s.removerCategoriaModelo);

  const [novaEnfermaria, setNovaEnfermaria] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function exibirToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function handleAddEnfermaria(e: React.FormEvent) {
    e.preventDefault();
    const nome = novaEnfermaria.trim();
    if (!nome) return;
    if (enfermarias.some((enf) => enf.toLowerCase() === nome.toLowerCase())) {
      exibirToast("Esta enfermaria já está cadastrada.");
      return;
    }
    adicionarEnfermaria(nome);
    setNovaEnfermaria("");
    exibirToast(`Enfermaria "${nome}" adicionada com sucesso!`);
  }

  function handleRemoveEnfermaria(nome: string) {
    if (confirm(`Deseja remover a enfermaria "${nome}"?`)) {
      removerEnfermaria(nome);
      exibirToast(`Enfermaria "${nome}" removida.`);
    }
  }

  function handleAddCategoria(e: React.FormEvent) {
    e.preventDefault();
    const nome = novaCategoria.trim();
    if (!nome) return;
    if (categoriasModelos.some((cat) => cat.toLowerCase() === nome.toLowerCase())) {
      exibirToast("Esta categoria já está cadastrada.");
      return;
    }
    adicionarCategoriaModelo(nome);
    setNovaCategoria("");
    exibirToast(`Categoria "${nome}" adicionada com sucesso!`);
  }

  function handleRemoveCategoria(nome: string) {
    if (confirm(`Deseja remover a categoria "${nome}"?`)) {
      removerCategoriaModelo(nome);
      exibirToast(`Categoria "${nome}" removida.`);
    }
  }

  const opcoesTema: { id: ThemeMode; label: string; sub: string; icon: typeof Sun }[] = [
    {
      id: "auto",
      label: "Automático (Sistema)",
      sub: "Acompanha o modo do seu celular ou PC",
      icon: Monitor,
    },
    {
      id: "light",
      label: "Modo Claro",
      sub: "Fundo claro, ideal para o dia",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Modo Escuro",
      sub: "Fundo escuro, ideal para plantões noturnos",
      icon: Moon,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* TOAST FLUTUANTE */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* CARD 0: APARÊNCIA E TEMA VISUAL */}
      <div className="clean-card rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800/50">
            <Palette className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Aparência e Tema do Sistema</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha entre o modo automático pelo sistema (padrão) ou force o modo claro ou escuro
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Aparência e Tema do Sistema"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
        >
          {opcoesTema.map((opcao) => {
            const Icon = opcao.icon;
            const isAtivo = themeMode === opcao.id;

            return (
              <button
                key={opcao.id}
                type="button"
                role="radio"
                aria-checked={isAtivo}
                onClick={() => {
                  setThemeMode(opcao.id);
                  exibirToast(`Tema alterado para ${opcao.label}`);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${
                  isAtivo
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-slate-50/60 dark:bg-slate-850 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${
                    isAtivo
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                  }`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>

                  {isAtivo && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" aria-hidden="true" />
                      Ativo
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold leading-tight">{opcao.label}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{opcao.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CARD 1: ENFERMARIAS */}
      <div className="clean-card rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
            <Hospital className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Enfermarias</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gerencie os nomes que aparecem no menu suspenso ao cadastrar altas e admissões
            </p>
          </div>
        </div>

        {/* FORM ADICIONAR ENFERMARIA */}
        <form onSubmit={handleAddEnfermaria} className="flex gap-2">
          <input
            type="text"
            value={novaEnfermaria}
            onChange={(e) => setNovaEnfermaria(e.target.value)}
            aria-label="Nome da nova enfermaria"
            placeholder="Nome da enfermaria..."
            className="flex-1 h-11 min-h-[44px] box-border px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="submit"
            aria-label="Adicionar enfermaria"
            className="h-11 min-h-[44px] min-w-[44px] box-border flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Adicionar Enfermaria"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        {/* LISTA DE ENFERMARIAS */}
        <div className="space-y-1.5 pt-1">
          {enfermarias.map((enf) => (
            <div
              key={enf}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{enf}</span>
              <button
                type="button"
                onClick={() => handleRemoveEnfermaria(enf)}
                aria-label={`Excluir enfermaria ${enf}`}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                title={`Excluir enfermaria ${enf}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 2: CATEGORIAS DE MODELOS */}
      <div className="clean-card rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
            <FileText className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Categorias de Modelos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gerencie as categorias dos textos modelos (orientações, receituário, etc)
            </p>
          </div>
        </div>

        {/* FORM ADICIONAR CATEGORIA */}
        <form onSubmit={handleAddCategoria} className="flex gap-2">
          <input
            type="text"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            aria-label="Nome da nova categoria de modelo"
            placeholder="Nome da categoria..."
            className="flex-1 h-11 min-h-[44px] box-border px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            aria-label="Adicionar categoria de modelo"
            className="h-11 min-h-[44px] min-w-[44px] box-border flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Adicionar Categoria"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        {/* LISTA DE CATEGORIAS */}
        <div className="space-y-1.5 pt-1">
          {categoriasModelos.map((cat) => (
            <div
              key={cat}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{cat}</span>
              <button
                type="button"
                onClick={() => handleRemoveCategoria(cat)}
                aria-label={`Excluir categoria ${cat}`}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                title={`Excluir categoria ${cat}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 3: PRIVACIDADE (LGPD) */}
      <div className="clean-card rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-800/50">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Privacidade (LGPD)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Política de retenção de dados</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
          Dados clínicos apagados automaticamente: admissão/alta em 2 dias (calculados a partir da data agendada), pendências e equipe em 1 dia. Apenas totais diários são preservados para fins estatísticos e conformidade legal.
        </p>
      </div>
    </div>
  );
}
