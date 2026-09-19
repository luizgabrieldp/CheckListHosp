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
  Stethoscope,
  Building2,
  ArrowRightLeft,
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
   * SEMPRE classificada automaticamente em ordem alfabética estrita.
   */
  function obterMedicosOrdenados(dia: DiaSemana, turno: TurnoAmbulatorio): MedicoAmbulatorio[] {
    const medicosNaCelula = ambulantes.filter((m) =>
      m.horarios?.some((h) => h.dia === dia && h.turno === turno)
    );

    return [...medicosNaCelula].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
  }

  /**
   * REGRA OBRIGATÓRIA:
   * A lista inferior ("Corpo Clínico Cadastrado") também deve ser
   * SEMPRE classificada automaticamente em ordem alfabética estrita.
   */
  const medicosCadastradosOrdenados = [...ambulantes].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* TOPO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            Agenda Semanal de Ambulatórios
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold">
              Segunda a Sexta
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Escala médica por dia e turno com classificação em ordem alfabética automática
          </p>
        </div>

        <button
          onClick={() => abrirModal()}
          className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Médico</span>
        </button>
      </div>

      {/* DICA DE ROLAGEM HORIZONTAL PARA MOBILE E TABLET */}
      <div className="lg:hidden flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 w-fit">
        <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Deslize horizontalmente para visualizar toda a semana</span>
      </div>

      {/* MATRIZ SEMANAL (SEGUNDA A SEXTA X MANHÃ E TARDE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 overflow-x-auto">
        <div className="min-w-[780px] space-y-4">
          {/* CABEÇALHO DOS DIAS */}
          <div className="grid grid-cols-5 gap-3 text-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className="font-bold text-xs uppercase tracking-wide text-slate-700">
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
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 pl-1">
                  <Icon className={`w-4 h-4 ${isManha ? "text-amber-500" : "text-orange-500"}`} />
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
                        className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-2.5 min-h-[140px] flex flex-col justify-between transition-colors hover:border-slate-300"
                      >
                        <div className="space-y-1.5">
                          {medicosOrdenados.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic block py-4 text-center">
                              Sem ambulatório
                            </span>
                          ) : (
                            medicosOrdenados.map((m) => (
                              <div
                                key={m.id}
                                className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all group"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                                    {m.nome}
                                  </span>
                                  <button
                                    onClick={() => abrirModal(m)}
                                    title="Editar médico"
                                    className="opacity-80 sm:opacity-60 group-hover:opacity-100 text-slate-400 hover:text-emerald-600 transition-opacity min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                  </button>
                                </div>
                                {m.especialidade && (
                                  <p className="text-[10px] font-semibold text-emerald-700 line-clamp-1 mt-0.5">
                                    {m.especialidade}
                                  </p>
                                )}
                                {m.sala && (
                                  <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5 flex items-center gap-1">
                                    <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span>{m.sala}</span>
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        <span className="text-[9px] font-medium text-slate-400 text-right mt-2 block">
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

      {/* LISTAGEM GERAL DE MÉDICOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Quadro Geral do Corpo Clínico</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
              {medicosCadastradosOrdenados.length} {medicosCadastradosOrdenados.length === 1 ? "médico" : "médicos"}
            </span>
          </h3>
        </div>

        {medicosCadastradosOrdenados.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            Nenhum médico cadastrado no ambulatório até o momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {medicosCadastradosOrdenados.map((m: MedicoAmbulatorio) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition-colors flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{m.nome}</h4>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {m.especialidade || "Cirurgião"} {m.sala ? `• ${m.sala}` : ""}
                  </span>

                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    {m.horarios?.length ? (
                      m.horarios.map((h, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold"
                        >
                          {h.dia.slice(0, 3)} - {h.turno[0]}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sem turno escalado</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button
                    onClick={() => abrirModal(m)}
                    title="Editar médico"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover ${m.nome} do ambulatório?`)) {
                        removerMedico(m.id);
                      }
                    }}
                    title="Excluir médico"
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CADASTRO / EDIÇÃO */}
      {modalNovoMedico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <h4 className="text-base font-bold text-slate-900">
                {medicoEmEdicao ? "Editar Médico Ambulatorial" : "Cadastrar Médico no Ambulatório"}
              </h4>
              <button
                type="button"
                onClick={() => setModalNovoMedico(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer -mr-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarMedico} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Médico *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Dr. Bernardo Silva"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Especialidade
                  </label>
                  <input
                    type="text"
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                    placeholder="Ex: Videolaparoscopia"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consultório / Sala
                  </label>
                  <input
                    type="text"
                    value={sala}
                    onChange={(e) => setSala(e.target.value)}
                    placeholder="Ex: Consultório 103"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* SELETOR DE HORÁRIOS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Dias e Turnos de Atendimento
                </label>
                <div className="space-y-2">
                  {DIAS_SEMANA.map((dia) => (
                    <div
                      key={dia}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap"
                    >
                      <span className="text-xs font-bold text-slate-800">{dia}</span>
                      <div className="flex items-center gap-1.5">
                        {TURNOS.map((turno) => {
                          const selecionado = horarios.some(
                            (h) => h.dia === dia && h.turno === turno
                          );
                          return (
                            <button
                              type="button"
                              key={turno}
                              onClick={() => toggleHorario(dia, turno)}
                              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
                                selecionado
                                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                                  : "bg-slate-200/80 text-slate-700 hover:bg-slate-300/80"
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

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalNovoMedico(false)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
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
