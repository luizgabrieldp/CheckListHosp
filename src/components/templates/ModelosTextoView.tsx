"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { CategoriaModelo, ModeloTexto } from "@/types/hospital";
import {
  FileText,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  X,
  FileCode,
} from "lucide-react";

const CATEGORIAS: CategoriaModelo[] = [
  "Encaminhamento",
  "Alta",
  "ADM",
  "Evolução",
  "Orientações Gerais",
  "Orientações de Alta",
  "Receituário",
];

export function ModelosTextoView() {
  const modelos = useAppStore((s) => s.modelos);
  const salvarModelo = useAppStore((s) => s.salvarModelo);
  const removerModelo = useAppStore((s) => s.removerModelo);

  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("TODAS");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [modeloEmEdicao, setModeloEmEdicao] = useState<ModeloTexto | null>(null);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<CategoriaModelo>("Alta");
  const [conteudo, setConteudo] = useState("");

  const modelosFiltrados = modelos.filter((m) => {
    const termo = busca.toLowerCase();
    const bateTexto =
      m.titulo.toLowerCase().includes(termo) || m.conteudo.toLowerCase().includes(termo);
    if (!bateTexto) return false;
    if (categoriaSelecionada === "TODAS") return true;
    return m.categoria === categoriaSelecionada;
  });

  async function handleCopiar(id: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2500);
    } catch {
      alert("Não foi possível copiar o texto automaticamente.");
    }
  }

  function abrirModal(m?: ModeloTexto) {
    if (m) {
      setModeloEmEdicao(m);
      setTitulo(m.titulo);
      setCategoria(m.categoria);
      setConteudo(m.conteudo);
    } else {
      setModeloEmEdicao(null);
      setTitulo("");
      setCategoria("Alta");
      setConteudo("");
    }
    setModalAberto(true);
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;

    const novoModelo: ModeloTexto = {
      id: modeloEmEdicao?.id || `mod-${Date.now()}`,
      titulo: titulo.trim(),
      categoria,
      conteudo,
      createdAt: modeloEmEdicao?.createdAt || new Date().toISOString(),
    };

    salvarModelo(novoModelo);
    setModalAberto(false);
  }

  return (
    <div className="space-y-6">
      {/* TOPO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Biblioteca de Modelos de Texto Clínicos
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
              {modelos.length} templates
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Textos estruturados com quebra de linha preservada (white-space) prontos para copiar para prontuários
          </p>
        </div>

        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Modelo</span>
        </button>
      </div>

      {/* BARRA DE FILTROS E CATEGORIAS */}
      <div className="glass-card rounded-2xl p-3.5 space-y-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar modelo de texto ou orientações..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs focus:border-cyan-500 focus:outline-none placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoriaSelecionada("TODAS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoriaSelecionada === "TODAS"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                : "bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Todas as Categorias
          </button>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaSelecionada(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoriaSelecionada === cat
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE MODELOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {modelosFiltrados.map((m) => {
          const isCopiado = copiadoId === m.id;

          return (
            <div
              key={m.id}
              className="rounded-2xl glass-card border border-slate-800/80 hover:border-cyan-500/30 p-5 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {m.categoria}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirModal(m)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir o modelo "${m.titulo}"?`)) {
                          removerModelo(m.id);
                        }
                      }}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mb-2.5">{m.titulo}</h3>

                {/* CONTEÚDO PRESERVANDO WHITE-SPACE: PRE-WRAP */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 max-h-56 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
                  {m.conteudo}
                </div>
              </div>

              {/* BOTÃO COPIAR */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Preserva quebras e recuos de texto
                </span>

                <button
                  onClick={() => handleCopiar(m.id, m.conteudo)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isCopiado
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                      : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
                  }`}
                >
                  {isCopiado ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-cyan-400" />
                      <span>Copiar Modelo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CRIAÇÃO / EDIÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl glass-card border border-cyan-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="text-base font-bold text-white">
                {modeloEmEdicao ? "Editar Modelo de Texto" : "Criar Novo Modelo de Texto"}
              </h4>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Título do Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Alta - Apendicectomia"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaModelo)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Conteúdo do Modelo (Preserva quebras de linha) *
                </label>
                <textarea
                  rows={8}
                  required
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Escreva o modelo de evolução, encaminhamento ou alta com toda a formatação desejada..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
