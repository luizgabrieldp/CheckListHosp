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
import {
  sincronizarComFirestore,
  apagarFotosFirestore,
  salvarItemGranularFirestore,
  removerItemGranularFirestore,
  salvarConfigGranularFirestore,
  removerPresencaFirestore,
  ColecaoGranularKey,
  PresencaUsuario,
  RemoteAuthorUpdate,
} from "@/lib/firebase";
import { obterDataLocalHoje } from "@/lib/utils";
import {
  executarExpurgoAutomaticoCliente,
  ResultadoExpurgoAutomatico,
} from "@/lib/lgpd";
import {
  SEED_AMBULATORIO_PADRAO,
  SEED_MODELOS_PADRAO,
  mesclarAmbulatorioComSeguranca,
  mesclarModelosComSeguranca,
} from "@/lib/seeds";

let socketInstance: WebSocket | null = null;

export function registerSocket(socket: WebSocket | null) {
  socketInstance = socket;
}

export function sendSocketMessage(msg: WebSocketMessage) {
  if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
    socketInstance.send(JSON.stringify(msg));
  }
}

function obterChaveLocalStorage(chave: keyof DatabaseState): string {
  if (chave === "categoriasModelos") return "checklist_categorias_modelos";
  return `checklist_${chave}`;
}

export interface ActiveEditingField {
  entityId: string;
  field: string;
}

export interface RecentRemoteUpdate {
  author: string;
  updatedAtMs: number;
}

/**
 * Mescla itens recebidos do Firestore preservando o campo exato que o usuário
 * local está editando no momento (evita salto de cursor / perda de digitação).
 */
export function mesclarColecaoComCampoAtivo<T extends { id: string }>(
  localItems: T[],
  remoteItems: T[],
  activeField: ActiveEditingField | null
): T[] {
  if (!activeField) return remoteItems;
  const localItem = localItems.find((i) => i.id === activeField.entityId);
  if (!localItem) return remoteItems;

  const hasLocalField = Object.prototype.hasOwnProperty.call(localItem, activeField.field);
  if (!hasLocalField) return remoteItems;

  return remoteItems.map((remoteItem) => {
    if (remoteItem.id !== activeField.entityId) return remoteItem;
    return {
      ...remoteItem,
      [activeField.field]: (localItem as Record<string, unknown>)[activeField.field],
    };
  });
}

function sincronizarCacheLocalEWs(chave: keyof DatabaseState, payload: unknown, wsType: string) {
  useAppStore.setState({ saveStatus: "saving" });

  sendSocketMessage({
    type: wsType as any,
    payload,
    timestamp: Date.now(),
  });

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(obterChaveLocalStorage(chave), JSON.stringify(payload));
    } catch {}
  }
}

function finalizarSyncStatus(ok: boolean) {
  useAppStore.setState({
    saveStatus: ok ? "saved" : "error",
    lastSyncTime: Date.now(),
  });
}

function sincronizarItemGranular(
  colecaoKey: ColecaoGranularKey,
  item: Record<string, unknown> & { id: string },
  prevItem: (Record<string, unknown> & { id: string }) | undefined,
  wsKey: keyof DatabaseState,
  wsPayload: unknown,
  wsType: string
) {
  sincronizarCacheLocalEWs(wsKey, wsPayload, wsType);
  const author = useAppStore.getState().plantonista || "Equipe";
  salvarItemGranularFirestore(colecaoKey, item.id, item, prevItem, author)
    .then((ok) => finalizarSyncStatus(ok))
    .catch(() => finalizarSyncStatus(false));
}

function removerItemGranular(
  colecaoKey: ColecaoGranularKey,
  id: string,
  wsKey: keyof DatabaseState,
  wsPayload: unknown,
  wsType: string
) {
  sincronizarCacheLocalEWs(wsKey, wsPayload, wsType);
  removerItemGranularFirestore(colecaoKey, id)
    .then((ok) => finalizarSyncStatus(ok))
    .catch(() => finalizarSyncStatus(false));
}

function sincronizarConfigGranular(
  docId: "enfermarias" | "categorias_modelo" | "equipe" | "atividades" | "metricas",
  data: Record<string, unknown>,
  wsKey: keyof DatabaseState,
  wsPayload: unknown,
  wsType: string
) {
  sincronizarCacheLocalEWs(wsKey, wsPayload, wsType);
  const author = useAppStore.getState().plantonista || "Equipe";
  salvarConfigGranularFirestore(docId, data, author)
    .then((ok) => finalizarSyncStatus(ok))
    .catch(() => finalizarSyncStatus(false));
}

function sincronizarMutation(chave: keyof DatabaseState, payload: any, wsType: string) {
  sincronizarCacheLocalEWs(chave, payload, wsType);

  sincronizarComFirestore({ [chave]: payload })
    .then((ok) => finalizarSyncStatus(ok))
    .catch(() => finalizarSyncStatus(false));
}

export const ENFERMARIAS_PADRAO = [
  "FGH",
  "IMIP",
  "NEFRO",
  "UTI",
  "Cirurgia Geral 1",
  "Cirurgia Geral 2",
];

export const CATEGORIAS_MODELOS_PADRAO = [
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

export function limparSinaisVitaisLegadosAlta(alta: AltaPaciente): AltaPaciente {
  // Preserva rigorosamente os valores reais digitados pelo usuário (não apaga FC ou Sat)
  return normalizarEnfermariaPaciente(alta);
}

export function limparSinaisVitaisLegadosPassagem(paciente: PacientePassagem): PacientePassagem {
  // Preserva rigorosamente os valores reais digitados pelo usuário
  return normalizarEnfermariaPaciente(paciente);
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

function carregarAmbulatorioLocalStorage(): MedicoAmbulatorio[] {
  if (typeof window !== "undefined") {
    try {
      const salvo = localStorage.getItem("checklist_ambulantes");
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return SEED_AMBULATORIO_PADRAO;
}

function carregarModelosLocalStorage(): ModeloTexto[] {
  if (typeof window !== "undefined") {
    try {
      const salvo = localStorage.getItem("checklist_modelos");
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return SEED_MODELOS_PADRAO;
}

export type ThemeMode = "auto" | "light" | "dark";

export function resolverTemaEfetivo(modo: ThemeMode, sistemaIsDark: boolean): "dark" | "light" {
  if (modo === "dark") return "dark";
  if (modo === "light") return "light";
  return sistemaIsDark ? "dark" : "light";
}

export function aplicarTemaNoDocumento(modo: ThemeMode) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const sistemaIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const efetivo = resolverTemaEfetivo(modo, sistemaIsDark);

  if (efetivo === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }

  // Atualiza a meta tag theme-color na barra de status do celular
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", efetivo === "dark" ? "#0b1120" : "#0f172a");
  }
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
  
  // Realtime Status & Colaboração (estilo Google Docs)
  isConnected: boolean;
  latencyMs: number;
  lastSyncTime: number;
  syncOrigin: "firestore" | "websocket" | "local" | "offline";
  saveStatus: "idle" | "saving" | "saved" | "error";
  onlineUsers: PresencaUsuario[];
  setOnlineUsers: (users: PresencaUsuario[]) => void;
  recentRemoteUpdates: Record<string, RecentRemoteUpdate>;
  markRemoteUpdates: (updates: RemoteAuthorUpdate[]) => void;
  activeEditingField: ActiveEditingField | null;
  setActiveEditingField: (field: ActiveEditingField | null) => void;
  applyGranularCollectionSync: (
    key: ColecaoGranularKey,
    items: Record<string, unknown>[],
    remoteAuthors: RemoteAuthorUpdate[]
  ) => void;
  applyGranularConfigSync: (docId: string, data: Record<string, unknown>) => void;

  // Identificação leve do plantonista (sessão)
  plantonista: string;
  setPlantonista: (nome: string) => void;

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

  // Tema & Aparência (Dark Mode / Light / Auto)
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Ações de Gatekeeper
  login: (senha: string) => boolean;
  aceitarTermoLgpd: () => void;
  logout: () => void;
  hidratarDadosLocais: () => void;
  registrarAtividade: () => void;
  setActiveTab: (tab: AppStoreState['activeTab']) => void;

  // Ações de Conexão
  setConnected: (connected: boolean, latency?: number, origin?: "firestore" | "websocket" | "local" | "offline") => void;
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

  // Rotina de Expurgo LGPD Automático (48h após a data do evento)
  executarExpurgoAutomatico: () => ResultadoExpurgoAutomatico;
}

function criarPermanenciaVazia(): DadosPermanencia {
  return {
    id: "perm-init",
    data: obterDataLocalHoje(),
    equipe: { doutorandos: [], residentes: [], preceptores: [] },
    pendencias: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  isAuthenticated: false,
  lgpdAcceptedDate: null,
  activeTab: "metricas",
  isConnected: false,
  latencyMs: 0,
  lastSyncTime: Date.now(),
  syncOrigin: "offline",
  saveStatus: "idle",
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  recentRemoteUpdates: {},
  markRemoteUpdates: (updates) => {
    if (!updates || updates.length === 0) return;
    set((prev) => {
      const next = { ...prev.recentRemoteUpdates };
      for (const u of updates) {
        next[u.id] = { author: u.author, updatedAtMs: u.updatedAtMs };
      }
      return { recentRemoteUpdates: next };
    });
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const cutoff = Date.now() - 4200;
        useAppStore.setState((prev) => {
          const cleaned: Record<string, RecentRemoteUpdate> = {};
          let changed = false;
          for (const [id, info] of Object.entries(prev.recentRemoteUpdates)) {
            if (info.updatedAtMs > cutoff) {
              cleaned[id] = info;
            } else {
              changed = true;
            }
          }
          return changed ? { recentRemoteUpdates: cleaned } : prev;
        });
      }, 4500);
    }
  },
  activeEditingField: null,
  setActiveEditingField: (field) => set({ activeEditingField: field }),
  plantonista: "",
  setPlantonista: (nome: string) => {
    const limpo = nome.trim().slice(0, 32);
    set({ plantonista: limpo });
    if (typeof window !== "undefined") {
      try {
        if (limpo) {
          sessionStorage.setItem("checklist_plantonista", limpo);
        } else {
          sessionStorage.removeItem("checklist_plantonista");
        }
      } catch {}
    }
  },

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

  themeMode:
    (typeof window !== "undefined" &&
      (((localStorage.getItem("checklist_theme_mode") || "auto").replace(/['"]/g, "").trim()) as ThemeMode)) ||
    "auto",
  setThemeMode: (mode: ThemeMode) => {
    set({ themeMode: mode });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("checklist_theme_mode", mode);
      } catch {}
      aplicarTemaNoDocumento(mode);
    }
  },

  admissoes: [],
  altas: [],
  permanencia: criarPermanenciaVazia(),
  passagem: [],
  ambulantes: carregarAmbulatorioLocalStorage(),
  modelos: carregarModelosLocalStorage(),
  metricas: [],

  enfermarias: carregarListaLocalStorage("checklist_enfermarias", ENFERMARIAS_PADRAO),
  categoriasModelos: carregarListaLocalStorage("checklist_categorias_modelos", CATEGORIAS_MODELOS_PADRAO),

  hidratarDadosLocais: () => {
    const plantonistaSalvo =
      typeof window !== "undefined" ? sessionStorage.getItem("checklist_plantonista") || "" : "";
    set({
      admissoes: carregarItemLocalStorage<AdmissaoPaciente[]>("checklist_admissoes", []).map(normalizarEnfermariaPaciente),
      altas: carregarItemLocalStorage<AltaPaciente[]>("checklist_altas", []).map(limparSinaisVitaisLegadosAlta),
      permanencia: carregarItemLocalStorage<DadosPermanencia>("checklist_permanencia", criarPermanenciaVazia()),
      passagem: carregarItemLocalStorage<PacientePassagem[]>("checklist_passagem", []).map(limparSinaisVitaisLegadosPassagem),
      metricas: carregarItemLocalStorage<MetricasHistoricasDiarias[]>("checklist_metricas", []),
      plantonista: plantonistaSalvo,
    });
  },

  login: (senha: string) => {
    // Senha Mestre "cgimip" sem distinção de maiúsculas ou minúsculas
    if (senha && senha.trim().toLowerCase() === "cgimip") {
      get().hidratarDadosLocais();
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
    set({
      isAuthenticated: false,
      activeTab: "metricas",
      isConnected: false,
      latencyMs: 0,
      syncOrigin: "offline",
      saveStatus: "idle",
      plantonista: "",
      onlineUsers: [],
      recentRemoteUpdates: {},
      activeEditingField: null,
      admissoes: [],
      altas: [],
      permanencia: criarPermanenciaVazia(),
      passagem: [],
      metricas: [],
    });
    removerPresencaFirestore().catch(() => {});
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("checklist_auth");
      sessionStorage.removeItem("checklist_last_activity");
      sessionStorage.removeItem("checklist_plantonista");
      try {
        localStorage.removeItem("checklist_admissoes");
        localStorage.removeItem("checklist_altas");
        localStorage.removeItem("checklist_permanencia");
        localStorage.removeItem("checklist_passagem");
        localStorage.removeItem("checklist_metricas");
      } catch {}
    }
  },

  registrarAtividade: () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("checklist_last_activity", Date.now().toString());
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setConnected: (connected, latency = 0, origin) =>
    set((prev) => ({
      isConnected: connected,
      latencyMs: latency,
      syncOrigin: origin ?? (connected ? prev.syncOrigin : "offline"),
      lastSyncTime: Date.now(),
    })),

  syncFullState: (state) => {
    if (!get().isAuthenticated) return;
    set((prev) => {
      const novosAmbulantes = mesclarAmbulatorioComSeguranca(state.ambulantes, prev.ambulantes);
      const novosModelos = mesclarModelosComSeguranca(state.modelos, prev.modelos);

      const enfermariasRemotas = Array.isArray(state.enfermarias)
        ? state.enfermarias.filter(
            (item: any) =>
              typeof item === "string" &&
              item.trim().length > 0 &&
              item.trim().toLowerCase() !== "sem enfermaria" &&
              item.trim().toLowerCase() !== "sem enfermaria / indefinida"
          )
        : [];
      const novasEnfermarias =
        enfermariasRemotas.length > 0
          ? enfermariasRemotas
          : prev.enfermarias.length > 0
            ? prev.enfermarias
            : ENFERMARIAS_PADRAO;

      const categoriasRemotas = Array.isArray(state.categoriasModelos)
        ? state.categoriasModelos.filter((c: any) => typeof c === "string" && c.trim().length > 0)
        : [];
      const novasCategorias =
        categoriasRemotas.length > 0
          ? categoriasRemotas
          : prev.categoriasModelos.length > 0
            ? prev.categoriasModelos
            : CATEGORIAS_MODELOS_PADRAO;

      return {
        ...prev,
        admissoes: state.admissoes ? state.admissoes.map(normalizarEnfermariaPaciente) : prev.admissoes,
        altas: state.altas
          ? state.altas.map((nova) => {
              const anterior = prev.altas.find((a) => a.id === nova.id);
              const atualizada = limparSinaisVitaisLegadosAlta(nova);
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
        passagem: state.passagem ? state.passagem.map(limparSinaisVitaisLegadosPassagem) : prev.passagem,
        ambulantes: novosAmbulantes,
        modelos: novosModelos,
        metricas: state.metricas || prev.metricas,
        enfermarias: novasEnfermarias,
        categoriasModelos: novasCategorias,
        lastSyncTime: Date.now(),
      };
    });

    if (typeof window !== "undefined") {
      try {
        if (state.admissoes) localStorage.setItem("checklist_admissoes", JSON.stringify(state.admissoes));
        if (state.altas) localStorage.setItem("checklist_altas", JSON.stringify(state.altas));
        if (state.permanencia) localStorage.setItem("checklist_permanencia", JSON.stringify(state.permanencia));
        if (state.passagem) localStorage.setItem("checklist_passagem", JSON.stringify(state.passagem));

        // NUNCA salvar arrays vazios no LocalStorage por sincronização passiva
        const cur = get();
        if (cur.ambulantes && cur.ambulantes.length > 0) {
          localStorage.setItem("checklist_ambulantes", JSON.stringify(cur.ambulantes));
        }
        if (cur.modelos && cur.modelos.length > 0) {
          localStorage.setItem("checklist_modelos", JSON.stringify(cur.modelos));
        }
        if (cur.enfermarias && cur.enfermarias.length > 0) {
          localStorage.setItem("checklist_enfermarias", JSON.stringify(cur.enfermarias));
        }
        if (cur.categoriasModelos && cur.categoriasModelos.length > 0) {
          localStorage.setItem("checklist_categorias_modelos", JSON.stringify(cur.categoriasModelos));
        }
        if (state.metricas) localStorage.setItem("checklist_metricas", JSON.stringify(state.metricas));
      } catch {}
    }
  },

  applyGranularCollectionSync: (key, items, remoteAuthors) => {
    if (!get().isAuthenticated) return;
    const activeField = get().activeEditingField;

    set((prev) => {
      if (key === "admissoes") {
        const normalized = (items as unknown as AdmissaoPaciente[]).map(normalizarEnfermariaPaciente);
        const merged = mesclarColecaoComCampoAtivo(prev.admissoes, normalized, activeField);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("checklist_admissoes", JSON.stringify(merged));
          } catch {}
        }
        return { admissoes: merged, lastSyncTime: Date.now() };
      }

      if (key === "altas") {
        const normalized = (items as unknown as AltaPaciente[]).map((nova) => {
          const anterior = prev.altas.find((a) => a.id === nova.id);
          const atualizada = limparSinaisVitaisLegadosAlta(nova);
          const fotosFeridaUrls =
            anterior?.fotosFeridaUrls && anterior.fotosFeridaUrls.length > 0
              ? anterior.fotosFeridaUrls
              : atualizada.fotosFeridaUrls && atualizada.fotosFeridaUrls.length > 0
                ? atualizada.fotosFeridaUrls
                : undefined;
          const fotoFeridaUrl =
            anterior?.fotoFeridaUrl ||
            atualizada.fotoFeridaUrl ||
            (fotosFeridaUrls && fotosFeridaUrls[0] ? fotosFeridaUrls[0] : undefined);
          return { ...atualizada, fotosFeridaUrls, fotoFeridaUrl };
        });
        const merged = mesclarColecaoComCampoAtivo(prev.altas, normalized, activeField);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("checklist_altas", JSON.stringify(merged));
          } catch {}
        }
        return { altas: merged, lastSyncTime: Date.now() };
      }

      if (key === "pacientesPassagem") {
        const normalized = (items as unknown as PacientePassagem[]).map(limparSinaisVitaisLegadosPassagem);
        const merged = mesclarColecaoComCampoAtivo(prev.passagem, normalized, activeField);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("checklist_passagem", JSON.stringify(merged));
          } catch {}
        }
        return { passagem: merged, lastSyncTime: Date.now() };
      }

      if (key === "pendencias") {
        const mergedPendencias = mesclarColecaoComCampoAtivo(
          prev.permanencia.pendencias,
          items as unknown as Pendencia[],
          activeField
        );
        const novaPermanencia: DadosPermanencia = {
          ...prev.permanencia,
          pendencias: mergedPendencias,
        };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("checklist_permanencia", JSON.stringify(novaPermanencia));
          } catch {}
        }
        return { permanencia: novaPermanencia, lastSyncTime: Date.now() };
      }

      if (key === "medicosAmbulatorio") {
        const merged = mesclarAmbulatorioComSeguranca(
          items as unknown as MedicoAmbulatorio[],
          prev.ambulantes
        );
        if (typeof window !== "undefined" && merged.length > 0) {
          try {
            localStorage.setItem("checklist_ambulantes", JSON.stringify(merged));
          } catch {}
        }
        return { ambulantes: merged, lastSyncTime: Date.now() };
      }

      if (key === "modelos") {
        const merged = mesclarModelosComSeguranca(
          items as unknown as ModeloTexto[],
          prev.modelos
        );
        if (typeof window !== "undefined" && merged.length > 0) {
          try {
            localStorage.setItem("checklist_modelos", JSON.stringify(merged));
          } catch {}
        }
        return { modelos: merged, lastSyncTime: Date.now() };
      }

      return prev;
    });

    if (remoteAuthors.length > 0) {
      get().markRemoteUpdates(remoteAuthors);
    }
  },

  applyGranularConfigSync: (docId, data) => {
    if (!get().isAuthenticated) return;
    set((prev) => {
      if (docId === "enfermarias" && Array.isArray(data.items)) {
        const validas = data.items.filter(
          (item: unknown): item is string =>
            typeof item === "string" &&
            item.trim().length > 0 &&
            item.trim().toLowerCase() !== "sem enfermaria" &&
            item.trim().toLowerCase() !== "sem enfermaria / indefinida"
        );
        if (validas.length === 0) return prev;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("checklist_enfermarias", JSON.stringify(validas));
          } catch {}
        }
        return { enfermarias: validas, lastSyncTime: Date.now() };
      }

      if (docId === "categorias_modelo" && Array.isArray(data.items)) {
        const validas = data.items.filter(
          (c: unknown): c is string => typeof c === "string" && c.trim().length > 0
        );
        if (validas.length === 0) return prev;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("checklist_categorias_modelos", JSON.stringify(validas));
          } catch {}
        }
        return { categoriasModelos: validas, lastSyncTime: Date.now() };
      }

      if (docId === "equipe") {
        const equipeData = (data.equipe || (Array.isArray(data.items) ? data.items[0] : data)) as EquipePlantao | undefined;
        if (!equipeData) return prev;
        const novaPerm: DadosPermanencia = {
          ...prev.permanencia,
          equipe: {
            doutorandos: Array.isArray(equipeData.doutorandos) ? equipeData.doutorandos : prev.permanencia.equipe.doutorandos,
            residentes: Array.isArray(equipeData.residentes) ? equipeData.residentes : prev.permanencia.equipe.residentes,
            preceptores: Array.isArray(equipeData.preceptores) ? equipeData.preceptores : prev.permanencia.equipe.preceptores,
          },
        };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("checklist_permanencia", JSON.stringify(novaPerm));
          } catch {}
        }
        return { permanencia: novaPerm, lastSyncTime: Date.now() };
      }

      if (docId === "metricas" && Array.isArray(data.items)) {
        const metricas = data.items as MetricasHistoricasDiarias[];
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("checklist_metricas", JSON.stringify(metricas));
          } catch {}
        }
        return { metricas, lastSyncTime: Date.now() };
      }

      return prev;
    });
  },

  // MUTAÇÕES ADMISSÕES (Granular por documento/campo)
  salvarAdmissao: (adm) => {
    const prev = get().admissoes;
    const prevItem = prev.find((a) => a.id === adm.id);
    const updated = prevItem ? prev.map((a) => (a.id === adm.id ? adm : a)) : [adm, ...prev];

    set({ admissoes: updated });
    sincronizarItemGranular(
      "admissoes",
      adm as unknown as Record<string, unknown> & { id: string },
      prevItem as unknown as (Record<string, unknown> & { id: string }) | undefined,
      "admissoes",
      updated,
      "UPDATE_ADMISSOES"
    );
  },

  removerAdmissao: (id) => {
    const updated = get().admissoes.filter((a) => a.id !== id);
    set({ admissoes: updated });
    removerItemGranular("admissoes", id, "admissoes", updated, "UPDATE_ADMISSOES");
  },

  alternarCanceladaAdmissao: (id) => {
    const prev = get().admissoes;
    const prevItem = prev.find((a) => a.id === id);
    if (!prevItem) return;
    const nextItem = { ...prevItem, cancelada: !prevItem.cancelada, updatedAt: new Date().toISOString() };
    const updated = prev.map((a) => (a.id === id ? nextItem : a));
    set({ admissoes: updated });
    sincronizarItemGranular(
      "admissoes",
      nextItem as unknown as Record<string, unknown> & { id: string },
      prevItem as unknown as Record<string, unknown> & { id: string },
      "admissoes",
      updated,
      "UPDATE_ADMISSOES"
    );
  },

  alternarHistoriaFinalizada: (id) => {
    const prev = get().admissoes;
    const prevItem = prev.find((a) => a.id === id);
    if (!prevItem) return;
    const nextItem = {
      ...prevItem,
      historiaFinalizada: !prevItem.historiaFinalizada,
      updatedAt: new Date().toISOString(),
    };
    const updated = prev.map((a) => (a.id === id ? nextItem : a));
    set({ admissoes: updated });
    sincronizarItemGranular(
      "admissoes",
      nextItem as unknown as Record<string, unknown> & { id: string },
      prevItem as unknown as Record<string, unknown> & { id: string },
      "admissoes",
      updated,
      "UPDATE_ADMISSOES"
    );
  },

  reordenarAdmissoes: (novasAdmissoes) => {
    const prev = get().admissoes;
    set({ admissoes: novasAdmissoes });
    sincronizarCacheLocalEWs("admissoes", novasAdmissoes, "UPDATE_ADMISSOES");
    const author = get().plantonista || "Equipe";
    const promises = novasAdmissoes.map((adm) => {
      const prevItem = prev.find((a) => a.id === adm.id);
      if (prevItem && JSON.stringify(prevItem) === JSON.stringify(adm)) return Promise.resolve(true);
      return salvarItemGranularFirestore(
        "admissoes",
        adm.id,
        adm as unknown as Record<string, unknown>,
        prevItem as unknown as Record<string, unknown> | undefined,
        author
      );
    });
    Promise.all(promises)
      .then((results) => finalizarSyncStatus(results.every(Boolean)))
      .catch(() => finalizarSyncStatus(false));
  },

  // MUTAÇÕES ALTAS
  salvarAlta: (alta) => {
    const prev = get().altas;
    const prevItem = prev.find((a) => a.id === alta.id);
    const updated = prevItem ? prev.map((a) => (a.id === alta.id ? alta : a)) : [alta, ...prev];

    set({ altas: updated });
    sincronizarItemGranular(
      "altas",
      alta as unknown as Record<string, unknown> & { id: string },
      prevItem as unknown as (Record<string, unknown> & { id: string }) | undefined,
      "altas",
      updated,
      "UPDATE_ALTAS"
    );
  },

  removerAlta: (id) => {
    const updated = get().altas.filter((a) => a.id !== id);
    set({ altas: updated });
    removerItemGranular("altas", id, "altas", updated, "UPDATE_ALTAS");
  },

  // MUTAÇÕES PERMANÊNCIA
  salvarPendencia: (pendencia) => {
    const perm = get().permanencia;
    const prevItem = perm.pendencias.find((p) => p.id === pendencia.id);
    const updatedPendencias = prevItem
      ? perm.pendencias.map((p) => (p.id === pendencia.id ? pendencia : p))
      : [pendencia, ...perm.pendencias];

    const updatedPerm: DadosPermanencia = {
      ...perm,
      pendencias: updatedPendencias,
      updatedAt: new Date().toISOString(),
    };

    set({ permanencia: updatedPerm });
    sincronizarItemGranular(
      "pendencias",
      pendencia as unknown as Record<string, unknown> & { id: string },
      prevItem as unknown as (Record<string, unknown> & { id: string }) | undefined,
      "permanencia",
      updatedPerm,
      "UPDATE_PERMANENCIA"
    );
  },

  removerPendencia: (id) => {
    const perm = get().permanencia;
    const updatedPerm: DadosPermanencia = {
      ...perm,
      pendencias: perm.pendencias.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString(),
    };

    set({ permanencia: updatedPerm });
    removerItemGranular("pendencias", id, "permanencia", updatedPerm, "UPDATE_PERMANENCIA");
  },

  atualizarEquipe: (equipe) => {
    const perm = get().permanencia;
    const updatedPerm: DadosPermanencia = {
      ...perm,
      equipe,
      updatedAt: new Date().toISOString(),
    };

    set({ permanencia: updatedPerm });
    sincronizarConfigGranular(
      "equipe",
      { equipe },
      "permanencia",
      updatedPerm,
      "UPDATE_PERMANENCIA"
    );
  },

  // MUTAÇÕES PASSAGEM
  salvarPacientePassagem: (paciente) => {
    const prev = get().passagem;
    const prevItem = prev.find((p) => p.id === paciente.id);
    const updated = prevItem ? prev.map((p) => (p.id === paciente.id ? paciente : p)) : [paciente, ...prev];

    set({ passagem: updated });
    sincronizarItemGranular(
      "pacientesPassagem",
      paciente as unknown as Record<string, unknown> & { id: string },
      prevItem as unknown as (Record<string, unknown> & { id: string }) | undefined,
      "passagem",
      updated,
      "UPDATE_PASSAGEM"
    );
  },

  removerPacientePassagem: (id) => {
    const updated = get().passagem.filter((p) => p.id !== id);
    set({ passagem: updated });
    removerItemGranular("pacientesPassagem", id, "passagem", updated, "UPDATE_PASSAGEM");
  },

  // MUTAÇÕES AMBULATÓRIO
  salvarMedicoAmbulatorio: (medico) => {
    const prev = get().ambulantes;
    const prevItem = prev.find((m) => m.id === medico.id);
    const updated = prevItem ? prev.map((m) => (m.id === medico.id ? medico : m)) : [...prev, medico];

    set({ ambulantes: updated });
    sincronizarItemGranular(
      "medicosAmbulatorio",
      medico as unknown as Record<string, unknown> & { id: string },
      prevItem as unknown as (Record<string, unknown> & { id: string }) | undefined,
      "ambulantes",
      updated,
      "UPDATE_AMBULATORIO"
    );
  },

  removerMedicoAmbulatorio: (id) => {
    const updated = get().ambulantes.filter((m) => m.id !== id);
    set({ ambulantes: updated });
    removerItemGranular("medicosAmbulatorio", id, "ambulantes", updated, "UPDATE_AMBULATORIO");
  },

  // MUTAÇÕES MODELOS
  salvarModelo: (modelo) => {
    const prev = get().modelos;
    const prevItem = prev.find((m) => m.id === modelo.id);
    const updated = prevItem ? prev.map((m) => (m.id === modelo.id ? modelo : m)) : [modelo, ...prev];

    set({ modelos: updated });
    sincronizarItemGranular(
      "modelos",
      modelo as unknown as Record<string, unknown> & { id: string },
      prevItem as unknown as (Record<string, unknown> & { id: string }) | undefined,
      "modelos",
      updated,
      "UPDATE_MODELOS"
    );
  },

  removerModelo: (id) => {
    const updated = get().modelos.filter((m) => m.id !== id);
    set({ modelos: updated });
    removerItemGranular("modelos", id, "modelos", updated, "UPDATE_MODELOS");
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
    sincronizarConfigGranular("enfermarias", { items: updated }, "enfermarias", updated, "UPDATE_ENFERMARIAS");
  },

  removerEnfermaria: (nome) => {
    const updated = get().enfermarias.filter((e) => e !== nome);
    set({ enfermarias: updated });
    sincronizarConfigGranular("enfermarias", { items: updated }, "enfermarias", updated, "UPDATE_ENFERMARIAS");
  },

  adicionarCategoriaModelo: (nome) => {
    const limpo = nome.trim();
    if (!limpo) return;
    const prev = get().categoriasModelos;
    if (prev.some((c) => c.toLowerCase() === limpo.toLowerCase())) return;
    const updated = [...prev, limpo];
    set({ categoriasModelos: updated });
    sincronizarConfigGranular(
      "categorias_modelo",
      { items: updated },
      "categoriasModelos",
      updated,
      "UPDATE_CATEGORIAS_MODELOS"
    );
  },

  removerCategoriaModelo: (nome) => {
    const updated = get().categoriasModelos.filter((c) => c !== nome);
    set({ categoriasModelos: updated });
    sincronizarConfigGranular(
      "categorias_modelo",
      { items: updated },
      "categoriasModelos",
      updated,
      "UPDATE_CATEGORIAS_MODELOS"
    );
  },

  // EXPURGO AUTOMÁTICO LGPD (48 horas pós-data do evento)
  executarExpurgoAutomatico: () => {
    const estado = {
      admissoes: get().admissoes,
      altas: get().altas,
      permanencia: get().permanencia,
      metricas: get().metricas,
    };

    const resultado = executarExpurgoAutomaticoCliente(estado, new Date(), obterDataLocalHoje);
    if (!resultado.houveExpurgo) {
      return resultado;
    }

    // 1. Atualiza estado em memória
    set({
      admissoes: resultado.novasAdmissoes,
      altas: resultado.novasAltas,
      permanencia: resultado.novaPermanencia,
      metricas: resultado.metricasAtualizadas,
    });

    // 2. Sincroniza remoção granular no Firestore, WebSocket e LocalStorage
    if (resultado.expurgadasAdmissoes > 0) {
      sincronizarCacheLocalEWs("admissoes", resultado.novasAdmissoes, "UPDATE_ADMISSOES");
      const idsRestantes = new Set(resultado.novasAdmissoes.map((a) => a.id));
      for (const a of estado.admissoes) {
        if (!idsRestantes.has(a.id)) removerItemGranularFirestore("admissoes", a.id).catch(() => {});
      }
    }

    if (resultado.expurgadasAltas > 0) {
      sincronizarCacheLocalEWs("altas", resultado.novasAltas, "UPDATE_ALTAS");
      const idsRestantes = new Set(resultado.novasAltas.map((a) => a.id));
      for (const a of estado.altas) {
        if (!idsRestantes.has(a.id)) removerItemGranularFirestore("altas", a.id).catch(() => {});
      }
      for (const altaId of resultado.altasIdsParaRemoverFotos) {
        apagarFotosFirestore(altaId).catch(() => {});
      }
    }

    if (resultado.expurgadasPermanencia) {
      sincronizarCacheLocalEWs("permanencia", resultado.novaPermanencia, "UPDATE_PERMANENCIA");
      const idsRestantes = new Set(resultado.novaPermanencia.pendencias.map((p) => p.id));
      for (const p of estado.permanencia.pendencias) {
        if (!idsRestantes.has(p.id)) removerItemGranularFirestore("pendencias", p.id).catch(() => {});
      }
    }

    if (resultado.metricasAtualizadas !== estado.metricas) {
      sincronizarConfigGranular(
        "metricas",
        { items: resultado.metricasAtualizadas },
        "metricas",
        resultado.metricasAtualizadas,
        "UPDATE_METRICAS"
      );
    }

    return resultado;
  },
}));

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem("checklist_theme_mode") || "auto";
    const modoSalvo = (raw.replace(/['"]/g, "").trim() as ThemeMode) || "auto";
    aplicarTemaNoDocumento(modoSalvo);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMqlChange = () => {
      const modoAtual = useAppStore.getState().themeMode;
      if (modoAtual === "auto") {
        aplicarTemaNoDocumento("auto");
      }
    };

    if (mql.addEventListener) {
      mql.addEventListener("change", handleMqlChange);
    } else if ((mql as any).addListener) {
      (mql as any).addListener(handleMqlChange);
    }
  } catch {}
}

