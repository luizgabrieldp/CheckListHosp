"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  Hospital,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";

export function ConfigView() {
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* TOAST FLUTUANTE */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* CARD 1: ENFERMARIAS */}
      <div className="clean-card rounded-2xl p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Hospital className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Enfermarias</h2>
            <p className="text-xs text-slate-500">
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
            placeholder="Nome da enfermaria..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="submit"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
            title="Adicionar Enfermaria"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* LISTA DE ENFERMARIAS */}
        <div className="space-y-1.5 pt-1">
          {enfermarias.map((enf) => (
            <div
              key={enf}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800">{enf}</span>
              <button
                type="button"
                onClick={() => handleRemoveEnfermaria(enf)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title={`Excluir enfermaria ${enf}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 2: CATEGORIAS DE MODELOS */}
      <div className="clean-card rounded-2xl p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Categorias de Modelos</h2>
            <p className="text-xs text-slate-500">
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
            placeholder="Nome da categoria..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
            title="Adicionar Categoria"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* LISTA DE CATEGORIAS */}
        <div className="space-y-1.5 pt-1">
          {categoriasModelos.map((cat) => (
            <div
              key={cat}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800">{cat}</span>
              <button
                type="button"
                onClick={() => handleRemoveCategoria(cat)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title={`Excluir categoria ${cat}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 3: PRIVACIDADE (LGPD) */}
      <div className="clean-card rounded-2xl p-6 bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Privacidade (LGPD)</h2>
            <p className="text-xs text-slate-500">Política de retenção de dados</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          Dados clínicos apagados automaticamente: admissão/alta em 2 dias (calculados a partir da data agendada), pendências e equipe em 1 dia. Apenas totais diários são preservados para fins estatísticos e conformidade legal.
        </p>
      </div>
    </div>
  );
}
