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
import { sincronizarComFirestore } from "@/lib/firebase";
import { obterDataLocalHoje } from "@/lib/utils";

let socketInstance: WebSocket | null = null;

export function registerSocket(socket: WebSocket | null) {
  socketInstance = socket;
}

export function sendSocketMessage(msg: WebSocketMessage) {
  if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
    socketInstance.send(JSON.stringify(msg));
  }
}

function sincronizarMutation(chave: keyof DatabaseState, payload: any, wsType: string) {
  // 1. Enviar para WebSocket local (se conectado)
  sendSocketMessage({
    type: wsType as any,
    payload,
    timestamp: Date.now(),
  });

  // 2. Enviar para Firebase Firestore (se configurado)
  sincronizarComFirestore({ [chave]: payload });

  // 3. Cache offline local
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`checklist_${chave}`, JSON.stringify(payload));
    } catch {}
  }
}

export const ENFERMARIAS_PADRAO = [
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

export function normalizarEnfermariaPaciente<T extends { enfermaria?: string }>(item: T): T {
  if (!item.enfermaria || item.enfermaria.trim().toLowerCase() === "sem enfermaria") {
    return { ...item, enfermaria: "" };
  }
  return item;
}

function carregarListaLocalStorage(chave: string, padrao: string[]): string[] {
  if (typeof window !== "undefined") {
    try {
      const salvo = localStorage.getItem(chave);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtrado = parsed.filter(
            (item: any) =>
              typeof item === "string" &&
              item.trim().toLowerCase() !== "sem enfermaria" &&
              item.trim().toLowerCase() !== "sem enfermaria / indefinida"
          );
          return filtrado.length > 0 ? filtrado : padrao;
        }
      }
    } catch {}
  }
  return padrao;
}

function carregarItemLocalStorage<T>(chave: string, padrao: T): T {
  if (typeof window !== "undefined") {
    try {
      const salvo = localStorage.getItem(chave);
      if (salvo) return JSON.parse(salvo);
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

  // Layout & Sidebar
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Ações de Gatekeeper
  login: (senha: string) => boolean;
  aceitarTermoLgpd: () => void;
  logout: () => void;
  registrarAtividade: () => void;
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
  activeTab: "metricas",
  isConnected: false,
  latencyMs: 0,
  lastSyncTime: Date.now(),

  isSidebarCollapsed: false,
  toggleSidebarCollapsed: () => {
    const proximo = !get().isSidebarCollapsed;
    set({ isSidebarCollapsed: proximo });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("checklist_sidebar_collapsed", String(proximo));
      } catch {}
    }
  },
  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("checklist_sidebar_collapsed", String(collapsed));
      } catch {}
    }
  },

  admissoes: carregarItemLocalStorage<AdmissaoPaciente[]>("checklist_admissoes", []).map(normalizarEnfermariaPaciente),
  altas: carregarItemLocalStorage<AltaPaciente[]>("checklist_altas", []).map(normalizarEnfermariaPaciente),
  permanencia: carregarItemLocalStorage<DadosPermanencia>("checklist_permanencia", {
    id: "perm-init",
    data: obterDataLocalHoje(),
    equipe: { doutorandos: [], residentes: [], preceptores: [] },
    pendencias: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  passagem: carregarItemLocalStorage<PacientePassagem[]>("checklist_passagem", []).map(normalizarEnfermariaPaciente),
  ambulantes: carregarItemLocalStorage<MedicoAmbulatorio[]>("checklist_ambulantes", []),
  modelos: carregarItemLocalStorage<ModeloTexto[]>("checklist_modelos", []),
  metricas: carregarItemLocalStorage<MetricasHistoricasDiarias[]>("checklist_metricas", []),

  enfermarias: carregarListaLocalStorage("checklist_enfermarias", ENFERMARIAS_PADRAO),
  categoriasModelos: carregarListaLocalStorage("checklist_categorias_modelos", CATEGORIAS_MODELOS_PADRAO),

  login: (senha: string) => {
    // Senha Mestre "cgimip" sem distinção de maiúsculas ou minúsculas
    if (senha && senha.trim().toLowerCase() === "cgimip") {
      set({ isAuthenticated: true, activeTab: "metricas" });
      if (typeof window !== "undefined") {
        sessionStorage.setItem("checklist_auth", "true");
        sessionStorage.setItem("checklist_last_activity", Date.now().toString());
      }
      return true;
    }
    return false;
  },

  aceitarTermoLgpd: () => {
    const hoje = obterDataLocalHoje();
    set({ lgpdAcceptedDate: hoje });
    if (typeof window !== "undefined") {
      localStorage.setItem("checklist_lgpd_date", hoje);
    }
  },

  logout: () => {
    set({ isAuthenticated: false, activeTab: "metricas" });
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("checklist_auth");
      sessionStorage.removeItem("checklist_last_activity");
    }
  },

  registrarAtividade: () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("checklist_last_activity", Date.now().toString());
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setConnected: (connected, latency = 0) =>
    set({ isConnected: connected, latencyMs: latency, lastSyncTime: Date.now() }),

  syncFullState: (state) => {
    set((prev) => ({
      ...prev,
      admissoes: state.admissoes ? state.admissoes.map(normalizarEnfermariaPaciente) : prev.admissoes,
      altas: state.altas
        ? state.altas.map((nova) => {
            const anterior = prev.altas.find((a) => a.id === nova.id);
            const atualizada = normalizarEnfermariaPaciente(nova);
            const fotosFeridaUrls =
              (anterior?.fotosFeridaUrls && anterior.fotosFeridaUrls.length > 0)
                ? anterior.fotosFeridaUrls
                : (atualizada.fotosFeridaUrls && atualizada.fotosFeridaUrls.length > 0
                    ? atualizada.fotosFeridaUrls
                    : undefined);
            const fotoFeridaUrl =
              anterior?.fotoFeridaUrl ||
              atualizada.fotoFeridaUrl ||
              (fotosFeridaUrls && fotosFeridaUrls[0] ? fotosFeridaUrls[0] : undefined);
            return {
              ...atualizada,
              fotosFeridaUrls,
              fotoFeridaUrl,
            };
          })
        : prev.altas,
      permanencia: state.permanencia || prev.permanencia,
      passagem: state.passagem ? state.passagem.map(normalizarEnfermariaPaciente) : prev.passagem,
      ambulantes: state.ambulantes || prev.ambulantes,
      modelos: state.modelos || prev.modelos,
      metricas: state.metricas || prev.metricas,
      lastSyncTime: Date.now(),
    }));

    if (typeof window !== "undefined") {
      try {
        if (state.admissoes) localStorage.setItem("checklist_admissoes", JSON.stringify(state.admissoes));
        if (state.altas) localStorage.setItem("checklist_altas", JSON.stringify(state.altas));
        if (state.permanencia) localStorage.setItem("checklist_permanencia", JSON.stringify(state.permanencia));
        if (state.passagem) localStorage.setItem("checklist_passagem", JSON.stringify(state.passagem));
        if (state.ambulantes) localStorage.setItem("checklist_ambulantes", JSON.stringify(state.ambulantes));
        if (state.modelos) localStorage.setItem("checklist_modelos", JSON.stringify(state.modelos));
        if (state.metricas) localStorage.setItem("checklist_metricas", JSON.stringify(state.metricas));
      } catch {}
    }
  },

  // MUTAÇÕES ADMISSÕES
  salvarAdmissao: (adm) => {
    const prev = get().admissoes;
    const exists = prev.some((a) => a.id === adm.id);
    const updated = exists ? prev.map((a) => (a.id === adm.id ? adm : a)) : [adm, ...prev];

    set({ admissoes: updated });
    sincronizarMutation("admissoes", updated, "UPDATE_ADMISSOES");
  },

  removerAdmissao: (id) => {
    const updated = get().admissoes.filter((a) => a.id !== id);
    set({ admissoes: updated });
    sincronizarMutation("admissoes", updated, "UPDATE_ADMISSOES");
  },

  alternarCanceladaAdmissao: (id) => {
    const updated = get().admissoes.map((a) =>
      a.id === id ? { ...a, cancelada: !a.cancelada, updatedAt: new Date().toISOString() } : a
    );
    set({ admissoes: updated });
    sincronizarMutation("admissoes", updated, "UPDATE_ADMISSOES");
  },

  alternarHistoriaFinalizada: (id) => {
    const updated = get().admissoes.map((a) =>
      a.id === id
        ? { ...a, historiaFinalizada: !a.historiaFinalizada, updatedAt: new Date().toISOString() }
        : a
    );
    set({ admissoes: updated });
    sincronizarMutation("admissoes", updated, "UPDATE_ADMISSOES");
  },

  reordenarAdmissoes: (novasAdmissoes) => {
    set({ admissoes: novasAdmissoes });
    sincronizarMutation("admissoes", novasAdmissoes, "UPDATE_ADMISSOES");
  },

  // MUTAÇÕES ALTAS
  salvarAlta: (alta) => {
    const prev = get().altas;
    const exists = prev.some((a) => a.id === alta.id);
    const updated = exists ? prev.map((a) => (a.id === alta.id ? alta : a)) : [alta, ...prev];

    set({ altas: updated });
    sincronizarMutation("altas", updated, "UPDATE_ALTAS");
  },

  removerAlta: (id) => {
    const updated = get().altas.filter((a) => a.id !== id);
    set({ altas: updated });
    sincronizarMutation("altas", updated, "UPDATE_ALTAS");
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
    sincronizarMutation("permanencia", updatedPerm, "UPDATE_PERMANENCIA");
  },

  removerPendencia: (id) => {
    const perm = get().permanencia;
    const updatedPerm: DadosPermanencia = {
      ...perm,
      pendencias: perm.pendencias.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString(),
    };

    set({ permanencia: updatedPerm });
    sincronizarMutation("permanencia", updatedPerm, "UPDATE_PERMANENCIA");
  },

  atualizarEquipe: (equipe) => {
    const perm = get().permanencia;
    const updatedPerm: DadosPermanencia = {
      ...perm,
      equipe,
      updatedAt: new Date().toISOString(),
    };

    set({ permanencia: updatedPerm });
    sincronizarMutation("permanencia", updatedPerm, "UPDATE_PERMANENCIA");
  },

  // MUTAÇÕES PASSAGEM
  salvarPacientePassagem: (paciente) => {
    const prev = get().passagem;
    const exists = prev.some((p) => p.id === paciente.id);
    const updated = exists ? prev.map((p) => (p.id === paciente.id ? paciente : p)) : [paciente, ...prev];

    set({ passagem: updated });
    sincronizarMutation("passagem", updated, "UPDATE_PASSAGEM");
  },

  removerPacientePassagem: (id) => {
    const updated = get().passagem.filter((p) => p.id !== id);
    set({ passagem: updated });
    sincronizarMutation("passagem", updated, "UPDATE_PASSAGEM");
  },

  // MUTAÇÕES AMBULATÓRIO
  salvarMedicoAmbulatorio: (medico) => {
    const prev = get().ambulantes;
    const exists = prev.some((m) => m.id === medico.id);
    const updated = exists ? prev.map((m) => (m.id === medico.id ? medico : m)) : [...prev, medico];

    set({ ambulantes: updated });
    sincronizarMutation("ambulantes", updated, "UPDATE_AMBULATORIO");
  },

  removerMedicoAmbulatorio: (id) => {
    const updated = get().ambulantes.filter((m) => m.id !== id);
    set({ ambulantes: updated });
    sincronizarMutation("ambulantes", updated, "UPDATE_AMBULATORIO");
  },

  // MUTAÇÕES MODELOS
  salvarModelo: (modelo) => {
    const prev = get().modelos;
    const exists = prev.some((m) => m.id === modelo.id);
    const updated = exists ? prev.map((m) => (m.id === modelo.id ? modelo : m)) : [modelo, ...prev];

    set({ modelos: updated });
    sincronizarMutation("modelos", updated, "UPDATE_MODELOS");
  },

  removerModelo: (id) => {
    const updated = get().modelos.filter((m) => m.id !== id);
    set({ modelos: updated });
    sincronizarMutation("modelos", updated, "UPDATE_MODELOS");
  },

  // MUTAÇÕES ENFERMARIAS & CONFIGURAÇÕES
  adicionarEnfermaria: (nome) => {
    const limpo = nome.trim();
    if (!limpo) return;
    if (limpo.toLowerCase() === "sem enfermaria" || limpo.toLowerCase() === "sem enfermaria / indefinida") return;
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
