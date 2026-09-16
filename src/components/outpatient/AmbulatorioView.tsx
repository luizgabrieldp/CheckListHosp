"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { DiaSemana, HorarioMedico, MedicoAmbulatorio, TurnoAmbulatorio } from "@/types/hospital";
import {
  Calendar,
  Plus,
  UserPlus,
  Trash2,
  Edit3,
  Sun,
  Sunset,
  X,
  Sparkles,
  Stethoscope,
} from "lucide-react";

const DIAS_SEMANA: DiaSemana[] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const TURNOS: TurnoAmbulatorio[] = ["Manhã", "Tarde"];

export function AmbulatorioView() {
  const ambulantes = useAppStore((s) => s.ambulantes);
  const salvarMedico = useAppStore((s) => s.salvarMedicoAmbulatorio);
  const removerMedico = useAppStore((s) => s.removerMedicoAmbulatorio);

  const [modalNovoMedico, setModalNovoMedico] = useState(false);
  const [medicoEmEdicao, setMedicoEmEdicao] = useState<MedicoAmbulatorio | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [sala, setSala] = useState("");
  const [horarios, setHorarios] = useState<HorarioMedico[]>([]);

  function abrirModal(medico?: MedicoAmbulatorio) {
    if (medico) {
      setMedicoEmEdicao(medico);
      setNome(medico.nome);
      setEspecialidade(medico.especialidade || "");
      setSala(medico.sala || "");
      setHorarios(medico.horarios || []);
    } else {
      setMedicoEmEdicao(null);
      setNome("");
      setEspecialidade("Cirurgia Geral");
      setSala("Consultório ");
      setHorarios([]);
    }
    setModalNovoMedico(true);
  }

  function toggleHorario(dia: DiaSemana, turno: TurnoAmbulatorio) {
    const existe = horarios.some((h) => h.dia === dia && h.turno === turno);
    if (existe) {
      setHorarios(horarios.filter((h) => !(h.dia === dia && h.turno === turno)));
    } else {
      setHorarios([...horarios, { dia, turno }]);
    }
  }

  function handleSalvarMedico(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    const novoMedico: MedicoAmbulatorio = {
      id: medicoEmEdicao?.id || `med-${Date.now()}`,
      nome: nome.trim(),
      especialidade: especialidade.trim() || undefined,
      sala: sala.trim() || undefined,
      horarios,
    };

    salvarMedico(novoMedico);
    setModalNovoMedico(false);
  }

  /**
   * REGRA OBRIGATÓRIA:
   * Em cada célula (dia + turno), a renderização da lista de médicos deve ser
   * SEMPRE classificada automaticamente em ordem alfabética.
   */
  function obterMedicosOrdenados(dia: DiaSemana, turno: TurnoAmbulatorio): MedicoAmbulatorio[] {
    const medicosNaCelula = ambulantes.filter((m) =>
      m.horarios?.some((h) => h.dia === dia && h.turno === turno)
    );

    return [...medicosNaCelula].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  return (
    <div className="space-y-6">
      {/* TOPO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Agenda Semanal de Ambulatórios Cirúrgicos
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
              Segunda a Sexta
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Escala médica por dia e turno com classificação alfabética estrita automática
          </p>
        </div>

        <button
          onClick={() => abrirModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Médico</span>
        </button>
      </div>

      {/* MATRIZ SEMANAL (SEGUNDA A SEXTA X MANHÃ E TARDE) */}
      <div className="glass-card rounded-2xl border border-slate-800 p-4 overflow-x-auto">
        <div className="min-w-[760px] space-y-4">
          <div className="grid grid-cols-5 gap-3 text-center border-b border-slate-800 pb-3">
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className="font-bold text-sm text-cyan-300">
                {dia}-Feira
              </div>
            ))}
          </div>

          {/* TURNOS */}
          {TURNOS.map((turno) => {
            const isManha = turno === "Manhã";
            const Icon = isManha ? Sun : Sunset;

            return (
              <div key={turno} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
                  <Icon className={`w-4 h-4 ${isManha ? "text-amber-400" : "text-orange-400"}`} />
                  <span>
                    Turno da {turno} {isManha ? "(07:00 às 12:00)" : "(13:00 às 18:00)"}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {DIAS_SEMANA.map((dia) => {
                    const medicosOrdenados = obterMedicosOrdenados(dia, turno);

                    return (
                      <div
                        key={`${dia}-${turno}`}
                        className="rounded-xl bg-slate-900/80 border border-slate-800/90 p-3 min-h-[140px] flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          {medicosOrdenados.length === 0 ? (
                            <span className="text-[11px] text-slate-600 italic block py-4 text-center">
                              Sem ambulatório
                            </span>
                          ) : (
                            medicosOrdenados.map((m) => (
                              <div
                                key={m.id}
                                className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-colors group"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-xs font-bold text-slate-100 line-clamp-1">
                                    {m.nome}
                                  </span>
                                  <button
                                    onClick={() => abrirModal(m)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-cyan-400 transition-opacity"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                                {m.especialidade && (
                                  <p className="text-[10px] text-cyan-400 line-clamp-1 mt-0.5">
                                    {m.especialidade}
                                  </p>
                                )}
                                {m.sala && (
                                  <p className="text-[9px] text-slate-500 line-clamp-1">{m.sala}</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        <span className="text-[9px] text-slate-500 text-right mt-2 block">
                          {medicosOrdenados.length} médico{medicosOrdenados.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LISTA COMPACTA DE MÉDICOS PARA GERENCIAMENTO */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-cyan-400" />
          <span>Corpo Clínico Cadastrado no Ambulatório ({ambulantes.length})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {ambulantes.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-white block">{m.nome}</span>
                <span className="text-[11px] text-slate-400 block">{m.especialidade || "Cirurgião"}</span>
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  {m.horarios?.map((h, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-medium"
                    >
                      {h.dia.slice(0, 3)} - {h.turno[0]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => abrirModal(m)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remover ${m.nome} do ambulatório?`)) {
                      removerMedico(m.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL CADASTRO / EDIÇÃO */}
      {modalNovoMedico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-card border border-cyan-500/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="text-base font-bold text-white">
                {medicoEmEdicao ? "Editar Médico Ambulatorial" : "Cadastrar Médico no Ambulatório"}
              </h4>
              <button
                onClick={() => setModalNovoMedico(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarMedico} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Médico *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Dr. Bernardo Silva"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Especialidade
                  </label>
                  <input
                    type="text"
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                    placeholder="Ex: Videolaparoscopia"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Consultório / Sala
                  </label>
                  <input
                    type="text"
                    value={sala}
                    onChange={(e) => setSala(e.target.value)}
                    placeholder="Ex: Consultório 103"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SELETOR DE HORÁRIOS */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Dias e Turnos de Atendimento
                </label>
                <div className="space-y-2">
                  {DIAS_SEMANA.map((dia) => (
                    <div
                      key={dia}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-300">{dia}</span>
                      <div className="flex items-center gap-2">
                        {TURNOS.map((turno) => {
                          const selecionado = horarios.some(
                            (h) => h.dia === dia && h.turno === turno
                          );
                          return (
                            <button
                              type="button"
                              key={turno}
                              onClick={() => toggleHorario(dia, turno)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                selecionado
                                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              {turno}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoMedico(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
                >
                  Salvar Médico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
