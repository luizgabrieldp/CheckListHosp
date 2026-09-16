"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { formatarDataBR } from "@/lib/utils";
import {
  ShieldCheck,
  Clock,
  Trash2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  RefreshCw,
  FileCheck,
} from "lucide-react";

export function MetricasLgpdView() {
  const metricas = useAppStore((s) => s.metricas || []);
  const admissoes = useAppStore((s) => s.admissoes);
  const altas = useAppStore((s) => s.altas);

  const [periodo, setPeriodo] = useState<7 | 14 | 30>(7);
  const [executandoExpurgo, setExecutandoExpurgo] = useState(false);
  const [statusExpurgo, setStatusExpurgo] = useState<string | null>(null);

  // Filtrar métricas dos últimos N dias
  const metricasExibidas = metricas.slice(-periodo);

  // Totais agregados do período
  const totalAdmissoesPeriodo = metricasExibidas.reduce((acc, m) => acc + m.totalAdmissoes, 0);
  const totalAltasPeriodo = metricasExibidas.reduce((acc, m) => acc + m.totalAltas, 0);
  const totalCancelamentosPeriodo = metricasExibidas.reduce(
    (acc, m) => acc + m.totalCancelamentos,
    0
  );
  const totalCirurgiasPeriodo = metricasExibidas.reduce((acc, m) => acc + m.totalCirurgias, 0);

  // Máximo para escala dos gráficos de barra
  const valorMaximo = Math.max(
    ...metricasExibidas.map((m) => Math.max(m.totalAdmissoes, m.totalAltas, m.totalCirurgias, 1)),
    10
  );

  async function handleForcarExpurgo() {
    setExecutandoExpurgo(true);
    setStatusExpurgo(null);
    try {
      const res = await fetch("/api/expurgo-lgpd", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setStatusExpurgo(
          `Varredura concluída: ${data.resultado.expurgadasAdmissoes} admissão(ões) antigas arquivadas em métricas anônimas com sucesso.`
        );
      }
    } catch {
      setStatusExpurgo("Não foi possível conectar ao motor de expurgo no momento.");
    } finally {
      setExecutandoExpurgo(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* TOPO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Retenção LGPD & Métricas Históricas
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Conformidade Ativa
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Política rigorosa de expurgo clínico (48h a partir da data agendada) e preservação de agregados
          </p>
        </div>

        <button
          onClick={handleForcarExpurgo}
          disabled={executandoExpurgo}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-500/40 transition-all active:scale-95 disabled:opacity-50 self-start md:self-auto shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${executandoExpurgo ? "animate-spin" : ""}`} />
          <span>Executar Auditoria de Expurgo</span>
        </button>
      </div>

      {/* FEEDBACK DO EXPURGO */}
      {statusExpurgo && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusExpurgo}</span>
        </div>
      )}

      {/* REGRAS DE CONFORMIDADE LGPD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-cyan-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Regra de Expurgo de 48h (Data Agendada)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Dados clínicos detalhados de Admissões e Altas são apagados após 48 horas calculadas <strong>a partir da data agendada de admissão</strong> (e não da criação no banco). Isso protege pacientes agendados para datas futuras contra remoção precoce.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-blue-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider">
            <FileCheck className="w-4 h-4" />
            <span>Preservação de Totais Agregados Anônimos</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Antes de qualquer prontuário ser expurgado, os totais numéricos (admissões, altas e cancelamentos) são computados e arquivados de forma 100% desprovida de dados pessoais para gerar os gráficos de gestão da enfermaria.
          </p>
        </div>
      </div>

      {/* CARDS DE RESUMO DO PERÍODO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Admissões Realizadas</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{totalAdmissoesPeriodo}</div>
          <span className="text-[10px] text-slate-500">Últimos {periodo} dias</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Altas Hospitalares</span>
          <div className="text-2xl font-bold text-teal-400 mt-1">{totalAltasPeriodo}</div>
          <span className="text-[10px] text-slate-500">Últimos {periodo} dias</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Cirurgias Concluídas</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{totalCirurgiasPeriodo}</div>
          <span className="text-[10px] text-slate-500">Últimos {periodo} dias</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Cancelamentos</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{totalCancelamentosPeriodo}</div>
          <span className="text-[10px] text-slate-500">Últimos {periodo} dias</span>
        </div>
      </div>

      {/* SELETOR DE PERÍODO & GRÁFICO HISTÓRICO */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Gráfico de Tendência da Rotina Cirúrgica
            </h3>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {([7, 14, 30] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  periodo === p
                    ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {p} Dias
              </button>
            ))}
          </div>
        </div>

        {/* LEGENDA */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-cyan-500" />
            <span className="text-slate-300">Admissões</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-teal-400" />
            <span className="text-slate-300">Altas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-500" />
            <span className="text-slate-300">Cancelamentos</span>
          </div>
        </div>

        {/* BARRAS DE TENDÊNCIA HISTÓRICA */}
        <div className="overflow-x-auto pt-2">
          <div className="min-w-[600px] flex items-end justify-between gap-2 h-56 px-2 border-b border-slate-800">
            {metricasExibidas.map((item) => {
              const altAdm = (item.totalAdmissoes / valorMaximo) * 100;
              const altAlta = (item.totalAltas / valorMaximo) * 100;
              const altCanc = (item.totalCancelamentos / valorMaximo) * 100;

              return (
                <div key={item.data} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    {/* BARRA ADMISSÕES */}
                    <div
                      style={{ height: `${Math.max(altAdm, 4)}%` }}
                      title={`Admissões: ${item.totalAdmissoes}`}
                      className="w-2.5 rounded-t bg-cyan-500 group-hover:bg-cyan-400 transition-all shadow-sm"
                    />
                    {/* BARRA ALTAS */}
                    <div
                      style={{ height: `${Math.max(altAlta, 4)}%` }}
                      title={`Altas: ${item.totalAltas}`}
                      className="w-2.5 rounded-t bg-teal-400 group-hover:bg-teal-300 transition-all shadow-sm"
                    />
                    {/* BARRA CANCELAMENTOS */}
                    {item.totalCancelamentos > 0 && (
                      <div
                        style={{ height: `${Math.max(altCanc, 4)}%` }}
                        title={`Cancelamentos: ${item.totalCancelamentos}`}
                        className="w-2.5 rounded-t bg-rose-500 group-hover:bg-rose-400 transition-all shadow-sm"
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 truncate w-full text-center">
                    {item.data.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
