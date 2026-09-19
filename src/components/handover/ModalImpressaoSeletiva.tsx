"use client";

import React, { useState, useMemo } from "react";
import { PacientePassagem } from "@/types/hospital";
import { anonimizarNome } from "@/lib/lgpd";
import {
  calcularDDayAntibiotico,
  calcularIdade,
  calcularTempoInternacao,
  formatarCirurgiaDPO,
  obterCirurgiasPaciente,
} from "@/lib/antibiotic-engine";
import { formatarDataBR, obterDataLocalHoje } from "@/lib/utils";
import {
  Printer,
  X,
  CheckSquare,
  Square,
  Building2,
  Bed,
  Check,
  Layers,
  Heart,
  AlertTriangle,
  Scissors,
  Pill,
  ClipboardList,
  FileText,
  Compass,
} from "lucide-react";

interface Props {
  pacientes: PacientePassagem[];
  onClose: () => void;
}

export function ModalImpressaoSeletiva({ pacientes, onClose }: Props) {
  // Pacientes selecionados (por padrão, todos)
  const [pacientesSelecionados, setPacientesSelecionados] = useState<string[]>(
    pacientes.map((p) => p.id)
  );

  // Categorias clínicas selecionadas para o relatório A4
  const [categorias, setCategorias] = useState({
    sinaisVitais: true,
    alertas: true,
    cirurgias: true,
    hd: true,
    hda: true,
    exames: true,
    medicacoes: true,
    antibioticos: true,
    pendencias: true,
    evolucao: true,
    conduta: true,
  });

  // Agrupamento de pacientes por enfermaria com ordenação natural por leito
  const gruposEnfermarias = useMemo(() => {
    const map = new Map<string, PacientePassagem[]>();
    pacientes.forEach((p) => {
      const enf = p.enfermaria?.trim() || "Sem Enfermaria";
      if (!map.has(enf)) {
        map.set(enf, []);
      }
      map.get(enf)!.push(p);
    });

    // Ordenação natural de leitos em cada enfermaria (ex: 1, 2, 8, 10, 25, 305-B)
    map.forEach((lista) => {
      lista.sort((a, b) =>
        (a.leito || "").localeCompare(b.leito || "", undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    });

    return Array.from(map.entries()).map(([nome, lista]) => ({
      nome,
      pacientes: lista,
    }));
  }, [pacientes]);

  function togglePaciente(id: string) {
    if (pacientesSelecionados.includes(id)) {
      setPacientesSelecionados((prev) => prev.filter((pId) => pId !== id));
    } else {
      setPacientesSelecionados((prev) => [...prev, id]);
    }
  }

  function toggleEnfermaria(pacientesDaEnf: PacientePassagem[]) {
    const ids = pacientesDaEnf.map((p) => p.id);
    const todosSelecionados = ids.every((id) => pacientesSelecionados.includes(id));
    if (todosSelecionados) {
      setPacientesSelecionados((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setPacientesSelecionados((prev) => Array.from(new Set([...prev, ...ids])));
    }
  }

  function selecionarTodosPacientes() {
    setPacientesSelecionados(pacientes.map((p) => p.id));
  }

  function desmarcarTodosPacientes() {
    setPacientesSelecionados([]);
  }

  function marcarTodasCategorias() {
    setCategorias({
      sinaisVitais: true,
      alertas: true,
      cirurgias: true,
      hd: true,
      hda: true,
      exames: true,
      medicacoes: true,
      antibioticos: true,
      pendencias: true,
      evolucao: true,
      conduta: true,
    });
  }

  function desmarcarTodasCategorias() {
    setCategorias({
      sinaisVitais: false,
      alertas: false,
      cirurgias: false,
      hd: false,
      hda: false,
      exames: false,
      medicacoes: false,
      antibioticos: false,
      pendencias: false,
      evolucao: false,
      conduta: false,
    });
  }

  function handleImprimir() {
    setTimeout(() => {
      window.print();
    }, 150);
  }

  // Grupos filtrados apenas com pacientes selecionados para impressão
  const gruposParaImpressao = useMemo(() => {
    return gruposEnfermarias
      .map((g) => ({
        nome: g.nome,
        pacientes: g.pacientes.filter((p) => pacientesSelecionados.includes(p.id)),
      }))
      .filter((g) => g.pacientes.length > 0);
  }, [gruposEnfermarias, pacientesSelecionados]);

  const totalSelecionados = pacientesSelecionados.length;
  const dataHojeFormatada = formatarDataBR(obterDataLocalHoje());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in no-print">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* CABEÇALHO DO MODAL */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-sky-600" />
              <span>Impressão Seletiva de Passagem de Plantão</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha as enfermarias, pacientes e seções clínicas que constarão na folha de passagem A4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* SEÇÃO 1: CATEGORIAS CLÍNICAS */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span>Sinais e Seções Clínicas para Impressão</span>
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={marcarTodasCategorias}
                  className="text-sky-600 hover:text-sky-700 font-semibold hover:underline cursor-pointer"
                >
                  Marcar todas
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={desmarcarTodasCategorias}
                  className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  Desmarcar todas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "sinaisVitais", label: "Sinais Vitais", icon: Heart },
                { id: "alertas", label: "Alertas (Alergias/Contato)", icon: AlertTriangle },
                { id: "cirurgias", label: "Cirurgias & DPO", icon: Scissors },
                { id: "hd", label: "HD & Motivo", icon: FileText },
                { id: "hda", label: "HDA (História Atual)", icon: FileText },
                { id: "evolucao", label: "Evolução Clínica", icon: FileText },
                { id: "exames", label: "Exames Realizados", icon: FileText },
                { id: "medicacoes", label: "Medicações Gerais", icon: Pill },
                { id: "antibioticos", label: "Medicações / D-Day", icon: Pill },
                { id: "pendencias", label: "Pendências do Leito", icon: ClipboardList },
                { id: "conduta", label: "Conduta Proposta", icon: Compass },
              ].map((item) => {
                const ativo = (categorias as any)[item.id];
                const Icone = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() =>
                      setCategorias((prev) => ({
                        ...prev,
                        [item.id]: !(prev as any)[item.id],
                      }))
                    }
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer text-left ${
                      ativo
                        ? "bg-sky-50 border-sky-300 text-sky-900 shadow-xs"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {ativo ? (
                      <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <Icone className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 2: SELEÇÃO DE PACIENTES AGRUPADOS POR ENFERMARIA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Pacientes Selecionados ({totalSelecionados}/{pacientes.length})</span>
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selecionarTodosPacientes}
                  className="text-sky-600 hover:text-sky-700 font-semibold hover:underline cursor-pointer"
                >
                  Selecionar todos
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={desmarcarTodosPacientes}
                  className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  Desmarcar todos
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {gruposEnfermarias.map((grupo) => {
                const totalGrupo = grupo.pacientes.length;
                const selecionadosGrupo = grupo.pacientes.filter((p) =>
                  pacientesSelecionados.includes(p.id)
                ).length;
                const todosDoGrupoSelecionados =
                  totalGrupo > 0 && selecionadosGrupo === totalGrupo;

                return (
                  <div
                    key={grupo.nome}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
                  >
                    {/* CABEÇALHO DA ENFERMARIA */}
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <span className="text-xs font-bold text-slate-800">
                          {grupo.nome}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {selecionadosGrupo}/{totalGrupo}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleEnfermaria(grupo.pacientes)}
                        className="text-xs text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                      >
                        {todosDoGrupoSelecionados ? "Desmarcar enfermaria" : "Marcar enfermaria"}
                      </button>
                    </div>

                    {/* LISTA DE PACIENTES DA ENFERMARIA */}
                    <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {grupo.pacientes.map((p) => {
                        const isSel = pacientesSelecionados.includes(p.id);
                        const idade = calcularIdade(p.dataNascimento);
                        const cxs = obterCirurgiasPaciente(p);

                        return (
                          <div
                            key={p.id}
                            onClick={() => togglePaciente(p.id)}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSel
                                ? "bg-sky-50/50 border-sky-300 text-slate-900"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isSel ? (
                                <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span className="font-extrabold text-sky-700 text-[11px] px-1.5 py-0.5 rounded bg-sky-100/60 shrink-0">
                                {p.leito ? `LT ${p.leito}` : "-"}
                              </span>
                              <span className="font-semibold truncate">
                                {anonimizarNome(p.nome) || "Sem nome"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-[11px] text-slate-500">
                              {cxs.length > 0 ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                                  Cirúrgico ({cxs.length})
                                </span>
                              ) : (
                                <span className="text-slate-400">Clínico</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImprimir}
            disabled={totalSelecionados === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir ({totalSelecionados} {totalSelecionados === 1 ? "Paciente" : "Pacientes"})</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ÁREA DE IMPRESSÃO A4 OTIMIZADA (@media print)
          - Sem banner institucional volumoso tomando meia página
          - Cabeçalho ultra-compacto de 1 linha
          - Dividido por enfermaria e estritamente ordenado por leito
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden print:block print-container">
        {/* CABEÇALHO ULTRA-COMPACTO DE 1 LINHA */}
        <div className="print-header flex items-center justify-between pb-1.5 mb-2.5 border-b-2 border-black text-xs font-bold uppercase tracking-wider text-black">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold">PASSAGEM DE PLANTÃO</span>
            <span>—</span>
            <span>{dataHojeFormatada}</span>
          </div>
          <div className="text-[11px] font-semibold text-gray-800">
            {totalSelecionados} {totalSelecionados === 1 ? "PACIENTE SELECIONADO" : "PACIENTES SELECIONADOS"}
          </div>
        </div>

        {/* LISTAGEM AGRUPADA POR ENFERMARIA E ORDENADA POR LEITO */}
        <div className="space-y-3">
          {gruposParaImpressao.map((grupo) => (
            <div key={grupo.nome} className="space-y-1.5">
              {/* CABEÇALHO DE ENFERMARIA */}
              <div className="text-xs font-extrabold uppercase tracking-wider text-black bg-gray-100 border-l-4 border-black px-2 py-0.5 page-break-avoid">
                ENFERMARIA: {grupo.nome} ({grupo.pacientes.length} {grupo.pacientes.length === 1 ? "paciente" : "pacientes"})
              </div>

              {/* CARDS DOS PACIENTES */}
              <div className="space-y-2">
                {grupo.pacientes.map((p) => {
                  const idade = calcularIdade(p.dataNascimento);
                  const tempoInt = calcularTempoInternacao(p.dataAdmissao);
                  const cirurgias = obterCirurgiasPaciente(p);

                  return (
                    <div
                      key={p.id}
                      className="border border-gray-400 p-2.5 rounded-lg page-break-avoid space-y-1 text-xs bg-white text-black"
                    >
                      {/* LINHA 1: LEITO, NOME, IDADE, TEMPO DE INTERNAÇÃO E CIRURGIAS/DPO */}
                      <div className="border-b border-gray-300 pb-1 flex flex-wrap items-baseline justify-between gap-1.5">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="font-extrabold text-sm text-black">
                            [{p.leito ? `LT ${p.leito}` : "Sem Leito"}]
                          </span>
                          <span className="font-bold text-sm text-black">
                            {anonimizarNome(p.nome) || "Sem Nome"}
                          </span>
                          <span className="text-gray-600 text-[11px]">
                            ({idade !== "-" ? `${idade} • ` : ""}Internação: {tempoInt})
                          </span>
                        </div>

                        {categorias.cirurgias && (
                          <div className="flex flex-wrap items-center gap-1 text-xs">
                            {cirurgias.length > 0 ? (
                              cirurgias.map((cx) => {
                                const dpoStr = formatarCirurgiaDPO(
                                  true,
                                  cx.tipoCirurgia,
                                  cx.dataCirurgia,
                                  cx.dpoManual
                                );
                                return (
                                  <span key={cx.id} className="font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
                                    ✂ {dpoStr}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-gray-500 italic text-[11px]">Tratamento Clínico</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* LINHA 2: HD & MOTIVO DO INTERNAMENTO */}
                      {categorias.hd && (p.motivoInternamento || p.hd) && (
                        <div>
                          {p.motivoInternamento && (
                            <div>
                              <strong>Motivo:</strong> {p.motivoInternamento}
                            </div>
                          )}
                          {p.hd && (
                            <div>
                              <strong>HD:</strong> {p.hd}
                            </div>
                          )}
                        </div>
                      )}

                      {/* LINHA 3: HDA (HISTÓRIA DA DOENÇA ATUAL) */}
                      {categorias.hda && p.hda && (
                        <div>
                          <strong>HDA:</strong> {p.hda}
                        </div>
                      )}

                      {/* LINHA 4: ALERTAS (ALERGIA E PRECAUÇÃO DE CONTATO) */}
                      {categorias.alertas && (p.temAlergia || p.precaucaoContato) && (
                        <div className="text-amber-900 font-semibold flex items-center gap-2 flex-wrap">
                          {p.temAlergia && (
                            <span>⚠ Alergia: {p.descricaoAlergia || "Registrada"}</span>
                          )}
                          {p.temAlergia && p.precaucaoContato && <span>•</span>}
                          {p.precaucaoContato && <span>⚠ Precaução de Contato</span>}
                        </div>
                      )}

                      {/* LINHA 5: SINAIS VITAIS / EXAME CLÍNICO */}
                      {categorias.sinaisVitais && p.sinaisVitais && (
                        <div className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                          <strong>Exame Físico:</strong> FC: {p.sinaisVitais.fc || "-"} bpm | SatO2:{" "}
                          {p.sinaisVitais.satO2 || "-"}% | PA: {p.sinaisVitais.pa || "-"}
                          {p.sinaisVitais.tax ? ` | Tax: ${p.sinaisVitais.tax}ºC` : ""}
                        </div>
                      )}

                      {/* LINHA 6: EVOLUÇÃO CLÍNICA */}
                      {categorias.evolucao && p.evolucao && (
                        <div>
                          <strong>Evolução:</strong> {p.evolucao}
                        </div>
                      )}

                      {/* LINHA 7: EXAMES REALIZADOS */}
                      {categorias.exames && p.examesRealizados && (
                        <div>
                          <strong>Exames Realizados:</strong> {p.examesRealizados}
                        </div>
                      )}

                      {/* LINHA 8: MEDICAÇÕES GERAIS */}
                      {categorias.medicacoes && p.medicacoesUsoGeral && (
                        <div>
                          <strong>Medicações Gerais:</strong> {p.medicacoesUsoGeral}
                        </div>
                      )}

                      {/* LINHA 9: ANTIBIÓTICOS & D-DAY */}
                      {categorias.antibioticos && p.antibioticos && p.antibioticos.length > 0 && (
                        <div>
                          <strong>Medicações de Controle & D-Day:</strong>
                          <ul className="list-disc pl-4 mt-0.5">
                            {p.antibioticos.map((atb) => {
                              const res = calcularDDayAntibiotico(atb);
                              return (
                                <li key={atb.id}>
                                  <strong>{atb.nome}</strong> ({atb.dose} - {atb.frequenciaHoras}/
                                  {atb.frequenciaHoras}h) —{" "}
                                  <span className="font-bold">
                                    {res.rotuloDDay}/{atb.duracaoDias}d
                                  </span>{" "}
                                  ({res.mensagemStatus}, término: {res.dataTerminoFormatada})
                                  {atb.dosesPerdidas > 0 ? ` [${atb.dosesPerdidas} dose(s) perdida(s)]` : ""}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* LINHA 10: PENDÊNCIAS DO LEITO */}
                      {categorias.pendencias && p.pendencias && p.pendencias.length > 0 && (
                        <div>
                          <strong>Pendências do Leito:</strong>
                          <ul className="list-disc pl-4 mt-0.5">
                            {p.pendencias.map((pend, pIdx) => (
                              <li key={pIdx}>{pend}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* LINHA 11: CONDUTA PROPOSTA */}
                      {categorias.conduta && p.conduta && (
                        <div>
                          <strong>Conduta:</strong> {p.conduta}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

