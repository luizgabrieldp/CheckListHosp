"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { CategoriaModelo, ModeloTexto } from "@/types/hospital";
import { useModalA11y } from "@/lib/useFocusTrap";
import {
  FileText,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit3,
  Search,
  X,
  Eye,
  EyeOff,
  FolderOpen,
  Filter,
  Sparkles,
} from "lucide-react";

export function ModelosTextoView() {
  const modelos = useAppStore((s) => s.modelos);
  const categoriasModelos = useAppStore((s) => s.categoriasModelos);
  const adicionarCategoriaModelo = useAppStore((s) => s.adicionarCategoriaModelo);
  const salvarModelo = useAppStore((s) => s.salvarModelo);
  const removerModelo = useAppStore((s) => s.removerModelo);

  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("TODAS");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Controle de acordeão de visualização por modelo
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Controle do modal de criação / edição
  const [modalAberto, setModalAberto] = useState(false);
  const modalAbertoRef = useModalA11y<HTMLDivElement>({
    isOpen: modalAberto,
    onClose: () => setModalAberto(false),
  });

  // Fechamento de modal via teclado ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && modalAberto) {
        setModalAberto(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalAberto]);
  const [modeloEmEdicao, setModeloEmEdicao] = useState<ModeloTexto | null>(null);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<string>("Alta");
  const [conteudo, setConteudo] = useState("");

  // Adicionar nova categoria inline no modal
  const [criandoNovaCat, setCriandoNovaCat] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState("");

  function toggleExpandido(id: string) {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCopiar(id: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2500);
    } catch {
      // Fallback para navegadores legados
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2500);
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
      setCategoria(categoriaSelecionada !== "TODAS" ? categoriaSelecionada : (categoriasModelos[0] || "Alta"));
      setConteudo("");
    }
    setCriandoNovaCat(false);
    setNovaCatNome("");
    setModalAberto(true);
  }

  function handleCriarNovaCategoria() {
    const nome = novaCatNome.trim();
    if (!nome) return;
    if (!categoriasModelos.some((c) => c.toLowerCase() === nome.toLowerCase())) {
      adicionarCategoriaModelo(nome);
    }
    setCategoria(nome);
    setNovaCatNome("");
    setCriandoNovaCat(false);
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;

    const novoModelo: ModeloTexto = {
      id: modeloEmEdicao?.id || `mod-${Date.now()}`,
      titulo: titulo.trim(),
      categoria: categoria as CategoriaModelo,
      conteudo,
      createdAt: modeloEmEdicao?.createdAt || new Date().toISOString(),
    };

    salvarModelo(novoModelo);
    setModalAberto(false);
  }

  // Filtragem dos modelos
  const modelosFiltrados = useMemo(() => {
    return modelos.filter((m) => {
      const termo = busca.toLowerCase().trim();
      const bateTexto =
        !termo ||
        m.titulo.toLowerCase().includes(termo) ||
        m.conteudo.toLowerCase().includes(termo);
      if (!bateTexto) return false;

      if (categoriaSelecionada === "TODAS") return true;
      return m.categoria?.toLowerCase() === categoriaSelecionada.toLowerCase();
    });
  }, [modelos, busca, categoriaSelecionada]);

  // Agrupamento por categoria com ordenação alfabética rigorosa dentro de cada categoria
  const categoriasAgrupadas = useMemo(() => {
    const map = new Map<string, ModeloTexto[]>();

    modelosFiltrados.forEach((m) => {
      const cat = m.categoria?.trim() || "Geral";
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(m);
    });

    // Ordenar os modelos dentro de cada categoria em ordem alfabética (A-Z)
    map.forEach((lista) => {
      lista.sort((a, b) =>
        a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" })
      );
    });

    // Se houver uma ordem preferencial nas categorias registradas da store
    const categoriasOrdenadas = Array.from(map.keys()).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    );

    return categoriasOrdenadas.map((cat) => ({
      categoria: cat,
      modelos: map.get(cat) || [],
    }));
  }, [modelosFiltrados]);

  return (
    <div className="space-y-5">
      {/* ─────────────────────────────────────────────────────────────
          1. CABEÇALHO DA PÁGINA (ESTILO BASE44 / CLEAN LIGHT)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Modelos de Texto</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
              {modelos.length} templates
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Biblioteca de textos clínicos estruturados prontos para copiar e colar com formatação preservada
          </p>
        </div>

        {/* BOTÃO + NOVO MODELO (DESTAQUE ESMERALDA/VERDE) */}
        <button
          onClick={() => abrirModal()}
          className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Modelo</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BARRA DE BUSCA COM SELETOR DE CATEGORIA E PÍLULAS
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* CAMPO DE BUSCA */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar modelos de texto"
              placeholder="Buscar modelo..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition-all"
            />
          </div>

          {/* MENU SUSPENSO DE CATEGORIA INTEGRADO */}
          <div className="w-full sm:w-56 shrink-0">
            <select
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              aria-label="Filtrar por categoria"
              className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="TODAS">Todas as Categorias</option>
              {categoriasModelos.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PÍLULAS DE CATEGORIAS RÁPIDAS */}
        <div role="tablist" aria-label="Filtrar por categorias de modelos" className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            role="tab"
            aria-selected={categoriaSelecionada === "TODAS"}
            onClick={() => setCategoriaSelecionada("TODAS")}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              categoriaSelecionada === "TODAS"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            Todas
          </button>

          {categoriasModelos.map((cat) => {
            const isAtiva = categoriaSelecionada.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isAtiva}
                onClick={() => setCategoriaSelecionada(cat)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isAtiva
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. LISTAGEM EM FORMATO DE LISTA AGRUPADA POR CATEGORIA
             COM ORDENAÇÃO ALFABÉTICA DENTRO DE CADA CATEGORIA
      ────────────────────────────────────────────────────────────── */}
      {categoriasAgrupadas.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
          <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Nenhum modelo encontrado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {busca
              ? "Tente refinar sua pesquisa ou selecione outra categoria."
              : "Clique em '+ Novo Modelo' para adicionar um texto clínico padrão."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categoriasAgrupadas.map(({ categoria: nomeCat, modelos: listaModelos }) => (
            <div key={nomeCat} className="space-y-2">
              {/* CABEÇALHO DA CATEGORIA */}
              <div className="flex items-center gap-2 px-1">
                <FolderOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  {nomeCat}
                </h3>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                  ({listaModelos.length})
                </span>
              </div>

              {/* LISTA DE ITENS HORIZONTAIS DA CATEGORIA */}
              <div className="space-y-1.5">
                {listaModelos.map((m) => {
                  const isAberto = !!expandidos[m.id];
                  const isCopiado = copiadoId === m.id;

                  return (
                    <div
                      key={m.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
                    >
                      {/* LINHA PRINCIPAL: TÍTULO À ESQUERDA + 4 AÇÕES À DIREITA */}
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        {/* TÍTULO DO MODELO (CLICÁVEL PARA EXPANDIR) */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isAberto}
                          aria-controls={`modelo-conteudo-${m.id}`}
                          aria-label={`Modelo ${m.titulo}. ${isAberto ? "Ocultar conteúdo" : "Visualizar conteúdo"}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleExpandido(m.id);
                            }
                          }}
                          onClick={() => toggleExpandido(m.id)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
                        >
                          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
                            {m.titulo}
                          </span>
                        </div>

                        {/* 4 BOTÕES DE AÇÃO: VISUALIZAR, COPIAR, EDITAR E APAGAR */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* 1. VISUALIZAR (OLHO) */}
                          <button
                            type="button"
                            onClick={() => toggleExpandido(m.id)}
                            aria-label={isAberto ? `Ocultar conteúdo de ${m.titulo}` : `Visualizar conteúdo de ${m.titulo}`}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                              isAberto
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                            title={isAberto ? "Ocultar conteúdo" : "Visualizar conteúdo"}
                          >
                            {isAberto ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>

                          {/* 2. COPIAR */}
                          <button
                            type="button"
                            onClick={() => handleCopiar(m.id, m.conteudo)}
                            aria-label={`Copiar texto de ${m.titulo}`}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                              isCopiado
                                ? "bg-emerald-500 text-white font-bold shadow-xs"
                                : "text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                            title="Copiar texto para área de transferência"
                          >
                            {isCopiado ? (
                              <Check className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Copy className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>

                          {/* 3. EDITAR */}
                          <button
                            type="button"
                            onClick={() => abrirModal(m)}
                            aria-label={`Editar modelo ${m.titulo}`}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            title="Editar modelo"
                          >
                            <Edit3 className="w-4 h-4" aria-hidden="true" />
                          </button>

                          {/* 4. APAGAR */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja realmente apagar o modelo "${m.titulo}"?`)) {
                                removerModelo(m.id);
                              }
                            }}
                            aria-label={`Excluir modelo ${m.titulo}`}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            title="Excluir modelo"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* ACORDEÃO DESLIZANTE DE VISUALIZAÇÃO DO CONTEÚDO */}
                      {isAberto && (
                        <div
                          id={`modelo-conteudo-${m.id}`}
                          className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/80 p-3.5 sm:p-4 space-y-2.5 animate-in fade-in"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                              Conteúdo Formatado
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopiar(m.id, m.conteudo)}
                              aria-label={`Copiar texto formatado de ${m.titulo}`}
                              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                isCopiado
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {isCopiado ? (
                                <>
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Copiado com Sucesso!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                  <span>Copiar Texto</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* TEXTO FORMATADO PRESERVANDO WHITE-SPACE E RECUOS */}
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 font-sans leading-relaxed whitespace-pre-wrap select-text shadow-2xs">
                            {m.conteudo}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL LIMPO DE CRIAÇÃO / EDIÇÃO DE MODELO
      ────────────────────────────────────────────────────────────── */}
      {modalAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-modelo-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
        >
          <div
            ref={modalAbertoRef}
            tabIndex={-1}
            className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col outline-none"
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 id="modal-modelo-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>{modeloEmEdicao ? "Editar Modelo de Texto" : "Criar Novo Modelo de Texto"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                aria-label="Fechar modal de modelo"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer -mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* FORMULÁRIO */}
            <form onSubmit={handleSalvar} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* TÍTULO DO MODELO */}
                <div className="sm:col-span-7">
                  <div className="h-7 flex items-center mb-1.5">
                    <label htmlFor="modelo-form-titulo" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Título do Modelo *
                    </label>
                  </div>
                  <input
                    id="modelo-form-titulo"
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: BARIÁTRICA, COLELAP, Padrão..."
                    className="w-full min-h-[44px] h-[44px] px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all"
                  />
                </div>

                {/* CATEGORIA (MENU SUSPENSO COM DADOS DAS CONFIGURAÇÕES) */}
                <div className="sm:col-span-5">
                  <div className="h-7 flex items-center justify-between mb-1.5">
                    <label htmlFor="modelo-form-categoria" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Categoria *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCriandoNovaCat(!criandoNovaCat)}
                      className="min-h-[44px] inline-flex items-center text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold cursor-pointer hover:underline gap-0.5 px-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      {criandoNovaCat ? "Cancelar" : "+ Nova"}
                    </button>
                  </div>

                  {criandoNovaCat ? (
                    <div className="flex items-center gap-1.5 min-h-[44px] h-[44px]">
                      <input
                        type="text"
                        autoFocus
                        value={novaCatNome}
                        onChange={(e) => setNovaCatNome(e.target.value)}
                        aria-label="Nome da nova categoria"
                        placeholder="Nova categoria..."
                        className="flex-1 h-full px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCriarNovaCategoria();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCriarNovaCategoria}
                        className="h-full min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer flex items-center justify-center shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select
                      id="modelo-form-categoria"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full min-h-[44px] h-[44px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none transition-all cursor-pointer"
                    >
                      {categoriasModelos.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* CONTEÚDO COMPLETO (TEXTAREA COM PRESERVAÇÃO RIGOROSA DE ESPAÇOS E QUEBRAS) */}
              <div>
                <label htmlFor="modelo-form-conteudo" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Conteúdo do Modelo *
                </label>
                <textarea
                  id="modelo-form-conteudo"
                  rows={10}
                  required
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Escreva a anotação completa do modelo. As quebras de linha, recuos e espaços serão 100% preservados para receituários e prontuários..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-xs leading-relaxed focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-1">
                  Preserva integralmente quebras de linhas e tabulações para copiar e colar diretamente no prontuário.
                </p>
              </div>

              {/* RODAPÉ DO MODAL */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {modeloEmEdicao ? "Atualizar Modelo" : "Salvar Modelo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

