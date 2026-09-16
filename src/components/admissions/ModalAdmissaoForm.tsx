"use client";

import React, { useState } from "react";
import { AdmissaoPaciente, StatusAdmissao } from "@/types/hospital";
import {
  X,
  Save,
  Lock,
  Unlock,
  AlertTriangle,
  Stethoscope,
  FileText,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

interface Props {
  pacienteExistente?: AdmissaoPaciente | null;
  onSalvar: (paciente: AdmissaoPaciente) => void;
  onClose: () => void;
}

export function ModalAdmissaoForm({ pacienteExistente, onSalvar, onClose }: Props) {
  const [nome, setNome] = useState(pacienteExistente?.nome || "");
  const [enfermaria, setEnfermaria] = useState(pacienteExistente?.enfermaria || "Cirurgia Geral 1");
  const [leito, setLeito] = useState(pacienteExistente?.leito || "");
  const [dataAdmissaoAgendada, setDataAdmissaoAgendada] = useState(
    pacienteExistente?.dataAdmissaoAgendada || new Date().toISOString().split("T")[0]
  );
  const [dataNascimento, setDataNascimento] = useState(pacienteExistente?.dataNascimento || "");
  const [status, setStatus] = useState<StatusAdmissao>(pacienteExistente?.status || "Aguardando");
  const [cancelada, setCancelada] = useState(pacienteExistente?.cancelada || false);
  const [historiaFinalizada, setHistoriaFinalizada] = useState(
    pacienteExistente?.historiaFinalizada || false
  );

  // Histórico Clínico
  const [hd, setHd] = useState(pacienteExistente?.historicoClinico?.hd || "");
  const [hda, setHda] = useState(pacienteExistente?.historicoClinico?.hda || "");
  const [alergias, setAlergias] = useState(
    pacienteExistente?.historicoClinico?.antecedentes?.alergias || ""
  );
  const [comorbidades, setComorbidades] = useState(
    pacienteExistente?.historicoClinico?.antecedentes?.comorbidades || ""
  );
  const [cirurgiasPrevias, setCirurgiasPrevias] = useState(
    pacienteExistente?.historicoClinico?.antecedentes?.cirurgiasPrevias || ""
  );
  const [habitos, setHabitos] = useState(
    pacienteExistente?.historicoClinico?.antecedentes?.habitos || ""
  );
  const [hfMotx, setHfMotx] = useState(
    pacienteExistente?.historicoClinico?.antecedentes?.hfMotx || ""
  );
  const [muc, setMuc] = useState(
    pacienteExistente?.historicoClinico?.antecedentes?.muc || ""
  );
  const [exameFisico, setExameFisico] = useState(
    pacienteExistente?.historicoClinico?.exameFisico || ""
  );
  const [examesComplementares, setExamesComplementares] = useState(
    pacienteExistente?.historicoClinico?.examesComplementares || ""
  );
  const [conduta, setConduta] = useState(
    pacienteExistente?.historicoClinico?.conduta || ""
  );

  const [secaoAtiva, setSecaoAtiva] = useState<"geral" | "historia" | "antecedentes" | "exames">("geral");

  const isBloqueado = historiaFinalizada;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    const novoOuAtualizado: AdmissaoPaciente = {
      id: pacienteExistente?.id || `adm-${Date.now()}`,
      nome: nome.trim(),
      enfermaria,
      leito: leito.trim(),
      dataAdmissaoAgendada,
      dataNascimento: dataNascimento || undefined,
      status,
      cancelada,
      historiaFinalizada,
      historicoClinico: {
        hd: hd.trim(),
        hda: hda.trim(),
        antecedentes: {
          alergias: alergias.trim(),
          comorbidades: comorbidades.trim(),
          cirurgiasPrevias: cirurgiasPrevias.trim(),
          habitos: habitos.trim(),
          hfMotx: hfMotx.trim(),
          muc: muc.trim(),
        },
        exameFisico: exameFisico.trim(),
        examesComplementares: examesComplementares.trim(),
        conduta: conduta.trim(),
      },
      ordemImpressao: pacienteExistente?.ordemImpressao,
      createdAt: pacienteExistente?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSalvar(novoOuAtualizado);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl glass-card border border-cyan-500/40 p-5 md:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {pacienteExistente ? "Editar Admissão Cirúrgica" : "Nova Admissão Cirúrgica"}
                {isBloqueado && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> História Travada
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Dados cadastrais e anamnese médica da enfermaria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALERTA SE TRAVADO */}
        {isBloqueado && (
          <div className="my-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Esta história foi marcada como <strong>finalizada</strong> para evitar alterações acidentais.</span>
            </div>
            <button
              type="button"
              onClick={() => setHistoriaFinalizada(false)}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1"
            >
              <Unlock className="w-3 h-3" />
              <span>Destravar Edição</span>
            </button>
          </div>
        )}

        {/* ABAS DE NAVEGAÇÃO INTERNA */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 py-2.5 overflow-x-auto scrollbar-none">
          {[
            { id: "geral", label: "Identificação & Status" },
            { id: "historia", label: "HD & HDA" },
            { id: "antecedentes", label: "Antecedentes & MUC" },
            { id: "exames", label: "Exames & Conduta" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSecaoAtiva(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                secaoAtiva === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* SEÇÃO 1: GERAL */}
          {secaoAtiva === "geral" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome Completo do Paciente *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isBloqueado}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João Carlos Silva Santos"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Data Agendada da Admissão * (Referência LGPD)
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isBloqueado}
                    value={dataAdmissaoAgendada}
                    onChange={(e) => setDataAdmissaoAgendada(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Enfermaria
                  </label>
                  <select
                    disabled={isBloqueado}
                    value={enfermaria}
                    onChange={(e) => setEnfermaria(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value="Cirurgia Geral 1">Cirurgia Geral 1</option>
                    <option value="Cirurgia Geral 2">Cirurgia Geral 2</option>
                    <option value="Enfermaria Especialidades">Enfermaria Especialidades</option>
                    <option value="Hospital Dia / Observação">Hospital Dia / Observação</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Leito
                  </label>
                  <input
                    type="text"
                    disabled={isBloqueado}
                    value={leito}
                    onChange={(e) => setLeito(e.target.value)}
                    placeholder="Ex: Leito 03"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Data de Nascimento (Opcional)
                  </label>
                  <input
                    type="date"
                    disabled={isBloqueado}
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Status da Admissão
                  </label>
                  <select
                    disabled={isBloqueado}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusAdmissao)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value="Aguardando">Aguardando</option>
                    <option value="Chegou">Chegou</option>
                    <option value="Internou">Internou</option>
                    <option value="AIH">AIH (Autorizada)</option>
                    <option value="Alta/ADM">Alta / ADM</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-rose-500/40 transition-colors">
                    <input
                      type="checkbox"
                      disabled={isBloqueado}
                      checked={cancelada}
                      onChange={(e) => setCancelada(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500/40 bg-slate-800 border-slate-700"
                    />
                    <div>
                      <span className="text-xs font-semibold text-rose-300 block">Admissão Cancelada</span>
                      <span className="text-[11px] text-slate-400">Suspender cirurgia/leito sem deletar</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 2: HISTÓRIA CLÍNICA */}
          {secaoAtiva === "historia" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hipótese Diagnóstica (HD) *
                </label>
                <input
                  type="text"
                  disabled={isBloqueado}
                  value={hd}
                  onChange={(e) => setHd(e.target.value)}
                  placeholder="Ex: Colecistite Crônica Calculosa sintomática"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  História da Doença Atual (HDA)
                </label>
                <textarea
                  rows={5}
                  disabled={isBloqueado}
                  value={hda}
                  onChange={(e) => setHda(e.target.value)}
                  placeholder="Descreva o quadro clínico, início dos sintomas, evolução..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          )}

          {/* SEÇÃO 3: ANTECEDENTES */}
          {secaoAtiva === "antecedentes" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-rose-400 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Alergias Medicamentosas / Alimentares
                </label>
                <input
                  type="text"
                  disabled={isBloqueado}
                  value={alergias}
                  onChange={(e) => setAlergias(e.target.value)}
                  placeholder="Ex: Dipirona (choque anafilático), Penicilina..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-rose-950/20 border border-rose-500/50 text-rose-100 placeholder-rose-400/50 text-sm focus:border-rose-400 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Comorbidades
                  </label>
                  <input
                    type="text"
                    disabled={isBloqueado}
                    value={comorbidades}
                    onChange={(e) => setComorbidades(e.target.value)}
                    placeholder="Ex: HAS, DM2, Asma..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Cirurgias Prévias
                  </label>
                  <input
                    type="text"
                    disabled={isBloqueado}
                    value={cirurgiasPrevias}
                    onChange={(e) => setCirurgiasPrevias(e.target.value)}
                    placeholder="Ex: Apendicectomia há 5 anos, Cesárea..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Medicamentos de Uso Contínuo (MUC)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isBloqueado}
                    value={muc}
                    onChange={(e) => setMuc(e.target.value)}
                    placeholder="Ex: Losartana 50mg 1x/dia, Metformina 850mg..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hábitos e Histórico Familiar
                  </label>
                  <textarea
                    rows={2}
                    disabled={isBloqueado}
                    value={habitos}
                    onChange={(e) => setHabitos(e.target.value)}
                    placeholder="Ex: Ex-tabagista, nega etilismo. HF de neoplasia colorretal..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 4: EXAMES & CONDUTA */}
          {secaoAtiva === "exames" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Exame Físico Dirigido
                </label>
                <textarea
                  rows={3}
                  disabled={isBloqueado}
                  value={exameFisico}
                  onChange={(e) => setExameFisico(e.target.value)}
                  placeholder="BEG, anictérico, abdome flácido, indolor, RHA presentes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Exames Complementares (Laboratório e Imagem)
                </label>
                <textarea
                  rows={3}
                  disabled={isBloqueado}
                  value={examesComplementares}
                  onChange={(e) => setExamesComplementares(e.target.value)}
                  placeholder="USG: Colelitíase calculosa. Hb: 13.5, Leucócitos: 6.800..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-300 mb-1.5">
                  Conduta Cirúrgica Proposta
                </label>
                <textarea
                  rows={3}
                  disabled={isBloqueado}
                  value={conduta}
                  onChange={(e) => setConduta(e.target.value)}
                  placeholder="Programada colecistectomia VLP para amanhã. Jejum a partir das 00:00..."
                  className="w-full px-3.5 py-2 rounded-xl bg-cyan-950/20 border border-cyan-500/40 text-white text-sm focus:border-cyan-400 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          )}

          {/* CHECKBOX TRAVA DE HISTÓRIA */}
          <div className="pt-3 border-t border-slate-800">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={historiaFinalizada}
                onChange={(e) => setHistoriaFinalizada(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/40 bg-slate-800 border-slate-700"
              />
              <div>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  História Finalizada (Trava de Segurança)
                </span>
                <span className="text-[11px] text-slate-400">
                  Bloqueia edições acidentais por outros membros da equipe. Pode ser destravada a qualquer momento.
                </span>
              </div>
            </label>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Admissão</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
