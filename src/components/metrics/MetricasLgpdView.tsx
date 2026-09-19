"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { formatarDataBR } from "@/lib/utils";
import {
  ShieldCheck,
  Clock,
  Trash2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  FileCheck,
  ClipboardList,
  CheckSquare,
  Users,
  Building2,
  ChevronRight,
} from "lucide-react";

export function MetricasLgpdView() {
  const metricas = useAppStore((s) => s.metricas || []);
  const admissoes = useAppStore((s) => s.admissoes || []);
  const altas = useAppStore((s) => s.altas || []);
  const permanencia = useAppStore((s) => s.permanencia);
  const passagem = useAppStore((s) => s.passagem || []);

  // Data do filtro (padrão hoje no fuso local no formato YYYY-MM-DD)
  const [dataFiltro, setDataFiltro] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });

  const [periodo, setPeriodo] = useState<7 | 14 | 30>(7);
  const [executandoExpurgo, setExecutandoExpurgo] = useState(false);
  const [statusExpurgo, setStatusExpurgo] = useState<string | null>(null);
  const [hoverPonto, setHoverPonto] = useState<{
    x: number;
    y: number;
    data: string;
    admissoes: number;
    altas: number;
  } | null>(null);

  // Formatar data para exibição no picker (DD/MM/AAAA)
  const partesData = dataFiltro.split("-");
  const dataFormatadaBR =
    partesData.length === 3
      ? `${partesData[2]}/${partesData[1]}/${partesData[0]}`
      : dataFiltro;

  // 1. DADOS SUPERIORES: CARD 1 - ADMISSÕES DO DIA
  const admissoesDoDia = admissoes.filter(
    (a) => !a.cancelada && (a.dataAdmissaoAgendada === dataFiltro || !a.dataAdmissaoAgendada)
  );
  const totalAdmissoes = admissoesDoDia.length;
  const enfermariasAdmissoes = admissoesDoDia.reduce<Record<string, number>>((acc, a) => {
    const enf = a.enfermaria?.trim() || "Geral";
    acc[enf] = (acc[enf] || 0) + 1;
    return acc;
  }, {});

  // 2. DADOS SUPERIORES: CARD 2 - ALTAS DO DIA
  const altasDoDia = altas.filter((a) =>
    a.dataAlta ? a.dataAlta.startsWith(dataFiltro) : true
  );
  const totalAltas = altasDoDia.length;
  const enfermariasAltas = altasDoDia.reduce<Record<string, number>>((acc, a) => {
    const enf = a.enfermaria?.trim() || "Geral";
    acc[enf] = (acc[enf] || 0) + 1;
    return acc;
  }, {});

  // 3. DADOS SUPERIORES: CARD 3 - PERMANÊNCIA (PENDÊNCIAS DO DIA)
  const pendencias = permanencia?.pendencias || [];
  const totalPendencias = pendencias.length;
  const concluidasPendencias = pendencias.filter((p) => p.status === "Feito").length;
  const pendenciasUrgentesPendentes = pendencias.filter(
    (p) => p.prioridade === "Urgente" && p.status !== "Feito"
  ).length;

  const emAcao = pendencias.some((p) => p.status === "Em Realização" || p.status === "Feito");
  const todasConcluidas = totalPendencias > 0 && concluidasPendencias === totalPendencias;
  const legendaPermanencia = todasConcluidas
    ? `Trabalho concluído (${concluidasPendencias}/${totalPendencias})`
    : emAcao
    ? "Equipe em ação"
    : "Tarefas do dia";

  // 4. DADOS SUPERIORES: CARD 4 - INTERNADOS (PASSAGEM)
  const internados = passagem;
  const totalInternados = internados.length;
  const enfermariasInternados = internados.reduce<Record<string, number>>((acc, p) => {
    const enf = p.enfermaria?.trim() || "Geral";
    acc[enf] = (acc[enf] || 0) + 1;
    return acc;
  }, {});

  // 5. EQUIPE DO DIA (PERMANÊNCIA)
  const equipe = permanencia?.equipe || {
    doutorandos: [],
    residentes: [],
    preceptores: [],
  };

  // 6. FASES DA ADMISSÃO (5 FASES BASE44)
  let countAguardando = 0;
  let countChegou = 0;
  let countInternou = 0;
  let countAih = 0;
  let countAltaAdm = 0;

  admissoesDoDia.forEach((p) => {
    if (p.status === "Alta/ADM" || p.altaAdm) {
      countAltaAdm++;
    } else if (p.status === "AIH" || p.aih) {
      countAih++;
    } else if (p.status === "Internou" || p.internou) {
      countInternou++;
    } else if (p.status === "Chegou" || p.chegou) {
      countChegou++;
    } else {
      countAguardando++;
    }
  });

  const fases = [
    { label: "Aguardando", count: countAguardando, color: "bg-[#8a99ad]", hex: "#8a99ad" },
    { label: "Chegou", count: countChegou, color: "bg-[#3b82f6]", hex: "#3b82f6" },
    { label: "Internou", count: countInternou, color: "bg-[#0d9488]", hex: "#0d9488" },
    { label: "AIH", count: countAih, color: "bg-[#a855f7]", hex: "#a855f7" },
    { label: "Alta/ADM", count: countAltaAdm, color: "bg-[#22c55e]", hex: "#22c55e" },
  ];

  const maxFaseCount = Math.max(...fases.map((f) => f.count), 1);
  const yAxisMaxFases = Math.max(8, Math.ceil(maxFaseCount / 4) * 4);

  // 7. TENDÊNCIA HISTÓRICA (ÚLTIMOS 7, 14 OU 30 DIAS)
  const dadosHistoricos: {
    data: string;
    label: string;
    admissoes: number;
    altas: number;
  }[] = [];

  const baseDate = new Date(dataFiltro + "T12:00:00");
  for (let i = periodo - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dataStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

    const historico = metricas.find((m) => m.data === dataStr);
    let adm = historico ? historico.totalAdmissoes : 0;
    let alt = historico ? historico.totalAltas : 0;

    if (dataStr === dataFiltro) {
      adm = Math.max(adm, totalAdmissoes);
      alt = Math.max(alt, totalAltas);
    } else if (!historico) {
      const admsCadastradas = admissoes.filter(
        (a) => !a.cancelada && a.dataAdmissaoAgendada === dataStr
      ).length;
      const altasCadastradas = altas.filter((a) =>
        a.dataAlta ? a.dataAlta.startsWith(dataStr) : false
      ).length;
      adm = admsCadastradas;
      alt = altasCadastradas;
    }

    dadosHistoricos.push({
      data: dataStr,
      label,
      admissoes: adm,
      altas: alt,
    });
  }

  // Cálculos SVG para curvas suaves
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 32;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxValorTendencia = Math.max(
    ...dadosHistoricos.map((d) => Math.max(d.admissoes, d.altas)),
    8
  );
  // Folga superior para garantir que valores altos não cortem no teto do gráfico
  const yAxisMaxTendencia = Math.max(8, Math.ceil((maxValorTendencia + 2.5) / 4) * 4);

  const pontosAdmissoes = dadosHistoricos.map((d, index) => {
    const x =
      paddingLeft +
      (index / (dadosHistoricos.length - 1 || 1)) * chartWidth;
    const y =
      paddingTop +
      chartHeight -
      (d.admissoes / yAxisMaxTendencia) * chartHeight;
    return { x, y, data: d.label, valor: d.admissoes };
  });

  const pontosAltas = dadosHistoricos.map((d, index) => {
    const x =
      paddingLeft +
      (index / (dadosHistoricos.length - 1 || 1)) * chartWidth;
    const y =
      paddingTop +
      chartHeight -
      (d.altas / yAxisMaxTendencia) * chartHeight;
    return { x, y, data: d.label, valor: d.altas };
  });

  function gerarCaminhoCurvaSuave(pontos: { x: number; y: number }[]): string {
    if (pontos.length === 0) return "";
    if (pontos.length === 1) return `M ${pontos[0].x} ${pontos[0].y}`;

    let d = `M ${pontos[0].x} ${pontos[0].y}`;
    for (let i = 0; i < pontos.length - 1; i++) {
      const p0 = pontos[i === 0 ? i : i - 1];
      const p1 = pontos[i];
      const p2 = pontos[i + 1];
      const p3 = pontos[i + 2 < pontos.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  const dCurvaAdmissoes = gerarCaminhoCurvaSuave(pontosAdmissoes);
  const dCurvaAltas = gerarCaminhoCurvaSuave(pontosAltas);

  // Disparo manual de expurgo
  async function handleForcarExpurgo() {
    setExecutandoExpurgo(true);
    setStatusExpurgo(null);
    try {
      const res = await fetch("/api/expurgo-lgpd", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setStatusExpurgo(
          `Varredura concluída: ${data.resultado.expurgadasAdmissoes} admissão(ões) e ${data.resultado.expurgadasAltas || 0} alta(s) arquivadas em métricas anônimas com sucesso.`
        );
      }
    } catch {
      setStatusExpurgo("Não foi possível conectar ao motor de expurgo no momento.");
    } finally {
      setExecutandoExpurgo(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. SELETOR DE DATA NO TOPO (PADRÃO BASE44) */}
      <div className="flex items-center justify-between">
        <div className="relative inline-flex items-center">
          <label className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-slate-300 transition-colors">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">{dataFormatadaBR}</span>
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => e.target.value && setDataFiltro(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>

        {/* BOTÃO DE AUDITORIA MANUAL LGPD */}
        <button
          onClick={handleForcarExpurgo}
          disabled={executandoExpurgo}
          title="Executar verificação manual de retenção LGPD"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${executandoExpurgo ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Auditoria LGPD</span>
        </button>
      </div>

      {/* FEEDBACK DO EXPURGO */}
      {statusExpurgo && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusExpurgo}</span>
        </div>
      )}

      {/* 2. OS 4 CARDS SUPERIORES (2x2 NO MOBILE, 4x1 NO DESKTOP) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* CARD 1: ADMISSÕES */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[115px] sm:min-h-[120px]">
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-semibold">
            <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            <span>Admissões</span>
          </div>

          <div className="my-1.5 sm:my-2">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
              {totalAdmissoes}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {Object.keys(enfermariasAdmissoes).length === 0 ? (
              <span className="text-[10px] sm:text-[11px] text-slate-400">-</span>
            ) : (
              Object.entries(enfermariasAdmissoes).map(([enf, qtd]) => (
                <span
                  key={enf}
                  className="px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-medium"
                >
                  {enf}: {qtd}
                </span>
              ))
            )}
          </div>
        </div>

        {/* CARD 2: ALTAS */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[115px] sm:min-h-[120px]">
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-semibold">
            <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            <span>Altas</span>
          </div>

          <div className="my-1.5 sm:my-2">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
              {totalAltas}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {Object.keys(enfermariasAltas).length === 0 ? (
              <span className="text-[10px] sm:text-[11px] text-slate-400">-</span>
            ) : (
              Object.entries(enfermariasAltas).map(([enf, qtd]) => (
                <span
                  key={enf}
                  className="px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-medium"
                >
                  {enf}: {qtd}
                </span>
              ))
            )}
          </div>
        </div>

        {/* CARD 3: PERMANÊNCIA */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[115px] sm:min-h-[120px]">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-semibold">
              <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
              <span>Permanência</span>
            </div>
            {pendenciasUrgentesPendentes > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] sm:text-[10px] font-bold animate-pulse border border-red-200">
                <span>🚨 {pendenciasUrgentesPendentes}</span>
              </span>
            )}
          </div>

          <div className="my-1.5 sm:my-2">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
              {concluidasPendencias}/{totalPendencias}
            </div>
          </div>

          <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">
            {legendaPermanencia}
          </span>
        </div>

        {/* CARD 4: INTERNADOS */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[115px] sm:min-h-[120px]">
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[11px] sm:text-xs font-semibold">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            <span>Internados</span>
          </div>

          <div className="my-1.5 sm:my-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
              {totalInternados}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">pacientes</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {Object.keys(enfermariasInternados).length === 0 ? (
              <span className="text-[10px] sm:text-[11px] text-slate-400">-</span>
            ) : (
              Object.entries(enfermariasInternados).map(([enf, qtd]) => (
                <span
                  key={enf}
                  className="px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-medium"
                >
                  {enf}: {qtd}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. CARD: EQUIPE DO DIA (PERMANÊNCIA) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Equipe do Dia (Permanência)</span>
        </div>

        <div className="space-y-3">
          {/* DOUTORANDOS */}
          {(equipe.doutorandos || []).length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                DOUTORANDOS
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {equipe.doutorandos.map((nome, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50/70 border border-purple-200 text-purple-700 text-xs font-semibold shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>{nome}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* RESIDENTES */}
          {(equipe.residentes || []).length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                RESIDENTES
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {equipe.residentes.map((nome, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/70 border border-blue-200 text-blue-700 text-xs font-semibold shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>{nome}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PRECEPTORES */}
          {(equipe.preceptores || []).length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                PRECEPTORES
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {equipe.preceptores.map((nome, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/70 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>{nome}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* SEM MEMBROS CADASTRADOS */}
          {(!equipe.doutorandos?.length &&
            !equipe.residentes?.length &&
            !equipe.preceptores?.length) && (
            <span className="text-xs text-slate-400 italic block py-1">
              Nenhum membro cadastrado na equipe do dia. Configure na aba Permanência.
            </span>
          )}
        </div>
      </div>

      {/* 4. CARD: FASES DA ADMISSÃO (BARRA SEGMENTADA CONTÍNUA + PILLS COM %) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Fases da admissão</h3>
          <span className="text-xs font-medium text-slate-500">
            {totalAdmissoes} paciente{totalAdmissoes !== 1 ? "s" : ""}
          </span>
        </div>

        {/* BARRA DE PROGRESSO SEGMENTADA CONTÍNUA */}
        <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 shadow-inner gap-0.5">
          {totalAdmissoes === 0 ? (
            <div className="w-full h-full bg-slate-200/80 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-medium text-slate-500">Sem admissões para esta data</span>
            </div>
          ) : (
            fases.map((fase) => {
              const pct = (fase.count / totalAdmissoes) * 100;
              if (fase.count === 0) return null;
              return (
                <div
                  key={fase.label}
                  style={{ width: `${pct}%`, backgroundColor: fase.hex }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 hover:opacity-90 cursor-default"
                  title={`${fase.label}: ${fase.count} (${pct.toFixed(0)}%)`}
                />
              );
            })
          )}
        </div>

        {/* GRID DE 5 PILLS COM COR, NOME, CONTAGEM E % */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
          {fases.map((fase) => {
            const pct = totalAdmissoes > 0 ? (fase.count / totalAdmissoes) * 100 : 0;
            return (
              <div
                key={fase.label}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: fase.hex }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-slate-600 truncate">
                    {fase.label}
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {fase.count}{" "}
                    <span className="text-[10px] font-medium text-slate-400">
                      ({totalAdmissoes > 0 ? pct.toFixed(0) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SELETOR DE PERÍODO (PÍLULAS) */}
      <div className="flex items-center gap-1.5">
        {([7, 14, 30] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
              periodo === p
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {p} dias
          </button>
        ))}
      </div>

      {/* 6. CARD: TENDÊNCIA HISTÓRICA (GRÁFICO SVG COM CURVAS SUAVES) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Tendência histórica</h3>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[640px] relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-56 overflow-visible"
            >
              {/* LINHAS DE GRADE HORIZONTAIS */}
              <line
                x1={paddingLeft}
                y1={paddingTop}
                x2={svgWidth - paddingRight}
                y2={paddingTop}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <line
                x1={paddingLeft}
                y1={paddingTop + chartHeight / 2}
                x2={svgWidth - paddingRight}
                y2={paddingTop + chartHeight / 2}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <line
                x1={paddingLeft}
                y1={paddingTop + chartHeight}
                x2={svgWidth - paddingRight}
                y2={paddingTop + chartHeight}
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              {/* RÓTULOS DO EIXO Y */}
              <text
                x={paddingLeft - 10}
                y={paddingTop + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-sans"
              >
                {yAxisMaxTendencia}
              </text>
              <text
                x={paddingLeft - 10}
                y={paddingTop + chartHeight / 2 + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-sans"
              >
                {Math.round(yAxisMaxTendencia / 2)}
              </text>
              <text
                x={paddingLeft - 10}
                y={paddingTop + chartHeight + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-sans"
              >
                0
              </text>

              {/* RÓTULOS DO EIXO X */}
              {dadosHistoricos.map((d, i) => {
                const x =
                  paddingLeft +
                  (i / (dadosHistoricos.length - 1 || 1)) * chartWidth;
                return (
                  <text
                    key={d.data}
                    x={x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400 font-sans"
                  >
                    {d.label}
                  </text>
                );
              })}

              {/* CURVA DE ADMISSÕES (TEAL) */}
              <path
                d={dCurvaAdmissoes}
                fill="none"
                stroke="#0d9488"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* CURVA DE ALTAS (ROXO/AZUL) */}
              <path
                d={dCurvaAltas}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* PONTOS DE HOVER INTERATIVOS */}
              {pontosAdmissoes.map((p, i) => (
                <circle
                  key={`adm-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  className="fill-[#0d9488] stroke-white stroke-2 cursor-pointer hover:r-5 transition-all"
                  onMouseEnter={() =>
                    setHoverPonto({
                      x: p.x,
                      y: p.y,
                      data: dadosHistoricos[i].label,
                      admissoes: dadosHistoricos[i].admissoes,
                      altas: dadosHistoricos[i].altas,
                    })
                  }
                  onMouseLeave={() => setHoverPonto(null)}
                />
              ))}

              {pontosAltas.map((p, i) => (
                <circle
                  key={`alt-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  className="fill-[#6366f1] stroke-white stroke-2 cursor-pointer hover:r-5 transition-all"
                  onMouseEnter={() =>
                    setHoverPonto({
                      x: p.x,
                      y: p.y,
                      data: dadosHistoricos[i].label,
                      admissoes: dadosHistoricos[i].admissoes,
                      altas: dadosHistoricos[i].altas,
                    })
                  }
                  onMouseLeave={() => setHoverPonto(null)}
                />
              ))}
            </svg>

            {/* TOOLTIP INTERATIVO FLUTUANTE */}
            {hoverPonto && (
              <div
                style={{
                  left: `${(hoverPonto.x / svgWidth) * 100}%`,
                  top:
                    hoverPonto.y < 90
                      ? `${((hoverPonto.y + 14) / svgHeight) * 100}%`
                      : `${(hoverPonto.y / svgHeight) * 100}%`,
                }}
                className={`absolute pointer-events-none -translate-x-1/2 ${
                  hoverPonto.y < 90 ? "translate-y-0" : "-translate-y-full -translate-y-2"
                } bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg space-y-0.5 z-20 whitespace-nowrap transition-transform duration-75`}
              >
                <div className="font-bold text-slate-300 border-b border-slate-800 pb-0.5">
                  Dia {hoverPonto.data}
                </div>
                <div className="text-teal-400 font-semibold">
                  Admissões: {hoverPonto.admissoes}
                </div>
                <div className="text-indigo-400 font-semibold">
                  Altas: {hoverPonto.altas}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. RODAPÉ DE RETENÇÃO E PRIVACIDADE LGPD (TEXTO EXATO DO PRINT) */}
      <div className="pt-2 pb-6 text-center">
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Dados clínicos apagados automaticamente: admissão/alta em 2 dias, pendências e equipe em 1 dia. Apenas totais diários são preservados.
          </span>
        </p>
      </div>
    </div>
  );
}
