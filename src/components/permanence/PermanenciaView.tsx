"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Pendencia, EquipePlantao, PrioridadePendencia, StatusPendencia } from "@/types/hospital";
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Flame,
  GraduationCap,
  Award,
  Stethoscope,
  X,
  FileText,
  ChevronDown,
  Check,
  UserCheck,
  Bed,
  SlidersHorizontal,
  Building2,
  Pencil,
} from "lucide-react";

export function PermanenciaView() {
  const permanencia = useAppStore((s) => s.permanencia);
  const salvarPendencia = useAppStore((s) => s.salvarPendencia);
  const removerPendencia = useAppStore((s) => s.removerPendencia);
  const atualizarEquipe = useAppStore((s) => s.atualizarEquipe);
  const enfermarias = useAppStore((s) => s.enfermarias);
  const adicionarEnfermaria = useAppStore((s) => s.adicionarEnfermaria);

  // Estados para criação rápida de pendência
  const [novoTitulo, setNovoTitulo] = useState("");
  const [expandirCriacao, setExpandirCriacao] = useState(false);
  const [novoLeitoNumero, setNovoLeitoNumero] = useState("");
  const [novaEnfermaria, setNovaEnfermaria] = useState("");
  const [novosResponsaveis, setNovosResponsaveis] = useState<string[]>([]);
  const [responsavelSelecionadoCriacao, setResponsavelSelecionadoCriacao] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState<PrioridadePendencia>("Normal");
  const [novaNotaInterna, setNovaNotaInterna] = useState("");

  // Estado para adição inline de novo membro da equipe (sem pop-up)
  const [categoriaAdicionando, setCategoriaAdicionando] = useState<
    "residentes" | "doutorandos" | "preceptores" | null
  >(null);
  const [nomeMembroInline, setNomeMembroInline] = useState("");

  // Estado para edição inline do nome de um membro existente ao clicar
  const [membroEditando, setMembroEditando] = useState<{
    categoria: "residentes" | "doutorandos" | "preceptores";
    index: number;
    nome: string;
  } | null>(null);

  // Estado para adicionar nova enfermaria inline dentro da sanfona
  const [enfParaCriar, setEnfParaCriar] = useState("");
  const [mostrandoNovaEnfId, setMostrandoNovaEnfId] = useState<string | null>(null);

  // Estado de seleção temporária de responsável na sanfona
  const [responsavelTempPorTarefa, setResponsavelTempPorTarefa] = useState<Record<string, string>>({});

  // Estado para controle de sanfona (accordion) dos itens de pendência
  const [pendenciaAbertaId, setPendenciaAbertaId] = useState<string | null>(null);

  // Filtro de status da lista
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");

  const equipe = permanencia?.equipe || { doutorandos: [], residentes: [], preceptores: [] };
  const pendencias = permanencia?.pendencias || [];

  // Lista com todos os membros escalados para os seletores
  const todosOsMembros = [
    ...(equipe.residentes || []).map((nome) => ({ nome, cargo: "Residente" })),
    ...(equipe.doutorandos || []).map((nome) => ({ nome, cargo: "Interno" })),
    ...(equipe.preceptores || []).map((nome) => ({ nome, cargo: "Preceptor / Staff" })),
  ];

  // Helper para obter lista de responsáveis de uma pendência
  function obterResponsaveis(p: Pendencia): string[] {
    if (p.responsaveis && p.responsaveis.length > 0) {
      return p.responsaveis;
    }
    return p.responsavel ? [p.responsavel] : [];
  }

  // 1. Algoritmo de ordenação automática estrita em 6 níveis
  function getPontuacaoOrdenacao(p: Pendencia): number {
    const isUrgente = p.prioridade === "Urgente";
    if (p.status === "Pendente") {
      return isUrgente ? 1 : 3; // 1: Urgente & Pendente | 3: Normal & Pendente
    }
    if (p.status === "Em Realização") {
      return isUrgente ? 2 : 4; // 2: Urgente & Em Realização | 4: Normal & Em Realização
    }
    if (p.status === "Feito") {
      return isUrgente ? 5 : 6; // 5: Urgente & Feito | 6: Normal & Feito
    }
    return 7;
  }

  const pendenciasOrdenadas = [...pendencias].sort((a, b) => {
    const scoreA = getPontuacaoOrdenacao(a);
    const scoreB = getPontuacaoOrdenacao(b);
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    // Desempate: mais recente criado/atualizado primeiro
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const pendenciasFiltradas = pendenciasOrdenadas.filter((p) => {
    if (filtroStatus === "TODOS") return true;
    if (filtroStatus === "URGENTES") return p.prioridade === "Urgente";
    return p.status === filtroStatus;
  });

  const totalTarefas = pendencias.length;
  const concluidasTarefas = pendencias.filter((p) => p.status === "Feito").length;

  // 2. Criar pendência rápida
  function handleCriarPendencia(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!novoTitulo.trim()) return;

    const nova: Pendencia = {
      id: `pend-${Date.now()}`,
      titulo: novoTitulo.trim(),
      leito: novoLeitoNumero.trim() || undefined,
      enfermaria: novaEnfermaria.trim() || undefined,
      responsaveis: novosResponsaveis.length > 0 ? novosResponsaveis : undefined,
      responsavel: novosResponsaveis[0] || undefined,
      prioridade: novaPrioridade,
      notaInterna: novaNotaInterna.trim() || undefined,
      status: "Pendente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    salvarPendencia(nova);
    setNovoTitulo("");
    setNovoLeitoNumero("");
    setNovaEnfermaria("");
    setNovosResponsaveis([]);
    setResponsavelSelecionadoCriacao("");
    setNovaPrioridade("Normal");
    setNovaNotaInterna("");
    setExpandirCriacao(false);
  }

  // 3. Alternar status da pendência (Pendente -> Em Realização -> Feito)
  function handleAvancarStatus(pendencia: Pendencia, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const ordem: StatusPendencia[] = ["Pendente", "Em Realização", "Feito"];
    const atualIdx = ordem.indexOf(pendencia.status);
    const proximoStatus = ordem[(atualIdx + 1) % ordem.length];

    salvarPendencia({
      ...pendencia,
      status: proximoStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  // 4. Atualizar campos da pendência diretamente na sanfona
  function handleAtualizarCampo(pendencia: Pendencia, updates: Partial<Pendencia>) {
    salvarPendencia({
      ...pendencia,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  // 5. Adicionar e remover múltiplos responsáveis na pendência
  function handleAdicionarResponsavel(pendencia: Pendencia, nome: string) {
    const limpo = nome.trim();
    if (!limpo) return;
    const atuais = obterResponsaveis(pendencia);
    if (atuais.includes(limpo)) return;

    const atualizados = [...atuais, limpo];
    handleAtualizarCampo(pendencia, {
      responsaveis: atualizados,
      responsavel: atualizados[0] || undefined,
    });
    setResponsavelTempPorTarefa((prev) => ({ ...prev, [pendencia.id]: "" }));
  }

  function handleRemoverResponsavel(pendencia: Pendencia, nome: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const atuais = obterResponsaveis(pendencia);
    const atualizados = atuais.filter((r) => r !== nome);
    handleAtualizarCampo(pendencia, {
      responsaveis: atualizados,
      responsavel: atualizados[0] || undefined,
    });
  }

  // 6. Salvar novo membro da equipe inline (sem pop-up)
  function handleSalvarMembroInline(categoria: "residentes" | "doutorandos" | "preceptores") {
    if (!nomeMembroInline.trim()) {
      setCategoriaAdicionando(null);
      return;
    }

    const novaEquipe: EquipePlantao = {
      ...equipe,
      [categoria]: [...(equipe[categoria] || []), nomeMembroInline.trim()],
    };

    atualizarEquipe(novaEquipe);
    setNomeMembroInline("");
    setCategoriaAdicionando(null);
  }

  // 7. Salvar edição do nome de um membro existente
  function handleSalvarEdicaoMembro() {
    if (!membroEditando) return;
    const { categoria, index, nome } = membroEditando;
    const limpo = nome.trim();
    if (!limpo) {
      setMembroEditando(null);
      return;
    }

    const novaLista = [...equipe[categoria]];
    novaLista[index] = limpo;

    atualizarEquipe({
      ...equipe,
      [categoria]: novaLista,
    });
    setMembroEditando(null);
  }

  // 8. Remover membro da equipe
  function handleRemoverMembro(categoria: keyof EquipePlantao, index: number, e: React.MouseEvent) {
    e.stopPropagation();
    const novaLista = [...equipe[categoria]];
    novaLista.splice(index, 1);
    atualizarEquipe({
      ...equipe,
      [categoria]: novaLista,
    });
  }

  // 9. Adicionar nova enfermaria e vincular à pendência
  function handleCriarNovaEnfermaria(pendenciaId?: string) {
    const limpo = enfParaCriar.trim().toUpperCase();
    if (limpo) {
      adicionarEnfermaria(limpo);
      if (pendenciaId) {
        const p = pendencias.find((item) => item.id === pendenciaId);
        if (p) handleAtualizarCampo(p, { enfermaria: limpo });
      } else {
        setNovaEnfermaria(limpo);
      }
    }
    setEnfParaCriar("");
    setMostrandoNovaEnfId(null);
  }

  // 10. Formatar badge combinada de Leito & Enfermaria
  function renderBadgeLeitoEnfermaria(leito?: string, enfermaria?: string) {
    if (!leito && !enfermaria) return null;
    let texto = "";
    if (leito && enfermaria) {
      texto = `Leito: ${leito} · ${enfermaria}`;
    } else if (leito) {
      texto = `Leito: ${leito}`;
    } else {
      texto = enfermaria!;
    }
    return (
      <span className="font-bold text-[11px] px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
        {texto}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. EQUIPE DO PLANTÃO & ROUND CIRÚRGICO (CLEAN LIGHT)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Equipe do Plantão & Round Cirúrgico
                <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full font-semibold">
                  Hoje: {permanencia.data || "Plantão Atual"}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Médicos Residentes, Doutorandos / Internos e Preceptoria escalados (clique no nome para editar)
              </p>
            </div>
          </div>
        </div>

        {/* 3 COLUNAS COM INSERÇÃO E EDIÇÃO INLINE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* RESIDENTES DE CIRURGIA */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  <span>Residentes ({equipe.residentes?.length || 0})</span>
                </div>
                {categoriaAdicionando !== "residentes" && (
                  <button
                    onClick={() => {
                      setCategoriaAdicionando("residentes");
                      setNomeMembroInline("");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                )}
              </div>

              {/* CAMPO INLINE PARA ADICIONAR RESIDENTE */}
              {categoriaAdicionando === "residentes" && (
                <div className="mb-3 p-2 rounded-lg bg-white border border-sky-300 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={nomeMembroInline}
                      onChange={(e) => setNomeMembroInline(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSalvarMembroInline("residentes");
                        if (e.key === "Escape") setCategoriaAdicionando(null);
                      }}
                      placeholder="Nome do residente (ex: Dr. Felipe R1)..."
                      className="flex-1 text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={() => handleSalvarMembroInline("residentes")}
                      className="p-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
                      title="Salvar (Enter)"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCategoriaAdicionando(null)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Cancelar (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* LISTA DE RESIDENTES COM EDIÇÃO AO CLICAR */}
              <div className="flex flex-wrap gap-1.5">
                {equipe.residentes?.map((membro, idx) => {
                  const isEditando =
                    membroEditando?.categoria === "residentes" && membroEditando?.index === idx;

                  if (isEditando) {
                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-sky-400 shadow-xs"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={membroEditando.nome}
                          onChange={(e) =>
                            setMembroEditando({ ...membroEditando, nome: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSalvarEdicaoMembro();
                            if (e.key === "Escape") setMembroEditando(null);
                          }}
                          className="text-xs text-sky-950 font-medium bg-transparent focus:outline-none w-28"
                        />
                        <button
                          onClick={handleSalvarEdicaoMembro}
                          className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                          title="Salvar"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setMembroEditando(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <span
                      key={idx}
                      onClick={() =>
                        setMembroEditando({ categoria: "residentes", index: idx, nome: membro })
                      }
                      title="Clique para editar o nome"
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-950 text-xs font-medium shadow-xs hover:border-sky-300 hover:bg-sky-50/40 transition-all cursor-pointer"
                    >
                      <span>{membro}</span>
                      <Pencil className="w-2.5 h-2.5 text-slate-300 group-hover:text-sky-500 transition-colors" />
                      <button
                        onClick={(e) => handleRemoverMembro("residentes", idx, e)}
                        className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remover residente"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                {(!equipe.residentes || equipe.residentes.length === 0) &&
                  categoriaAdicionando !== "residentes" && (
                    <span className="text-xs text-slate-400 italic">Nenhum residente cadastrado</span>
                  )}
              </div>
            </div>
          </div>

          {/* DOUTORANDOS / INTERNOS */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 text-teal-600" />
                  <span>Doutorandos / Internos ({equipe.doutorandos?.length || 0})</span>
                </div>
                {categoriaAdicionando !== "doutorandos" && (
                  <button
                    onClick={() => {
                      setCategoriaAdicionando("doutorandos");
                      setNomeMembroInline("");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                )}
              </div>

              {/* CAMPO INLINE PARA ADICIONAR INTERNO */}
              {categoriaAdicionando === "doutorandos" && (
                <div className="mb-3 p-2 rounded-lg bg-white border border-teal-300 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={nomeMembroInline}
                      onChange={(e) => setNomeMembroInline(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSalvarMembroInline("doutorandos");
                        if (e.key === "Escape") setCategoriaAdicionando(null);
                      }}
                      placeholder="Nome do interno (ex: Lucas Internato)..."
                      className="flex-1 text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      onClick={() => handleSalvarMembroInline("doutorandos")}
                      className="p-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
                      title="Salvar (Enter)"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCategoriaAdicionando(null)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Cancelar (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* LISTA DE DOUTORANDOS COM EDIÇÃO AO CLICAR */}
              <div className="flex flex-wrap gap-1.5">
                {equipe.doutorandos?.map((membro, idx) => {
                  const isEditando =
                    membroEditando?.categoria === "doutorandos" && membroEditando?.index === idx;

                  if (isEditando) {
                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-teal-400 shadow-xs"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={membroEditando.nome}
                          onChange={(e) =>
                            setMembroEditando({ ...membroEditando, nome: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSalvarEdicaoMembro();
                            if (e.key === "Escape") setMembroEditando(null);
                          }}
                          className="text-xs text-teal-950 font-medium bg-transparent focus:outline-none w-28"
                        />
                        <button
                          onClick={handleSalvarEdicaoMembro}
                          className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                          title="Salvar"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setMembroEditando(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <span
                      key={idx}
                      onClick={() =>
                        setMembroEditando({ categoria: "doutorandos", index: idx, nome: membro })
                      }
                      title="Clique para editar o nome"
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-950 text-xs font-medium shadow-xs hover:border-teal-300 hover:bg-teal-50/40 transition-all cursor-pointer"
                    >
                      <span>{membro}</span>
                      <Pencil className="w-2.5 h-2.5 text-slate-300 group-hover:text-teal-500 transition-colors" />
                      <button
                        onClick={(e) => handleRemoverMembro("doutorandos", idx, e)}
                        className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remover interno"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                {(!equipe.doutorandos || equipe.doutorandos.length === 0) &&
                  categoriaAdicionando !== "doutorandos" && (
                    <span className="text-xs text-slate-400 italic">Nenhum interno cadastrado</span>
                  )}
              </div>
            </div>
          </div>

          {/* PRECEPTORIA / STAFF */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Preceptoria / Staff ({equipe.preceptores?.length || 0})</span>
                </div>
                {categoriaAdicionando !== "preceptores" && (
                  <button
                    onClick={() => {
                      setCategoriaAdicionando("preceptores");
                      setNomeMembroInline("");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                )}
              </div>

              {/* CAMPO INLINE PARA ADICIONAR PRECEPTOR */}
              {categoriaAdicionando === "preceptores" && (
                <div className="mb-3 p-2 rounded-lg bg-white border border-amber-300 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={nomeMembroInline}
                      onChange={(e) => setNomeMembroInline(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSalvarMembroInline("preceptores");
                        if (e.key === "Escape") setCategoriaAdicionando(null);
                      }}
                      placeholder="Nome do preceptor (ex: Dr. Alexandre Staff)..."
                      className="flex-1 text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => handleSalvarMembroInline("preceptores")}
                      className="p-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
                      title="Salvar (Enter)"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCategoriaAdicionando(null)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Cancelar (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* LISTA DE PRECEPTORES COM EDIÇÃO AO CLICAR */}
              <div className="flex flex-wrap gap-1.5">
                {equipe.preceptores?.map((membro, idx) => {
                  const isEditando =
                    membroEditando?.categoria === "preceptores" && membroEditando?.index === idx;

                  if (isEditando) {
                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-amber-400 shadow-xs"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={membroEditando.nome}
                          onChange={(e) =>
                            setMembroEditando({ ...membroEditando, nome: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSalvarEdicaoMembro();
                            if (e.key === "Escape") setMembroEditando(null);
                          }}
                          className="text-xs text-amber-950 font-medium bg-transparent focus:outline-none w-28"
                        />
                        <button
                          onClick={handleSalvarEdicaoMembro}
                          className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                          title="Salvar"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setMembroEditando(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <span
                      key={idx}
                      onClick={() =>
                        setMembroEditando({ categoria: "preceptores", index: idx, nome: membro })
                      }
                      title="Clique para editar o nome"
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 text-xs font-medium shadow-xs hover:border-amber-300 hover:bg-amber-50/40 transition-all cursor-pointer"
                    >
                      <span>{membro}</span>
                      <Pencil className="w-2.5 h-2.5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                      <button
                        onClick={(e) => handleRemoverMembro("preceptores", idx, e)}
                        className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remover preceptor"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                {(!equipe.preceptores || equipe.preceptores.length === 0) &&
                  categoriaAdicionando !== "preceptores" && (
                    <span className="text-xs text-slate-400 italic">Nenhum preceptor cadastrado</span>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PENDÊNCIAS DO ROUND CIRÚRGICO (ORDENAÇÃO AUTOMÁTICA EM 6 NÍVEIS)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* CABEÇALHO DA SEÇÃO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              Pendências do Round Cirúrgico
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border transition-colors ${
                  totalTarefas > 0 && concluidasTarefas === totalTarefas
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-sky-50 text-sky-700 border-sky-200"
                }`}
              >
                {concluidasTarefas}/{totalTarefas} tarefas
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Controle colaborativo de condutas e exames (urgentes sobem ao topo, concluídas descem automaticamente)
            </p>
          </div>
        </div>

        {/* BARRA DE CRIAÇÃO RÁPIDA (COM TÍTULO DIRETO E DETALHES RETRÁTEIS) */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-3">
          <form onSubmit={handleCriarPendencia} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Adicionar nova pendência do round... (Pressione Enter para criar)"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 focus:outline-none transition-all"
                />
              </div>

              {/* BOTÃO PARA DETALHAR MAIS (OPCIONAL) */}
              <button
                type="button"
                onClick={() => setExpandirCriacao(!expandirCriacao)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  expandirCriacao
                    ? "bg-sky-50 text-sky-700 border-sky-300"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title="Adicionar leito numérico, enfermaria, responsáveis ou nota antes de salvar"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Detalhes</span>
              </button>

              {/* BOTÃO CRIAR */}
              <button
                type="submit"
                disabled={!novoTitulo.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* PAINEL RETRÁTIL DE DETALHES INICIAIS */}
            {expandirCriacao && (
              <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* LEITO NUMÉRICO */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Bed className="w-3 h-3 text-slate-400" />
                      <span>Leito (Número)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={novoLeitoNumero}
                      onChange={(e) => setNovoLeitoNumero(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ex: 08"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* ENFERMARIA DAS CONFIGURAÇÕES */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>Enfermaria</span>
                    </label>
                    <select
                      value={novaEnfermaria}
                      onChange={(e) => setNovaEnfermaria(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
                    >
                      <option value="">Sem enfermaria</option>
                      {enfermarias.map((enf) => (
                        <option key={enf} value={enf}>
                          {enf}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* MÚLTIPLOS RESPONSÁVEIS */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span>Adicionar Responsável</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={responsavelSelecionadoCriacao}
                        onChange={(e) => setResponsavelSelecionadoCriacao(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
                      >
                        <option value="">Selecione um profissional</option>
                        {todosOsMembros.map((m, idx) => (
                          <option key={idx} value={m.nome}>
                            {m.nome} ({m.cargo})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            responsavelSelecionadoCriacao &&
                            !novosResponsaveis.includes(responsavelSelecionadoCriacao)
                          ) {
                            setNovosResponsaveis([...novosResponsaveis, responsavelSelecionadoCriacao]);
                            setResponsavelSelecionadoCriacao("");
                          }
                        }}
                        disabled={!responsavelSelecionadoCriacao}
                        className="p-1.5 rounded-lg bg-sky-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-700 cursor-pointer"
                        title="Adicionar responsável"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* TAGS DOS RESPONSÁVEIS SELECIONADOS */}
                    {novosResponsaveis.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {novosResponsaveis.map((resp, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-medium"
                          >
                            <span>{resp}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setNovosResponsaveis(novosResponsaveis.filter((r) => r !== resp))
                              }
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PRIORIDADE */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Prioridade</label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setNovaPrioridade("Normal")}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          novaPrioridade === "Normal"
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovaPrioridade("Urgente")}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
                          novaPrioridade === "Urgente"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Flame className="w-3 h-3 text-rose-300" />
                        <span>Urg</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* NOTA INTERNA NA CRIAÇÃO (OPCIONAL) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nota Interna / Conduta Clínica (Opcional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={novaNotaInterna}
                    onChange={(e) => setNovaNotaInterna(e.target.value)}
                    placeholder="Descreva observações, resultados de exames, detalhes da conduta ou histórico..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* FILTRO DE STATUS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "TODOS", label: "Todas" },
            { id: "URGENTES", label: "🔥 Urgentes" },
            { id: "Pendente", label: "Pendente" },
            { id: "Em Realização", label: "Em Realização" },
            { id: "Feito", label: "Feito" },
          ].map((f) => {
            const isAtivo = filtroStatus === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltroStatus(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isAtivo
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* LISTA DE PENDÊNCIAS COM SANFONA DESLIZANTE */}
        {pendenciasFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">Nenhuma pendência encontrada</h4>
            <p className="text-xs text-slate-500 mt-1">
              {filtroStatus === "TODOS"
                ? "Tudo pronto! Nenhuma pendência em aberto para o round cirúrgico."
                : `Nenhuma tarefa com o status "${filtroStatus}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendenciasFiltradas.map((p) => {
              const isUrgente = p.prioridade === "Urgente";
              const isFeito = p.status === "Feito";
              const isAberta = pendenciaAbertaId === p.id;
              const responsaveisDaTarefa = obterResponsaveis(p);

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border transition-all duration-200 shadow-xs overflow-hidden ${
                    isFeito
                      ? "bg-slate-50/80 border-slate-200 opacity-75"
                      : isUrgente
                      ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  {/* LINHA RESUMIDA (CLICÁVEL PARA ABRIR SANFONA) */}
                  <div
                    onClick={() => setPendenciaAbertaId(isAberta ? null : p.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      {/* BOTÃO DE CHECK STATUS */}
                      <button
                        onClick={(e) => handleAvancarStatus(p, e)}
                        title={`Status: ${p.status}. Clique para avançar.`}
                        className={`shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                          isFeito
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : p.status === "Em Realização"
                            ? "bg-amber-100 border-amber-300 text-amber-700 animate-pulse"
                            : "bg-white border-slate-300 text-transparent hover:border-sky-500"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      {/* CORPO DO ITEM */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* BADGE FORMATADA: LEITO: 08 · ENFERMARIA */}
                          {renderBadgeLeitoEnfermaria(p.leito, p.enfermaria)}

                          {/* TAG URGENTE */}
                          {isUrgente && (
                            <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                              <Flame className="w-3 h-3 text-rose-600" /> URGENTE
                            </span>
                          )}

                          {/* TÍTULO PRINCIPAL (ALTO CONTRASTE E LEGIBILIDADE) */}
                          <span
                            className={`text-sm font-semibold truncate ${
                              isFeito
                                ? "line-through text-slate-400 font-normal"
                                : isUrgente
                                ? "text-rose-950 font-bold"
                                : "text-slate-900"
                            }`}
                          >
                            {p.titulo}
                          </span>

                          {/* INDICADOR DE QUE POSSUI NOTA INTERNA */}
                          {p.notaInterna && (
                            <span
                              title="Possui nota interna / conduta detalhada"
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
                            >
                              <FileText className="w-3 h-3 text-amber-600" />
                              <span>Nota</span>
                            </span>
                          )}
                        </div>

                        {/* LISTA DE MÚLTIPLOS RESPONSÁVEIS EM MINI-PÍLULAS */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          {responsaveisDaTarefa.length > 0 ? (
                            responsaveisDaTarefa.map((resp, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80"
                              >
                                <UserCheck className="w-2.5 h-2.5 text-slate-400" />
                                <span>{resp}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Sem responsável atribuído
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AÇÕES DA LINHA: BADGE DE STATUS + SETA SANFONA */}
                    <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                      <span
                        onClick={(e) => handleAvancarStatus(p, e)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          p.status === "Feito"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.status === "Em Realização"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {p.status}
                      </span>

                      <div
                        className={`p-1 text-slate-400 transition-transform duration-200 ${
                          isAberta ? "rotate-180 text-sky-600" : ""
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      SANFONA DESLIZANTE (STATUS E DADOS NO TOPO, NOTA NA BASE)
                  ────────────────────────────────────────────────────────────── */}
                  {isAberta && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/70 space-y-4 animate-in slide-in-from-top-2 duration-150">
                      {/* 1. STATUS E URGÊNCIA (NO TOPO) */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/70">
                        {/* ATALHOS DE STATUS */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-700 mr-1">Status:</span>
                          {(["Pendente", "Em Realização", "Feito"] as StatusPendencia[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleAtualizarCampo(p, { status: st })}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                p.status === st
                                  ? st === "Feito"
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : st === "Em Realização"
                                    ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                    : "bg-slate-800 text-white border-slate-800 shadow-xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>

                        {/* PRIORIDADE URGENTE */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-700 mr-1">Prioridade:</span>
                          <button
                            type="button"
                            onClick={() => handleAtualizarCampo(p, { prioridade: "Normal" })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              p.prioridade === "Normal"
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAtualizarCampo(p, { prioridade: "Urgente" })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                              p.prioridade === "Urgente"
                                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <Flame className="w-3 h-3 text-rose-300" />
                            <span>Urgente</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. LEITO NUMÉRICO, ENFERMARIA E MÚLTIPLOS RESPONSÁVEIS */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        {/* LEITO (APENAS NÚMERO) */}
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5 text-slate-500" />
                            <span>Leito (Apenas Número)</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={p.leito || ""}
                            onChange={(e) => {
                              const num = e.target.value.replace(/\D/g, "");
                              handleAtualizarCampo(p, { leito: num });
                            }}
                            placeholder="Ex: 08"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:border-sky-500 focus:outline-none"
                          />
                        </div>

                        {/* ENFERMARIA DAS CONFIGURAÇÕES */}
                        <div className="sm:col-span-4">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Enfermaria</span>
                            </label>
                            {mostrandoNovaEnfId !== p.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMostrandoNovaEnfId(p.id);
                                  setEnfParaCriar("");
                                }}
                                className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                              >
                                + Nova
                              </button>
                            )}
                          </div>

                          {mostrandoNovaEnfId === p.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <input
                                type="text"
                                autoFocus
                                value={enfParaCriar}
                                onChange={(e) => setEnfParaCriar(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCriarNovaEnfermaria(p.id);
                                  if (e.key === "Escape") setMostrandoNovaEnfId(null);
                                }}
                                placeholder="Nome da enfermaria..."
                                className="flex-1 px-2 py-1 bg-white border border-sky-400 rounded-lg text-xs uppercase"
                              />
                              <button
                                type="button"
                                onClick={() => handleCriarNovaEnfermaria(p.id)}
                                className="p-1 rounded bg-sky-600 text-white cursor-pointer"
                                title="Salvar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMostrandoNovaEnfId(null)}
                                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <select
                              value={p.enfermaria || ""}
                              onChange={(e) => handleAtualizarCampo(p, { enfermaria: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:border-sky-500 focus:outline-none"
                            >
                              <option value="">Sem enfermaria</option>
                              {enfermarias.map((enf) => (
                                <option key={enf} value={enf}>
                                  {enf}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* MÚLTIPLOS RESPONSÁVEIS */}
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span>Responsáveis</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={responsavelTempPorTarefa[p.id] || ""}
                              onChange={(e) =>
                                setResponsavelTempPorTarefa((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:border-sky-500 focus:outline-none"
                            >
                              <option value="">Selecione um profissional</option>
                              {todosOsMembros.map((m, idx) => (
                                <option key={idx} value={m.nome}>
                                  {m.nome} ({m.cargo})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const nome = responsavelTempPorTarefa[p.id];
                                if (nome) handleAdicionarResponsavel(p, nome);
                              }}
                              disabled={!responsavelTempPorTarefa[p.id]}
                              className="p-1.5 rounded-lg bg-sky-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-700 cursor-pointer"
                              title="Adicionar responsável"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* LISTA DE RESPONSÁVEIS ADICIONADOS COM BOTÃO DE REMOVER */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {responsaveisDaTarefa.length > 0 ? (
                              responsaveisDaTarefa.map((resp, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-800 text-[11px] font-medium shadow-2xs"
                                >
                                  <span>{resp}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoverResponsavel(p, resp, e)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Remover responsável"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Nenhum responsável vinculado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. NOTA INTERNA / CONDUTA CLÍNICA (ÚLTIMO ITEM DA SANFONA) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-sky-600" />
                            <span>Nota Interna / Conduta Clínica do Paciente</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Salva automaticamente
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={p.notaInterna || ""}
                          onChange={(e) => handleAtualizarCampo(p, { notaInterna: e.target.value })}
                          placeholder="Descreva aqui as condutas, checagem de antibiótico, resultados de laudos, prescrição ou orientações..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all leading-relaxed"
                        />
                      </div>

                      {/* RODAPÉ DA SANFONA: EXCLUSÃO */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            if (confirm(`Excluir a pendência "${p.titulo}"?`)) {
                              removerPendencia(p.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir Pendência</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

