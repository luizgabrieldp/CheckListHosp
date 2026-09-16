import { create } from "zustand";
import {
  AdmissaoPaciente,
  AltaPaciente,
  DadosPermanencia,
  DatabaseState,
  EquipePlantao,
  MedicoAmbulatorio,
  MetricasHistoricasDiarias,
  ModeloTexto,
  PacientePassagem,
  Pendencia,
  WebSocketMessage,
} from "@/types/hospital";

let socketInstance: WebSocket | null = null;

export function registerSocket(socket: WebSocket | null) {
  socketInstance = socket;
}

export function sendSocketMessage(msg: WebSocketMessage) {
  if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
    socketInstance.send(JSON.stringify(msg));
  }
}

const ENFERMARIAS_PADRAO = [
  "SEM ENFERMARIA",
  "FGH",
  "IMIP",
  "NEFRO",
  "UTI",
  "Cirurgia Geral 1",
  "Cirurgia Geral 2",
];

const CATEGORIAS_MODELOS_PADRAO = [
  "Encaminhamento",
  "Alta",
  "ADM",
  "Evolução",
  "Orientações Gerais",
  "Orientações de Alta",
  "Receituário",
];

function carregarListaLocalStorage(chave: string, padrao: string[]): string[] {
  if (typeof window !== "undefined") {
    try {
      const salvo = localStorage.getItem(chave);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return padrao;
}

interface AppStoreState {
  // Gatekeeper & LGPD
  isAuthenticated: boolean;
  lgpdAcceptedDate: string | null;
  activeTab: 'admissoes' | 'altas' | 'permanencia' | 'passagem' | 'ambulantes' | 'modelos' | 'metricas' | 'config';
  
  // Enfermarias & Configurações
  enfermarias: string[];
  adicionarEnfermaria: (nome: string) => void;
  removerEnfermaria: (nome: string) => void;
  
  categoriasModelos: string[];
  adicionarCategoriaModelo: (nome: string) => void;
  removerCategoriaModelo: (nome: string) => void;
  
  // Realtime Status
  isConnected: boolean;
  latencyMs: number;
  lastSyncTime: number;

  // Entidades Clínicas
  admissoes: AdmissaoPaciente[];
  altas: AltaPaciente[];
  permanencia: DadosPermanencia;
  passagem: PacientePassagem[];
  ambulantes: MedicoAmbulatorio[];
  modelos: ModeloTexto[];
  metricas: MetricasHistoricasDiarias[];

  // Ações de Gatekeeper
  login: (senha: string) => boolean;
  aceitarTermoLgpd: () => void;
  logout: () => void;
  setActiveTab: (tab: AppStoreState['activeTab']) => void;

  // Ações de Conexão
  setConnected: (connected: boolean, latency?: number) => void;
  syncFullState: (state: Partial<DatabaseState>) => void;

  // Mutações Clínicas Otimistas
  salvarAdmissao: (admissao: AdmissaoPaciente) => void;
  removerAdmissao: (id: string) => void;
  alternarCanceladaAdmissao: (id: string) => void;
  alternarHistoriaFinalizada: (id: string) => void;
  reordenarAdmissoes: (novasAdmissoes: AdmissaoPaciente[]) => void;

  salvarAlta: (alta: AltaPaciente) => void;
  removerAlta: (id: string) => void;

  salvarPendencia: (pendencia: Pendencia) => void;
  removerPendencia: (id: string) => void;
  atualizarEquipe: (equipe: EquipePlantao) => void;

  salvarPacientePassagem: (paciente: PacientePassagem) => void;
  removerPacientePassagem: (id: string) => void;

  salvarMedicoAmbulatorio: (medico: MedicoAmbulatorio) => void;
  removerMedicoAmbulatorio: (id: string) => void;

  salvarModelo: (modelo: ModeloTexto) => void;
  removerModelo: (id: string) => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  isAuthenticated: false,
  lgpdAcceptedDate: null,
  activeTab: "admissoes",
  isConnected: false,
  latencyMs: 0,
  lastSyncTime: Date.now(),

  admissoes: [],
  altas: [],
  permanencia: {
    id: "perm-init",
    data: new Date().toISOString().split("T")[0],
    equipe: { doutorandos: [], residentes: [], preceptores: [] },
    pendencias: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  passagem: [],
  ambulantes: [],
  modelos: [],
  metricas: [],

  enfermarias: carregarListaLocalStorage("checklist_enfermarias", ENFERMARIAS_PADRAO),
  categoriasModelos: carregarListaLocalStorage("checklist_categorias_modelos", CATEGORIAS_MODELOS_PADRAO),

  login: (senha: string) => {
    // Senha Mestre "cgimip" sem distinção de maiúsculas ou minúsculas
    if (senha && senha.trim().toLowerCase() === "cgimip") {
      set({ isAuthenticated: true });
      if (typeof window !== "undefined") {
        sessionStorage.setItem("checklist_auth", "true");
      }
      return true;
    }
    return false;
  },

  aceitarTermoLgpd: () => {
    const hoje = new Date().toISOString().split("T")[0];
    set({ lgpdAcceptedDate: hoje });
    if (typeof window !== "undefined") {
      localStorage.setItem("checklist_lgpd_date", hoje);
    }
  },

  logout: () => {
    set({ isAuthenticated: false });
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("checklist_auth");
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setConnected: (connected, latency = 0) =>
    set({ isConnected: connected, latencyMs: latency, lastSyncTime: Date.now() }),

  syncFullState: (state) => {
    set((prev) => ({
      ...prev,
      admissoes: state.admissoes || prev.admissoes,
      altas: state.altas || prev.altas,
      permanencia: state.permanencia || prev.permanencia,
      passagem: state.passagem || prev.passagem,
      ambulantes: state.ambulantes || prev.ambulantes,
      modelos: state.modelos || prev.modelos,
      metricas: state.metricas || prev.metricas,
      lastSyncTime: Date.now(),
    }));
  },

  // MUTAÇÕES ADMISSÕES
  salvarAdmissao: (adm) => {
    const prev = get().admissoes;
    const exists = prev.some((a) => a.id === adm.id);
    const updated = exists ? prev.map((a) => (a.id === adm.id ? adm : a)) : [adm, ...prev];

    set({ admissoes: updated });
    sendSocketMessage({
      type: "UPDATE_ADMISSOES",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  removerAdmissao: (id) => {
    const updated = get().admissoes.filter((a) => a.id !== id);
    set({ admissoes: updated });
    sendSocketMessage({
      type: "UPDATE_ADMISSOES",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  alternarCanceladaAdmissao: (id) => {
    const updated = get().admissoes.map((a) =>
      a.id === id ? { ...a, cancelada: !a.cancelada, updatedAt: new Date().toISOString() } : a
    );
    set({ admissoes: updated });
    sendSocketMessage({
      type: "UPDATE_ADMISSOES",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  alternarHistoriaFinalizada: (id) => {
    const updated = get().admissoes.map((a) =>
      a.id === id
        ? { ...a, historiaFinalizada: !a.historiaFinalizada, updatedAt: new Date().toISOString() }
        : a
    );
    set({ admissoes: updated });
    sendSocketMessage({
      type: "UPDATE_ADMISSOES",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  reordenarAdmissoes: (novasAdmissoes) => {
    set({ admissoes: novasAdmissoes });
    sendSocketMessage({
      type: "UPDATE_ADMISSOES",
      payload: novasAdmissoes,
      timestamp: Date.now(),
    });
  },

  // MUTAÇÕES ALTAS
  salvarAlta: (alta) => {
    const prev = get().altas;
    const exists = prev.some((a) => a.id === alta.id);
    const updated = exists ? prev.map((a) => (a.id === alta.id ? alta : a)) : [alta, ...prev];

    set({ altas: updated });
    sendSocketMessage({
      type: "UPDATE_ALTAS",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  removerAlta: (id) => {
    const updated = get().altas.filter((a) => a.id !== id);
    set({ altas: updated });
    sendSocketMessage({
      type: "UPDATE_ALTAS",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  // MUTAÇÕES PERMANÊNCIA
  salvarPendencia: (pendencia) => {
    const perm = get().permanencia;
    const exists = perm.pendencias.some((p) => p.id === pendencia.id);
    const updatedPendencias = exists
      ? perm.pendencias.map((p) => (p.id === pendencia.id ? pendencia : p))
      : [pendencia, ...perm.pendencias];

    const updatedPerm: DadosPermanencia = {
      ...perm,
      pendencias: updatedPendencias,
      updatedAt: new Date().toISOString(),
    };

    set({ permanencia: updatedPerm });
    sendSocketMessage({
      type: "UPDATE_PERMANENCIA",
      payload: updatedPerm,
      timestamp: Date.now(),
    });
  },

  removerPendencia: (id) => {
    const perm = get().permanencia;
    const updatedPerm: DadosPermanencia = {
      ...perm,
      pendencias: perm.pendencias.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString(),
    };

    set({ permanencia: updatedPerm });
    sendSocketMessage({
      type: "UPDATE_PERMANENCIA",
      payload: updatedPerm,
      timestamp: Date.now(),
    });
  },

  atualizarEquipe: (equipe) => {
    const perm = get().permanencia;
    const updatedPerm: DadosPermanencia = {
      ...perm,
      equipe,
      updatedAt: new Date().toISOString(),
    };

    set({ permanencia: updatedPerm });
    sendSocketMessage({
      type: "UPDATE_PERMANENCIA",
      payload: updatedPerm,
      timestamp: Date.now(),
    });
  },

  // MUTAÇÕES PASSAGEM
  salvarPacientePassagem: (paciente) => {
    const prev = get().passagem;
    const exists = prev.some((p) => p.id === paciente.id);
    const updated = exists ? prev.map((p) => (p.id === paciente.id ? paciente : p)) : [paciente, ...prev];

    set({ passagem: updated });
    sendSocketMessage({
      type: "UPDATE_PASSAGEM",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  removerPacientePassagem: (id) => {
    const updated = get().passagem.filter((p) => p.id !== id);
    set({ passagem: updated });
    sendSocketMessage({
      type: "UPDATE_PASSAGEM",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  // MUTAÇÕES AMBULATÓRIO
  salvarMedicoAmbulatorio: (medico) => {
    const prev = get().ambulantes;
    const exists = prev.some((m) => m.id === medico.id);
    const updated = exists ? prev.map((m) => (m.id === medico.id ? medico : m)) : [...prev, medico];

    set({ ambulantes: updated });
    sendSocketMessage({
      type: "UPDATE_AMBULATORIO",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  removerMedicoAmbulatorio: (id) => {
    const updated = get().ambulantes.filter((m) => m.id !== id);
    set({ ambulantes: updated });
    sendSocketMessage({
      type: "UPDATE_AMBULATORIO",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  // MUTAÇÕES MODELOS
  salvarModelo: (modelo) => {
    const prev = get().modelos;
    const exists = prev.some((m) => m.id === modelo.id);
    const updated = exists ? prev.map((m) => (m.id === modelo.id ? modelo : m)) : [modelo, ...prev];

    set({ modelos: updated });
    sendSocketMessage({
      type: "UPDATE_MODELOS",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  removerModelo: (id) => {
    const updated = get().modelos.filter((m) => m.id !== id);
    set({ modelos: updated });
    sendSocketMessage({
      type: "UPDATE_MODELOS",
      payload: updated,
      timestamp: Date.now(),
    });
  },

  // MUTAÇÕES ENFERMARIAS & CONFIGURAÇÕES
  adicionarEnfermaria: (nome) => {
    const limpo = nome.trim();
    if (!limpo) return;
    const prev = get().enfermarias;
    if (prev.some((e) => e.toLowerCase() === limpo.toLowerCase())) return;
    const updated = [...prev, limpo];
    set({ enfermarias: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("checklist_enfermarias", JSON.stringify(updated));
    }
  },

  removerEnfermaria: (nome) => {
    const updated = get().enfermarias.filter((e) => e !== nome);
    set({ enfermarias: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("checklist_enfermarias", JSON.stringify(updated));
    }
  },

  adicionarCategoriaModelo: (nome) => {
    const limpo = nome.trim();
    if (!limpo) return;
    const prev = get().categoriasModelos;
    if (prev.some((c) => c.toLowerCase() === limpo.toLowerCase())) return;
    const updated = [...prev, limpo];
    set({ categoriasModelos: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("checklist_categorias_modelos", JSON.stringify(updated));
    }
  },

  removerCategoriaModelo: (nome) => {
    const updated = get().categoriasModelos.filter((c) => c !== nome);
    set({ categoriasModelos: updated });
    if (typeof window !== "undefined") {
      localStorage.setItem("checklist_categorias_modelos", JSON.stringify(updated));
    }
  },
}));
