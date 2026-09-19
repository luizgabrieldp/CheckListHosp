"use client";

import React, { useState, useRef } from "react";
import { AltaPaciente } from "@/types/hospital";
import { comprimirImagemParaWebP, ResultadoCompressao } from "@/lib/image-compressor";
import { obterDataLocalHoje } from "@/lib/utils";
import {
  X,
  Save,
  Camera,
  Upload,
  AlertCircle,
  Activity,
  Heart,
  CheckCircle2,
  FileImage,
  Sparkles,
} from "lucide-react";

interface Props {
  altaExistente?: AltaPaciente | null;
  onSalvar: (alta: AltaPaciente, fotoFile?: File | null) => void;
  onClose: () => void;
}

export function ModalAltaForm({ altaExistente, onSalvar, onClose }: Props) {
  const [leito, setLeito] = useState(altaExistente?.leito || "");
  const [enfermaria, setEnfermaria] = useState(altaExistente?.enfermaria || "Cirurgia Geral 1");
  const [nomePaciente, setNomePaciente] = useState(altaExistente?.nomePaciente || "");
  const [tipoCirurgia, setTipoCirurgia] = useState(altaExistente?.tipoCirurgia || "PO 1 ");
  const [dataAlta, setDataAlta] = useState(
    altaExistente?.dataAlta || obterDataLocalHoje()
  );

  // Parâmetros de recuperação
  const [dieta, setDieta] = useState(altaExistente?.parametros.dieta ?? true);
  const [deambulou, setDeambulou] = useState(altaExistente?.parametros.deambulou ?? true);
  const [diurese, setDiurese] = useState(altaExistente?.parametros.diurese ?? true);
  const [evacuacao, setEvacuacao] = useState(altaExistente?.parametros.evacuacao ?? true);

  // Sinais vitais
  const [fc, setFc] = useState(altaExistente?.sinaisVitais.frequenciaCardiaca?.toString() || "76");
  const [satO2, setSatO2] = useState(altaExistente?.sinaisVitais.saturacaoO2?.toString() || "98");
  const [pa, setPa] = useState(altaExistente?.sinaisVitais.pressaoArterial || "120/80");

  // Queixas
  const [temQueixas, setTemQueixas] = useState(altaExistente?.temQueixas ?? false);
  const [detalhesQueixas, setDetalhesQueixas] = useState(altaExistente?.detalhesQueixas || "");

  // Foto da ferida
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(altaExistente?.fotoFeridaUrl);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [compressaoInfo, setCompressaoInfo] = useState<string | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  async function handleSelecionarArquivo(file: File) {
    if (!file) return;
    setProcessandoFoto(true);
    try {
      const res: ResultadoCompressao = await comprimirImagemParaWebP(file);
      setFotoUrl(res.dataUrl);
      setFotoFile(res.arquivo);
      setCompressaoInfo(
        `Comprimido para WebP: ${res.tamanhoFormatado} (original: ${Math.round(
          res.tamanhoOriginalBytes / 1024
        )} KB)`
      );
    } catch (err) {
      console.error("Erro na compressão:", err);
      alert("Não foi possível processar a imagem.");
    } finally {
      setProcessandoFoto(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leito.trim() || !nomePaciente.trim()) return;

    const novaAlta: AltaPaciente = {
      id: altaExistente?.id || `alta-${Date.now()}`,
      leito: leito.trim(),
      enfermaria,
      nomePaciente: nomePaciente.trim(),
      tipoCirurgia: tipoCirurgia.trim(),
      temQueixas,
      detalhesQueixas: temQueixas ? detalhesQueixas.trim() : undefined,
      parametros: {
        dieta,
        deambulou,
        diurese,
        evacuacao,
      },
      sinaisVitais: {
        frequenciaCardiaca: parseInt(fc, 10) || 75,
        saturacaoO2: parseInt(satO2, 10) || 98,
        pressaoArterial: pa.trim(),
      },
      fotoFeridaUrl: fotoUrl,
      dataAlta,
      createdAt: altaExistente?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSalvar(novaAlta, fotoFile);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl glass-card border border-cyan-500/40 p-5 md:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {altaExistente ? "Editar Alta / Evolução PO" : "Nova Alta / Avaliação de Ferida"}
              </h3>
              <p className="text-xs text-slate-400">
                Parâmetros pós-operatórios, sinais vitais e registro de incisão cirúrgica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
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
                placeholder="Ex: 04"
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

            <div>
              <div className="h-6 flex items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Nome do Paciente *
                </label>
              </div>
              <input
                type="text"
                required
                value={nomePaciente}
                onChange={(e) => setNomePaciente(e.target.value)}
                placeholder="Nome do paciente"
                className="w-full h-[40px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Procedimento / Cirurgia Realizada (PO) *
            </label>
            <input
              type="text"
              required
              value={tipoCirurgia}
              onChange={(e) => setTipoCirurgia(e.target.value)}
              placeholder="Ex: PO 1 Colecistectomia Videolaparoscópica"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* PARÂMETROS RÁPIDOS DE RECUPERAÇÃO */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Parâmetros Rápidos de Pós-Operatório
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "Dieta", val: dieta, set: setDieta, sub: "Tolerou" },
                { label: "Deambulou", val: deambulou, set: setDeambulou, sub: "Ativo" },
                { label: "Diurese", val: diurese, set: setDiurese, sub: "Presente" },
                { label: "Evacuação", val: evacuacao, set: setEvacuacao, sub: "Presente" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => item.set(!item.val)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    item.val
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xs font-bold">{item.label}</span>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span>{item.val ? item.sub : "Não / Ausente"}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.val ? "bg-emerald-400" : "bg-slate-600"
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SINAIS VITAIS */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-400" />
                FC (bpm)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={fc}
                onChange={(e) => setFc(e.target.value)}
                placeholder="Ex: 78"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                SatO2 (%)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={satO2}
                onChange={(e) => setSatO2(e.target.value)}
                placeholder="Ex: 98"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                PA (mmHg)
              </label>
              <input
                type="text"
                value={pa}
                onChange={(e) => setPa(e.target.value)}
                placeholder="Ex: 120/80"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* QUEIXAS */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Paciente Apresenta Queixas Atuais?
                </span>
                <span className="text-[11px] text-slate-400">
                  Dor, náuseas, vômitos ou intercorrências
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTemQueixas(!temQueixas)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  temQueixas
                    ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {temQueixas ? "Sim, possui" : "Sem queixas"}
              </button>
            </div>

            {temQueixas && (
              <textarea
                rows={2}
                value={detalhesQueixas}
                onChange={(e) => setDetalhesQueixas(e.target.value)}
                placeholder="Descreva a queixa, intensidade da dor, conduta administrada..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-rose-500/50 text-rose-100 placeholder-rose-400/40 text-xs focus:border-rose-400 focus:outline-none animate-in fade-in"
              />
            )}
          </div>

          {/* UPLOAD E COMPRESSÃO DE FOTO DA FERIDA CIRÚRGICA */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">
                  Foto da Ferida Cirúrgica (Otimizada WebP &lt; 1MB)
                </span>
              </div>
              {processandoFoto && (
                <span className="text-[11px] text-cyan-400 animate-pulse font-medium">
                  Comprimindo imagem...
                </span>
              )}
            </div>

            {/* PREVIEW SE EXISTIR FOTO */}
            {fotoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 bg-slate-950 max-h-48 flex items-center justify-center group">
                <img
                  src={fotoUrl}
                  alt="Ferida cirúrgica"
                  className="max-h-48 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFotoUrl(undefined);
                    setFotoFile(null);
                    setCompressaoInfo(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white text-xs transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* BOTÃO CÂMERA MOBILE */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-3 px-2 rounded-xl bg-slate-900 border border-dashed border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all"
                >
                  <Camera className="w-5 h-5 text-cyan-400" />
                  <span>Tirar Foto (Câmera)</span>
                </button>

                {/* BOTÃO ARQUIVO / GALERIA */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-2 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span>Escolher da Galeria</span>
                </button>
              </div>
            )}

            {/* INPUTS ESCONDIDOS */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleSelecionarArquivo(e.target.files[0]);
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleSelecionarArquivo(e.target.files[0]);
              }}
            />

            {compressaoInfo && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {compressaoInfo}
              </p>
            )}
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-3 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alta / PO</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
