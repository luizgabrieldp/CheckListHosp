"use client";

import React, { useState, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Pendencia, EquipePlantao, PrioridadePendencia, StatusPendencia } from "@/types/hospital";
import { obterDataLocalHoje } from "@/lib/utils";
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Flame,
  GraduationCap,
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
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

export function PermanenciaView() {
  const permanencia = useAppStore((s) => s.permanencia);
  const salvarPendencia = useAppStore((s) => s.salvarPendencia);
  const removerPendencia = useAppStore((s) => s.removerPendencia);
  const atualizarEquipe = useAppStore((s) => s.atualizarEquipe);
  const enfermarias = useAppStore((s) => s.enfermarias);
  const adicionarEnfermaria = useAppStore((s) => s.adicionarEnfermaria);

  // Controle de data de visualização das pendências (padrão: hoje no fuso local)
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    return obterDataLocalHoje();
  });

  const hojeStr = useMemo(() => obterDataLocalHoje(), []);
  const ontemStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return obterDataLocalHoje(d);
  }, []);

  function mudarDia(delta: number) {
    const [ano, mes, dia] = dataSelecionada.split("-").map(Number);
    const d = new Date(ano, mes - 1, dia);
    d.setDate(d.getDate() + delta);
    setDataSelecionada(obterDataLocalHoje(d));
  }

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

  // Pendências da data selecionada (ou retrocompatíveis com a data de criação/hoje)
  const pendenciasDaData = useMemo(() => {
    return pendencias.filter((p) => {
      const dataP = p.data || (p.createdAt ? p.createdAt.split("T")[0] : hojeStr);
      return dataP === dataSelecionada;
    });
  }, [pendencias, dataSelecionada, hojeStr]);

  // Pendências não concluídas do dia anterior para o banner inteligente de transferência
  const pendenciasOntemEmAberto = useMemo(() => {
    return pendencias.filter((p) => {
      const dataP = p.data || (p.createdAt ? p.createdAt.split("T")[0] : "");
      return dataP === ontemStr && p.status !== "Feito";
    });
  }, [pendencias, ontemStr]);

  function handleTransferirPendenciasOntemParaHoje() {
    pendenciasOntemEmAberto.forEach((p) => {
      salvarPendencia({
        ...p,
        data: hojeStr,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  // Lista com todos os membros escalados para os seletores
  const todosOsMembros = [
    ...(equipe.residentes || []).map((nome) => ({ nome, cargo: "Residente" })),
    ...(equipe.doutorandos || []).map((nome) => ({ nome, cargo: "Interno" })),
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

  const pendenciasOrdenadas = [...pendenciasDaData].sort((a, b) => {
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

  const totalTarefas = pendenciasDaData.length;
  const concluidasTarefas = pendenciasDaData.filter((p) => p.status === "Feito").length;

  // 2. Criar pendência rápida
  function handleCriarPendencia(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!novoTitulo.trim()) return;

    const nova: Pendencia = {
      id: `pend-${Date.now()}`,
      data: dataSelecionada,
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
      <span className="font-bold text-[11px] px-2.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
        {texto}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          SELETOR DE DATA NO TOPO (COMPACTO)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setDataSelecionada(hojeStr)}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
            dataSelecionada === hojeStr
              ? "bg-sky-600 text-white shadow-xs"
              : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          Hoje
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => mudarDia(-1)}
            aria-label="Dia anterior"
            className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => mudarDia(1)}
            aria-label="Próximo dia"
            className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <input
          type="date"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
          aria-label="Data das pendências"
          className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
        />
      </div>

      {/* BANNER INTELIGENTE: PENDÊNCIAS EM ABERTO DO PLANTÃO ANTERIOR */}
      {dataSelecionada === hojeStr && pendenciasOntemEmAberto.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Você tem {pendenciasOntemEmAberto.length} pendência(s) não concluída(s) de ontem
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Deseja transferi-las para a lista de hoje para continuar o acompanhamento do round?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTransferirPendenciasOntemParaHoje}
            className="self-end sm:self-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Trazer para hoje</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. EQUIPE DO PLANTÃO & ROUND CIRÚRGICO (CLEAN LIGHT)
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Equipe do Plantão & Round Cirúrgico
          </h2>
        </div>

        {/* 2 COLUNAS: RESIDENTES E DOUTORANDOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-3.5">
          {/* RESIDENTES DE CIRURGIA */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>Residentes ({equipe.residentes?.length || 0})</span>
                </div>
                {categoriaAdicionando !== "residentes" && (
                  <button
                    onClick={() => {
                      setCategoriaAdicionando("residentes");
                      setNomeMembroInline("");
                    }}
                    aria-label="Adicionar residente"
                    className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-sky-600 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-100 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    title="Adicionar residente"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* CAMPO INLINE PARA ADICIONAR RESIDENTE */}
              {categoriaAdicionando === "residentes" && (
                <div className="mb-3 p-2 rounded-lg bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 shadow-xs animate-in fade-in">
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
                      aria-label="Nome do residente"
                      className="flex-1 min-h-[44px] text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    />
                    <button
                      onClick={() => handleSalvarMembroInline("residentes")}
                      aria-label="Salvar residente"
                      className="min-h-[44px] min-w-[44px] rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      title="Salvar (Enter)"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCategoriaAdicionando(null)}
                      aria-label="Cancelar adição de residente"
                      className="min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      title="Cancelar (Esc)"
                    >
                      <X className="w-4 h-4" />
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
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-sky-400 dark:border-sky-500 shadow-xs"
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
                          className="text-xs text-sky-950 dark:text-sky-200 font-medium bg-transparent focus:outline-none w-28"
                        />
                        <button
                          onClick={handleSalvarEdicaoMembro}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 cursor-pointer"
                          title="Salvar"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setMembroEditando(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="group inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700/80 text-sky-950 dark:text-sky-200 text-xs font-semibold shadow-xs hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50/40 dark:hover:bg-sky-950/40 transition-all"
                    >
                      <button
                        type="button"
                        role="button"
                        tabIndex={0}
                        aria-label={`Editar residente ${membro}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setMembroEditando({ categoria: "residentes", index: idx, nome: membro });
                          }
                        }}
                        onClick={() =>
                          setMembroEditando({ categoria: "residentes", index: idx, nome: membro })
                        }
                        title="Clique para editar o nome"
                        className="inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded py-1 min-h-[36px]"
                      >
                        <span>{membro}</span>
                        <Pencil className="w-2.5 h-2.5 text-slate-400 dark:text-slate-400 group-hover:text-sky-500 dark:group-hover:text-sky-300 transition-colors" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoverMembro("residentes", idx, e);
                        }}
                        aria-label={`Remover residente ${membro}`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1 rounded-md text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        title="Remover residente"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {(!equipe.residentes || equipe.residentes.length === 0) &&
                  categoriaAdicionando !== "residentes" && (
                    <span className="text-xs text-slate-500 dark:text-slate-300 italic">Nenhum residente cadastrado</span>
                  )}
              </div>
            </div>
          </div>

          {/* INTERNOS */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Internos ({equipe.doutorandos?.length || 0})</span>
                </div>
                {categoriaAdicionando !== "doutorandos" && (
                  <button
                    onClick={() => {
                      setCategoriaAdicionando("doutorandos");
                      setNomeMembroInline("");
                    }}
                    aria-label="Adicionar interno"
                    className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-teal-600 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-100 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    title="Adicionar interno"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* CAMPO INLINE PARA ADICIONAR INTERNO */}
              {categoriaAdicionando === "doutorandos" && (
                <div className="mb-3 p-2 rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 shadow-xs animate-in fade-in">
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
                      aria-label="Nome do interno"
                      className="flex-1 min-h-[44px] text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    />
                    <button
                      onClick={() => handleSalvarMembroInline("doutorandos")}
                      aria-label="Salvar interno"
                      className="min-h-[44px] min-w-[44px] rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                      title="Salvar (Enter)"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCategoriaAdicionando(null)}
                      aria-label="Cancelar adição de interno"
                      className="min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      title="Cancelar (Esc)"
                    >
                      <X className="w-4 h-4" />
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
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-teal-400 dark:border-teal-500 shadow-xs"
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
                          className="text-xs text-teal-950 dark:text-teal-200 font-medium bg-transparent focus:outline-none w-28"
                        />
                        <button
                          onClick={handleSalvarEdicaoMembro}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 cursor-pointer"
                          title="Salvar"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setMembroEditando(null)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="group inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700/80 text-teal-950 dark:text-teal-200 text-xs font-semibold shadow-xs hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50/40 dark:hover:bg-teal-950/40 transition-all"
                    >
                      <button
                        type="button"
                        role="button"
                        tabIndex={0}
                        aria-label={`Editar interno ${membro}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setMembroEditando({ categoria: "doutorandos", index: idx, nome: membro });
                          }
                        }}
                        onClick={() =>
                          setMembroEditando({ categoria: "doutorandos", index: idx, nome: membro })
                        }
                        title="Clique para editar o nome"
                        className="inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded py-1 min-h-[36px]"
                      >
                        <span>{membro}</span>
                        <Pencil className="w-2.5 h-2.5 text-slate-400 dark:text-slate-400 group-hover:text-teal-500 dark:group-hover:text-teal-300 transition-colors" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoverMembro("doutorandos", idx, e);
                        }}
                        aria-label={`Remover interno ${membro}`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1 rounded-md text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        title="Remover interno"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {(!equipe.doutorandos || equipe.doutorandos.length === 0) &&
                  categoriaAdicionando !== "doutorandos" && (
                    <span className="text-xs text-slate-500 dark:text-slate-300 italic">Nenhum interno cadastrado</span>
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
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Pendências do Round Cirúrgico
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border transition-colors ${
                  totalTarefas > 0 && concluidasTarefas === totalTarefas
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                }`}
              >
                {concluidasTarefas}/{totalTarefas} tarefas
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhamento e gestão de condutas da enfermaria
            </p>
          </div>
        </div>

        {/* BARRA DE CRIAÇÃO RÁPIDA (COM TÍTULO DIRETO E DETALHES RETRÁTEIS) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <form onSubmit={handleCriarPendencia} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  aria-label="Título da nova pendência do round"
                  placeholder="Adicionar nova pendência do round... (Pressione Enter para criar)"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 focus:outline-none transition-all"
                />
              </div>

              {/* BOTÃO PARA DETALHAR MAIS (OPCIONAL) */}
              <button
                type="button"
                onClick={() => setExpandirCriacao(!expandirCriacao)}
                aria-expanded={expandirCriacao}
                aria-label="Mais detalhes da pendência"
                className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  expandirCriacao
                    ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Adicionar leito numérico, enfermaria, responsáveis ou nota antes de salvar"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Detalhes</span>
              </button>

              {/* BOTÃO CRIAR */}
              <button
                type="submit"
                disabled={!novoTitulo.trim()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* PAINEL RETRÁTIL DE DETALHES INICIAIS */}
            {expandirCriacao && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* LEITO NUMÉRICO */}
                  <div className="sm:col-span-3">
                    <div className="h-7 flex items-center mb-1">
                      <label htmlFor="novo-leito-numero" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Bed className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        <span>Leito (Número)</span>
                      </label>
                    </div>
                    <input
                      id="novo-leito-numero"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={novoLeitoNumero}
                      onChange={(e) => setNovoLeitoNumero(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ex: 08"
                      className="w-full h-11 min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset box-border"
                    />
                  </div>

                  {/* ENFERMARIA DAS CONFIGURAÇÕES */}
                  <div className="sm:col-span-3">
                    <div className="h-7 flex items-center mb-1">
                      <label htmlFor="nova-enfermaria-pendencia" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        <span>Enfermaria</span>
                      </label>
                    </div>
                    <select
                      id="nova-enfermaria-pendencia"
                      value={novaEnfermaria}
                      onChange={(e) => setNovaEnfermaria(e.target.value)}
                      className="w-full h-11 min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset box-border"
                    >
                      <option value="">Sem enfermaria</option>
                      {enfermarias
                        .filter((enf) => enf.trim().toLowerCase() !== "sem enfermaria")
                        .map((enf) => (
                        <option key={enf} value={enf}>
                          {enf}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* MÚLTIPLOS RESPONSÁVEIS */}
                  <div className="sm:col-span-4">
                    <div className="h-7 flex items-center mb-1">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>Adicionar Responsável</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={responsavelSelecionadoCriacao}
                        onChange={(e) => setResponsavelSelecionadoCriacao(e.target.value)}
                        className="flex-1 h-11 min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset box-border"
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
                        aria-label="Adicionar responsável à pendência"
                        className="h-11 min-h-[44px] w-11 min-w-[44px] flex items-center justify-center rounded-xl bg-sky-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-700 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 box-border"
                        title="Adicionar responsável"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* TAGS DOS RESPONSÁVEIS SELECIONADOS */}
                    {novosResponsaveis.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {novosResponsaveis.map((resp, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 text-[11px] font-medium"
                          >
                            <span>{resp}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setNovosResponsaveis(novosResponsaveis.filter((r) => r !== resp))
                              }
                              aria-label={`Remover responsável ${resp}`}
                              className="min-h-[36px] min-w-[36px] -my-1 -mr-1.5 p-1 flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PRIORIDADE */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Prioridade</label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setNovaPrioridade("Normal")}
                        className={`min-h-[44px] py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${
                          novaPrioridade === "Normal"
                            ? "bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovaPrioridade("Urgente")}
                        className={`min-h-[44px] py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-0.5 cursor-pointer ${
                          novaPrioridade === "Urgente"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
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
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nota Interna / Conduta Clínica (Opcional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={novaNotaInterna}
                    onChange={(e) => setNovaNotaInterna(e.target.value)}
                    placeholder="Descreva observações, resultados de exames, detalhes da conduta ou histórico..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* FILTRO DE STATUS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filtro de status das pendências">
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
                type="button"
                role="tab"
                aria-selected={isAtivo}
                onClick={() => setFiltroStatus(f.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center ${
                  isAtivo
                    ? "bg-slate-900 dark:bg-sky-600 text-white font-bold shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* LISTA DE PENDÊNCIAS COM SANFONA DESLIZANTE */}
        {pendenciasFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Nenhuma pendência encontrada</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                  className={`rounded-xl border transition-all duration-200 shadow-xs overflow-hidden ${
                    isFeito
                      ? "bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75"
                      : isUrgente
                      ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-300 dark:hover:border-rose-700"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                  }`}
                >
                  {/* LINHA RESUMIDA (CLICÁVEL PARA ABRIR SANFONA) */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isAberta}
                    aria-controls={`pendencia-body-${p.id}`}
                    aria-label={`Pendência ${p.titulo}, ${isAberta ? "recolher detalhes" : "expandir detalhes"}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPendenciaAbertaId(isAberta ? null : p.id);
                      }
                    }}
                    onClick={() => setPendenciaAbertaId(isAberta ? null : p.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* BOTÃO DE CHECK STATUS COM TOUCH TARGET CONFORTÁVEL */}
                      <button
                        type="button"
                        onClick={(e) => handleAvancarStatus(p, e)}
                        aria-label={`Status atual: ${p.status}. Clique para avançar.`}
                        title={`Status: ${p.status}. Clique para avançar.`}
                        className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1.5 sm:ml-0 p-1 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                            isFeito
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : p.status === "Em Realização"
                              ? "bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 animate-pulse"
                              : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-sky-500"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                      </button>

                      {/* CORPO DO ITEM */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* BADGE FORMATADA: LEITO: 08 · ENFERMARIA */}
                          {renderBadgeLeitoEnfermaria(p.leito, p.enfermaria)}

                          {/* TAG URGENTE */}
                          {isUrgente && (
                            <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                              <Flame className="w-3 h-3 text-rose-600" aria-hidden="true" /> URGENTE
                            </span>
                          )}

                          {/* TÍTULO PRINCIPAL (ALTO CONTRASTE E LEGIBILIDADE) */}
                          <span
                            className={`text-sm font-semibold truncate ${
                              isFeito
                                ? "line-through text-slate-400 dark:text-slate-500 font-normal"
                                : isUrgente
                                ? "text-rose-950 dark:text-rose-200 font-bold"
                                : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {p.titulo}
                          </span>

                          {/* INDICADOR DE QUE POSSUI NOTA INTERNA */}
                          {p.notaInterna && (
                            <span
                              title="Possui nota interna / conduta detalhada"
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            >
                              <FileText className="w-3 h-3 text-amber-600" aria-hidden="true" />
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
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
                              >
                                <UserCheck className="w-2.5 h-2.5 text-slate-400" aria-hidden="true" />
                                <span>{resp}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-300 font-medium italic">
                              Sem responsável atribuído
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AÇÕES DA LINHA: BADGE DE STATUS + SETA SANFONA */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleAvancarStatus(p, e)}
                        aria-label={`Alterar status da pendência "${p.titulo}", atual: ${p.status}`}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${
                          p.status === "Feito"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : p.status === "Em Realização"
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {p.status}
                      </button>

                      <div
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-400 dark:text-slate-400 transition-transform duration-200 ${
                          isAberta ? "rotate-180 text-sky-600 dark:text-sky-400" : ""
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      SANFONA DESLIZANTE (STATUS E DADOS NO TOPO, NOTA NA BASE)
                  ────────────────────────────────────────────────────────────── */}
                  {isAberta && (
                    <div
                      id={`pendencia-body-${p.id}`}
                      className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50 space-y-4 animate-in slide-in-from-top-2 duration-150"
                    >
                      {/* 1. STATUS E URGÊNCIA (NO TOPO) */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
                        {/* ATALHOS DE STATUS */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mr-1">Status:</span>
                          {(["Pendente", "Em Realização", "Feito"] as StatusPendencia[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => handleAtualizarCampo(p, { status: st })}
                              className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                p.status === st
                                  ? st === "Feito"
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : st === "Em Realização"
                                    ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                    : "bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700 shadow-xs"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>

                        {/* PRIORIDADE URGENTE */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mr-1">Prioridade:</span>
                          <button
                            type="button"
                            onClick={() => handleAtualizarCampo(p, { prioridade: "Normal" })}
                            className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                              p.prioridade === "Normal"
                                ? "bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAtualizarCampo(p, { prioridade: "Urgente" })}
                            className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                              p.prioridade === "Urgente"
                                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <Flame className="w-3.5 h-3.5 text-rose-300" />
                            <span>Urgente</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. LEITO NUMÉRICO, ENFERMARIA E MÚLTIPLOS RESPONSÁVEIS */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        {/* LEITO (APENAS NÚMERO) */}
                        <div className="sm:col-span-3">
                          <div className="h-7 flex items-center mb-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                              <span>Leito (Apenas Número)</span>
                            </label>
                          </div>
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
                            className="w-full h-10 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset box-border"
                          />
                        </div>

                        {/* ENFERMARIA DAS CONFIGURAÇÕES */}
                        <div className="sm:col-span-4">
                          <div className="h-7 flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                              <span>Enfermaria</span>
                            </label>
                            {mostrandoNovaEnfId !== p.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMostrandoNovaEnfId(p.id);
                                  setEnfParaCriar("");
                                }}
                                className="h-6 px-2 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-bold flex items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
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
                                className="flex-1 h-10 min-h-[40px] px-2 py-1 bg-white dark:bg-slate-800 border border-sky-400 dark:border-sky-600 text-slate-900 dark:text-slate-100 rounded-lg text-xs uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset box-border"
                              />
                              <button
                                type="button"
                                onClick={() => handleCriarNovaEnfermaria(p.id)}
                                className="h-10 min-h-[40px] w-10 min-w-[40px] flex items-center justify-center p-1 rounded-lg bg-sky-600 text-white cursor-pointer hover:bg-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 box-border"
                                title="Salvar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMostrandoNovaEnfId(null)}
                                className="h-10 min-h-[40px] w-10 min-w-[40px] flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 box-border"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <select
                              value={p.enfermaria || ""}
                              onChange={(e) => handleAtualizarCampo(p, { enfermaria: e.target.value })}
                              className="w-full h-10 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset box-border"
                            >
                              <option value="">Sem enfermaria</option>
                              {enfermarias
                                .filter((enf) => enf.trim().toLowerCase() !== "sem enfermaria")
                                .map((enf) => (
                                  <option key={enf} value={enf}>
                                    {enf}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>

                        {/* MÚLTIPLOS RESPONSÁVEIS */}
                        <div className="sm:col-span-5">
                          <div className="h-7 flex items-center mb-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                              <span>Responsáveis</span>
                            </label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={responsavelTempPorTarefa[p.id] || ""}
                              onChange={(e) =>
                                setResponsavelTempPorTarefa((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              className="flex-1 h-10 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:border-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset box-border"
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
                              className="h-10 min-h-[40px] w-10 min-w-[40px] flex items-center justify-center p-1.5 rounded-lg bg-sky-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-700 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 box-border"
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
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium shadow-2xs"
                                >
                                  <span>{resp}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleRemoverResponsavel(p, resp, e)}
                                    aria-label={`Remover responsável ${resp}`}
                                    className="min-h-[36px] min-w-[36px] -my-1 -mr-1.5 p-1 flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                    title="Remover responsável"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-500 dark:text-slate-300 italic font-medium">
                                Nenhum responsável vinculado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. NOTA INTERNA / CONDUTA CLÍNICA (ÚLTIMO ITEM DA SANFONA) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                            <span>Nota Interna / Conduta Clínica do Paciente</span>
                          </label>
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                            Salva automaticamente
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={p.notaInterna || ""}
                          onChange={(e) => handleAtualizarCampo(p, { notaInterna: e.target.value })}
                          placeholder="Descreva aqui as condutas, checagem de antibiótico, resultados de laudos, prescrição ou orientações..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all leading-relaxed"
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
                          className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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

