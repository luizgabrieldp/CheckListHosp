"use client";

import React, { useState, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  PacientePassagem,
  PrescricaoAntibiotico,
  CirurgiaProcedimento,
  ControleAntropometrico,
} from "@/types/hospital";
import { anonimizarNome } from "@/lib/lgpd";
import {
  calcularDDayAntibiotico,
  calcularIdade,
  calcularTempoInternacao,
  calcularDPO,
  formatarCirurgiaDPO,
  obterCirurgiasPaciente,
} from "@/lib/antibiotic-engine";
import { obterDataLocalHoje } from "@/lib/utils";
import { classificarIMC, calcularVariacaoPeso, obterUltimaAntropometria } from "@/lib/imc";
import { ModalImpressaoSeletiva } from "./ModalImpressaoSeletiva";
import { ControlePesoImc } from "./ControlePesoImc";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import {
  Stethoscope,
  Pill,
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  Flame,
  Heart,
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  Building2,
  Bed,
  Thermometer,
  ShieldAlert,
  Scissors,
  CheckCircle2,
  X,
  Edit3,
  ClipboardList,
  Check,
  Scale,
} from "lucide-react";

export function PassagemPlantaoView() {
  const passagem = useAppStore((s) => s.passagem);
  const enfermarias = useAppStore((s) => s.enfermarias);
  const adicionarEnfermaria = useAppStore((s) => s.adicionarEnfermaria);
  const salvarPaciente = useAppStore((s) => s.salvarPacientePassagem);
  const removerPaciente = useAppStore((s) => s.removerPacientePassagem);

  // Estados de navegação e filtros
  const [termoBusca, setTermoBusca] = useState("");
  const [enfermariaFiltro, setEnfermariaFiltro] = useState("TODAS");

  // Sanfonas expandidas (múltiplas permitidas)
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Sub-painel para adicionar/editar medicação de controle
  const [pacienteAdicionandoMed, setPacienteAdicionandoMed] = useState<string | null>(null);
  const [medEmEdicaoId, setMedEmEdicaoId] = useState<string | null>(null);
  const [medNome, setMedNome] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medFreqHoras, setMedFreqHoras] = useState<number | "">(6);
  const [medHorario1aDose, setMedHorario1aDose] = useState("20:00");
  const [medDataInicio, setMedDataInicio] = useState(() => obterDataLocalHoje());
  const [medDuracaoDias, setMedDuracaoDias] = useState<number | "">(7);
  const [medDataTermino, setMedDataTermino] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return obterDataLocalHoje(d);
  });
  const [medDosesPerdidas, setMedDosesPerdidas] = useState<number>(0);

  // Modais de impressão e nova enfermaria inline
  const [modalImpressaoAberto, setModalImpressaoAberto] = useState(false);
  const [modalNovaEnfAberto, setModalNovaEnfAberto] = useState(false);
  const [novaEnfNome, setNovaEnfNome] = useState("");

  // Alternar abertura de sanfona
  function toggleExpandido(id: string) {
    setExpandidos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  // 1. Estatísticas rápidas do plantão
  const totalPacientes = passagem.length;
  let totalAtbAtivos = 0;
  let totalDesescalonar = 0;

  passagem.forEach((p) => {
    p.antibioticos?.forEach((atb) => {
      totalAtbAtivos++;
      const res = calcularDDayAntibiotico(atb);
      if (res.statusAlerta === "DESESCALONAR") {
        totalDesescalonar++;
      }
    });
  });

  // 2. Criação inline direta de novo paciente (abre expandido no topo)
  function handleCriarNovoPaciente() {
    const defaultEnf =
      enfermariaFiltro !== "TODAS" && enfermariaFiltro !== "SEM_ENFERMARIA"
        ? enfermariaFiltro
        : "";

    const novoId = `pass-${Date.now()}`;
    const novo: PacientePassagem = {
      id: novoId,
      nome: "",
      leito: "",
      enfermaria: defaultEnf,
      dataAdmissao: obterDataLocalHoje(),
      dataNascimento: "",
      motivoInternamento: "",
      isCirurgico: false,
      cirurgias: [],
      dataCirurgia: "",
      tipoCirurgia: "",
      dpoManual: undefined,
      temAlergia: false,
      descricaoAlergia: "",
      precaucaoContato: false,
      hd: "",
      hda: "",
      evolucao: "",
      examesRealizados: "",
      medicacoesUsoGeral: "",
      antibioticos: [],
      pendencias: [],
      sinaisVitais: {},
      conduta: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    salvarPaciente(novo);
    if (termoBusca) setTermoBusca("");
    setExpandidos((prev) => ({ ...prev, [novoId]: true }));
  }

  // 3. Atualização reativa de campos do paciente
  function handleSalvarCampo(
    paciente: PacientePassagem,
    campo: keyof PacientePassagem,
    valor: any
  ) {
    salvarPaciente({
      ...paciente,
      [campo]: valor,
      updatedAt: new Date().toISOString(),
    });
  }

  // Atualização dos sinais vitais
  function handleSalvarSinaisVitais(
    paciente: PacientePassagem,
    campo: "fc" | "satO2" | "pa" | "tax",
    valor: any
  ) {
    const sinaisVitais = {
      ...(paciente.sinaisVitais || {}),
      [campo]: valor,
    };
    handleSalvarCampo(paciente, "sinaisVitais", sinaisVitais);
  }

  // Atualização dos dados antropométricos (Peso, Altura, IMC, Histórico)
  function handleSalvarAntropometria(
    paciente: PacientePassagem,
    antropometria: ControleAntropometrico
  ) {
    handleSalvarCampo(paciente, "antropometria", antropometria);
  }

  // 4. Gestão de Múltiplas Cirurgias / Reoperações
  function handleAdicionarCirurgia(paciente: PacientePassagem) {
    const listaAtual = obterCirurgiasPaciente(paciente);
    const novaCirurgia: CirurgiaProcedimento = {
      id: `cx-${Date.now()}`,
      tipoCirurgia: "",
      dataCirurgia: obterDataLocalHoje(),
      dpoManual: undefined,
    };
    const novasCirurgias = [...listaAtual, novaCirurgia];
    salvarPaciente({
      ...paciente,
      isCirurgico: true,
      cirurgias: novasCirurgias,
      // manter compatibilidade com primeiro procedimento
      tipoCirurgia: novasCirurgias[0]?.tipoCirurgia || "",
      dataCirurgia: novasCirurgias[0]?.dataCirurgia || "",
      dpoManual: novasCirurgias[0]?.dpoManual,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleAtualizarCirurgia(
    paciente: PacientePassagem,
    cxId: string,
    campo: keyof CirurgiaProcedimento,
    valor: any
  ) {
    const listaAtual = obterCirurgiasPaciente(paciente);
    const novasCirurgias = listaAtual.map((cx) => {
      if (cx.id === cxId) {
        return { ...cx, [campo]: valor };
      }
      return cx;
    });

    salvarPaciente({
      ...paciente,
      cirurgias: novasCirurgias,
      tipoCirurgia: novasCirurgias[0]?.tipoCirurgia || "",
      dataCirurgia: novasCirurgias[0]?.dataCirurgia || "",
      dpoManual: novasCirurgias[0]?.dpoManual,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleRemoverCirurgia(paciente: PacientePassagem, cxId: string) {
    const listaAtual = obterCirurgiasPaciente(paciente);
    const novasCirurgias = listaAtual.filter((cx) => cx.id !== cxId);
    salvarPaciente({
      ...paciente,
      cirurgias: novasCirurgias,
      isCirurgico: novasCirurgias.length > 0,
      tipoCirurgia: novasCirurgias[0]?.tipoCirurgia || "",
      dataCirurgia: novasCirurgias[0]?.dataCirurgia || "",
      dpoManual: novasCirurgias[0]?.dpoManual,
      updatedAt: new Date().toISOString(),
    });
  }

  // 5. Sub-painel: Adição e Edição de Medicações de Controle
  function abrirNovoSubPainelMed(pacienteId: string) {
    setPacienteAdicionandoMed(pacienteId);
    setMedEmEdicaoId(null);
    setMedNome("");
    setMedDose("");
    setMedFreqHoras(6);
    setMedHorario1aDose("20:00");
    const hoje = obterDataLocalHoje();
    setMedDataInicio(hoje);
    setMedDuracaoDias(7);

    try {
      const [ano, mes, dia] = hoje.split("-").map(Number);
      const d = new Date(ano, mes - 1, dia);
      d.setDate(d.getDate() + 7);
      setMedDataTermino(obterDataLocalHoje(d));
    } catch {
      setMedDataTermino(hoje);
    }
    setMedDosesPerdidas(0);
  }

  function abrirEdicaoSubPainelMed(pacienteId: string, atb: PrescricaoAntibiotico) {
    setPacienteAdicionandoMed(pacienteId);
    setMedEmEdicaoId(atb.id);
    setMedNome(atb.nome);
    setMedDose(atb.dose);
    setMedFreqHoras(atb.frequenciaHoras || 6);
    setMedHorario1aDose(atb.horarioPrimeiraDose || "20:00");
    const dataIni = atb.dataInicio || obterDataLocalHoje();
    setMedDataInicio(dataIni);
    setMedDuracaoDias(atb.duracaoDias || 7);

    try {
      const [ano, mes, dia] = dataIni.split("-").map(Number);
      const d = new Date(ano, mes - 1, dia);
      d.setDate(d.getDate() + (atb.duracaoDias || 7));
      setMedDataTermino(obterDataLocalHoje(d));
    } catch {
      setMedDataTermino(dataIni);
    }
    setMedDosesPerdidas(atb.dosesPerdidas || 0);
  }

  // Sincronização bidirecional de datas
  function handleMudarDataInicio(novaDataInicio: string) {
    setMedDataInicio(novaDataInicio);
    if (novaDataInicio && typeof medDuracaoDias === "number" && medDuracaoDias > 0) {
      try {
        const [ano, mes, dia] = novaDataInicio.split("-").map(Number);
        const d = new Date(ano, mes - 1, dia);
        d.setDate(d.getDate() + medDuracaoDias);
        setMedDataTermino(obterDataLocalHoje(d));
      } catch {}
    }
  }

  function handleMudarDuracaoDias(dias: number | "") {
    setMedDuracaoDias(dias);
    if (dias === "" || dias <= 0) return;
    if (medDataInicio) {
      try {
        const [ano, mes, dia] = medDataInicio.split("-").map(Number);
        const d = new Date(ano, mes - 1, dia);
        d.setDate(d.getDate() + Number(dias));
        setMedDataTermino(obterDataLocalHoje(d));
      } catch {}
    }
  }

  function handleMudarDataTermino(novaDataTermino: string) {
    setMedDataTermino(novaDataTermino);
    if (medDataInicio && novaDataTermino) {
      try {
        const [a1, m1, d1] = medDataInicio.split("-").map(Number);
        const [a2, m2, d2] = novaDataTermino.split("-").map(Number);
        const dt1 = new Date(a1, m1 - 1, d1);
        const dt2 = new Date(a2, m2 - 1, d2);
        const diff = Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) {
          setMedDuracaoDias(diff);
        }
      } catch {}
    }
  }

  // Salvar nova medicação ou salvar edição existente
  function handleSalvarMedicacao(paciente: PacientePassagem) {
    if (!medNome.trim()) return;

    const freq = typeof medFreqHoras === "number" && medFreqHoras > 0 ? medFreqHoras : 6;
    const duracao = typeof medDuracaoDias === "number" && medDuracaoDias > 0 ? medDuracaoDias : 7;

    if (medEmEdicaoId) {
      // Atualizar existente
      const listaAtualizada = (paciente.antibioticos || []).map((atb) => {
        if (atb.id === medEmEdicaoId) {
          return {
            ...atb,
            nome: medNome.trim(),
            dose: medDose.trim() || "Dose padrão",
            frequenciaHoras: freq,
            horarioPrimeiraDose: medHorario1aDose.trim() || "20:00",
            dataInicio: medDataInicio,
            duracaoDias: duracao,
            dosesPerdidas: Math.max(0, medDosesPerdidas),
          };
        }
        return atb;
      });
      handleSalvarCampo(paciente, "antibioticos", listaAtualizada);
    } else {
      // Inserir nova
      const novaMed: PrescricaoAntibiotico = {
        id: `atb-${Date.now()}`,
        nome: medNome.trim(),
        dose: medDose.trim() || "Dose padrão",
        frequenciaHoras: freq,
        horarioPrimeiraDose: medHorario1aDose.trim() || "20:00",
        dataInicio: medDataInicio,
        duracaoDias: duracao,
        dosesPerdidas: Math.max(0, medDosesPerdidas),
        observacao: "",
      };
      const lista = [...(paciente.antibioticos || []), novaMed];
      handleSalvarCampo(paciente, "antibioticos", lista);
    }

    setPacienteAdicionandoMed(null);
    setMedEmEdicaoId(null);
  }

  function handleRemoverAtb(paciente: PacientePassagem, atbId: string) {
    const lista = (paciente.antibioticos || []).filter((atb) => atb.id !== atbId);
    handleSalvarCampo(paciente, "antibioticos", lista);
  }

  function handleAjustarDosePerdida(
    paciente: PacientePassagem,
    atbId: string,
    delta: number
  ) {
    const lista = (paciente.antibioticos || []).map((atb) => {
      if (atb.id === atbId) {
        const novoVal = Math.max(0, (atb.dosesPerdidas || 0) + delta);
        return { ...atb, dosesPerdidas: novoVal };
      }
      return atb;
    });
    handleSalvarCampo(paciente, "antibioticos", lista);
  }

  // 6. Gestão de Pendências do Leito
  function handleAdicionarPendencia(paciente: PacientePassagem, texto: string) {
    if (!texto.trim()) return;
    const lista = [...(paciente.pendencias || []), texto.trim()];
    handleSalvarCampo(paciente, "pendencias", lista);
  }

  function handleRemoverPendencia(paciente: PacientePassagem, index: number) {
    const lista = [...(paciente.pendencias || [])];
    lista.splice(index, 1);
    handleSalvarCampo(paciente, "pendencias", lista);
  }

  // Estado de edição inline de pendência
  const [pendenciaEmEdicao, setPendenciaEmEdicao] = useState<{
    pacienteId: string;
    index: number;
    texto: string;
  } | null>(null);

  function handleIniciarEdicaoPendencia(
    pacienteId: string,
    index: number,
    textoAtual: string
  ) {
    setPendenciaEmEdicao({ pacienteId, index, texto: textoAtual });
  }

  function handleSalvarEdicaoPendencia(paciente: PacientePassagem) {
    if (!pendenciaEmEdicao || pendenciaEmEdicao.pacienteId !== paciente.id) return;
    const novoTexto = pendenciaEmEdicao.texto.trim();
    if (!novoTexto) return;
    const lista = [...(paciente.pendencias || [])];
    lista[pendenciaEmEdicao.index] = novoTexto;
    handleSalvarCampo(paciente, "pendencias", lista);
    setPendenciaEmEdicao(null);
  }

  function handleCancelarEdicaoPendencia() {
    setPendenciaEmEdicao(null);
  }

  // Adicionar nova enfermaria inline
  function handleSalvarNovaEnfermaria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaEnfNome.trim()) return;
    adicionarEnfermaria(novaEnfNome.trim());
    setNovaEnfNome("");
    setModalNovaEnfAberto(false);
  }

  // 7. Filtragem e Agrupamento
  const pacientesFiltrados = useMemo(() => {
    return passagem.filter((p) => {
      if (enfermariaFiltro === "SEM_ENFERMARIA") {
        const enf = p.enfermaria?.trim() || "";
        if (enf !== "" && enf.toLowerCase() !== "sem enfermaria") return false;
      } else if (enfermariaFiltro !== "TODAS") {
        if (p.enfermaria?.toLowerCase() !== enfermariaFiltro.toLowerCase()) return false;
      }

      if (termoBusca.trim()) {
        const q = termoBusca.toLowerCase();
        const nomeMatch = p.nome?.toLowerCase().includes(q);
        const leitoMatch = p.leito?.toLowerCase().includes(q);
        const hdMatch = p.hd?.toLowerCase().includes(q);
        const motivoMatch = p.motivoInternamento?.toLowerCase().includes(q);
        const cirurgias = obterCirurgiasPaciente(p);
        const cirurgiaMatch = cirurgias.some((cx) =>
          cx.tipoCirurgia.toLowerCase().includes(q)
        );
        if (!nomeMatch && !leitoMatch && !hdMatch && !motivoMatch && !cirurgiaMatch) {
          return false;
        }
      }

      return true;
    });
  }, [passagem, enfermariaFiltro, termoBusca]);

  const gruposEnfermarias = useMemo(() => {
    const setEnfs = new Set<string>();
    pacientesFiltrados.forEach((p) => {
      const enf = p.enfermaria?.trim() || "";
      if (!enf || enf.toLowerCase() === "sem enfermaria") {
        setEnfs.add("Sem Enfermaria");
      } else {
        setEnfs.add(enf);
      }
    });

    const ordenadas = Array.from(setEnfs).sort((a, b) => {
      if (a === "Sem Enfermaria") return -1; // Sem Enfermaria no topo prioritário
      if (b === "Sem Enfermaria") return 1;
      return a.localeCompare(b, "pt-BR");
    });

    return ordenadas;
  }, [pacientesFiltrados]);

  return (
    <div className="space-y-6">
      {/* WRAPPER DA INTERFACE INTERATIVA DE TELA (OCULTO NA IMPRESSÃO PARA VELOCIDADE INSTANTÂNEA) */}
      <div className="space-y-6 no-print print:hidden">
        {/* ─────────────────────────────────────────────────────────────
            1. TOPO DA PASSAGEM DE PLANTÃO
        ────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Passagem de Plantão
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
              {totalPacientes} leitos ativos
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Round clínico colaborativo, múltiplos pós-operatórios e motor de antibioticoterapia
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setModalImpressaoAberto(true)}
            className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            <span>Impressão Seletiva A4</span>
          </button>

          <button
            onClick={handleCriarNovoPaciente}
            className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PAINEL DE ESTATÍSTICAS COMPACTO
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 leading-none">{totalPacientes}</div>
            <div className="text-xs text-slate-500 mt-0.5">Pacientes em Passagem</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-teal-700 leading-none">{totalAtbAtivos}</div>
            <div className="text-xs text-slate-500 mt-0.5">Antibióticos em Curso</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              totalDesescalonar > 0
                ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse"
                : "bg-emerald-50 border-emerald-100 text-emerald-600"
            }`}
          >
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div
              className={`text-lg font-bold leading-none ${
                totalDesescalonar > 0 ? "text-rose-600" : "text-emerald-700"
              }`}
            >
              {totalDesescalonar}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Reavaliações / Desescalonamentos</div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BARRA DE BUSCA E FILTROS DE ENFERMARIAS
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* BUSCA */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar paciente por nome, leito, enfermaria, HD ou motivo..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 focus:outline-none transition-all shadow-xs"
          />
        </div>

        {/* FILTROS DE ENFERMARIA */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setEnfermariaFiltro("TODAS")}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center ${
                enfermariaFiltro === "TODAS"
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Todas
            </button>

            <button
              onClick={() => setEnfermariaFiltro("SEM_ENFERMARIA")}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center ${
                enfermariaFiltro === "SEM_ENFERMARIA"
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Sem Enfermaria
            </button>

            {enfermarias
              .filter((e) => e.trim().toLowerCase() !== "sem enfermaria")
              .map((enf) => {
                const isAtiva = enfermariaFiltro.toLowerCase() === enf.toLowerCase();
                return (
                  <button
                    key={enf}
                    onClick={() => setEnfermariaFiltro(enf)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center ${
                      isAtiva
                        ? "bg-slate-900 text-white font-bold shadow-xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {enf}
                  </button>
                );
              })}
          </div>

          {/* BOTÃO NOVA ENFERMARIA */}
          <button
            onClick={() => setModalNovaEnfAberto(true)}
            className="min-h-[40px] text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 shrink-0 px-2.5 py-2 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Enfermaria</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. LISTA DE PACIENTES EM SANFONA (CABEÇALHO EM 4 LINHAS)
      ────────────────────────────────────────────────────────────── */}
      {pacientesFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <Stethoscope className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nenhum paciente encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">
            {termoBusca
              ? "Tente refinar sua busca por nome ou leito."
              : "Clique em '+ Novo Paciente' para adicionar um paciente na passagem."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {gruposEnfermarias.map((grupoNome) => {
            const pacientesDoGrupo = pacientesFiltrados.filter((p) => {
              const enf = p.enfermaria?.trim() || "";
              const enfNormalizada = !enf || enf.toLowerCase() === "sem enfermaria" ? "Sem Enfermaria" : enf;
              return enfNormalizada.toLowerCase() === grupoNome.toLowerCase();
            });

            if (pacientesDoGrupo.length === 0) return null;

            return (
              <div key={grupoNome} className="space-y-2.5">
                {/* CABEÇALHO DO GRUPO / ENFERMARIA */}
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {grupoNome} ({pacientesDoGrupo.length})
                  </h4>
                </div>

                {/* CARDS EM SANFONA */}
                <div className="space-y-2.5">
                  {pacientesDoGrupo.map((paciente) => {
                    const isExpandido = !!expandidos[paciente.id];
                    const idade = calcularIdade(paciente.dataNascimento);
                    const tempoInternacao = calcularTempoInternacao(paciente.dataAdmissao);
                    const nomeExibicao = anonimizarNome(paciente.nome) || "Paciente não identificado";
                    const cirurgiasDoPaciente = obterCirurgiasPaciente(paciente);

                    return (
                      <div
                        key={paciente.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
                      >
                        {/* ──────────────────────────────────────────
                            CABEÇALHO RESUMIDO EM 4 LINHAS (CLICÁVEL)
                        ─────────────────────────────────────────── */}
                        <div
                          onClick={() => toggleExpandido(paciente.id)}
                          className="p-3.5 sm:p-4 cursor-pointer hover:bg-slate-50/50 transition-colors space-y-2 select-none"
                        >
                          {/* LINHA 1: IDENTIFICAÇÃO DO PACIENTE & CIRURGIAS/DPO INDIVIDUAIS */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* LEITO */}
                              <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                                {paciente.leito ? `LT ${paciente.leito}` : "Sem Leito"}
                              </span>

                              {/* ENFERMARIA */}
                              <span className="text-xs text-slate-500 font-medium px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                                {paciente.enfermaria?.trim() || "Sem Enfermaria"}
                              </span>

                              {/* NOME ANONIMIZADO */}
                              <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight break-words">
                                {nomeExibicao}
                              </span>

                              {/* IDADE CALCULADA */}
                              {idade !== "-" && (
                                <span className="text-xs text-slate-500 font-medium">
                                  • {idade}
                                </span>
                              )}

                              {/* TEMPO DE INTERNAÇÃO */}
                              <span className="text-xs text-slate-500 font-medium">
                                • {tempoInternacao}
                              </span>
                            </div>

                            {/* PÍLULAS INDIVIDUAIS PARA CADA PÓS-OPERATÓRIO & BOTÃO SANFONA */}
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                              {cirurgiasDoPaciente.length > 0 ? (
                                cirurgiasDoPaciente.map((cx) => {
                                  const dpoStr = formatarCirurgiaDPO(
                                    true,
                                    cx.tipoCirurgia,
                                    cx.dataCirurgia,
                                    cx.dpoManual
                                  );
                                  return (
                                    <span
                                      key={cx.id}
                                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200"
                                    >
                                      <Scissors className="w-3 h-3 text-amber-600" />
                                      <span>{dpoStr}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-slate-500 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 hidden sm:inline-block">
                                  Tratamento Clínico
                                </span>
                              )}

                              <div className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                                {isExpandido ? (
                                  <ChevronUp className="w-4 h-4 text-sky-600" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* LINHA 2: POR QUE INTERNOU (MOTIVO PRINCIPAL) */}
                          <div className="pt-1 flex items-start gap-1.5 text-xs text-slate-700">
                            <span className="font-bold text-slate-900 shrink-0">Internou por:</span>
                            <span className="line-clamp-1 font-medium text-slate-700">
                              {paciente.motivoInternamento || paciente.hd || "Sem motivo cadastrado"}
                            </span>
                          </div>

                          {/* LINHA 3: MEDICAÇÕES QUE ESTÁ FAZENDO & ALERTAS */}
                          <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                            {/* ALERTA DE ALERGIA */}
                            {paciente.temAlergia && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px]">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>
                                  Alergia{paciente.descricaoAlergia ? `: ${paciente.descricaoAlergia}` : ""}
                                </span>
                              </span>
                            )}

                            {/* PRECAUÇÃO DE CONTATO */}
                            {paciente.precaucaoContato && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[11px]">
                                <ShieldAlert className="w-3 h-3 text-rose-700" />
                                <span>Precaução de Contato</span>
                              </span>
                            )}

                            {/* MINI-TAGS DE MEDICAÇÕES / ANTIBIÓTICOS ATIVOS */}
                            {paciente.antibioticos?.map((atb) => {
                              const res = calcularDDayAntibiotico(atb);
                              const isDesescalonar = res.statusAlerta === "DESESCALONAR";
                              return (
                                <span
                                  key={atb.id}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                    isDesescalonar
                                      ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse font-bold"
                                      : "bg-teal-50 text-teal-800 border-teal-200"
                                  }`}
                                >
                                  <Pill className="w-3 h-3 text-teal-600" />
                                  <span>
                                    {atb.nome} {res.rotuloDDay}/{atb.duracaoDias}d
                                  </span>
                                  {isDesescalonar && <span>(Desescalonar)</span>}
                                </span>
                              );
                            })}

                            {!paciente.temAlergia &&
                              !paciente.precaucaoContato &&
                              (!paciente.antibioticos || paciente.antibioticos.length === 0) && (
                                <span className="text-[11px] text-slate-400 italic">
                                  Sem alertas ou medicações de controle cadastradas
                                </span>
                              )}
                          </div>

                          {/* LINHA 4: EXAME CLÍNICO / SINAIS VITAIS (FAIXA SUAVE) */}
                          {(() => {
                            const sv = paciente.sinaisVitais;
                            const temFc = sv?.fc !== undefined && sv.fc !== null && sv.fc > 0;
                            const temSat = sv?.satO2 !== undefined && sv.satO2 !== null && sv.satO2 > 0;
                            const temPa = Boolean(sv?.pa && sv.pa.trim());
                            const temTax = sv?.tax !== undefined && sv.tax !== null && sv.tax > 0;
                            const temSv = temFc || temSat || temPa || temTax;

                            const ultimaAntropo = paciente.antropometria?.ativo
                              ? obterUltimaAntropometria(paciente.antropometria)
                              : null;
                            const temAntropo = Boolean(ultimaAntropo);

                            if (!temSv && !temAntropo) return null;

                            const itensSv: React.ReactNode[] = [];
                            if (temFc) {
                              itensSv.push(
                                <span key="fc" className="inline-flex items-center gap-1 font-semibold text-[11px] text-rose-700">
                                  <Heart className="w-3 h-3 text-rose-500" />
                                  <span>FC: {sv?.fc} bpm</span>
                                </span>
                              );
                            }
                            if (temSat) {
                              itensSv.push(
                                <span key="sat" className="inline-flex items-center gap-1 font-semibold text-[11px] text-sky-700">
                                  <Activity className="w-3 h-3 text-sky-500" />
                                  <span>SatO2: {sv?.satO2}%</span>
                                </span>
                              );
                            }
                            if (temPa) {
                              itensSv.push(
                                <span key="pa" className="font-semibold text-[11px] text-slate-700">
                                  PA: {sv?.pa}
                                </span>
                              );
                            }
                            if (temTax) {
                              itensSv.push(
                                <span key="tax" className="inline-flex items-center gap-1 font-semibold text-[11px] text-amber-700">
                                  <Thermometer className="w-3 h-3 text-amber-500" />
                                  <span>{sv?.tax}ºC</span>
                                </span>
                              );
                            }

                            return (
                              <div className="bg-slate-50/80 border border-slate-200/70 px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 flex-wrap text-xs text-slate-700">
                                {temSv && (
                                  <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider shrink-0">
                                    Exame Clínico:
                                  </span>
                                )}

                                {itensSv.map((item, idx) => (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && <span className="text-slate-300">•</span>}
                                    {item}
                                  </React.Fragment>
                                ))}

                                {/* RESUMO COMPACTO DE PESO & IMC (SE ATIVO E HOUVER PESAGEM) */}
                                {ultimaAntropo && (() => {
                                  const c = classificarIMC(ultimaAntropo.imc);
                                  const v = calcularVariacaoPeso(paciente.antropometria?.historico || []);
                                  return (
                                    <>
                                      {temSv && <span className="text-slate-300">•</span>}
                                      <span
                                        className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full border ${c.corBg} ${c.corTexto} ${c.corBorda}`}
                                        title={`Altura: ${ultimaAntropo.altura}m | IMC: ${ultimaAntropo.imc} (${c.categoria})${v.tipo !== "unico" ? ` | Variação: ${v.textoFormatado}` : ""}`}
                                      >
                                        <Scale className="w-3 h-3" />
                                        <span>
                                          {ultimaAntropo.peso} kg • IMC {ultimaAntropo.imc}
                                          {v.tipo === "perda" ? ` (${v.deltaKg} kg)` : v.tipo === "ganho" ? ` (+${v.deltaKg} kg)` : ""}
                                        </span>
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            );
                          })()}

                          {/* LINHA 5: PENDÊNCIAS DO LEITO (VISÍVEL SOMENTE SE HOUVER PENDÊNCIAS) */}
                          {paciente.pendencias && paciente.pendencias.length > 0 && (
                            <div className="pt-1 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <ClipboardList className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <span>Pendências do Leito ({paciente.pendencias.length}):</span>
                              </div>
                              <div className="space-y-1">
                                {paciente.pendencias.map((pend, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50/80 border border-slate-200/70 px-2.5 py-1.5 rounded-lg"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                                    <span className="leading-snug font-medium">{pend}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ──────────────────────────────────────────
                            PAINEL EXPANDIDO DA SANFONA (PILHA VERTICAL)
                        ─────────────────────────────────────────── */}
                        {isExpandido && (
                          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50 space-y-4 animate-in fade-in">
                            {/* BLOCO 1: DADOS GERAIS */}
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                {/* NOME DO PACIENTE */}
                                <div className="sm:col-span-6">
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Nome do Paciente (Anonimizado na tela)
                                  </label>
                                  <input
                                    type="text"
                                    value={paciente.nome}
                                    onChange={(e) =>
                                      handleSalvarCampo(paciente, "nome", e.target.value)
                                    }
                                    placeholder="Nome completo do paciente..."
                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                                  />
                                </div>

                                {/* LEITO */}
                                <div className="sm:col-span-3">
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Bed className="w-3 h-3 text-slate-400" />
                                    <span>Leito</span>
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={paciente.leito}
                                    onChange={(e) =>
                                      handleSalvarCampo(
                                        paciente,
                                        "leito",
                                        e.target.value.replace(/\D/g, "")
                                      )
                                    }
                                    placeholder="Ex: 25"
                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                                  />
                                </div>

                                {/* ENFERMARIA */}
                                <div className="sm:col-span-3">
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <span>Enfermaria</span>
                                  </label>
                                  <select
                                    value={paciente.enfermaria || ""}
                                    onChange={(e) =>
                                      handleSalvarCampo(paciente, "enfermaria", e.target.value)
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
                                  >
                                    <option value="">Sem enfermaria</option>
                                    {enfermarias
                                      .filter((e) => e.trim().toLowerCase() !== "sem enfermaria")
                                      .map((enf) => (
                                        <option key={enf} value={enf}>
                                          {enf}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>

                              {/* DATAS & CÁLCULO DE IDADE */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                {/* DATA DE ADMISSÃO */}
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>Data de Admissão</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={paciente.dataAdmissao}
                                    onChange={(e) =>
                                      handleSalvarCampo(paciente, "dataAdmissao", e.target.value)
                                    }
                                    className="w-full px-3 py-1.5 min-h-[40px] rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
                                  />
                                </div>

                                {/* DATA DE NASCIMENTO */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      <span>Data de Nascimento</span>
                                    </label>
                                    {idade !== "-" && (
                                      <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                        Idade: {idade}
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="date"
                                    value={paciente.dataNascimento || ""}
                                    onChange={(e) =>
                                      handleSalvarCampo(paciente, "dataNascimento", e.target.value)
                                    }
                                    className="w-full px-3 py-1.5 min-h-[40px] rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-sky-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* BLOCO 2: ALERTAS MÉDICOS E MÚLTIPLAS CIRURGIAS / REOPERAÇÕES */}
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                              {/* TOGGLES DE ALERGIA E PRECAUÇÃO */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* ALERGIA */}
                                <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200 space-y-2">
                                  <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Paciente com Alergia</span>
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={!!paciente.temAlergia}
                                      onChange={(e) =>
                                        handleSalvarCampo(paciente, "temAlergia", e.target.checked)
                                      }
                                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                  </label>
                                  {paciente.temAlergia && (
                                    <input
                                      type="text"
                                      value={paciente.descricaoAlergia || ""}
                                      onChange={(e) =>
                                        handleSalvarCampo(
                                          paciente,
                                          "descricaoAlergia",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Ex: Dipirona, Penicilina, Iodo..."
                                      className="w-full px-2.5 py-1 rounded bg-white border border-amber-300 text-slate-800 text-xs focus:outline-none"
                                    />
                                  )}
                                </div>

                                {/* PRECAUÇÃO DE CONTATO */}
                                <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Precaução de Contato</span>
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={!!paciente.precaucaoContato}
                                    onChange={(e) =>
                                      handleSalvarCampo(
                                        paciente,
                                        "precaucaoContato",
                                        e.target.checked
                                      )
                                    }
                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                                  />
                                </div>
                              </div>

                              {/* SEÇÃO CIRÚRGICA COM SUPORTE A MÚLTIPLAS REOPERAÇÕES */}
                              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!paciente.isCirurgico || cirurgiasDoPaciente.length > 0}
                                      onChange={(e) => {
                                        const check = e.target.checked;
                                        if (check && cirurgiasDoPaciente.length === 0) {
                                          handleAdicionarCirurgia(paciente);
                                        } else {
                                          handleSalvarCampo(paciente, "isCirurgico", check);
                                        }
                                      }}
                                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <Scissors className="w-3.5 h-3.5 text-sky-600" />
                                      <span>
                                        Paciente Cirúrgico (Pós-Operatórios: {cirurgiasDoPaciente.length})
                                      </span>
                                    </span>
                                  </label>

                                  {(paciente.isCirurgico || cirurgiasDoPaciente.length > 0) && (
                                    <button
                                      type="button"
                                      onClick={() => handleAdicionarCirurgia(paciente)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Adicionar Cirurgia / Reoperação</span>
                                    </button>
                                  )}
                                </div>

                                {(paciente.isCirurgico || cirurgiasDoPaciente.length > 0) && (
                                  <div className="space-y-2">
                                    {cirurgiasDoPaciente.map((cx, idx) => (
                                      <div
                                        key={cx.id || idx}
                                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                                      >
                                        <div className="sm:col-span-5">
                                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                            Procedimento #{idx + 1}
                                          </label>
                                          <input
                                            type="text"
                                            value={cx.tipoCirurgia}
                                            onChange={(e) =>
                                              handleAtualizarCirurgia(
                                                paciente,
                                                cx.id,
                                                "tipoCirurgia",
                                                e.target.value
                                              )
                                            }
                                            placeholder="Ex: Colecistectomia VLP..."
                                            className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none"
                                          />
                                        </div>

                                        <div className="sm:col-span-4">
                                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                            Data da Cirurgia
                                          </label>
                                          <input
                                            type="date"
                                            value={cx.dataCirurgia}
                                            onChange={(e) =>
                                              handleAtualizarCirurgia(
                                                paciente,
                                                cx.id,
                                                "dataCirurgia",
                                                e.target.value
                                              )
                                            }
                                            className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none"
                                          />
                                        </div>

                                        <div className="sm:col-span-2">
                                          <div className="flex items-center justify-between mb-0.5">
                                            <label className="text-[10px] font-bold text-slate-600">
                                              DPO
                                            </label>
                                            <span className="text-[10px] font-bold text-amber-700">
                                              {calcularDPO(cx.dataCirurgia, cx.dpoManual) || "D0"}
                                            </span>
                                          </div>
                                          <input
                                            type="number"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            min={0}
                                            value={cx.dpoManual !== undefined ? cx.dpoManual : ""}
                                            onChange={(e) => {
                                              const val =
                                                e.target.value === ""
                                                  ? undefined
                                                  : parseInt(e.target.value, 10);
                                              handleAtualizarCirurgia(
                                                paciente,
                                                cx.id,
                                                "dpoManual",
                                                val
                                              );
                                            }}
                                            placeholder="Ajuste..."
                                            className="w-full px-2 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none"
                                          />
                                        </div>

                                        <div className="sm:col-span-1 text-right flex items-center justify-end">
                                          <button
                                            type="button"
                                            onClick={() => handleRemoverCirurgia(paciente, cx.id)}
                                            className="min-h-[38px] min-w-[38px] flex items-center justify-center p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Remover este procedimento"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ──────────────────────────────────────────
                                BLOCO 3: PILHA VERTICAL DE TEXTOS CLÍNICOS E SINAIS VITAIS
                            ─────────────────────────────────────────── */}
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3.5">
                              {/* 1. MOTIVO DO INTERNAMENTO */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Motivo do Internamento
                                </label>
                                <AutoResizeTextarea
                                  minRows={2}
                                  value={paciente.motivoInternamento || ""}
                                  onChange={(e) =>
                                    handleSalvarCampo(
                                      paciente,
                                      "motivoInternamento",
                                      e.target.value
                                    )
                                  }
                                  placeholder="PO colecistectomia, abdome agudo obstrutivo..."
                                  className="text-slate-900 font-medium"
                                />
                              </div>

                              {/* 2. HIPÓTESE DIAGNÓSTICA (HD) */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Hipótese Diagnóstica (HD)
                                </label>
                                <AutoResizeTextarea
                                  minRows={2}
                                  value={paciente.hd}
                                  onChange={(e) =>
                                    handleSalvarCampo(paciente, "hd", e.target.value)
                                  }
                                  placeholder="colelitíase, apendicite aguda perfurada..."
                                />
                              </div>

                              {/* 3. HISTÓRIA DA DOENÇA ATUAL (HDA) */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  História da Doença Atual (HDA)
                                </label>
                                <AutoResizeTextarea
                                  minRows={2}
                                  value={paciente.hda || ""}
                                  onChange={(e) =>
                                    handleSalvarCampo(paciente, "hda", e.target.value)
                                  }
                                  placeholder="dor abdominal de forte intensidade associada a vômitos..."
                                />
                              </div>

                              {/* 4. EVOLUÇÃO */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Evolução
                                </label>
                                <AutoResizeTextarea
                                  minRows={2}
                                  value={paciente.evolucao || ""}
                                  onChange={(e) =>
                                    handleSalvarCampo(paciente, "evolucao", e.target.value)
                                  }
                                  placeholder="Descreva a evolução..."
                                />
                              </div>

                              {/* 5. SINAIS VITAIS (EXAME FÍSICO) - POSICIONADO LOGO ABAIXO DA EVOLUÇÃO */}
                              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <h5 className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-sky-600" />
                                    <span>Sinais Vitais (Exame Físico)</span>
                                  </h5>

                                  {/* BOTÃO DISCRETO PARA ATIVAR PESO & IMC */}
                                  {(!paciente.antropometria || !paciente.antropometria.ativo) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSalvarAntropometria(paciente, {
                                          ativo: true,
                                          alturaPadrao: paciente.antropometria?.alturaPadrao,
                                          historico: paciente.antropometria?.historico || [],
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                                      title="Ativar controle de Peso, Altura e IMC pré-bariátrica para este paciente"
                                    >
                                      <Scale className="w-3 h-3 text-teal-600" />
                                      <span>+ Controle de Peso / IMC</span>
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                      FC (bpm)
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={paciente.sinaisVitais?.fc || ""}
                                      onChange={(e) => {
                                        const num = parseInt(e.target.value.replace(/\D/g, ""), 10);
                                        handleSalvarSinaisVitais(
                                          paciente,
                                          "fc",
                                          isNaN(num) ? undefined : num
                                        );
                                      }}
                                      placeholder="Ex: 78"
                                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 placeholder:opacity-50 focus:outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                      SatO2 (%)
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={paciente.sinaisVitais?.satO2 || ""}
                                      onChange={(e) => {
                                        const num = parseInt(e.target.value.replace(/\D/g, ""), 10);
                                        handleSalvarSinaisVitais(
                                          paciente,
                                          "satO2",
                                          isNaN(num) ? undefined : num
                                        );
                                      }}
                                      placeholder="Ex: 98"
                                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 placeholder:opacity-50 focus:outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                      PA (mmHg)
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={paciente.sinaisVitais?.pa || ""}
                                      onChange={(e) => {
                                        const str = e.target.value.replace(/[^0-9xX/]/g, "").trim();
                                        handleSalvarSinaisVitais(
                                          paciente,
                                          "pa",
                                          str || undefined
                                        );
                                      }}
                                      placeholder="Ex: 120/80"
                                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 placeholder:opacity-50 focus:outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                      Tax (ºC)
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={
                                        paciente.sinaisVitais?.tax !== undefined && paciente.sinaisVitais?.tax !== null && paciente.sinaisVitais?.tax !== 0
                                          ? String(paciente.sinaisVitais.tax).replace(".", ",")
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const limpo = e.target.value.replace(/[^0-9,.]/g, "");
                                        if (!limpo) {
                                          handleSalvarSinaisVitais(paciente, "tax", undefined);
                                          return;
                                        }
                                        const num = parseFloat(limpo.replace(",", "."));
                                        handleSalvarSinaisVitais(
                                          paciente,
                                          "tax",
                                          isNaN(num) ? undefined : num
                                        );
                                      }}
                                      placeholder="Ex: 36,5"
                                      className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 placeholder:opacity-50 focus:outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                </div>

                                {/* BLOCO INTERATIVO DE PESO, ALTURA, IMC E GRÁFICO (PRÉ-BARIÁTRICA) */}
                                {paciente.antropometria?.ativo && (
                                  <ControlePesoImc
                                    paciente={paciente}
                                    onSalvarAntropometria={handleSalvarAntropometria}
                                  />
                                )}
                              </div>

                              {/* 6. PRINCIPAIS EXAMES REALIZADOS */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Principais Exames Realizados
                                </label>
                                <AutoResizeTextarea
                                  minRows={2}
                                  value={paciente.examesRealizados || ""}
                                  onChange={(e) =>
                                    handleSalvarCampo(
                                      paciente,
                                      "examesRealizados",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ex: TC abdome, hemograma, PCR..."
                                />
                              </div>

                              {/* 7. MEDICAÇÕES EM USO (GERAL) */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Medicações em Uso
                                </label>
                                <AutoResizeTextarea
                                  minRows={2}
                                  value={paciente.medicacoesUsoGeral || ""}
                                  onChange={(e) =>
                                    handleSalvarCampo(
                                      paciente,
                                      "medicacoesUsoGeral",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Anotação geral de medicações..."
                                />
                              </div>

                              {/* ──────────────────────────────────────────
                                  8. SUB-PAINEL: ADICIONAR/EDITAR MEDICAÇÃO DE CONTROLE
                              ─────────────────────────────────────────── */}
                              <div className="pt-2 border-t border-slate-100 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <Pill className="w-3.5 h-3.5 text-teal-600" />
                                    <span>
                                      Medicações de Controle (
                                      {paciente.antibioticos?.length || 0})
                                    </span>
                                  </span>

                                  {pacienteAdicionandoMed !== paciente.id && (
                                    <button
                                      type="button"
                                      onClick={() => abrirNovoSubPainelMed(paciente.id)}
                                      className="px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Adicionar medicação</span>
                                    </button>
                                  )}
                                </div>

                                {/* FORMULÁRIO DO SUB-PAINEL (NOVA OU EDIÇÃO) */}
                                {pacienteAdicionandoMed === paciente.id && (
                                  <div className="p-3.5 rounded-xl border border-teal-300 bg-teal-50/20 space-y-3 animate-in fade-in overflow-hidden w-full max-w-full box-border">
                                    <div className="flex items-center justify-between">
                                      <h6 className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                                        {medEmEdicaoId ? (
                                          <>
                                            <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                                            <span>Editar Medicação de Controle</span>
                                          </>
                                        ) : (
                                          <>
                                            <Plus className="w-3.5 h-3.5 text-teal-600" />
                                            <span>Nova Medicação de Controle</span>
                                          </>
                                        )}
                                      </h6>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPacienteAdicionandoMed(null);
                                          setMedEmEdicaoId(null);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* NOME DO MEDICAMENTO */}
                                    <div className="min-w-0 w-full max-w-full">
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Nome do medicamento
                                      </label>
                                      <input
                                        type="text"
                                        value={medNome}
                                        onChange={(e) => setMedNome(e.target.value)}
                                        placeholder="Ex: Dipirona"
                                        autoFocus
                                        className="w-full max-w-full min-w-0 box-border px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:border-teal-500 focus:outline-none"
                                      />
                                    </div>

                                    {/* DOSE E FREQUÊNCIA (HORAS) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full">
                                      <div className="min-w-0 w-full max-w-full">
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                          Dose
                                        </label>
                                        <input
                                          type="text"
                                          value={medDose}
                                          onChange={(e) => setMedDose(e.target.value)}
                                          placeholder="Ex: 500mg"
                                          className="w-full max-w-full min-w-0 box-border px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none"
                                        />
                                      </div>

                                      <div className="min-w-0 w-full max-w-full">
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                          Frequência (horas)
                                        </label>
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          min={1}
                                          value={medFreqHoras}
                                          onChange={(e) =>
                                            setMedFreqHoras(
                                              parseInt(e.target.value, 10) || ""
                                            )
                                          }
                                          placeholder="Ex: 6"
                                          className="w-full max-w-full min-w-0 box-border px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    {/* 1ª DOSE (HORÁRIO) E DATA DE INÍCIO */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full">
                                      <div className="min-w-0 w-full max-w-full">
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                          1ª dose (horário)
                                        </label>
                                        <input
                                          type="time"
                                          value={medHorario1aDose}
                                          onChange={(e) =>
                                            setMedHorario1aDose(e.target.value)
                                          }
                                          className="w-full max-w-full min-w-0 box-border block px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none appearance-none"
                                        />
                                      </div>

                                      <div className="min-w-0 w-full max-w-full">
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                          Data de início
                                        </label>
                                        <input
                                          type="date"
                                          value={medDataInicio}
                                          onChange={(e) =>
                                            handleMudarDataInicio(e.target.value)
                                          }
                                          className="w-full max-w-full min-w-0 box-border block px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none appearance-none"
                                        />
                                      </div>
                                    </div>

                                    {/* DURAÇÃO (DIAS) E DATA DE TÉRMINO (SINCRONIZAÇÃO BIDIRECIONAL) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full">
                                      <div className="min-w-0 w-full max-w-full">
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                          Duração (dias)
                                        </label>
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          min={1}
                                          value={medDuracaoDias}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "") {
                                              handleMudarDuracaoDias("");
                                            } else {
                                              const parsed = parseInt(val, 10);
                                              if (!isNaN(parsed)) {
                                                handleMudarDuracaoDias(parsed);
                                              }
                                            }
                                          }}
                                          placeholder="Ex: 7"
                                          className="w-full max-w-full min-w-0 box-border px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none"
                                        />
                                      </div>

                                      <div className="min-w-0 w-full max-w-full">
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                          Data de término
                                        </label>
                                        <input
                                          type="date"
                                          value={medDataTermino}
                                          onChange={(e) =>
                                            handleMudarDataTermino(e.target.value)
                                          }
                                          className="w-full max-w-full min-w-0 box-border block px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none appearance-none"
                                        />
                                      </div>
                                    </div>

                                    {/* DOSES PERDIDAS (QTD) */}
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Doses perdidas (qtd)
                                      </label>
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        min={0}
                                        value={medDosesPerdidas}
                                        onChange={(e) =>
                                          setMedDosesPerdidas(
                                            parseInt(e.target.value, 10) || 0
                                          )
                                        }
                                        placeholder="0"
                                        className="w-full sm:w-1/2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none"
                                      />
                                    </div>

                                    {/* BOTÕES CANCELAR E SALVAR */}
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPacienteAdicionandoMed(null);
                                          setMedEmEdicaoId(null);
                                        }}
                                        className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer flex items-center justify-center"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSalvarMedicacao(paciente)}
                                        disabled={!medNome.trim()}
                                        className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center"
                                      >
                                        {medEmEdicaoId ? "Salvar Alterações" : "Salvar"}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* LISTA DE MEDICAÇÕES DE CONTROLE CADASTRADAS */}
                                {(!paciente.antibioticos ||
                                  paciente.antibioticos.length === 0) &&
                                  pacienteAdicionandoMed !== paciente.id && (
                                    <p className="text-xs text-slate-400 italic py-1">
                                      Nenhuma medicação cadastrada.
                                    </p>
                                  )}

                                <div className="space-y-2">
                                  {paciente.antibioticos?.map((atb) => {
                                    const res = calcularDDayAntibiotico(atb);
                                    const isDesescalonar = res.statusAlerta === "DESESCALONAR";

                                    return (
                                      <div
                                        key={atb.id}
                                        className={`p-3 rounded-xl border transition-all ${
                                          isDesescalonar
                                            ? "bg-rose-50/60 border-rose-300 shadow-xs"
                                            : "bg-slate-50 border-slate-200"
                                        }`}
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                                <Pill className="w-3.5 h-3.5 text-teal-600" />
                                                <span>{atb.nome}</span>
                                              </span>
                                              <span className="text-[11px] text-slate-600">
                                                {atb.dose} ({atb.frequenciaHoras}/{atb.frequenciaHoras}h)
                                              </span>
                                              <span
                                                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                                  isDesescalonar
                                                    ? "bg-rose-600 text-white"
                                                    : "bg-teal-100 text-teal-900 border border-teal-300"
                                                }`}
                                              >
                                                {res.rotuloDDay}/{atb.duracaoDias}d
                                              </span>
                                            </div>

                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                              Início: {atb.dataInicio} às {atb.horarioPrimeiraDose || "20:00"} → Término:{" "}
                                              <strong className="text-slate-700">{res.dataTerminoFormatada}</strong>
                                            </div>
                                          </div>

                                          {/* DOSES PERDIDAS, BOTÃO EDITAR & BOTÃO REMOVER */}
                                          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                                            <div className="flex items-center gap-1.5 text-xs">
                                              <span className="text-[11px] text-slate-500">Perdidas:</span>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleAjustarDosePerdida(paciente, atb.id, -1)
                                                  }
                                                  disabled={(atb.dosesPerdidas || 0) <= 0}
                                                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 text-xs font-bold flex items-center justify-center cursor-pointer"
                                                >
                                                  -
                                                </button>
                                                <span className="font-bold text-slate-800 text-xs px-1">
                                                  {atb.dosesPerdidas || 0}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleAjustarDosePerdida(paciente, atb.id, 1)
                                                  }
                                                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-rose-600 flex items-center justify-center cursor-pointer"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </div>

                                            {/* BOTÃO EDITAR MEDICAÇÃO */}
                                            <button
                                              type="button"
                                              onClick={() =>
                                                abrirEdicaoSubPainelMed(paciente.id, atb)
                                              }
                                              className="min-h-[38px] min-w-[38px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                                              title="Editar medicação"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>

                                            {/* BOTÃO EXCLUIR MEDICAÇÃO */}
                                            <button
                                              type="button"
                                              onClick={() => handleRemoverAtb(paciente, atb.id)}
                                              className="min-h-[38px] min-w-[38px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                              title="Remover medicação"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* ALERTA DE DESESCALONAR */}
                                        {isDesescalonar && (
                                          <div className="mt-2 pt-1.5 border-t border-rose-200/80 flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                            <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                                            <span>⚠ Lembrar de desescalonar / reavaliar prescrição</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* ──────────────────────────────────────────
                                  9. CONDUTAS / PENDÊNCIAS
                              ─────────────────────────────────────────── */}
                              <div className="pt-2 border-t border-slate-100 space-y-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Condutas / Decisões do Round
                                  </label>
                                  <AutoResizeTextarea
                                    minRows={2}
                                    value={paciente.conduta}
                                    onChange={(e) =>
                                      handleSalvarCampo(paciente, "conduta", e.target.value)
                                    }
                                    placeholder="O que foi decidido na passagem de plantão..."
                                  />
                                </div>

                                {/* PENDÊNCIAS DO LEITO */}
                                <div className="space-y-2">
                                  <label className="block text-[11px] font-bold text-slate-700">
                                    Pendências do Leito
                                  </label>
                                  <div className="space-y-1.5">
                                    {paciente.pendencias?.map((pend, idx) => {
                                      const isEditando =
                                        pendenciaEmEdicao?.pacienteId === paciente.id &&
                                        pendenciaEmEdicao?.index === idx;

                                      if (isEditando) {
                                        return (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-2 p-1.5 rounded-lg bg-sky-50 border border-sky-300"
                                          >
                                            <input
                                              type="text"
                                              autoFocus
                                              value={pendenciaEmEdicao.texto}
                                              onChange={(e) =>
                                                setPendenciaEmEdicao({
                                                  ...pendenciaEmEdicao,
                                                  texto: e.target.value,
                                                })
                                              }
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  handleSalvarEdicaoPendencia(paciente);
                                                } else if (e.key === "Escape") {
                                                  handleCancelarEdicaoPendencia();
                                                }
                                              }}
                                              className="flex-1 px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-sky-500 font-medium"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleSalvarEdicaoPendencia(paciente)}
                                              className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded hover:bg-sky-200 text-sky-700 transition-colors cursor-pointer"
                                              title="Salvar alteração"
                                            >
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleCancelarEdicaoPendencia}
                                              className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                                              title="Cancelar edição"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:border-slate-300 transition-colors group"
                                        >
                                          <span
                                            onClick={() =>
                                              handleIniciarEdicaoPendencia(paciente.id, idx, pend)
                                            }
                                            className="flex items-center gap-1.5 cursor-pointer flex-1 min-h-[36px]"
                                            title="Clique para editar esta pendência"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                            <span className="group-hover:text-slate-900 font-medium">
                                              {pend}
                                            </span>
                                          </span>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleIniciarEdicaoPendencia(paciente.id, idx, pend)
                                              }
                                              className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-sky-600 transition-colors cursor-pointer"
                                              title="Editar pendência"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoverPendencia(paciente, idx)}
                                              className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                              title="Remover pendência"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* ADICIONAR NOVA PENDÊNCIA */}
                                    <input
                                      type="text"
                                      placeholder="+ Digite uma pendência do leito e tecle Enter..."
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAdicionarPendencia(
                                            paciente,
                                            (e.target as HTMLInputElement).value
                                          );
                                          (e.target as HTMLInputElement).value = "";
                                        }
                                      }}
                                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-slate-800 text-xs placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* RODAPÉ DO CARD EXPANDIDO */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Excluir o paciente ${
                                        paciente.nome || "sem nome"
                                      } da passagem?`
                                    )
                                  ) {
                                    removerPaciente(paciente.id);
                                  }
                                }}
                                className="min-h-[44px] text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Excluir Paciente</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleExpandido(paciente.id)}
                                className="min-h-[44px] text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <ChevronUp className="w-4 h-4" />
                                <span>Recolher Detalhes</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL PARA ADICIONAR NOVA ENFERMARIA INLINE
      ────────────────────────────────────────────────────────────── */}
      {modalNovaEnfAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-sm shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>Nova Enfermaria</span>
              </h4>
              <button
                type="button"
                onClick={() => setModalNovaEnfAberto(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaEnfermaria} className="space-y-3 flex-1 overflow-y-auto">
              <input
                type="text"
                value={novaEnfNome}
                onChange={(e) => setNovaEnfNome(e.target.value)}
                placeholder="Ex: NEFRO, UTI, 5º ANDAR..."
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
              />

              <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalNovaEnfAberto(false)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!novaEnfNome.trim()}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL DE IMPRESSÃO SELETIVA
      ────────────────────────────────────────────────────────────── */}
      {modalImpressaoAberto && (
        <ModalImpressaoSeletiva
          pacientes={passagem}
          onClose={() => setModalImpressaoAberto(false)}
        />
      )}
    </div>
  );
}
