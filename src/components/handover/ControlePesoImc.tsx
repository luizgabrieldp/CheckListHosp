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
    <div className="mt-2.5 p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-teal-50/60 via-white to-sky-50/40 border border-teal-200/80 shadow-2xs space-y-3 animate-in fade-in duration-200">
      {/* CABEÇALHO DO BLOCO */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-teal-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-2xs">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
              <span>Controle de Peso & IMC</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">
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
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Ocultar controle de peso para este paciente"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* LINHA DE REGISTRO RÁPIDO DE PESAGEM */}
      <div className="bg-white/80 p-2.5 rounded-lg border border-teal-100/80 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* ALTURA FIXA / REUTILIZÁVEL */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-0.5 flex items-center justify-between">
              <span>Altura (m)</span>
              <span className="text-[9px] font-normal text-slate-400">Fixa</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={alturaInput}
              onChange={(e) => setAlturaInput(e.target.value)}
              placeholder="Ex: 1,70"
              className="w-full px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* PESO ATUAL */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
              Peso (kg)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={pesoInput}
              onChange={(e) => setPesoInput(e.target.value)}
              placeholder="Ex: 112,5"
              className="w-full px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:bg-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* DATA DA PESAGEM */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
              Data da Pesagem
            </label>
            <input
              type="date"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* BOTÃO REGISTRAR */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              disabled={pesoNum <= 0 || alturaNum <= 0}
              onClick={handleRegistrarPesagem}
              className={`w-full py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                pesoNum > 0 && alturaNum > 0
                  ? "bg-teal-600 hover:bg-teal-700 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK CLÍNICO EM TEMPO REAL: IMC CALCULADO + CLASSIFICAÇÃO OMS */}
        {pesoNum > 0 && alturaNum > 0 && (
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">
                IMC Calculado:{" "}
                <span className="text-teal-900 font-extrabold text-sm">
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
            <span className="text-[11px] text-slate-500">
              Pressione &ldquo;Registrar&rdquo; para salvar na curva
            </span>
          </div>
        )}
      </div>

      {/* VARIAÇÃO ACUMULADA DE PESO (DELTA) */}
      {historicoOrdenado.length > 1 && (
        <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs">
            {variacao.tipo === "perda" ? (
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            ) : variacao.tipo === "ganho" ? (
              <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <Scale className="w-3.5 h-3.5" />
              </div>
            )}
            <div>
              <span className="text-[11px] font-bold text-slate-700 block">
                Evolução no Tratamento Pré-Bariátrico:
              </span>
              <span
                className={`font-bold text-xs ${
                  variacao.tipo === "perda"
                    ? "text-emerald-700"
                    : variacao.tipo === "ganho"
                    ? "text-rose-700"
                    : "text-slate-700"
                }`}
              >
                Variação: {variacao.textoFormatado} (
                {variacao.deltaImc > 0 ? `+${variacao.deltaImc}` : variacao.deltaImc} IMC)
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            {historicoOrdenado[0].peso} kg ({historicoOrdenado[0].data.split("-").reverse().join("/")}) ➔{" "}
            {ultimaPesagem?.peso} kg ({ultimaPesagem?.data.split("-").reverse().join("/")})
          </div>
        </div>
      )}

      {/* ÁREA DO GRÁFICO DE EVOLUÇÃO (PESO / IMC) */}
      {historicoOrdenado.length > 0 && (
        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
          {/* ABAS RÁPIDAS: PESO (KG) vs IMC */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setAbaGrafico("peso")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  abaGrafico === "peso"
                    ? "bg-white text-teal-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Curva de Peso (kg)
              </button>
              <button
                type="button"
                onClick={() => setAbaGrafico("imc")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  abaGrafico === "imc"
                    ? "bg-white text-teal-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Curva de IMC (kg/m²)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMostrarTabelaHistorico(!mostrarTabelaHistorico)}
              className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
            >
              <span>{mostrarTabelaHistorico ? "Ocultar tabela" : "Ver registros"}</span>
              {mostrarTabelaHistorico ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* RENDERIZAÇÃO SVG RESPONSIVA DO GRÁFICO */}
          <div className="w-full relative overflow-visible">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-36 overflow-visible"
            >
              {/* LINHAS DE GRADE E RÓTULOS Y */}
              <line
                x1={padLeft}
                y1={padTop}
                x2={svgWidth - padRight}
                y2={padTop}
                stroke="#f1f5f9"
                strokeDasharray="3 3"
              />
              <line
                x1={padLeft}
                y1={padTop + chartH / 2}
                x2={svgWidth - padRight}
                y2={padTop + chartH / 2}
                stroke="#f1f5f9"
                strokeDasharray="3 3"
              />
              <line
                x1={padLeft}
                y1={padTop + chartH}
                x2={svgWidth - padRight}
                y2={padTop + chartH}
                stroke="#e2e8f0"
              />

              <text
                x={padLeft - 8}
                y={padTop + 4}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-sans"
              >
                {maxVal}
              </text>
              <text
                x={padLeft - 8}
                y={padTop + chartH / 2 + 4}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-sans"
              >
                {Math.round((maxVal + minVal) / 2)}
              </text>
              <text
                x={padLeft - 8}
                y={padTop + chartH + 3}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-sans"
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
                    className="text-[9px] fill-slate-500 font-sans font-medium"
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
                    className="text-[9px] font-bold fill-slate-700 font-sans pointer-events-none"
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
            <div className="pt-2 border-t border-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                    <th className="pb-1.5 font-bold">Data</th>
                    <th className="pb-1.5 font-bold">Peso</th>
                    <th className="pb-1.5 font-bold">Altura</th>
                    <th className="pb-1.5 font-bold">IMC</th>
                    <th className="pb-1.5 font-bold">Classificação</th>
                    <th className="pb-1.5 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicoOrdenado.map((reg) => {
                    const c = classificarIMC(reg.imc);
                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/60">
                        <td className="py-1.5 font-medium text-slate-800">
                          {reg.data.split("-").reverse().join("/")}
                        </td>
                        <td className="py-1.5 font-bold text-slate-900">
                          {reg.peso} kg
                        </td>
                        <td className="py-1.5 text-slate-600">
                          {reg.altura} m
                        </td>
                        <td className="py-1.5 font-bold text-teal-700">
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
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir este registro"
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
