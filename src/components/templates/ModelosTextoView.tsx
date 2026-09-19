"use client";

import React, { useState, useMemo } from "react";
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Modelos de Texto</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              {modelos.length} templates
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
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
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* CAMPO DE BUSCA */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar modelo..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none transition-all"
            />
          </div>

          {/* MENU SUSPENSO DE CATEGORIA INTEGRADO */}
          <div className="w-full sm:w-56 shrink-0">
            <select
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="min-h-[40px] w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold focus:bg-white focus:border-emerald-500 focus:outline-none transition-all cursor-pointer"
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoriaSelecionada("TODAS")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center ${
              categoriaSelecionada === "TODAS"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Todas
          </button>

          {categoriasModelos.map((cat) => {
            const isAtiva = categoriaSelecionada.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setCategoriaSelecionada(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center ${
                  isAtiva
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
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
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nenhum modelo encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">
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
                <FolderOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  {nomeCat}
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
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
                      className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                    >
                      {/* LINHA PRINCIPAL: TÍTULO À ESQUERDA + 4 AÇÕES À DIREITA */}
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        {/* TÍTULO DO MODELO (CLICÁVEL PARA EXPANDIR) */}
                        <div
                          onClick={() => toggleExpandido(m.id)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none group"
                        >
                          <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                            {m.titulo}
                          </span>
                        </div>

                        {/* 4 BOTÕES DE AÇÃO: VISUALIZAR, COPIAR, EDITAR E APAGAR */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* 1. VISUALIZAR (OLHO) */}
                          <button
                            type="button"
                            onClick={() => toggleExpandido(m.id)}
                            className={`min-h-[38px] min-w-[38px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isAberto
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            }`}
                            title={isAberto ? "Ocultar conteúdo" : "Visualizar conteúdo"}
                          >
                            {isAberto ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>

                          {/* 2. COPIAR */}
                          <button
                            type="button"
                            onClick={() => handleCopiar(m.id, m.conteudo)}
                            className={`min-h-[38px] min-w-[38px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isCopiado
                                ? "bg-emerald-500 text-white font-bold shadow-xs"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title="Copiar texto para área de transferência"
                          >
                            {isCopiado ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* 3. EDITAR */}
                          <button
                            type="button"
                            onClick={() => abrirModal(m)}
                            className="min-h-[38px] min-w-[38px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                            title="Editar modelo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* 4. APAGAR */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja realmente apagar o modelo "${m.titulo}"?`)) {
                                removerModelo(m.id);
                              }
                            }}
                            className="min-h-[38px] min-w-[38px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir modelo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* ACORDEÃO DESLIZANTE DE VISUALIZAÇÃO DO CONTEÚDO */}
                      {isAberto && (
                        <div className="border-t border-slate-100 bg-slate-50/60 p-3.5 sm:p-4 space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Conteúdo Formatado
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopiar(m.id, m.conteudo)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isCopiado
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {isCopiado ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copiado com Sucesso!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Copiar Texto</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* TEXTO FORMATADO PRESERVANDO WHITE-SPACE E RECUOS */}
                          <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap select-text shadow-2xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>{modeloEmEdicao ? "Editar Modelo de Texto" : "Criar Novo Modelo de Texto"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORMULÁRIO */}
            <form onSubmit={handleSalvar} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* TÍTULO DO MODELO */}
                <div className="sm:col-span-7">
                  <div className="h-7 flex items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Título do Modelo *
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: BARIÁTRICA, COLELAP, Padrão..."
                    className="w-full h-[42px] px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>

                {/* CATEGORIA (MENU SUSPENSO COM DADOS DAS CONFIGURAÇÕES) */}
                <div className="sm:col-span-5">
                  <div className="h-7 flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Categoria *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCriandoNovaCat(!criandoNovaCat)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer hover:underline flex items-center gap-0.5"
                    >
                      {criandoNovaCat ? "Cancelar" : "+ Nova"}
                    </button>
                  </div>

                  {criandoNovaCat ? (
                    <div className="flex items-center gap-1.5 h-[42px]">
                      <input
                        type="text"
                        autoFocus
                        value={novaCatNome}
                        onChange={(e) => setNovaCatNome(e.target.value)}
                        placeholder="Nova categoria..."
                        className="flex-1 h-full px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
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
                        className="h-full px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer flex items-center justify-center shadow-xs"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full h-[42px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:bg-white focus:border-emerald-500 focus:outline-none transition-all cursor-pointer"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Conteúdo do Modelo *
                </label>
                <textarea
                  rows={10}
                  required
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Escreva a anotação completa do modelo. As quebras de linha, recuos e espaços serão 100% preservados para receituários e prontuários..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs leading-relaxed focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Preserva integralmente quebras de linhas e tabulações para copiar e colar diretamente no prontuário.
                </p>
              </div>

              {/* RODAPÉ DO MODAL */}
              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center"
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

