"use client";

import React, { useState } from "react";
import { PacientePassagem } from "@/types/hospital";
import { anonimizarNome } from "@/lib/lgpd";
import { calcularDDayAntibiotico, calcularIdade, calcularTempoInternacao } from "@/lib/antibiotic-engine";
import { formatarDataBR } from "@/lib/utils";
import { Printer, X, CheckSquare, Square, Check } from "lucide-react";

interface Props {
  pacientes: PacientePassagem[];
  onClose: () => void;
}

export function ModalImpressaoSeletiva({ pacientes, onClose }: Props) {
  // Pacientes selecionados (por padrão, todos)
  const [pacientesSelecionados, setPacientesSelecionados] = useState<string[]>(
    pacientes.map((p) => p.id)
  );

  // Categorias clínicas selecionadas para o relatório
  const [categorias, setCategorias] = useState({
    hd: true,
    antibioticos: true,
    sinaisVitais: true,
    pendencias: true,
    conduta: true,
  });

  function togglePaciente(id: string) {
    if (pacientesSelecionados.includes(id)) {
      setPacientesSelecionados(pacientesSelecionados.filter((pId) => pId !== id));
    } else {
      setPacientesSelecionados([...pacientesSelecionados, id]);
    }
  }

  function handleImprimir() {
    setTimeout(() => {
      window.print();
    }, 150);
  }

  const pacientesFiltrados = pacientes.filter((p) => pacientesSelecionados.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl glass-card border border-cyan-500/40 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Impressão Seletiva de Passagem de Plantão</h3>
            <p className="text-xs text-slate-400">
              Escolha os pacientes e as seções clínicas que constarão na folha de passagem A4
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* CATEGORIAS CLÍNICAS */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Categorias Clínicas para Impressão
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "hd", label: "Hipótese Diagnóstica (HD)" },
                { id: "antibioticos", label: "Antibioticoterapia & D-Day" },
                { id: "sinaisVitais", label: "Sinais Vitais" },
                { id: "pendencias", label: "Pendências da Enfermaria" },
                { id: "conduta", label: "Conduta Proposta" },
              ].map((c) => {
                const ativo = (categorias as any)[c.id];
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() =>
                      setCategorias((prev) => ({ ...prev, [c.id]: !(prev as any)[c.id] }))
                    }
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      ativo
                        ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    {ativo ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELEÇÃO DE PACIENTES */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pacientes Selecionados ({pacientesSelecionados.length}/{pacientes.length})
              </h4>
              <button
                onClick={() => {
                  if (pacientesSelecionados.length === pacientes.length) {
                    setPacientesSelecionados([]);
                  } else {
                    setPacientesSelecionados(pacientes.map((p) => p.id));
                  }
                }}
                className="text-xs text-cyan-400 hover:underline"
              >
                {pacientesSelecionados.length === pacientes.length
                  ? "Desmarcar todos"
                  : "Selecionar todos"}
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {pacientes.map((p) => {
                const isSel = pacientesSelecionados.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePaciente(p.id)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSel
                        ? "bg-slate-800/90 border-cyan-500/40 text-white"
                        : "bg-slate-900/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isSel ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-cyan-300 mr-2">{p.leito}</span>
                        <span>{anonimizarNome(p.nome)}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400">{p.enfermaria}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Fechar
          </button>
          <button
            onClick={handleImprimir}
            disabled={pacientesSelecionados.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Passagem Selecionada</span>
          </button>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO A4 FORMATAÇÃO LIMPA */}
      <div className="hidden print:block print-container">
        <div className="print-header">
          <h1 className="text-xl font-bold">HOSPITAL REGIONAL - PASSAGEM DE PLANTÃO CIRÚRGICO</h1>
          <h2 className="text-sm font-semibold text-gray-700">
            RELATÓRIO DE PACIENTES INTERNADOS - DATA: {new Date().toLocaleDateString("pt-BR")}
          </h2>
          <p className="text-[10px] text-gray-500">
            Documento confidencial da equipe de enfermarias cirúrgicas. Anonimização LGPD aplicada.
          </p>
        </div>

        <div className="space-y-4">
          {pacientesFiltrados.map((p) => {
            const idade = calcularIdade(p.dataNascimento);
            const tempoInt = calcularTempoInternacao(p.dataAdmissao);

            return (
              <div
                key={p.id}
                className="border border-gray-400 p-3 rounded page-break-avoid space-y-2 text-xs"
              >
                <div className="flex justify-between items-center border-b border-gray-300 pb-1">
                  <div>
                    <span className="font-bold text-sm mr-2">[{p.leito}]</span>
                    <span className="font-bold">{anonimizarNome(p.nome)}</span>
                    <span className="text-gray-600 ml-2">
                      ({idade} • Internação: {tempoInt})
                    </span>
                  </div>
                  <div className="text-gray-600 font-medium">{p.enfermaria}</div>
                </div>

                {categorias.hd && (
                  <div>
                    <strong>HD:</strong> {p.hd}
                  </div>
                )}

                {categorias.sinaisVitais && p.sinaisVitais && (
                  <div>
                    <strong>Sinais Vitais:</strong> FC: {p.sinaisVitais.fc || "-"} bpm | SatO2:{" "}
                    {p.sinaisVitais.satO2 || "-"}% | PA: {p.sinaisVitais.pa || "-"}
                  </div>
                )}

                {categorias.antibioticos && p.antibioticos && p.antibioticos.length > 0 && (
                  <div>
                    <strong>Antibioticoterapia:</strong>
                    <ul className="list-disc pl-4 mt-0.5">
                      {p.antibioticos.map((atb) => {
                        const res = calcularDDayAntibiotico(atb);
                        return (
                          <li key={atb.id}>
                            <strong>{atb.nome}</strong> ({atb.dose} - {atb.frequenciaHoras}/{atb.frequenciaHoras}h) -{" "}
                            <span className="font-bold">{res.rotuloDDay}/{atb.duracaoDias}d</span> -{" "}
                            {res.mensagemStatus} (Término prev.: {res.dataTerminoFormatada})
                            {atb.dosesPerdidas > 0 ? ` [${atb.dosesPerdidas} dose(s) perdida(s)]` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {categorias.pendencias && p.pendencias && p.pendencias.length > 0 && (
                  <div>
                    <strong>Pendências:</strong>
                    <ul className="list-disc pl-4 mt-0.5">
                      {p.pendencias.map((pend, i) => (
                        <li key={i}>{pend}</li>
                      ))}
                    </ul>
                  </div>
                )}

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
    </div>
  );
}
