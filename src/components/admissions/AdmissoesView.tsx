"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AdmissaoPaciente } from "@/types/hospital";
import {
  gerarMensagemWhatsAppAdmissoes,
  compartilharOuCopiar,
  obterEmojisStatusAdmissao,
} from "@/lib/whatsapp";
import { obterDataLocalHoje } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Plus,
  Share2,
  Printer,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  Hospital,
  GripVertical,
  X,
  ArrowUpDown,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// MODELO CLÍNICO PADRÃO EXATO FORNECIDO PELO USUÁRIO
const TEMPLATE_HISTORIA_PADRAO = `HD:
-

HDA:

ANTECEDENTES
- ALERGIAS
- COMORBIDADES
- CX PRÉVIAS
- HÁBITOS DE VIDA
- HEMOTX PRÉVIAS
- MUC
- PESO ATUAL

EXAME FÍSICO:
- GERAL: EGB, CONSCIENTE E ORIENTADO, CORADO, HIDRATADO, ACIANÓTICO, ANICTÉRICO, AFEBRIL
- ACV: RCR EM 2T, BNF, S/S 
- AR: MV+ EM AHT, S/RA 
- ABD: GLOBOSO, FLÁCIDO, DEPRESSIVEL, INDOLOR À PALPAÇÃO SUPERFICIAL E PROFUNDA, SEM SINAIS DE IRRITAÇÃO PERITONEAL. MURPHY NEGATIVO. 
- EXT: PULSOS CHEIOS E SIMÉTRICOS. TEC < 3S.

EXAMES COMPLEMENTARES

CD:
- INTERNAMENTO PARA`;

// Função helper para renderizar as duas bolinhas de status
function renderBolinhasStatus(paciente: AdmissaoPaciente, agora: number) {
  const isCancelada = Boolean(paciente.cancelada);
  // Todos os 4 status completados
  const isCompleto = Boolean(
    paciente.chegou && paciente.internou && paciente.aih && paciente.altaAdm
  );

  const dataRef = paciente.updatedAt || paciente.createdAt;
  const diferencaMs = dataRef ? agora - new Date(dataRef).getTime() : 0;
  const isInativo30Min = diferencaMs > 30 * 60 * 1000;

  // 1ª Bolinha: Fluxo da Admissão
  let bolinhaFluxo: React.ReactNode = null;
  if (isCancelada) {
    bolinhaFluxo = (
      <span
        className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-xs"
        title="Cirurgia cancelada"
      />
    );
  } else if (isCompleto) {
    bolinhaFluxo = (
      <span
        className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs"
        title="Fluxo concluído (Chegou, Internou, AIH e Alta/ADM)"
      />
    );
  } else if (isInativo30Min) {
    bolinhaFluxo = (
      <span
        className="relative flex h-2.5 w-2.5 shrink-0"
        title="Alerta: Paciente pendente sem atualização há mais de 30 minutos"
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
      </span>
    );
  }

  // 2ª Bolinha: História Clínica Concluída
  let bolinhaHistoria: React.ReactNode = null;
  if (paciente.historiaFinalizada) {
    bolinhaHistoria = (
      <span
        className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0 shadow-xs"
        title="História clínica finalizada e travada"
      />
    );
  }

  if (!bolinhaFluxo && !bolinhaHistoria) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {bolinhaFluxo}
      {bolinhaHistoria}
    </div>
  );
}

// Componente de Item Arrastável para o modal de impressão
function ItemArrastavel({ paciente, indice }: { paciente: AdmissaoPaciente; indice: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: paciente.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500/50 select-none transition-colors"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-200/60"
          title="Arrastar para reordenar a sequência"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="font-bold text-xs text-slate-500 w-5">{indice + 1}.</span>
        <span className="text-xs font-bold text-slate-900">{paciente.nome.toUpperCase()}</span>
      </div>
      <span className="text-[11px] text-slate-500">{paciente.enfermaria}</span>
    </div>
  );
}

export function AdmissoesView() {
  const admissoes = useAppStore((s) => s.admissoes);
  const salvarAdmissao = useAppStore((s) => s.salvarAdmissao);
  const removerAdmissao = useAppStore((s) => s.removerAdmissao);
  const enfermarias = useAppStore((s) => s.enfermarias);
  const adicionarEnfermaria = useAppStore((s) => s.adicionarEnfermaria);

  // Data selecionada no topo (padrão: hoje no fuso local)
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    return obterDataLocalHoje();
  });

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [pacienteExpandidoId, setPacienteExpandidoId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modalNovoPaciente, setModalNovoPaciente] = useState(false);
  const [modalImpressaoAberto, setModalImpressaoAberto] = useState(false);

  // Lista ordenada manualmente para a folha A4
  const [ordemImpressaoPacientes, setOrdemImpressaoPacientes] = useState<AdmissaoPaciente[]>([]);

  // Form para novo paciente
  const [novoNome, setNovoNome] = useState("");
  const [novaEnfermaria, setNovaEnfermaria] = useState("SEM ENFERMARIA");

  // Estados para adição rápida in-place de enfermaria
  const [adicionandoEnfModal, setAdicionandoEnfModal] = useState(false);
  const [nomeNovaEnfModal, setNomeNovaEnfModal] = useState("");
  const [adicionandoEnfPacienteId, setAdicionandoEnfPacienteId] = useState<string | null>(null);
  const [nomeNovaEnfPaciente, setNomeNovaEnfPaciente] = useState("");

  // Relógio reativo para avaliar inatividade de 30 minutos
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

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

  function handleSalvarNovaEnfermariaPaciente(e: React.FormEvent, paciente: AdmissaoPaciente) {
    e.preventDefault();
    const limpo = nomeNovaEnfPaciente.trim();
    if (!limpo) return;
    adicionarEnfermaria(limpo);
    salvarAdmissao({
      ...paciente,
      enfermaria: limpo,
      updatedAt: new Date().toISOString(),
    });
    setNomeNovaEnfPaciente("");
    setAdicionandoEnfPacienteId(null);
    exibirToast(`Enfermaria "${limpo}" atribuída ao paciente!`);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function exibirToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // Filtrar pacientes da data selecionada
  const admissoesDaData = useMemo(() => {
    return admissoes.filter((p) => p.dataAdmissaoAgendada === dataSelecionada);
  }, [admissoes, dataSelecionada]);

  // Contadores para o "Resumo do dia"
  const totalChegou = admissoesDaData.filter(
    (p) => !p.cancelada && (p.chegou || p.status === "Chegou" || p.status === "Internou" || p.status === "AIH" || p.status === "Alta/ADM")
  ).length;
  const totalInternou = admissoesDaData.filter(
    (p) => !p.cancelada && (p.internou || p.status === "Internou" || p.status === "AIH" || p.status === "Alta/ADM")
  ).length;
  const totalAih = admissoesDaData.filter(
    (p) => !p.cancelada && (p.aih || p.status === "AIH" || p.status === "Alta/ADM")
  ).length;
  const totalAltaAdm = admissoesDaData.filter(
    (p) => !p.cancelada && (p.altaAdm || p.status === "Alta/ADM")
  ).length;
  const totalAtivos = admissoesDaData.filter((p) => !p.cancelada).length;

  // Filtragem e busca
  const pacientesFiltrados = useMemo(() => {
    return admissoesDaData.filter((p) => {
      const termo = busca.toLowerCase();
      const bateNome =
        p.nome.toLowerCase().includes(termo) ||
        (p.enfermaria && p.enfermaria.toLowerCase().includes(termo));
      if (!bateNome) return false;

      if (filtroStatus === "TODOS") return true;
      if (filtroStatus === "CANCELADAS") return p.cancelada;
      if (p.cancelada) return false;

      if (filtroStatus === "AGUARDANDO") return !p.chegou && !p.internou && !p.aih && !p.altaAdm;
      if (filtroStatus === "CHEGOU") return p.chegou;
      if (filtroStatus === "INTERNOU") return p.internou;
      if (filtroStatus === "AIH") return p.aih;
      if (filtroStatus === "ALTA_ADM") return p.altaAdm;

      return true;
    });
  }, [admissoesDaData, busca, filtroStatus]);

  // Agrupar por enfermaria
  const pacientesAgrupadosPorEnfermaria = useMemo(() => {
    const grupos: Record<string, AdmissaoPaciente[]> = {};

    pacientesFiltrados.forEach((p) => {
      const enf = p.enfermaria?.trim() || "SEM ENFERMARIA";
      if (!grupos[enf]) grupos[enf] = [];
      grupos[enf].push(p);
    });

    // Ordenar pacientes alfabeticamente dentro de cada enfermaria
    Object.keys(grupos).forEach((enf) => {
      grupos[enf].sort((a, b) => a.nome.localeCompare(b.nome));
    });

    return grupos;
  }, [pacientesFiltrados]);

  // Abertura do modal de impressão com os pacientes ativos do dia
  function handleAbrirModalImpressao() {
    const ativos = admissoesDaData.filter((p) => !p.cancelada);
    // Ordenar inicialmente por ordem alfabética
    const ordenados = [...ativos].sort((a, b) => a.nome.localeCompare(b.nome));
    setOrdemImpressaoPacientes(ordenados);
    setModalImpressaoAberto(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrdemImpressaoPacientes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleConfirmarImpressao() {
    setModalImpressaoAberto(false);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  // Regra de etapas progressivas automáticas para os 4 status
  function handleToggleEtapaStatus(
    paciente: AdmissaoPaciente,
    etapa: "chegou" | "internou" | "aih" | "altaAdm"
  ) {
    const novo = { ...paciente };

    if (etapa === "chegou") {
      const proximo = !novo.chegou;
      novo.chegou = proximo;
      if (!proximo) {
        novo.internou = false;
        novo.aih = false;
        novo.altaAdm = false;
      }
    } else if (etapa === "internou") {
      const proximo = !novo.internou;
      novo.internou = proximo;
      if (proximo) {
        novo.chegou = true;
      } else {
        novo.aih = false;
        novo.altaAdm = false;
      }
    } else if (etapa === "aih") {
      const proximo = !novo.aih;
      novo.aih = proximo;
      if (proximo) {
        novo.chegou = true;
        novo.internou = true;
      } else {
        novo.altaAdm = false;
      }
    } else if (etapa === "altaAdm") {
      const proximo = !novo.altaAdm;
      novo.altaAdm = proximo;
      if (proximo) {
        novo.chegou = true;
        novo.internou = true;
        novo.aih = true;
      }
    }

    if (novo.altaAdm) novo.status = "Alta/ADM";
    else if (novo.aih) novo.status = "AIH";
    else if (novo.internou) novo.status = "Internou";
    else if (novo.chegou) novo.status = "Chegou";
    else novo.status = "Aguardando";

    novo.updatedAt = new Date().toISOString();
    salvarAdmissao(novo);
  }

  function handleCriarPaciente(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const novo: AdmissaoPaciente = {
      id: `adm-${Date.now()}`,
      nome: novoNome.trim(),
      enfermaria: novaEnfermaria.trim() || "SEM ENFERMARIA",
      dataAdmissaoAgendada: dataSelecionada,
      status: "Aguardando",
      chegou: false,
      internou: false,
      aih: false,
      altaAdm: false,
      cancelada: false,
      historiaFinalizada: false,
      anotacoesHistoria: TEMPLATE_HISTORIA_PADRAO,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    salvarAdmissao(novo);
    setNovoNome("");
    setModalNovoPaciente(false);
    setPacienteExpandidoId(novo.id);
    exibirToast("Paciente adicionado com sucesso!");
  }

  async function handleGerarMensagemWhatsApp() {
    const texto = gerarMensagemWhatsAppAdmissoes(admissoesDaData, dataSelecionada);
    const res = await compartilharOuCopiar(texto, null, `Admissões ${dataSelecionada}`);
    exibirToast(res.mensagem);
  }

  // Data formatada para exibição (DD/MM/AAAA)
  const dataFormatadaBR = dataSelecionada.split("-").reverse().join("/");

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* TOAST FLUTUANTE */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SELETOR DE DATA NO TOPO (ESTILO BASE44) */}
      <div className="clean-card rounded-xl p-3 flex items-center gap-3 no-print">
        <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
          <CalendarIcon className="w-4 h-4 text-slate-500" />
          <span>Data de Trabalho:</span>
        </div>
        <input
          type="date"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          (Pacientes adicionados ficam salvos até 48h após a data agendada)
        </span>
      </div>

      {/* RESUMO DO DIA (4 CARDS DE STATUS) */}
      <div className="space-y-2 no-print">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <span className="font-bold text-slate-800">Resumo do dia</span>
          <span>{totalAtivos} pacientes ativos</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* CHEGOU */}
          <div className="clean-card rounded-2xl p-4 bg-sky-50/40 border-sky-100 flex flex-col items-center justify-center text-center">
            <span className="text-xl mb-1">🏥</span>
            <span className="text-xl font-bold text-sky-800 leading-tight">{totalChegou}</span>
            <span className="text-[11px] font-semibold text-sky-700">Chegou</span>
          </div>

          {/* INTERNOU */}
          <div className="clean-card rounded-2xl p-4 bg-indigo-50/40 border-indigo-100 flex flex-col items-center justify-center text-center">
            <span className="text-xl mb-1">🛏️</span>
            <span className="text-xl font-bold text-indigo-800 leading-tight">{totalInternou}</span>
            <span className="text-[11px] font-semibold text-indigo-700">Internou</span>
          </div>

          {/* AIH */}
          <div className="clean-card rounded-2xl p-4 bg-emerald-50/40 border-emerald-100 flex flex-col items-center justify-center text-center">
            <span className="text-xl mb-1">✅</span>
            <span className="text-xl font-bold text-emerald-800 leading-tight">{totalAih}</span>
            <span className="text-[11px] font-semibold text-emerald-700">AIH</span>
          </div>

          {/* ALTA/ADM */}
          <div className="clean-card rounded-2xl p-4 bg-blue-50/40 border-blue-100 flex flex-col items-center justify-center text-center">
            <span className="text-xl mb-1">🟦</span>
            <span className="text-xl font-bold text-blue-800 leading-tight">{totalAltaAdm}</span>
            <span className="text-[11px] font-semibold text-blue-700">Alta/ADM</span>
          </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="flex flex-wrap items-center gap-2.5 no-print">
        <button
          onClick={() => setModalNovoPaciente(true)}
          className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-emerald-700 text-xs font-bold border border-emerald-600 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>Adicionar</span>
        </button>

        <button
          onClick={handleGerarMensagemWhatsApp}
          className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Share2 className="w-4 h-4 text-emerald-100" />
          <span>Gerar Mensagem</span>
        </button>

        <button
          onClick={handleAbrirModalImpressao}
          className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Imprimir Lista</span>
        </button>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="clean-card rounded-2xl p-3 space-y-3 no-print">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "TODOS", label: "Todos" },
            { id: "AGUARDANDO", label: "Aguardando" },
            { id: "CHEGOU", label: "🏥 Chegou" },
            { id: "INTERNOU", label: "🛏️ Internou" },
            { id: "AIH", label: "✅ AIH" },
            { id: "ALTA_ADM", label: "🟦 Alta/ADM" },
            { id: "CANCELADAS", label: "Canceladas" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroStatus(f.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center ${
                filtroStatus === f.id
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM AGRUPADA POR ENFERMARIA */}
      <div className="no-print">
        {Object.keys(pacientesAgrupadosPorEnfermaria).length === 0 ? (
          <div className="clean-card rounded-2xl p-12 text-center text-slate-400 text-xs">
            Nenhum paciente encontrado para esta data ou filtro.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(pacientesAgrupadosPorEnfermaria).map(([enfermariaNome, pacientes]) => (
              <div key={enfermariaNome} className="space-y-2">
                {/* CABEÇALHO DA ENFERMARIA */}
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800 px-1">
                  <Hospital className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{enfermariaNome}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({pacientes.length} paciente{pacientes.length !== 1 ? "s" : ""})
                  </span>
                </div>

                {/* LISTA DE PACIENTES EM ACORDEÃO */}
                <div className="space-y-2">
                  {pacientes.map((paciente) => {
                    const isExpandido = pacienteExpandidoId === paciente.id;
                    const emojisAtivos = obterEmojisStatusAdmissao(paciente);
                    const isCancelada = paciente.cancelada;
                    const isTravada = paciente.historiaFinalizada;

                    return (
                      <div
                        key={paciente.id}
                        className={`clean-card rounded-xl transition-all overflow-hidden ${
                          isExpandido
                            ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm"
                            : "hover:border-slate-300"
                        } ${isCancelada ? "opacity-60 bg-slate-50" : "bg-white"}`}
                      >
                        {/* LINHA RECOLHIDA (ACCORDION HEADER) */}
                        <div
                          onClick={() =>
                            setPacienteExpandidoId(isExpandido ? null : paciente.id)
                          }
                          className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            {renderBolinhasStatus(paciente, agora)}
                            <div>
                              <span
                                className={`text-xs font-bold block ${
                                  isCancelada
                                    ? "line-through text-slate-400"
                                    : "text-slate-900"
                                }`}
                              >
                                {paciente.nome}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {paciente.enfermaria}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* EMOJIS DE STATUS ATIVOS NO MODO RECOLHIDO */}
                            <div className="flex items-center gap-1 text-sm">
                              {emojisAtivos.map((emoji, i) => (
                                <span key={i} title="Status ativo">
                                  {emoji}
                                </span>
                              ))}
                            </div>

                            {isExpandido ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* CONTEÚDO EXPANDIDO */}
                        {isExpandido && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                            {/* EDITAR NOME & ENFERMARIA */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Nome do Paciente
                                </label>
                                <input
                                  type="text"
                                  value={paciente.nome}
                                  onChange={(e) => {
                                    salvarAdmissao({
                                      ...paciente,
                                      nome: e.target.value,
                                      updatedAt: new Date().toISOString(),
                                    });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                                    title="Adicionar nova enfermaria na hora"
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
                                      className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800"
                                    >
                                      OK
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAdicionandoEnfPacienteId(null)}
                                      className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] hover:bg-slate-200"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <select
                                    value={paciente.enfermaria}
                                    onChange={(e) => {
                                      salvarAdmissao({
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

                            {/* 4 BOTÕES PROGRESSIVOS DE STATUS (ESTILO BASE44) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {/* CHEGOU */}
                              <button
                                type="button"
                                onClick={() => handleToggleEtapaStatus(paciente, "chegou")}
                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                  paciente.chegou
                                    ? "bg-sky-50 border-sky-400 text-sky-800 font-bold shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <span className="text-xl">🏥</span>
                                <span className="text-xs">Chegou</span>
                              </button>

                              {/* INTERNOU */}
                              <button
                                type="button"
                                onClick={() => handleToggleEtapaStatus(paciente, "internou")}
                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                  paciente.internou
                                    ? "bg-indigo-50 border-indigo-400 text-indigo-800 font-bold shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <span className="text-xl">🛏️</span>
                                <span className="text-xs">Internou</span>
                              </button>

                              {/* AIH */}
                              <button
                                type="button"
                                onClick={() => handleToggleEtapaStatus(paciente, "aih")}
                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                  paciente.aih
                                    ? "bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <span className="text-xl">✅</span>
                                <span className="text-xs">AIH</span>
                              </button>

                              {/* ALTA/ADM */}
                              <button
                                type="button"
                                onClick={() => handleToggleEtapaStatus(paciente, "altaAdm")}
                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                  paciente.altaAdm
                                    ? "bg-blue-50 border-blue-400 text-blue-800 font-bold shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                <span className="text-xl">🟦</span>
                                <span className="text-xs">Alta/ADM</span>
                              </button>
                            </div>

                            {/* TOGGLE CANCELADA */}
                            <div className="flex items-center justify-between py-1 border-t border-slate-100">
                              <span className="text-xs font-semibold text-slate-700">Cancelada</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                type="checkbox"
                                checked={paciente.cancelada}
                                onChange={(e) => {
                                  salvarAdmissao({
                                    ...paciente,
                                    cancelada: e.target.checked,
                                    updatedAt: new Date().toISOString(),
                                  });
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                            </label>
                          </div>

                          {/* CAMPO GRANDE DE ANOTAÇÕES (HISTÓRIA DO PACIENTE - TEMPLATE PADRÃO) */}
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Anotações (História do Paciente)
                            </label>
                            <textarea
                              rows={14}
                              disabled={isTravada}
                              value={paciente.anotacoesHistoria ?? TEMPLATE_HISTORIA_PADRAO}
                              onChange={(e) => {
                                salvarAdmissao({
                                  ...paciente,
                                  anotacoesHistoria: e.target.value,
                                  updatedAt: new Date().toISOString(),
                                });
                              }}
                              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed disabled:opacity-75 disabled:bg-slate-100"
                            />
                          </div>

                          {/* CHECKBOX HISTÓRIA FINALIZADA & REMOVER PACIENTE */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                            <label className="min-h-[44px] flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isTravada}
                                onChange={(e) => {
                                  salvarAdmissao({
                                    ...paciente,
                                    historiaFinalizada: e.target.checked,
                                    updatedAt: new Date().toISOString(),
                                  });
                                }}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                              />
                              <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                                {isTravada ? (
                                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                História finalizada
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remover o paciente ${paciente.nome}?`)) {
                                  removerAdmissao(paciente.id);
                                  exibirToast("Paciente removido com sucesso.");
                                }
                              }}
                              className="min-h-[44px] px-3 py-2 rounded-lg text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Remover paciente</span>
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

      {/* MODAL DE ORDENAÇÃO MANUAL ANTES DA IMPRESSÃO */}
      {modalImpressaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Sequência de Impressão dos Internamentos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Arraste os nomes para definir a ordem (1º, 2º, 3º...) que sairá na folha A4.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalImpressaoAberto(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={ordemImpressaoPacientes.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {ordemImpressaoPacientes.map((paciente, idx) => (
                    <ItemArrastavel key={paciente.id} paciente={paciente} indice={idx} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalImpressaoAberto(false)}
                className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center justify-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarImpressao}
                className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Lista Simples</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLHA A4 DE IMPRESSÃO LIMPA E ESTRITAMENTE NUMERADA */}
      <div className="hidden print:block print-container w-full">
        <div className="text-center pb-3 mb-4 border-b-2 border-black">
          <h1 className="text-lg font-bold uppercase tracking-wider text-black">
            INTERNAMENTOS DO DIA — {dataFormatadaBR}
          </h1>
          <p className="text-xs text-gray-700 mt-1 font-medium">
            Enfermaria Cirúrgica • Total: {ordemImpressaoPacientes.length} paciente(s)
          </p>
        </div>

        <ol className="space-y-2 pt-1 text-sm text-black">
          {ordemImpressaoPacientes.map((p, idx) => (
            <li
              key={p.id}
              className="py-1.5 border-b border-gray-300 flex items-center justify-between text-sm page-break-avoid"
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold w-7 text-gray-900">
                  {idx + 1}.
                </span>
                <span className="font-bold text-black uppercase">
                  {p.nome}
                </span>
              </div>
              <div className="text-xs font-semibold text-gray-800 flex items-center gap-2 shrink-0">
                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                  {p.enfermaria}
                </span>
                {p.leito && (
                  <span className="font-bold">
                    LT {p.leito}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* MODAL ADICIONAR NOVO PACIENTE */}
      {modalNovoPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in no-print">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="shrink-0 mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Adicionar Paciente para {dataFormatadaBR}
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha o nome e selecione a enfermaria inicial.
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

            <form onSubmit={handleCriarPaciente} className="space-y-4 flex-1 overflow-y-auto pr-1">
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
                  placeholder="Ex: TAMIRES SILVA SAMPAIO SANTOS"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Enfermaria
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAdicionandoEnfModal(!adicionandoEnfModal);
                      setNomeNovaEnfModal("");
                    }}
                    className="min-h-[36px] px-2 py-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Cadastrar nova enfermaria na hora"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova
                  </button>
                </div>

                {adicionandoEnfModal ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={nomeNovaEnfModal}
                      onChange={(e) => setNomeNovaEnfModal(e.target.value)}
                      placeholder="Nome da nova enfermaria..."
                      className="flex-1 px-3 py-2 rounded-xl border border-emerald-500 text-xs text-slate-900 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSalvarNovaEnfermariaModal(e);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSalvarNovaEnfermariaModal}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdicionandoEnfModal(false)}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs cursor-pointer flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={novaEnfermaria}
                    onChange={(e) => setNovaEnfermaria(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {enfermarias.map((enf) => (
                      <option key={enf} value={enf}>
                        {enf}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalNovoPaciente(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center"
                >
                  Salvar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
