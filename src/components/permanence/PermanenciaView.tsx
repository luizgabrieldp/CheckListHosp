"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Pendencia, EquipePlantao, PrioridadePendencia, StatusPendencia } from "@/types/hospital";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Flame,
  UserPlus,
  GraduationCap,
  Award,
  Stethoscope,
  X,
  Sparkles,
} from "lucide-react";

export function PermanenciaView() {
  const permanencia = useAppStore((s) => s.permanencia);
  const salvarPendencia = useAppStore((s) => s.salvarPendencia);
  const removerPendencia = useAppStore((s) => s.removerPendencia);
  const atualizarEquipe = useAppStore((s) => s.atualizarEquipe);

  // Estados locais para adicionar pendência
  const [titulo, setTitulo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [leito, setLeito] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadePendencia>("Normal");
  const [modalNovaPendencia, setModalNovaPendencia] = useState(false);

  // Estados para adicionar membro da equipe
  const [novoMembroNome, setNovoMembroNome] = useState("");
  const [categoriaMembro, setCategoriaMembro] = useState<"doutorandos" | "residentes" | "preceptores">("residentes");
  const [modalNovoMembro, setModalNovoMembro] = useState(false);

  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");

  const equipe = permanencia?.equipe || { doutorandos: [], residentes: [], preceptores: [] };
  const pendencias = permanencia?.pendencias || [];

  const pendenciasFiltradas = pendencias.filter((p) => {
    if (filtroStatus === "TODOS") return true;
    if (filtroStatus === "URGENTES") return p.prioridade === "Urgente";
    return p.status === filtroStatus;
  });

  function handleCriarPendencia(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !responsavel.trim()) return;

    const nova: Pendencia = {
      id: `pend-${Date.now()}`,
      titulo: titulo.trim(),
      responsavel: responsavel.trim(),
      leito: leito.trim() || undefined,
      prioridade,
      status: "Pendente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    salvarPendencia(nova);
    setTitulo("");
    setResponsavel("");
    setLeito("");
    setPrioridade("Normal");
    setModalNovaPendencia(false);
  }

  function handleAvancarStatus(pendencia: Pendencia) {
    const ordem: StatusPendencia[] = ["Pendente", "Em Realização", "Feito"];
    const atualIdx = ordem.indexOf(pendencia.status);
    const proximoStatus = ordem[(atualIdx + 1) % ordem.length];

    salvarPendencia({
      ...pendencia,
      status: proximoStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleAdicionarMembro(e: React.FormEvent) {
    e.preventDefault();
    if (!novoMembroNome.trim()) return;

    const novaEquipe: EquipePlantao = {
      ...equipe,
      [categoriaMembro]: [...(equipe[categoriaMembro] || []), novoMembroNome.trim()],
    };

    atualizarEquipe(novaEquipe);
    setNovoMembroNome("");
    setModalNovoMembro(false);
  }

  function handleRemoverMembro(categoria: keyof EquipePlantao, index: number) {
    const novaLista = [...equipe[categoria]];
    novaLista.splice(index, 1);
    atualizarEquipe({
      ...equipe,
      [categoria]: novaLista,
    });
  }

  return (
    <div className="space-y-6">
      {/* TOPO: EQUIPE DO PLANTÃO */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Equipe do Plantão & Round Cirúrgico
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Hoje: {permanencia.data || "Plantão Atual"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Doutorandos, Médicos Residentes e Preceptores escalados</p>
            </div>
          </div>

          <button
            onClick={() => setModalNovoMembro(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold self-start sm:self-auto transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Adicionar Membro</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* RESIDENTES */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2.5">
              <Stethoscope className="w-4 h-4" />
              <span>Residentes de Cirurgia ({equipe.residentes?.length || 0})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {equipe.residentes?.map((membro, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-200 text-xs font-medium"
                >
                  <span>{membro}</span>
                  <button
                    onClick={() => handleRemoverMembro("residentes", idx)}
                    className="text-cyan-400 hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(!equipe.residentes || equipe.residentes.length === 0) && (
                <span className="text-xs text-slate-500 italic">Nenhum residente cadastrado</span>
              )}
            </div>
          </div>

          {/* DOUTORANDOS / INTERNOS */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider mb-2.5">
              <GraduationCap className="w-4 h-4" />
              <span>Doutorandos / Internos ({equipe.doutorandos?.length || 0})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {equipe.doutorandos?.map((membro, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-200 text-xs font-medium"
                >
                  <span>{membro}</span>
                  <button
                    onClick={() => handleRemoverMembro("doutorandos", idx)}
                    className="text-teal-400 hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(!equipe.doutorandos || equipe.doutorandos.length === 0) && (
                <span className="text-xs text-slate-500 italic">Nenhum interno cadastrado</span>
              )}
            </div>
          </div>

          {/* PRECEPTORES / CHEFIA */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5">
              <Award className="w-4 h-4" />
              <span>Preceptoria / Staff ({equipe.preceptores?.length || 0})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {equipe.preceptores?.map((membro, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-200 text-xs font-medium"
                >
                  <span>{membro}</span>
                  <button
                    onClick={() => handleRemoverMembro("preceptores", idx)}
                    className="text-amber-400 hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(!equipe.preceptores || equipe.preceptores.length === 0) && (
                <span className="text-xs text-slate-500 italic">Nenhum preceptor cadastrado</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: PENDÊNCIAS E ROUND */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Pendências do Round Cirúrgico
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {pendencias.length} tarefas ativas
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Controle colaborativo de condutas, checagem de exames e altas
            </p>
          </div>

          <button
            onClick={() => setModalNovaPendencia(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Pendência</span>
          </button>
        </div>

        {/* FILTRO DE STATUS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "TODOS", label: "Todas" },
            { id: "URGENTES", label: "🔥 Urgentes" },
            { id: "Pendente", label: "Pendente" },
            { id: "Em Realização", label: "Em Realização" },
            { id: "Feito", label: "Feito" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filtroStatus === f.id
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* LISTA DE PENDÊNCIAS */}
        {pendenciasFiltradas.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl border border-slate-800 p-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">Nenhuma pendência encontrada</h4>
            <p className="text-xs text-slate-500 mt-1">A equipe concluiu todas as tarefas ou nenhuma foi registrada.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendenciasFiltradas.map((p) => {
              const isUrgente = p.prioridade === "Urgente";
              const isFeito = p.status === "Feito";

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl glass-card border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    isFeito
                      ? "opacity-60 bg-slate-950/40 border-slate-800/60 line-through"
                      : isUrgente
                      ? "border-rose-500/50 bg-rose-950/15 shadow-md shadow-rose-500/10"
                      : "border-slate-800/80 hover:border-cyan-500/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* BOTÃO DE STATUS CLICÁVEL */}
                    <button
                      onClick={() => handleAvancarStatus(p)}
                      title={`Status atual: ${p.status}. Clique para avançar.`}
                      className={`shrink-0 mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                        isFeito
                          ? "bg-emerald-500 border-emerald-400 text-slate-950"
                          : p.status === "Em Realização"
                          ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                          : "bg-slate-900 border-slate-700 text-transparent hover:border-cyan-400"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.leito && (
                          <span className="font-bold text-[11px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                            {p.leito}
                          </span>
                        )}
                        {isUrgente && (
                          <span className="inline-flex items-center gap-1 font-extrabold text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse">
                            <Flame className="w-3 h-3 text-rose-400" /> URGENTE
                          </span>
                        )}
                        <span className={`text-sm font-semibold text-white ${isFeito ? "line-through text-slate-400" : ""}`}>
                          {p.titulo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Responsável: <strong className="text-slate-200">{p.responsavel}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* BADGE DE STATUS */}
                    <button
                      onClick={() => handleAvancarStatus(p)}
                      className={`text-xs font-semibold px-3 py-1 rounded-xl border transition-all ${
                        p.status === "Feito"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : p.status === "Em Realização"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      {p.status}
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Excluir a pendência "${p.titulo}"?`)) {
                          removerPendencia(p.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL NOVA PENDÊNCIA */}
      {modalNovaPendencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl glass-card border border-cyan-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="text-base font-bold text-white">Criar Nova Pendência</h4>
              <button
                onClick={() => setModalNovaPendencia(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarPendencia} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título da Tarefa / Pendência *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Checar TC de abdome do leito 04"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Ex: Dr. Felipe (R1)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Leito (Opcional)
                  </label>
                  <input
                    type="text"
                    value={leito}
                    onChange={(e) => setLeito(e.target.value)}
                    placeholder="Ex: Leito 05"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Prioridade
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrioridade("Normal")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      prioridade === "Normal"
                        ? "bg-slate-800 text-white border-cyan-500"
                        : "bg-slate-900/60 text-slate-400 border-slate-800"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioridade("Urgente")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                      prioridade === "Urgente"
                        ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/25"
                        : "bg-slate-900/60 text-slate-400 border-slate-800"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Urgente</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovaPendencia(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
                >
                  Adicionar Pendência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR MEMBRO DA EQUIPE */}
      {modalNovoMembro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl glass-card border border-cyan-500/40 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="text-base font-bold text-white">Adicionar Membro ao Plantão</h4>
              <button
                onClick={() => setModalNovoMembro(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdicionarMembro} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome e Cargo / Ano *
                </label>
                <input
                  type="text"
                  required
                  value={novoMembroNome}
                  onChange={(e) => setNovoMembroNome(e.target.value)}
                  placeholder="Ex: Dr. Lucas (R1) ou Mariana (Internato)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={categoriaMembro}
                  onChange={(e) => setCategoriaMembro(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="residentes">Residente de Cirurgia</option>
                  <option value="doutorandos">Doutorando / Interno</option>
                  <option value="preceptores">Preceptor / Staff Chefe</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoMembro(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
