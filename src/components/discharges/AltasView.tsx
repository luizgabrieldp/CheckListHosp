"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AltaPaciente } from "@/types/hospital";
import { ModalAltaForm } from "./ModalAltaForm";
import { gerarMensagemAlta, compartilharOuCopiar } from "@/lib/whatsapp";
import { formatarDataBR } from "@/lib/utils";
import {
  Plus,
  Share2,
  Activity,
  Heart,
  Search,
  CheckCircle2,
  Trash2,
  Edit3,
  Camera,
  AlertTriangle,
  Sparkles,
  Maximize2,
  X,
} from "lucide-react";

export function AltasView() {
  const altas = useAppStore((s) => s.altas);
  const salvarAlta = useAppStore((s) => s.salvarAlta);
  const removerAlta = useAppStore((s) => s.removerAlta);

  const [busca, setBusca] = useState("");
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [altaEmEdicao, setAltaEmEdicao] = useState<AltaPaciente | null>(null);
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function exibirToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // Filtragem
  const altasFiltradas = altas.filter((a) => {
    const termo = busca.toLowerCase();
    return (
      a.nomePaciente.toLowerCase().includes(termo) ||
      a.leito.toLowerCase().includes(termo) ||
      a.tipoCirurgia.toLowerCase().includes(termo)
    );
  });

  // Converter dataUrl para File se necessário para Web Share API
  async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type || "image/webp" });
  }

  async function handleCompartilhar(alta: AltaPaciente) {
    const texto = gerarMensagemAlta(alta);
    let fotoFile: File | null = null;

    if (alta.fotoFeridaUrl && alta.fotoFeridaUrl.startsWith("data:")) {
      try {
        fotoFile = await dataUrlToFile(
          alta.fotoFeridaUrl,
          `ferida_${alta.leito.replace(/\s+/g, "_")}.webp`
        );
      } catch (err) {
        console.warn("Erro ao preparar arquivo de imagem para share:", err);
      }
    }

    const res = await compartilharOuCopiar(
      texto,
      fotoFile,
      `Alta / PO - ${alta.leito} (${alta.nomePaciente})`
    );
    exibirToast(res.mensagem);
  }

  return (
    <div className="space-y-6">
      {/* TOAST FLUTUANTE */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-teal-500/50 text-teal-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOPO: AÇÕES E TÍTULO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Módulo de Altas & Feridas Cirúrgicas
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 font-medium">
              {altasFiltradas.length} pacientes
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Critérios de alta cirúrgica, sinais vitais e envio de fotos para WhatsApp com compressão WebP
          </p>
        </div>

        <button
          onClick={() => {
            setAltaEmEdicao(null);
            setModalFormAberto(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/25 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Alta / Evolução</span>
        </button>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="glass-card rounded-2xl p-3 flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por paciente, leito, procedimento cirúrgico..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-xs focus:border-teal-500 focus:outline-none placeholder-slate-500"
          />
        </div>
      </div>

      {/* GRID DE ALTAS */}
      {altasFiltradas.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-slate-800 p-8">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">Nenhum registro de alta encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre uma nova avaliação pós-operatória com parâmetros rápidos e fotos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {altasFiltradas.map((alta) => {
            const hasQueixas = alta.temQueixas;
            const satBaixa = alta.sinaisVitais.saturacaoO2 < 94;
            const fcAlterada =
              alta.sinaisVitais.frequenciaCardiaca < 50 || alta.sinaisVitais.frequenciaCardiaca > 100;

            return (
              <div
                key={alta.id}
                className="rounded-2xl glass-card border border-slate-800/80 hover:border-teal-500/40 p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-teal-500/5"
              >
                <div>
                  {/* CABEÇALHO DO CARD */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-teal-950/70 text-teal-300 border border-teal-700/50 shadow-sm">
                      {alta.leito}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatarDataBR(alta.dataAlta)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1">{alta.nomePaciente}</h3>
                  <p className="text-xs text-cyan-400 font-semibold mt-0.5 line-clamp-1">
                    {alta.tipoCirurgia}
                  </p>
                  <p className="text-[11px] text-slate-400">{alta.enfermaria}</p>

                  {/* PARÂMETROS RÁPIDOS */}
                  <div className="grid grid-cols-4 gap-1.5 my-3 text-center">
                    {[
                      { l: "Dieta", v: alta.parametros.dieta },
                      { l: "Deamb.", v: alta.parametros.deambulou },
                      { l: "Diurese", v: alta.parametros.diurese },
                      { l: "Evac.", v: alta.parametros.evacuacao },
                    ].map((p) => (
                      <div
                        key={p.l}
                        className={`p-1.5 rounded-lg border text-[10px] font-bold ${
                          p.v
                            ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                            : "bg-slate-900/60 text-slate-400 border-slate-800"
                        }`}
                      >
                        <div>{p.l}</div>
                        <div className="text-[9px] font-normal">{p.v ? "Sim" : "Não"}</div>
                      </div>
                    ))}
                  </div>

                  {/* SINAIS VITAIS */}
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                        fcAlterada
                          ? "bg-amber-950/40 text-amber-300 border-amber-500/40 font-bold"
                          : "bg-slate-900/80 text-slate-300 border-slate-800"
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>{alta.sinaisVitais.frequenciaCardiaca} bpm</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                        satBaixa
                          ? "bg-rose-950/40 text-rose-300 border-rose-500/40 font-bold animate-pulse"
                          : "bg-slate-900/80 text-slate-300 border-slate-800"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{alta.sinaisVitais.saturacaoO2}% SatO2</span>
                    </div>
                  </div>

                  {/* QUEIXAS SE HOUVER */}
                  {hasQueixas ? (
                    <div className="mt-3 p-2 rounded-xl bg-rose-950/20 border border-rose-500/40 text-[11px] text-rose-300">
                      <div className="font-bold flex items-center gap-1 text-rose-400 mb-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Queixas Atuais:</span>
                      </div>
                      <p className="line-clamp-2">{alta.detalhesQueixas || "Relatou dor/desconforto."}</p>
                    </div>
                  ) : (
                    <div className="mt-2.5 text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sem queixas ou intercorrências.</span>
                    </div>
                  )}

                  {/* THUMBNAIL DA FOTO SE HOUVER */}
                  {alta.fotoFeridaUrl && (
                    <div className="mt-3">
                      <div
                        onClick={() => setFotoModalUrl(alta.fotoFeridaUrl || null)}
                        className="relative rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-950 h-28 cursor-pointer group"
                      >
                        <img
                          src={alta.fotoFeridaUrl}
                          alt="Foto da ferida"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs gap-1 transition-opacity">
                          <Maximize2 className="w-4 h-4" />
                          <span>Ampliar</span>
                        </div>
                        <span className="absolute bottom-1 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-cyan-300">
                          WebP Comprimido
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCompartilhar(alta)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp {alta.fotoFeridaUrl ? "+ Foto" : ""}</span>
                  </button>

                  <button
                    onClick={() => {
                      setAltaEmEdicao(alta);
                      setModalFormAberto(true);
                    }}
                    title="Editar alta"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Excluir alta do leito ${alta.leito}?`)) {
                        removerAlta(alta.id);
                        exibirToast("Alta removida com sucesso.");
                      }
                    }}
                    title="Excluir"
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-rose-900/30 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA VISUALIZAR FOTO AMPLIADA */}
      {fotoModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-cyan-500/40">
            <img src={fotoModalUrl} alt="Ferida Cirúrgica Ampliada" className="max-h-[80vh] w-auto object-contain" />
            <button
              onClick={() => setFotoModalUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {modalFormAberto && (
        <ModalAltaForm
          altaExistente={altaEmEdicao}
          onSalvar={(a) => {
            salvarAlta(a);
            exibirToast("Alta / PO salva e sincronizada em tempo real!");
          }}
          onClose={() => {
            setModalFormAberto(false);
            setAltaEmEdicao(null);
          }}
        />
      )}
    </div>
  );
}
