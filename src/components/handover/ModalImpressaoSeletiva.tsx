"use client";

import React, { useState, useMemo, useRef } from "react";
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
import { imprimirElementoIsolado } from "@/lib/printUtils";
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
  Loader2,
} from "lucide-react";

interface Props {
  pacientes: PacientePassagem[];
  onClose: () => void;
}

export function ModalImpressaoSeletiva({ pacientes, onClose }: Props) {
  // Referência para extração isolada da folha A4 e controle de clique duplo
  const folhaA4Ref = useRef<HTMLDivElement>(null);
  const [isImprimindo, setIsImprimindo] = useState(false);

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

  async function handleImprimir() {
    if (isImprimindo) return;
    if (!folhaA4Ref.current) {
      window.print();
      return;
    }

    setIsImprimindo(true);
    try {
      await imprimirElementoIsolado(
        folhaA4Ref.current,
        `Passagem de Plantão — ${dataHojeFormatada}`
      );
    } catch (err) {
      console.error("[ModalImpressaoSeletiva] Erro na impressão isolada:", err);
      window.print();
    } finally {
      setIsImprimindo(false);
    }
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
    <>
      {/* DIÁLOGO INTERATIVO DE SELEÇÃO - VISÍVEL APENAS NA TELA (TOTALMENTE OCULTO NA IMPRESSÃO) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in no-print print:hidden">
        <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh]">
          {/* CABEÇALHO DO MODAL */}
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 shrink-0 gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-sky-600 shrink-0" />
              <span>Impressão Seletiva de Passagem</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha as enfermarias, pacientes e seções clínicas para a folha A4
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
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
                    className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer text-left ${
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
                            className={`min-h-[44px] p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
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

        {/* RODAPÉ DO MODAL (SHRINK-0 E RESPONSIVO) */}
        <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImprimir}
            disabled={totalSelecionados === 0 || isImprimindo}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            {isImprimindo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Abrindo Impressão...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Imprimir ({totalSelecionados} {totalSelecionados === 1 ? "Paciente" : "Pacientes"})</span>
              </>
            )}
          </button>
        </div>
      </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ÁREA DE IMPRESSÃO A4 OTIMIZADA (@media print)
          - Fora de qualquer container .no-print
          - Sem banner institucional volumoso tomando meia página
          - Cabeçalho ultra-compacto de 1 linha
          - Dividido por enfermaria e estritamente ordenado por leito
      ────────────────────────────────────────────────────────────── */}
      <div ref={folhaA4Ref} className="hidden print:block print-container">
        {/* CABEÇALHO ULTRA-COMPACTO DE 1 LINHA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "6px",
            marginBottom: "10px",
            borderBottom: "2px solid #000000",
            fontSize: "12px",
            fontWeight: "bold",
            textTransform: "uppercase",
            color: "#000000",
          }}
          className="print-header flex items-center justify-between pb-1.5 mb-2.5 border-b-2 border-black text-xs font-bold uppercase tracking-wider text-black"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="flex items-center gap-2">
            <span style={{ fontSize: "14px", fontWeight: "800" }} className="text-sm font-extrabold">PASSAGEM DE PLANTÃO</span>
            <span>—</span>
            <span>{dataHojeFormatada}</span>
          </div>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#1f2937" }} className="text-[11px] font-semibold text-gray-800">
            {totalSelecionados} {totalSelecionados === 1 ? "PACIENTE SELECIONADO" : "PACIENTES SELECIONADOS"}
          </div>
        </div>

        {/* LISTAGEM AGRUPADA POR ENFERMARIA E ORDENADA POR LEITO */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }} className="space-y-3">
          {gruposParaImpressao.map((grupo) => (
            <div key={grupo.nome} style={{ display: "flex", flexDirection: "column", gap: "6px" }} className="space-y-1.5">
              {/* CABEÇALHO DE ENFERMARIA */}
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "#000000",
                  backgroundColor: "#f3f4f6",
                  borderLeft: "4px solid #000000",
                  padding: "4px 8px",
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                }}
                className="text-xs font-extrabold uppercase tracking-wider text-black bg-gray-100 border-l-4 border-black px-2 py-0.5 page-break-avoid"
              >
                ENFERMARIA: {grupo.nome} ({grupo.pacientes.length} {grupo.pacientes.length === 1 ? "paciente" : "pacientes"})
              </div>

              {/* CARDS DOS PACIENTES */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className="space-y-2">
                {grupo.pacientes.map((p) => {
                  const idade = calcularIdade(p.dataNascimento);
                  const tempoInt = calcularTempoInternacao(p.dataAdmissao);
                  const cirurgias = obterCirurgiasPaciente(p);

                  return (
                    <div
                      key={p.id}
                      style={{
                        border: "1px solid #9ca3af",
                        borderRadius: "10px",
                        padding: "12px",
                        pageBreakInside: "avoid",
                        breakInside: "avoid",
                        backgroundColor: "#ffffff",
                        color: "#000000",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                      className="border border-gray-400 p-3.5 rounded-xl page-break-avoid space-y-2.5 text-xs bg-white text-black"
                    >
                      {/* LINHA 1: LEITO, NOME, IDADE, TEMPO DE INTERNAÇÃO E CIRURGIAS/DPO */}
                      <div
                        style={{
                          borderBottom: "1px solid #d1d5db",
                          paddingBottom: "6px",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: "6px",
                        }}
                        className="border-b border-gray-300 pb-1.5 flex flex-wrap items-baseline justify-between gap-1.5"
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px" }} className="flex flex-wrap items-baseline gap-1.5">
                          <span style={{ fontWeight: "800", fontSize: "13px", color: "#000000" }} className="font-extrabold text-sm text-black">
                            [{p.leito ? `LT ${p.leito}` : "Sem Leito"}]
                          </span>
                          <span style={{ fontWeight: "700", fontSize: "13px", color: "#000000" }} className="font-bold text-sm text-black">
                            {anonimizarNome(p.nome) || "Sem Nome"}
                          </span>
                          <span style={{ color: "#4b5563", fontSize: "11px" }} className="text-gray-600 text-[11px]">
                            ({idade !== "-" ? `${idade} • ` : ""}Internação: {tempoInt})
                          </span>
                        </div>

                        {categorias.cirurgias && (
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", fontSize: "11px" }} className="flex flex-wrap items-center gap-1 text-xs">
                            {cirurgias.length > 0 ? (
                              cirurgias.map((cx) => {
                                const dpoStr = formatarCirurgiaDPO(
                                  true,
                                  cx.tipoCirurgia,
                                  cx.dataCirurgia,
                                  cx.dpoManual
                                );
                                return (
                                  <span
                                    key={cx.id}
                                    style={{
                                      fontWeight: "bold",
                                      color: "#111827",
                                      backgroundColor: "#f3f4f6",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      border: "1px solid #d1d5db",
                                    }}
                                    className="font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300"
                                  >
                                    ✂ {dpoStr}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ color: "#6b7280", fontStyle: "italic", fontSize: "11px" }} className="text-gray-500 italic text-[11px]">
                                Tratamento Clínico
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* LINHA 2: MOTIVO DO INTERNAMENTO (TÍTULO EM LINHA PRÓPRIA, TEXTO LOGO ABAIXO) */}
                      {categorias.hd && p.motivoInternamento && (
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            MOTIVO:
                          </div>
                          <div
                            style={{
                              display: "block",
                              whiteSpace: "pre-wrap",
                              fontSize: "11.5px",
                              lineHeight: 1.45,
                              color: "#1f2937",
                              wordBreak: "break-word",
                            }}
                            className="text-gray-800 text-xs whitespace-pre-wrap"
                          >
                            {p.motivoInternamento}
                          </div>
                        </div>
                      )}

                      {/* LINHA 2: HD */}
                      {categorias.hd && p.hd && (
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            HD:
                          </div>
                          <div
                            style={{
                              display: "block",
                              whiteSpace: "pre-wrap",
                              fontSize: "11.5px",
                              lineHeight: 1.45,
                              color: "#1f2937",
                              wordBreak: "break-word",
                            }}
                            className="text-gray-800 text-xs whitespace-pre-wrap"
                          >
                            {p.hd}
                          </div>
                        </div>
                      )}

                      {/* LINHA 3: HDA (HISTÓRIA DA DOENÇA ATUAL) */}
                      {categorias.hda && p.hda && (
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            HDA:
                          </div>
                          <div
                            style={{
                              display: "block",
                              whiteSpace: "pre-wrap",
                              fontSize: "11.5px",
                              lineHeight: 1.45,
                              color: "#1f2937",
                              wordBreak: "break-word",
                            }}
                            className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed"
                          >
                            {p.hda}
                          </div>
                        </div>
                      )}

                      {/* LINHA 4: ALERTAS (ALERGIA E PRECAUÇÃO DE CONTATO) */}
                      {categorias.alertas && (p.temAlergia || p.precaucaoContato) && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "8px",
                            color: "#78350f",
                            fontWeight: "bold",
                            fontSize: "11px",
                            padding: "2px 0",
                            marginBottom: "3px",
                          }}
                          className="text-amber-900 font-semibold flex items-center gap-2 flex-wrap py-0.5 text-xs"
                        >
                          {p.temAlergia && (
                            <span>⚠ Alergia: {p.descricaoAlergia || "Registrada"}</span>
                          )}
                          {p.temAlergia && p.precaucaoContato && <span>•</span>}
                          {p.precaucaoContato && <span>⚠ Precaução de Contato</span>}
                        </div>
                      )}

                      {/* LINHA 5: SINAIS VITAIS / EXAME CLÍNICO */}
                      {categorias.sinaisVitais && p.sinaisVitais && (
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            EXAME FÍSICO:
                          </div>
                          <div
                            style={{
                              display: "block",
                              backgroundColor: "#f9fafb",
                              border: "1px solid #d1d5db",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              color: "#111827",
                              fontWeight: "500",
                            }}
                            className="bg-gray-50 border border-gray-300 px-2.5 py-1 rounded text-xs text-gray-900 font-medium"
                          >
                            FC: {p.sinaisVitais.fc || "-"} bpm | SatO2: {p.sinaisVitais.satO2 || "-"}% | PA: {p.sinaisVitais.pa || "-"}
                            {p.sinaisVitais.tax ? ` | Tax: ${p.sinaisVitais.tax}ºC` : ""}
                          </div>
                        </div>
                      )}

                      {/* LINHA 6: EVOLUÇÃO CLÍNICA */}
                      {categorias.evolucao && p.evolucao && (
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            EVOLUÇÃO:
                          </div>
                          <div
                            style={{
                              display: "block",
                              whiteSpace: "pre-wrap",
                              fontSize: "11.5px",
                              lineHeight: 1.45,
                              color: "#1f2937",
                              wordBreak: "break-word",
                            }}
                            className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed"
                          >
                            {p.evolucao}
                          </div>
                        </div>
                      )}

                      {/* LINHA 7: EXAMES REALIZADOS */}
                      {categorias.exames && p.examesRealizados && (
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            EXAMES REALIZADOS:
                          </div>
                          <div
                            style={{
                              display: "block",
                              whiteSpace: "pre-wrap",
                              fontSize: "11.5px",
                              lineHeight: 1.45,
                              color: "#1f2937",
                              wordBreak: "break-word",
                            }}
                            className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed"
                          >
                            {p.examesRealizados}
                          </div>
                        </div>
                      )}

                      {/* LINHA 8: MEDICAÇÕES GERAIS */}
                      {categorias.medicacoes && p.medicacoesUsoGeral && (
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            MEDICAÇÕES GERAIS:
                          </div>
                          <div
                            style={{
                              display: "block",
                              whiteSpace: "pre-wrap",
                              fontSize: "11.5px",
                              lineHeight: 1.45,
                              color: "#1f2937",
                              wordBreak: "break-word",
                            }}
                            className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed"
                          >
                            {p.medicacoesUsoGeral}
                          </div>
                        </div>
                      )}

                      {/* LINHA 9: ANTIBIÓTICOS & D-DAY */}
                      {categorias.antibioticos && p.antibioticos && p.antibioticos.length > 0 && (
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            MEDICAÇÕES DE CONTROLE & D-DAY:
                          </div>
                          <ul style={{ listStyleType: "disc", paddingLeft: "16px", marginTop: "2px", fontSize: "11px", color: "#111827" }} className="list-disc pl-4 mt-0.5 space-y-0.5 text-xs text-gray-900">
                            {p.antibioticos.map((atb) => {
                              const res = calcularDDayAntibiotico(atb);
                              return (
                                <li key={atb.id} style={{ marginBottom: "2px" }}>
                                  <strong>{atb.nome}</strong> ({atb.dose} - {atb.frequenciaHoras}/
                                  {atb.frequenciaHoras}h) —{" "}
                                  <span style={{ fontWeight: "bold" }}>
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
                        <div style={{ display: "block", marginBottom: "4px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            PENDÊNCIAS DO LEITO:
                          </div>
                          <ul style={{ listStyleType: "disc", paddingLeft: "16px", marginTop: "2px", fontSize: "11px", color: "#111827" }} className="list-disc pl-4 mt-0.5 space-y-0.5 text-xs text-gray-900">
                            {p.pendencias.map((pend, pIdx) => (
                              <li key={pIdx} style={{ whiteSpace: "pre-wrap", marginBottom: "2px" }} className="whitespace-pre-wrap">{pend}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* LINHA 11: CONDUTA PROPOSTA */}
                      {categorias.conduta && p.conduta && (
                        <div style={{ display: "block", marginBottom: "2px" }}>
                          <div
                            style={{
                              display: "block",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              fontSize: "11px",
                              letterSpacing: "0.03em",
                              color: "#111827",
                              marginBottom: "2px",
                            }}
                          >
                            CONDUTA:
                          </div>
                          <div
                            style={{
                              display: "block",
                              whiteSpace: "pre-wrap",
                              fontSize: "11.5px",
                              lineHeight: 1.45,
                              color: "#1f2937",
                              wordBreak: "break-word",
                            }}
                            className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed"
                          >
                            {p.conduta}
                          </div>
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
    </>
  );
}

