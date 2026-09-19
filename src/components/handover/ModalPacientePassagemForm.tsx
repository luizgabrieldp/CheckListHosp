"use client";

import React, { useState } from "react";
import { PacientePassagem, PrescricaoAntibiotico } from "@/types/hospital";
import { obterDataLocalHoje } from "@/lib/utils";
import { X, Save, Plus, Trash2, Pill, Activity, Stethoscope } from "lucide-react";

interface Props {
  pacienteExistente?: PacientePassagem | null;
  onSalvar: (paciente: PacientePassagem) => void;
  onClose: () => void;
}

export function ModalPacientePassagemForm({ pacienteExistente, onSalvar, onClose }: Props) {
  const [nome, setNome] = useState(pacienteExistente?.nome || "");
  const [leito, setLeito] = useState(pacienteExistente?.leito || "");
  const [enfermaria, setEnfermaria] = useState(pacienteExistente?.enfermaria || "Cirurgia Geral 1");
  const [dataNascimento, setDataNascimento] = useState(pacienteExistente?.dataNascimento || "1980-01-01");
  const [dataAdmissao, setDataAdmissao] = useState(
    pacienteExistente?.dataAdmissao || obterDataLocalHoje()
  );
  const [hd, setHd] = useState(pacienteExistente?.hd || "");
  const [conduta, setConduta] = useState(pacienteExistente?.conduta || "");

  // Sinais vitais
  const [fc, setFc] = useState(pacienteExistente?.sinaisVitais?.fc?.toString() || "78");
  const [satO2, setSatO2] = useState(pacienteExistente?.sinaisVitais?.satO2?.toString() || "98");
  const [pa, setPa] = useState(pacienteExistente?.sinaisVitais?.pa || "120/80");

  // Pendências em texto livre (uma por linha)
  const [pendenciasTexto, setPendenciasTexto] = useState(
    pacienteExistente?.pendencias?.join("\n") || ""
  );

  // Antibióticos
  const [antibioticos, setAntibioticos] = useState<PrescricaoAntibiotico[]>(
    pacienteExistente?.antibioticos || []
  );

  function handleAdicionarAntibiotico() {
    const novoAtb: PrescricaoAntibiotico = {
      id: `atb-${Date.now()}`,
      nome: "Ceftriaxona",
      dose: "1g IV",
      frequenciaHoras: 12,
      horarioPrimeiraDose: "08:00",
      dataInicio: obterDataLocalHoje(),
      duracaoDias: 7,
      dosesPerdidas: 0,
      observacao: "",
    };
    setAntibioticos([...antibioticos, novoAtb]);
  }

  function handleAtualizarAtb(index: number, campo: keyof PrescricaoAntibiotico, valor: any) {
    const lista = [...antibioticos];
    lista[index] = { ...lista[index], [campo]: valor };
    setAntibioticos(lista);
  }

  function handleRemoverAtb(index: number) {
    const lista = [...antibioticos];
    lista.splice(index, 1);
    setAntibioticos(lista);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !leito.trim()) return;

    const pendencias = pendenciasTexto
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const pacienteSalvo: PacientePassagem = {
      id: pacienteExistente?.id || `pass-${Date.now()}`,
      nome: nome.trim(),
      leito: leito.trim(),
      enfermaria,
      dataNascimento: dataNascimento || undefined,
      dataAdmissao,
      hd: hd.trim(),
      conduta: conduta.trim(),
      pendencias,
      sinaisVitais: {
        fc: parseInt(fc, 10) || 75,
        satO2: parseInt(satO2, 10) || 98,
        pa: pa.trim(),
      },
      antibioticos,
      createdAt: pacienteExistente?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSalvar(pacienteSalvo);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6 animate-in fade-in">
      <div className="w-full max-w-3xl rounded-2xl glass-card border border-cyan-500/40 p-5 md:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {pacienteExistente ? "Editar Paciente na Passagem" : "Adicionar Paciente à Passagem"}
              </h3>
              <p className="text-xs text-slate-400">Dados clínicos e prescrição detalhada de antibioticoterapia</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white cursor-pointer -mr-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* IDENTIFICAÇÃO BÁSICA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="h-6 flex items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Nome do Paciente *
                </label>
              </div>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo de Oliveira"
                className="w-full h-[40px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="h-6 flex items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Leito *
                </label>
              </div>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                value={leito}
                onChange={(e) => setLeito(e.target.value.replace(/\D/g, ""))}
                placeholder="Ex: 08"
                className="w-full h-[40px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="h-6 flex items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Enfermaria
                </label>
              </div>
              <select
                value={enfermaria}
                onChange={(e) => setEnfermaria(e.target.value)}
                className="w-full h-[40px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="Cirurgia Geral 1">Cirurgia Geral 1</option>
                <option value="Cirurgia Geral 2">Cirurgia Geral 2</option>
                <option value="Enfermaria Especialidades">Enfermaria Especialidades</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data de Nascimento (Cálculo de Idade)
              </label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data de Admissão (Cálculo de D-Day Internação) *
              </label>
              <input
                type="date"
                required
                value={dataAdmissao}
                onChange={(e) => setDataAdmissao(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Hipótese Diagnóstica (HD) / Cirurgia Realizada *
            </label>
            <input
              type="text"
              required
              value={hd}
              onChange={(e) => setHd(e.target.value)}
              placeholder="Ex: PO 3 Apendicectomia por apendicite complicada"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* SINAIS VITAIS */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Sinais Vitais do Round
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">FC (bpm)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={fc}
                  onChange={(e) => setFc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">SatO2 (%)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={satO2}
                  onChange={(e) => setSatO2(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">PA (mmHg)</label>
                <input
                  type="text"
                  value={pa}
                  onChange={(e) => setPa(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* MOTOR DE ANTIBIOTICOTERAPIA */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Prescrições de Antibióticos ({antibioticos.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleAdicionarAntibiotico}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Antibiótico</span>
              </button>
            </div>

            {antibioticos.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Nenhum antibiótico prescrito para este paciente.
              </p>
            ) : (
              <div className="space-y-3">
                {antibioticos.map((atb, index) => (
                  <div
                    key={atb.id || index}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400">
                        Antibiótico #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoverAtb(index)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">Nome do ATB</label>
                        <input
                          type="text"
                          required
                          value={atb.nome}
                          onChange={(e) => handleAtualizarAtb(index, "nome", e.target.value)}
                          placeholder="Ex: Ceftriaxona"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">Dose</label>
                        <input
                          type="text"
                          required
                          value={atb.dose}
                          onChange={(e) => handleAtualizarAtb(index, "dose", e.target.value)}
                          placeholder="Ex: 1g IV ou 500mg VO"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">
                          Frequência (Horas)
                        </label>
                        <select
                          value={atb.frequenciaHoras}
                          onChange={(e) =>
                            handleAtualizarAtb(index, "frequenciaHoras", parseInt(e.target.value, 10))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                        >
                          <option value={6}>6/6h (4 doses/dia)</option>
                          <option value={8}>8/8h (3 doses/dia)</option>
                          <option value={12}>12/12h (2 doses/dia)</option>
                          <option value={24}>24/24h (1 dose/dia)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">Data Início</label>
                        <input
                          type="date"
                          value={atb.dataInicio}
                          onChange={(e) => handleAtualizarAtb(index, "dataInicio", e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">
                          Hora 1ª Dose
                        </label>
                        <input
                          type="time"
                          value={atb.horarioPrimeiraDose}
                          onChange={(e) =>
                            handleAtualizarAtb(index, "horarioPrimeiraDose", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-0.5">
                          Duração (Dias)
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={1}
                          max={30}
                          value={atb.duracaoDias}
                          onChange={(e) =>
                            handleAtualizarAtb(index, "duracaoDias", parseInt(e.target.value, 10) || 7)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-rose-300 font-semibold mb-0.5">
                          Doses Perdidas
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={0}
                          value={atb.dosesPerdidas}
                          onChange={(e) =>
                            handleAtualizarAtb(index, "dosesPerdidas", parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-rose-950/20 border border-rose-500/40 text-rose-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pendências do Paciente (Uma por linha)
            </label>
            <textarea
              rows={2}
              value={pendenciasTexto}
              onChange={(e) => setPendenciasTexto(e.target.value)}
              placeholder="Ex:&#10;Checar TC de abdome&#10;Aguardar leucograma"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-cyan-300 mb-1">
              Conduta Cirúrgica Proposta
            </label>
            <textarea
              rows={2}
              value={conduta}
              onChange={(e) => setConduta(e.target.value)}
              placeholder="Ex: Manter esquema de ATB, programar alta amanhã se afebril."
              className="w-full px-3 py-2 rounded-xl bg-cyan-950/20 border border-cyan-500/40 text-white text-xs focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-3 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center"
            >
              Salvar Paciente na Passagem
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
