"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { PacientePassagem, PrescricaoAntibiotico } from "@/types/hospital";
import { anonimizarNome } from "@/lib/lgpd";
import {
  calcularDDayAntibiotico,
  calcularIdade,
  calcularTempoInternacao,
} from "@/lib/antibiotic-engine";
import { ModalPacientePassagemForm } from "./ModalPacientePassagemForm";
import { ModalImpressaoSeletiva } from "./ModalImpressaoSeletiva";
import {
  Stethoscope,
  Pill,
  Printer,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Activity,
  Heart,
  Calendar,
  Sparkles,
} from "lucide-react";

export function PassagemPlantaoView() {
  const passagem = useAppStore((s) => s.passagem);
  const salvarPaciente = useAppStore((s) => s.salvarPacientePassagem);
  const removerPaciente = useAppStore((s) => s.removerPacientePassagem);

  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [pacienteEmEdicao, setPacienteEmEdicao] = useState<PacientePassagem | null>(null);
  const [modalImpressaoAberto, setModalImpressaoAberto] = useState(false);

  // Estatísticas rápidas
  const totalPacientes = passagem.length;
  let totalAtbAtivos = 0;
  let totalDesescalonar = 0;

  passagem.forEach((p) => {
    p.antibioticos?.forEach((atb) => {
      totalAtbAtivos++;
      const res = calcularDDayAntibiotico(atb);
      if (res.statusAlerta === "DESESCALONAR") {
        totalDesescalonar++;
      }
    });
  });

  // Ajustar dose perdida rápida (+1 / -1)
  function handleAjustarDosePerdida(
    paciente: PacientePassagem,
    atbId: string,
    delta: number
  ) {
    const novosAtb = paciente.antibioticos.map((atb) => {
      if (atb.id === atbId) {
        const novoVal = Math.max(0, atb.dosesPerdidas + delta);
        return { ...atb, dosesPerdidas: novoVal };
      }
      return atb;
    });

    salvarPaciente({
      ...paciente,
      antibioticos: novosAtb,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-6">
      {/* TOPO: TÍTULO E AÇÕES */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Passagem de Plantão & Motor de Antibioticoterapia
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
              {totalPacientes} leitos ativos
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Anonimização LGPD, cálculo automático de D-Day por 24h equivalentes e alerta de desescalonamento
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setModalImpressaoAberto(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95 shadow-sm"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Impressão Seletiva A4</span>
          </button>

          <button
            onClick={() => {
              setPacienteEmEdicao(null);
              setModalFormAberto(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* PAINEL DE ESTATÍSTICAS DO MOTOR ATB */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white leading-none">{totalPacientes}</div>
            <div className="text-xs text-slate-400 mt-1">Pacientes em Passagem</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-teal-300 leading-none">{totalAtbAtivos}</div>
            <div className="text-xs text-slate-400 mt-1">Antibióticos em Curso</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              totalDesescalonar > 0
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse"
                : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
            }`}
          >
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div
              className={`text-xl font-bold leading-none ${
                totalDesescalonar > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {totalDesescalonar}
            </div>
            <div className="text-xs text-slate-400 mt-1">Reavaliações / Desescalonamentos</div>
          </div>
        </div>
      </div>

      {/* LISTA DE PACIENTES */}
      {passagem.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-slate-800 p-8">
          <Stethoscope className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">Nenhum paciente na passagem</h3>
          <p className="text-xs text-slate-500 mt-1">Adicione pacientes internados para iniciar o round.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {passagem.map((paciente) => {
            const idade = calcularIdade(paciente.dataNascimento);
            const tempoInternacao = calcularTempoInternacao(paciente.dataAdmissao);
            const nomeAnonimizado = anonimizarNome(paciente.nome);

            return (
              <div
                key={paciente.id}
                className="rounded-2xl glass-card border border-slate-800/90 hover:border-cyan-500/40 p-5 flex flex-col justify-between transition-all"
              >
                <div>
                  {/* CABEÇALHO DO CARTÃO COM LGPD */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shadow-sm">
                          {paciente.leito}
                        </span>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {nomeAnonimizado}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{paciente.enfermaria}</span>
                        <span>•</span>
                        <span className="text-cyan-300 font-medium">Idade: {idade}</span>
                        <span>•</span>
                        <span className="text-emerald-300 font-medium">
                          Internação: {tempoInternacao}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setPacienteEmEdicao(paciente);
                          setModalFormAberto(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remover ${nomeAnonimizado} da passagem?`)) {
                            removerPaciente(paciente.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* HIPÓTESE DIAGNÓSTICA */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      HD / Procedimento Cirúrgico
                    </span>
                    <span className="text-xs text-slate-200 font-semibold mt-0.5 block">
                      {paciente.hd}
                    </span>
                  </div>

                  {/* SINAIS VITAIS */}
                  {paciente.sinaisVitais && (
                    <div className="flex items-center gap-2 my-2.5 text-xs">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        <span>FC: {paciente.sinaisVitais.fc || "-"} bpm</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span>SatO2: {paciente.sinaisVitais.satO2 || "-"}%</span>
                      </div>
                      {paciente.sinaisVitais.pa && (
                        <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                          PA: {paciente.sinaisVitais.pa}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MOTOR DE ANTIBIOTICOTERAPIA */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5" />
                        Antibioticoterapia ({paciente.antibioticos?.length || 0})
                      </span>
                    </div>

                    {(!paciente.antibioticos || paciente.antibioticos.length === 0) && (
                      <p className="text-xs text-slate-500 italic py-1">
                        Sem antibioticoterapia em curso.
                      </p>
                    )}

                    {paciente.antibioticos?.map((atb) => {
                      const res = calcularDDayAntibiotico(atb);
                      const isDesescalonar = res.statusAlerta === "DESESCALONAR";

                      return (
                        <div
                          key={atb.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isDesescalonar
                              ? "bg-rose-950/25 border-rose-500/60 shadow-sm shadow-rose-500/10"
                              : "bg-slate-900/90 border-slate-800"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{atb.nome}</span>
                                <span className="text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                                  {atb.dose} ({atb.frequenciaHoras}/{atb.frequenciaHoras}h)
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Início: {atb.dataInicio} às {atb.horarioPrimeiraDose} • {res.dosesPorDia}{" "}
                                doses/dia
                              </p>
                            </div>

                            {/* BADGE D-DAY & STATUS */}
                            <div className="text-right">
                              {isDesescalonar ? (
                                <div className="inline-flex items-center gap-1 font-black text-[11px] px-2.5 py-1 rounded-lg bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse">
                                  <Flame className="w-3.5 h-3.5" />
                                  <span>Desescalonar / Reavaliar</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                                  <span>{res.rotuloDDay}</span>
                                  <span className="text-[10px] text-slate-400">
                                    /{atb.duracaoDias}d
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* BARRA DE PROGRESSO DO CICLO DIÁRIO E DOSES PERDIDAS */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-300">
                            <div>
                              <span className="text-slate-400">Término previsto:</span>{" "}
                              <strong className="text-slate-200">{res.dataTerminoFormatada}</strong>
                            </div>

                            {/* CONTROLE DE DOSES PERDIDAS */}
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-[11px]">Doses Perdidas:</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleAjustarDosePerdida(paciente, atb.id, -1)}
                                  disabled={atb.dosesPerdidas <= 0}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs flex items-center justify-center font-bold"
                                >
                                  -
                                </button>
                                <span className="font-bold text-rose-300 px-1 text-xs">
                                  {atb.dosesPerdidas}
                                </span>
                                <button
                                  onClick={() => handleAjustarDosePerdida(paciente, atb.id, 1)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center font-bold text-rose-300"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* PENDÊNCIAS */}
                  {paciente.pendencias && paciente.pendencias.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Pendências do Leito
                      </span>
                      <ul className="space-y-1">
                        {paciente.pendencias.map((pend, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-300 flex items-start gap-1.5"
                          >
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{pend}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CONDUTA */}
                  {paciente.conduta && (
                    <div className="mt-3 text-xs text-slate-300">
                      <strong className="text-cyan-300">Conduta:</strong> {paciente.conduta}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {modalFormAberto && (
        <ModalPacientePassagemForm
          pacienteExistente={pacienteEmEdicao}
          onSalvar={(p) => salvarPaciente(p)}
          onClose={() => {
            setModalFormAberto(false);
            setPacienteEmEdicao(null);
          }}
        />
      )}

      {/* MODAL DE IMPRESSÃO SELETIVA */}
      {modalImpressaoAberto && (
        <ModalImpressaoSeletiva
          pacientes={passagem}
          onClose={() => setModalImpressaoAberto(false)}
        />
      )}
    </div>
  );
}
