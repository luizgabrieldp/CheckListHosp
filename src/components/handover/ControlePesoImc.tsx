"use client";

import React, { useState } from "react";
import {
  RegistroAntropometria,
  ControleAntropometrico,
  PacientePassagem,
} from "@/types/hospital";
import {
  calcularIMC,
  classificarIMC,
  normalizarAltura,
  normalizarPeso,
  ordenarHistoricoCronologico,
  calcularVariacaoPeso,
  obterUltimaAntropometria,
} from "@/lib/imc";
import { obterDataLocalHoje } from "@/lib/utils";
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from "lucide-react";

interface ControlePesoImcProps {
  paciente: PacientePassagem;
  onSalvarAntropometria: (
    paciente: PacientePassagem,
    antropometria: ControleAntropometrico
  ) => void;
}

export function ControlePesoImc({
  paciente,
  onSalvarAntropometria,
}: ControlePesoImcProps) {
  const antropometria = paciente.antropometria || {
    ativo: true,
    alturaPadrao: undefined,
    historico: [],
  };

  const historicoOrdenado = ordenarHistoricoCronologico(
    antropometria.historico || []
  );
  const ultimaPesagem = obterUltimaAntropometria(antropometria);

  // Estados dos inputs de inserção
  const [alturaInput, setAlturaInput] = useState<string>(() => {
    if (antropometria.alturaPadrao) return String(antropometria.alturaPadrao).replace(".", ",");
    if (ultimaPesagem?.altura) return String(ultimaPesagem.altura).replace(".", ",");
    return "";
  });

  const [pesoInput, setPesoInput] = useState<string>("");
  const [dataInput, setDataInput] = useState<string>(() => obterDataLocalHoje());
  const [observacaoInput, setObservacaoInput] = useState<string>("");

  // Estado do gráfico (aba ativa: 'peso' ou 'imc')
  const [abaGrafico, setAbaGrafico] = useState<"peso" | "imc">("peso");

  // Hover interativo no gráfico
  const [hoverPonto, setHoverPonto] = useState<{
    x: number;
    y: number;
    data: string;
    peso: number;
    imc: number;
    categoria: string;
  } | null>(null);

  // Exibir tabela detalhada do histórico
  const [mostrarTabelaHistorico, setMostrarTabelaHistorico] = useState<boolean>(false);

  // Altura numérica normalizada e IMC em tempo real
  const alturaNum = normalizarAltura(alturaInput);
  const pesoNum = normalizarPeso(pesoInput);
  const imcTempoReal = calcularIMC(pesoNum, alturaNum);
  const classificacaoTempoReal = classificarIMC(imcTempoReal);

  // Variação acumulada de peso
  const variacao = calcularVariacaoPeso(historicoOrdenado);

  // Salvar nova pesagem
  const handleRegistrarPesagem = () => {
    if (pesoNum <= 0 || alturaNum <= 0) return;

    const novoRegistro: RegistroAntropometria = {
      id: `antrop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      data: dataInput || obterDataLocalHoje(),
      peso: pesoNum,
      altura: alturaNum,
      imc: imcTempoReal,
      observacao: observacaoInput.trim() || undefined,
    };

    const novoHistorico = [...(antropometria.historico || []), novoRegistro];
    const novaAntropometria: ControleAntropometrico = {
      ativo: true,
      alturaPadrao: alturaNum,
      historico: novoHistorico,
    };

    onSalvarAntropometria(paciente, novaAntropometria);
    setPesoInput("");
    setObservacaoInput("");
  };

  // Excluir pesagem do histórico
  const handleExcluirPesagem = (id: string) => {
    const novoHistorico = (antropometria.historico || []).filter((r) => r.id !== id);
    const novaAntropometria: ControleAntropometrico = {
      ...antropometria,
      historico: novoHistorico,
    };
    onSalvarAntropometria(paciente, novaAntropometria);
  };

  // Desativar/Remover controle de peso do paciente
  const handleDesativar = () => {
    if (
      antropometria.historico?.length > 0 &&
      !confirm("Deseja ocultar o controle de peso deste paciente? Os registros serão preservados.")
    ) {
      return;
    }
    onSalvarAntropometria(paciente, {
      ...antropometria,
      ativo: false,
    });
  };

  // Cálculos do Gráfico SVG
  const svgWidth = 460;
  const svgHeight = 160;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 28;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const valoresEixoY = historicoOrdenado.map((h) =>
    abaGrafico === "peso" ? h.peso : h.imc
  );

  const minValBruto = valoresEixoY.length > 0 ? Math.min(...valoresEixoY) : 0;
  const maxValBruto = valoresEixoY.length > 0 ? Math.max(...valoresEixoY) : 100;
  // Margem superior e inferior para não colar nas bordas do gráfico
  const margem = Math.max(2, (maxValBruto - minValBruto) * 0.15 || 5);
  const minVal = Math.max(0, Math.floor(minValBruto - margem));
  const maxVal = Math.ceil(maxValBruto + margem);
  const rangeY = maxVal - minVal || 1;

  const pontosGrafico = historicoOrdenado.map((h, idx) => {
    const val = abaGrafico === "peso" ? h.peso : h.imc;
    const x =
      padLeft +
      (historicoOrdenado.length === 1
        ? chartW / 2
        : (idx / (historicoOrdenado.length - 1)) * chartW);
    const y = padTop + chartH - ((val - minVal) / rangeY) * chartH;
    return {
      x,
      y,
      data: h.data,
      labelData: h.data.split("-").slice(1).reverse().join("/"), // DD/MM
      valor: val,
      peso: h.peso,
      imc: h.imc,
      categoria: classificarIMC(h.imc).categoria,
    };
  });

  const linhaSvgD =
    pontosGrafico.length === 0
      ? ""
      : pontosGrafico.length === 1
      ? `M ${pontosGrafico[0].x} ${pontosGrafico[0].y}`
      : pontosGrafico.reduce(
          (acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
          ""
        );

  return (
    <div className="mt-2.5 p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-teal-50/60 via-white to-sky-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-teal-200/80 dark:border-teal-800/60 shadow-2xs space-y-3 animate-in fade-in duration-200">
      {/* CABEÇALHO DO BLOCO */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-teal-100 dark:border-slate-700/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-2xs">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
              <span>Controle de Peso & IMC</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border dark:border-teal-800/60">
                Pré-Bariátrica
              </span>
            </h5>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {ultimaPesagem && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${classificarIMC(ultimaPesagem.imc).corBg} ${classificarIMC(ultimaPesagem.imc).corTexto} ${classificarIMC(ultimaPesagem.imc).corBorda}`}
            >
              Último: {ultimaPesagem.peso} kg • IMC {ultimaPesagem.imc}
            </span>
          )}

          <button
            type="button"
            onClick={handleDesativar}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            title="Ocultar controle de peso para este paciente"
            aria-label="Ocultar controle de peso para este paciente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* LINHA DE REGISTRO RÁPIDO DE PESAGEM */}
      <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-teal-100/80 dark:border-slate-700 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* ALTURA FIXA / REUTILIZÁVEL */}
          <div>
            <label
              htmlFor={`peso-altura-${paciente.id}`}
              className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5 flex items-center justify-between"
            >
              <span>Altura (m)</span>
              <span className="text-[9px] font-normal text-slate-400 dark:text-slate-400">Fixa</span>
            </label>
            <input
              id={`peso-altura-${paciente.id}`}
              type="text"
              inputMode="decimal"
              value={alturaInput}
              onChange={(e) => setAlturaInput(e.target.value)}
              placeholder="Ex: 1,70"
              className="w-full min-h-[44px] px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            />
          </div>

          {/* PESO ATUAL */}
          <div>
            <label
              htmlFor={`peso-atual-${paciente.id}`}
              className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5"
            >
              Peso (kg)
            </label>
            <input
              id={`peso-atual-${paciente.id}`}
              type="text"
              inputMode="decimal"
              value={pesoInput}
              onChange={(e) => setPesoInput(e.target.value)}
              placeholder="Ex: 112,5"
              className="w-full min-h-[44px] px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-semibold focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            />
          </div>

          {/* DATA DA PESAGEM */}
          <div>
            <label
              htmlFor={`peso-data-${paciente.id}`}
              className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5"
            >
              Data da Pesagem
            </label>
            <input
              id={`peso-data-${paciente.id}`}
              type="date"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              className="w-full min-h-[44px] px-2 py-1.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            />
          </div>

          {/* BOTÃO REGISTRAR */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              disabled={pesoNum <= 0 || alturaNum <= 0}
              onClick={handleRegistrarPesagem}
              className={`w-full min-h-[44px] py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                pesoNum > 0 && alturaNum > 0
                  ? "bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Registrar</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK CLÍNICO EM TEMPO REAL: IMC CALCULADO + CLASSIFICAÇÃO OMS */}
        {pesoNum > 0 && alturaNum > 0 && (
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                IMC Calculado:{" "}
                <span className="text-teal-900 dark:text-teal-300 font-extrabold text-sm">
                  {imcTempoReal}
                </span>{" "}
                kg/m²
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${classificacaoTempoReal.corBg} ${classificacaoTempoReal.corTexto} ${classificacaoTempoReal.corBorda}`}
              >
                {classificacaoTempoReal.categoria}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Pressione &ldquo;Registrar&rdquo; para salvar na curva
            </span>
          </div>
        )}
      </div>

      {/* VARIAÇÃO ACUMULADA DE PESO (DELTA) */}
      {historicoOrdenado.length > 1 && (
        <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs">
            {variacao.tipo === "perda" ? (
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            ) : variacao.tipo === "ganho" ? (
              <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-700 dark:text-rose-300">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Scale className="w-3.5 h-3.5" />
              </div>
            )}
            <div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Evolução no Tratamento Pré-Bariátrico:
              </span>
              <span
                className={`font-bold text-xs ${
                  variacao.tipo === "perda"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : variacao.tipo === "ganho"
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                Variação: {variacao.textoFormatado} (
                {variacao.deltaImc > 0 ? `+${variacao.deltaImc}` : variacao.deltaImc} IMC)
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {historicoOrdenado[0].peso} kg ({historicoOrdenado[0].data.split("-").reverse().join("/")}) ➔{" "}
            {ultimaPesagem?.peso} kg ({ultimaPesagem?.data.split("-").reverse().join("/")})
          </div>
        </div>
      )}

      {/* ÁREA DO GRÁFICO DE EVOLUÇÃO (PESO / IMC) */}
      {historicoOrdenado.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
          {/* ABAS RÁPIDAS: PESO (KG) vs IMC */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div
              role="tablist"
              aria-label="Alternar gráfico entre peso e IMC"
              className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <button
                type="button"
                role="tab"
                aria-selected={abaGrafico === "peso"}
                onClick={() => setAbaGrafico("peso")}
                className={`min-h-[44px] px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  abaGrafico === "peso"
                    ? "bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                Curva de Peso (kg)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={abaGrafico === "imc"}
                onClick={() => setAbaGrafico("imc")}
                className={`min-h-[44px] px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  abaGrafico === "imc"
                    ? "bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                Curva de IMC (kg/m²)
              </button>
            </div>

            <button
              type="button"
              aria-expanded={mostrarTabelaHistorico}
              onClick={() => setMostrarTabelaHistorico(!mostrarTabelaHistorico)}
              className="min-h-[44px] inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-2"
            >
              <span>{mostrarTabelaHistorico ? "Ocultar tabela" : "Ver registros"}</span>
              {mostrarTabelaHistorico ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* RENDERIZAÇÃO SVG RESPONSIVA DO GRÁFICO */}
          <div className="w-full relative overflow-visible">
            <svg
              role="img"
              aria-label={`Gráfico de curva de ${abaGrafico === "peso" ? "Peso" : "IMC"}`}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-36 overflow-visible"
            >
              <title>{`Gráfico de curva de ${abaGrafico === "peso" ? "Peso" : "IMC"}`}</title>
              {/* LINHAS DE GRADE E RÓTULOS Y */}
              <line
                x1={padLeft}
                y1={padTop}
                x2={svgWidth - padRight}
                y2={padTop}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeDasharray="3 3"
              />
              <line
                x1={padLeft}
                y1={padTop + chartH / 2}
                x2={svgWidth - padRight}
                y2={padTop + chartH / 2}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeDasharray="3 3"
              />
              <line
                x1={padLeft}
                y1={padTop + chartH}
                x2={svgWidth - padRight}
                y2={padTop + chartH}
                className="stroke-slate-200 dark:stroke-slate-700"
              />

              <text
                x={padLeft - 8}
                y={padTop + 4}
                textAnchor="end"
                className="text-[9px] fill-slate-400 dark:fill-slate-400 font-sans"
              >
                {maxVal}
              </text>
              <text
                x={padLeft - 8}
                y={padTop + chartH / 2 + 4}
                textAnchor="end"
                className="text-[9px] fill-slate-400 dark:fill-slate-400 font-sans"
              >
                {Math.round((maxVal + minVal) / 2)}
              </text>
              <text
                x={padLeft - 8}
                y={padTop + chartH + 3}
                textAnchor="end"
                className="text-[9px] fill-slate-400 dark:fill-slate-400 font-sans"
              >
                {minVal}
              </text>

              {/* CURVA DE CONEXÃO DOS PONTOS */}
              {pontosGrafico.length > 1 && (
                <path
                  d={linhaSvgD}
                  fill="none"
                  stroke={abaGrafico === "peso" ? "#0d9488" : "#6366f1"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* RÓTULOS DO EIXO X (DATAS) E PONTOS INTERATIVOS */}
              {pontosGrafico.map((p, i) => (
                <g key={`ponto-${i}`}>
                  {/* DATA NO EIXO X */}
                  <text
                    x={p.x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    className="text-[9px] fill-slate-500 dark:fill-slate-400 font-sans font-medium"
                  >
                    {p.labelData}
                  </text>

                  {/* CÍRCULO DO PONTO */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    className="cursor-pointer transition-all hover:r-6"
                    fill={abaGrafico === "peso" ? "#0d9488" : "#6366f1"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    onMouseEnter={() =>
                      setHoverPonto({
                        x: p.x,
                        y: p.y,
                        data: p.data,
                        peso: p.peso,
                        imc: p.imc,
                        categoria: p.categoria,
                      })
                    }
                    onMouseLeave={() => setHoverPonto(null)}
                  />

                  {/* RÓTULO DO VALOR LOGO ACIMA DO PONTO */}
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-slate-700 dark:fill-slate-200 font-sans pointer-events-none"
                  >
                    {p.valor}
                  </text>
                </g>
              ))}
            </svg>

            {/* TOOLTIP INTERATIVO FLUTUANTE AO PASSAR O MOUSE */}
            {hoverPonto && (
              <div
                className="absolute z-20 pointer-events-none bg-slate-900 text-white text-[11px] p-2 rounded-lg shadow-lg -translate-x-1/2 -translate-y-full mb-2 whitespace-nowrap animate-in fade-in"
                style={{
                  left: `${(hoverPonto.x / svgWidth) * 100}%`,
                  top: `${(hoverPonto.y / svgHeight) * 100}%`,
                }}
              >
                <div className="font-bold text-teal-300">
                  Data: {hoverPonto.data.split("-").reverse().join("/")}
                </div>
                <div>Peso: <span className="font-bold">{hoverPonto.peso} kg</span></div>
                <div>IMC: <span className="font-bold">{hoverPonto.imc}</span> ({hoverPonto.categoria})</div>
              </div>
            )}
          </div>

          {/* TABELA DE REGISTROS DETALHADOS (RECOLHÍVEL) */}
          {mostrarTabelaHistorico && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-1.5 font-bold">Data</th>
                    <th className="pb-1.5 font-bold">Peso</th>
                    <th className="pb-1.5 font-bold">Altura</th>
                    <th className="pb-1.5 font-bold">IMC</th>
                    <th className="pb-1.5 font-bold">Classificação</th>
                    <th className="pb-1.5 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historicoOrdenado.map((reg) => {
                    const c = classificarIMC(reg.imc);
                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-1.5 font-medium text-slate-800 dark:text-slate-200">
                          {reg.data.split("-").reverse().join("/")}
                        </td>
                        <td className="py-1.5 font-bold text-slate-900 dark:text-white">
                          {reg.peso} kg
                        </td>
                        <td className="py-1.5 text-slate-600 dark:text-slate-300">
                          {reg.altura} m
                        </td>
                        <td className="py-1.5 font-bold text-teal-700 dark:text-teal-400">
                          {reg.imc}
                        </td>
                        <td className="py-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${c.corBg} ${c.corTexto} ${c.corBorda}`}
                          >
                            {c.categoria}
                          </span>
                        </td>
                        <td className="py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleExcluirPesagem(reg.id)}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            title="Excluir este registro"
                            aria-label="Excluir este registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
