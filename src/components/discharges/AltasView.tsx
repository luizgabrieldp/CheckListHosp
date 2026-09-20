"use client";

import React, { useState, useMemo, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AltaPaciente } from "@/types/hospital";
import { gerarMensagemAlta, compartilharOuCopiar } from "@/lib/whatsapp";
import { comprimirImagemParaWebP } from "@/lib/image-compressor";
import {
  salvarFotosFirestore,
  obterFotosFirestore,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { obterDataLocalHoje } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Search,
  Plus,
  Hospital,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Share2,
  Trash2,
  Camera,
  Upload,
  CheckCircle2,
  X,
  Maximize2,
  ArrowUpDown,
  AlertCircle,
  FileImage,
  Info,
} from "lucide-react";

export function AltasView() {
  const altas = useAppStore((s) => s.altas);
  const salvarAlta = useAppStore((s) => s.salvarAlta);
  const removerAlta = useAppStore((s) => s.removerAlta);
  const enfermarias = useAppStore((s) => s.enfermarias);
  const adicionarEnfermaria = useAppStore((s) => s.adicionarEnfermaria);

  // Data selecionada no topo (padrão: hoje no fuso local)
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    return obterDataLocalHoje();
  });

  const [busca, setBusca] = useState("");
  const [filtroEnfermaria, setFiltroEnfermaria] = useState<string>("TODAS");
  const [ordenacao, setOrdenacao] = useState<"leito" | "nome">("leito");
  const [pacienteExpandidoId, setPacienteExpandidoId] = useState<string | null>(null);
  const [modalNovoPaciente, setModalNovoPaciente] = useState(false);
  const [modalFotos, setModalFotos] = useState<string[]>([]);
  const [modalFotoIdx, setModalFotoIdx] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Estados para adição rápida de nova enfermaria in-place
  const [adicionandoEnfModal, setAdicionandoEnfModal] = useState(false);
  const [nomeNovaEnfModal, setNomeNovaEnfModal] = useState("");
  const [adicionandoEnfPacienteId, setAdicionandoEnfPacienteId] = useState<string | null>(null);
  const [nomeNovaEnfPaciente, setNomeNovaEnfPaciente] = useState("");

  // Estado do form para novo paciente de alta
  const [novoLeito, setNovoLeito] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaEnfermaria, setNovaEnfermaria] = useState("FGH");
  const [novoPO, setNovoPO] = useState("");

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function exibirToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // Filtrar pacientes da data selecionada
  const altasDaData = useMemo(() => {
    return altas.filter((a) => a.dataAlta === dataSelecionada);
  }, [altas, dataSelecionada]);

  // Filtragem e busca
  const altasFiltradas = useMemo(() => {
    return altasDaData.filter((a) => {
      const termo = busca.toLowerCase();
      const bateTexto =
        a.nomePaciente.toLowerCase().includes(termo) ||
        Boolean(a.leito && a.leito.toLowerCase().includes(termo)) ||
        Boolean(a.tipoCirurgia && a.tipoCirurgia.toLowerCase().includes(termo));
      if (!bateTexto) return false;

      if (filtroEnfermaria === "TODAS") return true;
      return a.enfermaria.trim().toLowerCase() === filtroEnfermaria.trim().toLowerCase();
    });
  }, [altasDaData, busca, filtroEnfermaria]);

  // Agrupamento por enfermaria com ordenação (Leito ou Nome)
  const altasAgrupadas = useMemo(() => {
    const grupos: Record<string, AltaPaciente[]> = {};

    altasFiltradas.forEach((p) => {
      const enf = p.enfermaria?.trim() || "SEM ENFERMARIA";
      if (!grupos[enf]) grupos[enf] = [];
      grupos[enf].push(p);
    });

    Object.keys(grupos).forEach((enf) => {
      grupos[enf].sort((a, b) => {
        if (ordenacao === "leito") {
          const numA = parseInt((a.leito || "").replace(/\D/g, ""), 10) || 0;
          const numB = parseInt((b.leito || "").replace(/\D/g, ""), 10) || 0;
          if (numA === 0 && numB > 0) return 1; // Sem leito vai para o final
          if (numB === 0 && numA > 0) return -1;
          if (numA !== numB) return numA - numB;
          return a.nomePaciente.localeCompare(b.nomePaciente);
        }
        return a.nomePaciente.localeCompare(b.nomePaciente);
      });
    });

    return grupos;
  }, [altasFiltradas, ordenacao]);

  // Converter dataUrl para File para Web Share API
  async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type || "image/webp" });
  }

  // Visualização de foto ampliada
  function abrirVisualizadorFoto(fotos: string[], index: number = 0) {
    if (!fotos.length) return;
    setModalFotos(fotos);
    setModalFotoIdx(index);
  }

  function fecharVisualizadorFoto() {
    setModalFotos([]);
    setModalFotoIdx(0);
  }

  // Compartilhar WhatsApp com suporte nativo a bloco de fotos (até 5) no mobile e download no desktop.
  // A legenda com o relatório clínico da alta acompanha a última foto enviada como fechamento da mensagem.
  async function handleCompartilhar(alta: AltaPaciente) {
    const texto = gerarMensagemAlta(alta);
    const fotosList = (alta.fotosFeridaUrls && alta.fotosFeridaUrls.length > 0)
      ? alta.fotosFeridaUrls
      : (alta.fotoFeridaUrl ? [alta.fotoFeridaUrl] : []);

    const fotoFiles: File[] = [];
    const totalFotos = fotosList.length;

    for (let i = 0; i < totalFotos; i++) {
      const dataUrl = fotosList[i];
      if (dataUrl && dataUrl.startsWith("data:")) {
        try {
          const leitoSafe = (alta.leito || "semlt").replace(/\s+/g, "_");
          const nomeSafe = (alta.nomePaciente || "paciente").replace(/\s+/g, "_").toLowerCase();
          const isUltima = i === totalFotos - 1;
          const sufixo = totalFotos > 1
            ? (isUltima ? `_${i + 1}_final_legenda` : `_${i + 1}`)
            : "";
          const file = await dataUrlToFile(
            dataUrl,
            `alta_${leitoSafe}_${nomeSafe}${sufixo}.webp`
          );
          fotoFiles.push(file);
        } catch (err) {
          console.warn("Erro ao preparar arquivo de imagem para share:", err);
        }
      }
    }

    const leitoValido = alta.leito?.trim();
    const titulo = leitoValido
      ? `Alta PO - LT ${leitoValido} (${alta.nomePaciente})`
      : `Alta PO - ${alta.nomePaciente}`;

    const res = await compartilharOuCopiar(
      texto,
      fotoFiles,
      titulo
    );
    exibirToast(res.mensagem);
  }

  // Recuperar fotos salvas de forma dedicada caso o dispositivo local ainda não as tenha em cache
  React.useEffect(() => {
    if (!isFirebaseConfigured()) return;
    altas.forEach(async (a) => {
      const temFotos = (a.fotosFeridaUrls && a.fotosFeridaUrls.length > 0) || Boolean(a.fotoFeridaUrl);
      if (!temFotos) {
        const fotosSalvas = await obterFotosFirestore(a.id);
        if (fotosSalvas && fotosSalvas.length > 0) {
          salvarAlta({
            ...a,
            fotosFeridaUrls: fotosSalvas,
            fotoFeridaUrl: fotosSalvas[0],
          });
        }
      }
    });
  }, [altas.length]);

  // Upload e compressão de múltiplas fotos para WebP (até 5 fotos)
  async function handleUploadFotos(paciente: AltaPaciente, listaArquivos: FileList | File[]) {
    const arquivos = Array.from(listaArquivos);
    if (!arquivos.length) return;

    const fotosAtuais = (paciente.fotosFeridaUrls && paciente.fotosFeridaUrls.length > 0)
      ? [...paciente.fotosFeridaUrls]
      : (paciente.fotoFeridaUrl ? [paciente.fotoFeridaUrl] : []);

    if (fotosAtuais.length >= 5) {
      exibirToast("Limite máximo de 5 fotos atingido para este paciente.");
      return;
    }

    const vagas = 5 - fotosAtuais.length;
    const aProcessar = arquivos.slice(0, vagas);

    try {
      exibirToast(`Comprimindo ${aProcessar.length} foto(s) para WebP...`);
      const novasUrls: string[] = [];

      for (const arq of aProcessar) {
        const resultado = await comprimirImagemParaWebP(arq);
        novasUrls.push(resultado.dataUrl);
      }

      const listaFinal = [...fotosAtuais, ...novasUrls];
      salvarAlta({
        ...paciente,
        fotosFeridaUrls: listaFinal,
        fotoFeridaUrl: listaFinal[0],
        updatedAt: new Date().toISOString(),
      });
      salvarFotosFirestore(paciente.id, listaFinal).catch(() => {});
      exibirToast(`${novasUrls.length} foto(s) anexada(s)! Total: ${listaFinal.length}/5`);
    } catch (err) {
      console.error("Erro no upload de fotos:", err);
      exibirToast("Erro ao processar imagens.");
    }
  }

  // Remover foto individual da galeria do paciente
  function handleRemoverFoto(paciente: AltaPaciente, index: number) {
    const fotosAtuais = (paciente.fotosFeridaUrls && paciente.fotosFeridaUrls.length > 0)
      ? [...paciente.fotosFeridaUrls]
      : (paciente.fotoFeridaUrl ? [paciente.fotoFeridaUrl] : []);

    const listaFinal = fotosAtuais.filter((_, idx) => idx !== index);
    salvarAlta({
      ...paciente,
      fotosFeridaUrls: listaFinal,
      fotoFeridaUrl: listaFinal[0] || undefined,
      updatedAt: new Date().toISOString(),
    });
    salvarFotosFirestore(paciente.id, listaFinal).catch(() => {});
    exibirToast("Foto removida.");
  }

  // Criação de novo paciente de alta (leito opcional)
  function handleCriarPaciente(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const nova: AltaPaciente = {
      id: `alta-${Date.now()}`,
      leito: novoLeito.trim() || undefined,
      nomePaciente: novoNome.trim(),
      enfermaria: novaEnfermaria.trim() || "FGH",
      tipoCirurgia: novoPO.trim() || "",
      temQueixas: false,
      detalhesQueixas: "",
      parametros: {
        dieta: true,
        deambulou: true,
        diurese: true,
        evacuacao: false,
      },
      sinaisVitais: {
        frequenciaCardiaca: 75,
        saturacaoO2: 98,
      },
      dataAlta: dataSelecionada,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    salvarAlta(nova);
    setNovoNome("");
    setNovoLeito("");
    setNovoPO("");
    setModalNovoPaciente(false);
    setPacienteExpandidoId(nova.id);
    exibirToast("Paciente de alta adicionado com sucesso!");
  }

  function handleSalvarNovaEnfermariaModal(e: React.FormEvent) {
    e.preventDefault();
    const limpo = nomeNovaEnfModal.trim();
    if (!limpo) return;
    adicionarEnfermaria(limpo);
    setNovaEnfermaria(limpo);
    setNomeNovaEnfModal("");
    setAdicionandoEnfModal(false);
    exibirToast(`Enfermaria "${limpo}" adicionada e selecionada!`);
  }

  function handleSalvarNovaEnfermariaPaciente(e: React.FormEvent, paciente: AltaPaciente) {
    e.preventDefault();
    const limpo = nomeNovaEnfPaciente.trim();
    if (!limpo) return;
    adicionarEnfermaria(limpo);
    salvarAlta({
      ...paciente,
      enfermaria: limpo,
      updatedAt: new Date().toISOString(),
    });
    setNomeNovaEnfPaciente("");
    setAdicionandoEnfPacienteId(null);
    exibirToast(`Enfermaria "${limpo}" atribuída ao paciente!`);
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* TOAST FLUTUANTE */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SELETOR DE DATA NO TOPO (ESTILO BASE44) */}
      <div className="clean-card rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <span>Data de Trabalho:</span>
          </div>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
          />
        </div>

        <button
          onClick={() => setModalNovoPaciente(true)}
          className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Paciente</span>
        </button>
      </div>

      {/* BARRA DE BUSCA, ORDENAÇÃO E PÍLULAS DE ENFERMARIA */}
      <div className="clean-card rounded-2xl p-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar paciente por nome, leito ou cirurgia..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* SELETOR DE ORDENAÇÃO */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as "leito" | "nome")}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none cursor-pointer"
            >
              <option value="leito">Ordenar por Leito</option>
              <option value="nome">Ordenar por Nome</option>
            </select>
          </div>
        </div>

        {/* PÍLULAS DE FILTRO DINÂMICAS POR ENFERMARIA (DE CONFIGURAÇÕES) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFiltroEnfermaria("TODAS")}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center ${
              filtroEnfermaria === "TODAS"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            Todas
          </button>
          {enfermarias.map((enf) => (
            <button
              key={enf}
              onClick={() => setFiltroEnfermaria(enf)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center ${
                filtroEnfermaria.toLowerCase() === enf.toLowerCase()
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              {enf}
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM AGRUPADA POR ENFERMARIA (ESTILO BASE44) */}
      <div>
        {Object.keys(altasAgrupadas).length === 0 ? (
          <div className="clean-card rounded-2xl p-12 text-center text-slate-400 text-xs">
            Nenhum paciente de alta encontrado para esta data ou filtro.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(altasAgrupadas).map(([enfermariaNome, pacientes]) => (
              <div key={enfermariaNome} className="space-y-2">
                {/* CABEÇALHO DA ENFERMARIA */}
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800 px-1">
                  <Hospital className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{enfermariaNome}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({pacientes.length} paciente{pacientes.length !== 1 ? "s" : ""})
                  </span>
                </div>

                {/* LISTA DE PACIENTES EM ACORDEÃO DESLIZANTE */}
                <div className="space-y-2">
                  {pacientes.map((paciente) => {
                    const isExpandido = pacienteExpandidoId === paciente.id;

                    return (
                      <div
                        key={paciente.id}
                        className={`clean-card rounded-xl transition-all overflow-hidden ${
                          isExpandido
                            ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm"
                            : "hover:border-slate-300"
                        } bg-white`}
                      >
                        {/* CABEÇALHO DO ACORDEÃO COM NOME DO PACIENTE EM EVIDÊNCIA MÁXIMA */}
                        <div
                          onClick={() =>
                            setPacienteExpandidoId(isExpandido ? null : paciente.id)
                          }
                          className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            {isExpandido ? (
                              <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                {paciente.nomePaciente}
                              </h3>
                              <span className="text-xs text-slate-500 font-medium">
                                {paciente.leito?.trim() ? `LT ${paciente.leito.trim()} · ` : ""}
                                {paciente.enfermaria}
                                {paciente.tipoCirurgia ? ` · ${paciente.tipoCirurgia}` : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {(() => {
                              const qtdFotos = (paciente.fotosFeridaUrls && paciente.fotosFeridaUrls.length > 0)
                                ? paciente.fotosFeridaUrls.length
                                : (paciente.fotoFeridaUrl ? 1 : 0);
                              if (qtdFotos === 0) return null;
                              return (
                                <span
                                  className="p-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200/60"
                                  title={`${qtdFotos} foto(s) da ferida anexada(s)`}
                                >
                                  <Camera className="w-3 h-3" />
                                  {qtdFotos === 1 ? "1 Foto" : `${qtdFotos} Fotos`}
                                </span>
                              );
                            })()}
                            {paciente.temQueixas ? (
                              <span className="text-[11px] font-semibold text-amber-600 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                                Com queixa
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-50">
                                Sem queixas
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CONTEÚDO EXPANDIDO (ANIMAÇÃO RÁPIDA E FLUIDA) */}
                        {isExpandido && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                            {/* LINHA 1: LEITO E ENFERMARIA */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Leito (Opcional)
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={paciente.leito || ""}
                                  onChange={(e) => {
                                    salvarAlta({
                                      ...paciente,
                                      leito: e.target.value.replace(/\D/g, "") || undefined,
                                      updatedAt: new Date().toISOString(),
                                    });
                                  }}
                                  placeholder="Ex: 15"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[11px] font-semibold text-slate-600">
                                    Enfermaria
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdicionandoEnfPacienteId(
                                        adicionandoEnfPacienteId === paciente.id ? null : paciente.id
                                      );
                                      setNomeNovaEnfPaciente("");
                                    }}
                                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5"
                                    title="Cadastrar nova enfermaria na hora"
                                  >
                                    <Plus className="w-3 h-3" /> Nova
                                  </button>
                                </div>

                                {adicionandoEnfPacienteId === paciente.id ? (
                                  <div className="flex gap-1.5 pt-0.5">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={nomeNovaEnfPaciente}
                                      onChange={(e) => setNomeNovaEnfPaciente(e.target.value)}
                                      placeholder="Nova enfermaria..."
                                      className="flex-1 px-2.5 py-1 rounded-lg border border-emerald-500 text-xs text-slate-900 bg-white focus:outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleSalvarNovaEnfermariaPaciente(e, paciente);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => handleSalvarNovaEnfermariaPaciente(e, paciente)}
                                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 flex items-center justify-center cursor-pointer"
                                    >
                                      OK
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAdicionandoEnfPacienteId(null)}
                                      className="min-h-[38px] min-w-[38px] px-2 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[11px] hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <select
                                    value={paciente.enfermaria}
                                    onChange={(e) => {
                                      salvarAlta({
                                        ...paciente,
                                        enfermaria: e.target.value,
                                        updatedAt: new Date().toISOString(),
                                      });
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                  >
                                    {enfermarias.map((enf) => (
                                      <option key={enf} value={enf}>
                                        {enf}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>

                            {/* LINHA 2: TIPO DE CIRURGIA (PO) */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Tipo de Cirurgia (PO)
                              </label>
                              <input
                                type="text"
                                value={paciente.tipoCirurgia}
                                onChange={(e) => {
                                  salvarAlta({
                                    ...paciente,
                                    tipoCirurgia: e.target.value,
                                    updatedAt: new Date().toISOString(),
                                  });
                                }}
                                placeholder="Ex: HIB+Hu"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              />
                            </div>

                            {/* LINHA 3: QUEIXAS (COM CHECKBOX INTERATIVO CONFORME PEDIDO) */}
                            <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={paciente.temQueixas}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      salvarAlta({
                                        ...paciente,
                                        temQueixas: checked,
                                        detalhesQueixas: checked ? paciente.detalhesQueixas || "" : "",
                                        updatedAt: new Date().toISOString(),
                                      });
                                    }}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                  />
                                  <span className="text-xs font-bold text-slate-800">
                                    Paciente tem queixas?
                                  </span>
                                </label>

                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                    paciente.temQueixas
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {paciente.temQueixas ? "Com queixa" : "Sem queixas"}
                                </span>
                              </div>

                              {paciente.temQueixas && (
                                <input
                                  type="text"
                                  autoFocus
                                  value={paciente.detalhesQueixas || ""}
                                  onChange={(e) => {
                                    salvarAlta({
                                      ...paciente,
                                      detalhesQueixas: e.target.value,
                                      updatedAt: new Date().toISOString(),
                                    });
                                  }}
                                  placeholder="Descreva a queixa (ex: Dor leve em sítio cirúrgico)..."
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 animate-in fade-in duration-150"
                                />
                              )}
                            </div>

                            {/* LINHA 4: 4 TOGGLES FISIOLÓGICOS (DIETA, DEAMBULOU, DIURESE, EVACUAÇÃO) */}
                            <div className="space-y-1.5">
                              {/* DIETA */}
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                                <span className="text-xs font-semibold text-slate-700">Dieta</span>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <span className="text-[11px] font-bold text-emerald-700">
                                    {paciente.parametros.dieta ? "Sim" : "Não"}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={paciente.parametros.dieta}
                                    onChange={(e) => {
                                      salvarAlta({
                                        ...paciente,
                                        parametros: {
                                          ...paciente.parametros,
                                          dieta: e.target.checked,
                                        },
                                        updatedAt: new Date().toISOString(),
                                      });
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                                </label>
                              </div>

                              {/* DEAMBULOU */}
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                                <span className="text-xs font-semibold text-slate-700">Deambulou</span>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <span className="text-[11px] font-bold text-emerald-700">
                                    {paciente.parametros.deambulou ? "Sim" : "Não"}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={paciente.parametros.deambulou}
                                    onChange={(e) => {
                                      salvarAlta({
                                        ...paciente,
                                        parametros: {
                                          ...paciente.parametros,
                                          deambulou: e.target.checked,
                                        },
                                        updatedAt: new Date().toISOString(),
                                      });
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                                </label>
                              </div>

                              {/* DIURESE */}
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                                <span className="text-xs font-semibold text-slate-700">Diurese</span>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <span className="text-[11px] font-bold text-emerald-700">
                                    {paciente.parametros.diurese ? "Sim" : "Não"}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={paciente.parametros.diurese}
                                    onChange={(e) => {
                                      salvarAlta({
                                        ...paciente,
                                        parametros: {
                                          ...paciente.parametros,
                                          diurese: e.target.checked,
                                        },
                                        updatedAt: new Date().toISOString(),
                                      });
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                                </label>
                              </div>

                              {/* EVACUAÇÃO */}
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                                <span className="text-xs font-semibold text-slate-700">Evacuação</span>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <span className="text-[11px] font-bold text-emerald-700">
                                    {paciente.parametros.evacuacao ? "Sim" : "Não"}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={paciente.parametros.evacuacao}
                                    onChange={(e) => {
                                      salvarAlta({
                                        ...paciente,
                                        parametros: {
                                          ...paciente.parametros,
                                          evacuacao: e.target.checked,
                                        },
                                        updatedAt: new Date().toISOString(),
                                      });
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                                </label>
                              </div>
                            </div>

                            {/* LINHA 5: SINAIS VITAIS (FC E SAT) */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  FC (bpm)
                                </label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={paciente.sinaisVitais.frequenciaCardiaca || ""}
                                  onChange={(e) => {
                                    salvarAlta({
                                      ...paciente,
                                      sinaisVitais: {
                                        ...paciente.sinaisVitais,
                                        frequenciaCardiaca: parseInt(e.target.value, 10) || 0,
                                      },
                                      updatedAt: new Date().toISOString(),
                                    });
                                  }}
                                  placeholder="75"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Sat (%)
                                </label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={paciente.sinaisVitais.saturacaoO2 || ""}
                                  onChange={(e) => {
                                    salvarAlta({
                                      ...paciente,
                                      sinaisVitais: {
                                        ...paciente.sinaisVitais,
                                        saturacaoO2: parseInt(e.target.value, 10) || 0,
                                      },
                                      updatedAt: new Date().toISOString(),
                                    });
                                  }}
                                  placeholder="98"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </div>
                            </div>

                            {/* LINHA 6: FOTOS DA FERIDA CIRÚRGICA / PACIENTE (ATÉ 5 FOTOS) */}
                            {(() => {
                              const fotosDoPaciente = (paciente.fotosFeridaUrls && paciente.fotosFeridaUrls.length > 0)
                                ? paciente.fotosFeridaUrls
                                : (paciente.fotoFeridaUrl ? [paciente.fotoFeridaUrl] : []);
                              const qtd = fotosDoPaciente.length;

                              return (
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                      <Camera className="w-3.5 h-3.5 text-emerald-700" />
                                      Fotos da Ferida / Incisão ({qtd}/5)
                                    </span>
                                    {qtd < 5 ? (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() => cameraInputRefs.current[paciente.id]?.click()}
                                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                          title="Tirar foto com a câmera"
                                        >
                                          <Camera className="w-4 h-4 text-emerald-600" /> Câmera
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => fileInputRefs.current[paciente.id]?.click()}
                                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                          title="Carregar fotos da galeria (múltiplas)"
                                        >
                                          <Upload className="w-4 h-4 text-emerald-600" /> Galeria (Múltiplas)
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                        Limite de 5 fotos atingido
                                      </span>
                                    )}
                                  </div>

                                  {/* INPUTS OCULTOS DE CÂMERA E ARQUIVO */}
                                  <input
                                    ref={(el) => {
                                      cameraInputRefs.current[paciente.id] = el;
                                    }}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files) handleUploadFotos(paciente, e.target.files);
                                      e.target.value = "";
                                    }}
                                  />
                                  <input
                                    ref={(el) => {
                                      fileInputRefs.current[paciente.id] = el;
                                    }}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files) handleUploadFotos(paciente, e.target.files);
                                      e.target.value = "";
                                    }}
                                  />

                                  {/* GRADE DE FOTOS ANEXADAS */}
                                  {qtd > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                                      {fotosDoPaciente.map((url, idx) => (
                                        <div
                                          key={idx}
                                          className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-1 flex flex-col group shadow-2xs"
                                        >
                                          <div
                                            className="relative aspect-square w-full rounded-lg overflow-hidden cursor-pointer bg-slate-100"
                                            onClick={() => abrirVisualizadorFoto(fotosDoPaciente, idx)}
                                          >
                                            <img
                                              src={url}
                                              alt={`Ferida ${idx + 1}`}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
                                            </div>
                                            {idx === qtd - 1 && qtd > 1 ? (
                                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-emerald-700/95 backdrop-blur-xs text-[9px] font-bold text-white shadow-xs flex items-center gap-1">
                                                #{idx + 1} • Legenda
                                              </span>
                                            ) : (
                                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-bold text-white">
                                                #{idx + 1}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between mt-1 px-1">
                                            <span className="text-[10px] font-medium truncate flex-1">
                                              {idx === qtd - 1 && qtd > 1 ? (
                                                <span className="text-emerald-700 font-bold">Com Legenda</span>
                                              ) : (
                                                <span className="text-slate-500">Foto {idx + 1}</span>
                                              )}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoverFoto(paciente, idx)}
                                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                              title="Excluir esta foto"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 italic">
                                      Nenhuma foto anexada. Tire fotos com a câmera ou selecione da galeria para enviar junto no WhatsApp (máximo de 5 fotos).
                                    </p>
                                  )}

                                  {/* AVISO DO BLOCO DE FOTOS COM LEGENDA NA ÚLTIMA FOTO */}
                                  {qtd > 1 ? (
                                    <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-2 text-[11px] text-emerald-800">
                                      <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>
                                        O bloco de <strong>{qtd} fotos</strong> será enviado junto, e a <strong>última foto (#{qtd})</strong> levará o relatório clínico completo na legenda, finalizando a mensagem.
                                      </span>
                                    </div>
                                  ) : qtd === 1 ? (
                                    <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-2 text-[11px] text-emerald-800">
                                      <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>A foto será enviada com a legenda contendo os dados clínicos da alta.</span>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })()}

                            {/* LINHA 7: BOTÃO GERAR MENSAGEM WHATSAPP & EXCLUIR */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleCompartilhar(paciente)}
                                className="min-h-[44px] flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                              >
                                <Share2 className="w-4 h-4" />
                                <span>Gerar Mensagem</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Excluir paciente ${paciente.nomePaciente}?`)) {
                                    removerAlta(paciente.id);
                                    exibirToast("Paciente de alta removido.");
                                  }
                                }}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                title="Excluir paciente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
        )}
      </div>

      {/* MODAL NOVO PACIENTE DE ALTA */}
      {modalNovoPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="shrink-0 mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Novo Paciente de Alta / PO
                </h3>
                <p className="text-xs text-slate-500">
                  Data: {dataSelecionada.split("-").reverse().join("/")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoPaciente(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 -mr-2 -mt-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCriarPaciente} className="space-y-3.5 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Renata Camila"
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 box-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <div className="h-7 flex items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Leito (Opcional)
                    </label>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={novoLeito}
                    onChange={(e) => setNovoLeito(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ex: 15"
                    className="w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 box-border"
                  />
                </div>

                <div>
                  <div className="h-7 flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Enfermaria
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAdicionandoEnfModal(!adicionandoEnfModal);
                        setNomeNovaEnfModal("");
                      }}
                      className="h-6 px-2 py-0.5 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer rounded-lg hover:bg-emerald-50 transition-colors"
                      title="Cadastrar nova enfermaria"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nova
                    </button>
                  </div>

                  {adicionandoEnfModal ? (
                    <div className="flex gap-1.5 h-[42px] items-center">
                      <input
                        type="text"
                        autoFocus
                        value={nomeNovaEnfModal}
                        onChange={(e) => setNomeNovaEnfModal(e.target.value)}
                        placeholder="Nome..."
                        className="flex-1 h-[42px] px-2.5 py-2 rounded-xl border border-emerald-500 text-xs text-slate-900 bg-white focus:outline-none box-border"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSalvarNovaEnfermariaModal(e);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSalvarNovaEnfermariaModal}
                        className="h-[42px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-colors shrink-0"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select
                      value={novaEnfermaria}
                      onChange={(e) => setNovaEnfermaria(e.target.value)}
                      className="w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer box-border"
                    >
                      {enfermarias.map((enf) => (
                        <option key={enf} value={enf}>
                          {enf}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Cirurgia (PO)
                </label>
                <input
                  type="text"
                  value={novoPO}
                  onChange={(e) => setNovoPO(e.target.value)}
                  placeholder="Ex: HIB+Hu"
                  className="w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 box-border"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalNovoPaciente(false)}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center"
                >
                  Salvar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZADOR DE FOTOS EM TAMANHO REAL (COM NAVEGAÇÃO MULTIFOTO) */}
      {modalFotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xs p-4 animate-in fade-in select-none"
          onClick={fecharVisualizadorFoto}
        >
          <div
            className="relative max-w-2xl w-full max-h-[92vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* BOTÃO FECHAR */}
            <button
              onClick={fecharVisualizadorFoto}
              className="absolute top-2 right-2 z-30 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/75 text-white hover:bg-black/95 shadow-lg cursor-pointer"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>

            {/* BOTÕES DE NAVEGAÇÃO ANTERIOR / PRÓXIMA */}
            {modalFotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setModalFotoIdx((prev) => (prev > 0 ? prev - 1 : modalFotos.length - 1))
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/70 hover:bg-black/95 text-white shadow-lg cursor-pointer transition-colors"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setModalFotoIdx((prev) => (prev < modalFotos.length - 1 ? prev + 1 : 0))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/70 hover:bg-black/95 text-white shadow-lg cursor-pointer transition-colors"
                  title="Próxima foto"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* FOTO ATUAL */}
            <img
              src={modalFotos[modalFotoIdx]}
              alt={`Foto da Ferida Ampliada ${modalFotoIdx + 1}`}
              className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />

            {/* CONTADOR DE FOTOS */}
            {modalFotos.length > 1 && (
              <div className="mt-3 px-3.5 py-1 rounded-full bg-black/75 text-white text-xs font-bold tracking-wide">
                Foto {modalFotoIdx + 1} de {modalFotos.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
