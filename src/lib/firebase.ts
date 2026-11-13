import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  deleteField,
  Firestore,
  DocumentSnapshot,
  QuerySnapshot,
} from "firebase/firestore";
import { DatabaseState } from "@/types/hospital";

// Configurações do Firebase fornecidas para o Checklist Hospitalar
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCHiqrR2MZQGVJw8SxEXA2tu2OINzk4X4M",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "checklist-hospitalar-bce7b.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "checklist-hospitalar-bce7b",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "checklist-hospitalar-bce7b.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "985661538519",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:985661538519:web:c04b625957f6f6bf1c3092",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-2JB7DK3H88",
};

let app: FirebaseApp | null = null;
let dbFirestore: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

export function getFirebaseDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;

  try {
    if (!app) {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    if (!dbFirestore && app) {
      dbFirestore = getFirestore(app);
    }
    return dbFirestore;
  } catch (err) {
    console.warn("[Firebase] Erro ao inicializar Firestore:", err);
    return null;
  }
}

const DOC_ID = "hospital_state_v1";

/**
 * Salva as fotos de alta em uma coleção dedicada no Firestore (até 5 fotos WebP).
 * Cada alta possui seu próprio documento dedicado, evitando estourar o limite de 1MB do documento principal.
 */
export async function salvarFotosFirestore(
  altaId: string,
  fotosDataUrls: string[]
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !altaId || !fotosDataUrls || fotosDataUrls.length === 0) return false;

  try {
    const fotoDocRef = doc(db, "hospital_fotos", `alta_${altaId}`);
    await setDoc(
      fotoDocRef,
      {
        altaId,
        fotosDataUrls,
        fotoDataUrl: fotosDataUrls[0] || null, // retrocompatibilidade
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("[Firebase] Falha ao salvar fotos dedicadas no Firestore:", err);
    return false;
  }
}

/**
 * Salva uma foto única de alta (mantido para retrocompatibilidade)
 */
export async function salvarFotoFirestore(
  altaId: string,
  fotoDataUrl: string
): Promise<boolean> {
  return salvarFotosFirestore(altaId, [fotoDataUrl]);
}

/**
 * Obtém a lista de fotos dedicada de uma alta caso elas não estejam embutidas no snapshot
 */
export async function obterFotosFirestore(altaId: string): Promise<string[]> {
  const db = getFirebaseDb();
  if (!db || !altaId) return [];

  try {
    const fotoDocRef = doc(db, "hospital_fotos", `alta_${altaId}`);
    const snap = await getDoc(fotoDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.fotosDataUrls) && data.fotosDataUrls.length > 0) {
        return data.fotosDataUrls;
      }
      if (data.fotoDataUrl) {
        return [data.fotoDataUrl];
      }
    }
  } catch (err) {
    console.warn("[Firebase] Erro ao carregar fotos dedicadas:", err);
  }
  return [];
}

/**
 * Obtém a foto dedicada de uma alta caso ela não esteja embutida (retrocompatibilidade)
 */
export async function obterFotoFirestore(altaId: string): Promise<string | null> {
  const fotos = await obterFotosFirestore(altaId);
  return fotos.length > 0 ? fotos[0] : null;
}

/**
 * Apaga definitivamente as fotos de uma alta na coleção hospital_fotos após expurgo LGPD (48h)
 */
export async function apagarFotosFirestore(altaId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !altaId) return false;

  try {
    const fotoDocRef = doc(db, "hospital_fotos", `alta_${altaId}`);
    await deleteDoc(fotoDocRef);
    return true;
  } catch (err) {
    console.warn("[Firebase] Erro ao apagar fotos de alta expurgada:", err);
    return false;
  }
}

/**
 * Salva atualizações parciais do estado no Firestore em tempo real.
 * Sanitiza campos undefined para evitar erros nativos do Firestore SDK.
 * Salva fotos em coleção dedicada de forma assíncrona para garantir sincronização.
 */
export async function sincronizarComFirestore(
  dados: Partial<DatabaseState>
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    // Se houver altas com fotos, garante o salvamento de cada foto na coleção dedicada hospital_fotos
    let altasParaSincronizar = dados.altas;
    if (dados.altas && Array.isArray(dados.altas)) {
      for (const a of dados.altas) {
        const listaFotos = (a.fotosFeridaUrls && a.fotosFeridaUrls.length > 0)
          ? a.fotosFeridaUrls
          : (a.fotoFeridaUrl ? [a.fotoFeridaUrl] : []);
        if (a.id && listaFotos.length > 0) {
          salvarFotosFirestore(a.id, listaFotos).catch(() => {});
        }
      }

      // CRÍTICO: Remover base64 pesados do payload antes de salvar no documento principal hospital_state_v1!
      // O documento principal hospital_state_v1 possui limite máximo estrito de 1MB (1.048.576 bytes) no Firestore.
      // As fotos ficam armazenadas com total segurança na coleção dedicada hospital_fotos (1 documento por alta).
      altasParaSincronizar = dados.altas.map((a) => {
        const { fotoFeridaUrl, fotosFeridaUrls, ...resto } = a;
        return {
          ...resto,
          temFoto: Boolean((fotosFeridaUrls && fotosFeridaUrls.length > 0) || fotoFeridaUrl),
          fotosCount: fotosFeridaUrls ? fotosFeridaUrls.length : (fotoFeridaUrl ? 1 : 0),
        };
      });
    }

    const docRef = doc(db, "hospital_data", DOC_ID);
    // Remove qualquer chave com valor undefined que possa quebrar o Firestore
    const payloadSanitizado = JSON.parse(
      JSON.stringify({
        ...dados,
        ...(altasParaSincronizar ? { altas: altasParaSincronizar } : {}),
        updatedAt: new Date().toISOString(),
      })
    );

    await setDoc(docRef, payloadSanitizado, { merge: true });
    return true;
  } catch (err) {
    console.warn("[Firebase] Falha ao sincronizar com Firestore:", err);
    return false;
  }
}

/**
 * Escuta alterações no Firestore em tempo real e atualiza a store.
 * Se o documento for novo e ainda não existir, chama onDocumentoInexistente para semeadura inicial.
 */
export function escutarAlteracoesFirestore(
  onAtualizacao: (dados: Partial<DatabaseState>) => void,
  onDocumentoInexistente?: () => void
): () => void {
  const db = getFirebaseDb();
  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, "hospital_data", DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<DatabaseState>;
          onAtualizacao(data);
        } else if (onDocumentoInexistente) {
          onDocumentoInexistente();
        }
      },
      (error) => {
        console.warn("[Firebase] Erro no listener do Firestore:", error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn("[Firebase] Erro ao registrar listener:", err);
    return () => {};
  }
}

// ==========================================
// SINCRONIZAÇÃO GRANULAR COLABORATIVA (V2)
// ==========================================

export type ColecaoGranularKey =
  | "admissoes"
  | "altas"
  | "pacientesPassagem"
  | "pendencias"
  | "medicosAmbulatorio"
  | "modelos";

export const COLECOES_GRANULARES: Record<ColecaoGranularKey, string> = {
  admissoes: "hospital_admissoes",
  altas: "hospital_altas",
  pacientesPassagem: "hospital_passagem",
  pendencias: "hospital_permanencia",
  medicosAmbulatorio: "hospital_ambulantes",
  modelos: "hospital_modelos",
};

export const COL_CONFIG_GRANULAR = "hospital_config";
export const COL_PRESENCA_GRANULAR = "hospital_presenca";

export interface PresencaUsuario {
  sessionId: string;
  nome: string;
  perfil: string;
  activeTab: string;
  lastSeenMs: number;
}

export interface RemoteAuthorUpdate {
  id: string;
  author: string;
  updatedAtMs: number;
}

let memorySessionId: string | null = null;

/**
 * Retorna um identificador único por aba do navegador para evitar eco local
 * e atribuir autoria em tempo real sem conflito entre abas do mesmo usuário.
 */
export function getSessionId(): string {
  if (typeof window !== "undefined") {
    try {
      const existing = window.sessionStorage.getItem("hosp_collab_session_id");
      if (existing) return existing;
      const generated = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem("hosp_collab_session_id", generated);
      return generated;
    } catch {
      // Fallback para ambientes onde sessionStorage é restrito
    }
  }
  if (!memorySessionId) {
    memorySessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return memorySessionId;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (val === null || typeof val !== "object" || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Remove valores `undefined` recursivamente preservando arrays e objetos planos,
 * sem corromper sentinels do Firestore (como deleteField() e serverTimestamp()).
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      clean[k] = sanitizeForFirestore(v);
    }
    return clean as T;
  }
  return value;
}

/**
 * Calcula apenas os campos alterados entre `prev` e `next` para escrita granular
 * com `setDoc(..., { merge: true })`, evitando sobrescrever campos editados por outros usuários.
 */
export function computeDiffFields(
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
  deleteSentinel: unknown = deleteField()
): Record<string, unknown> {
  if (!prev) {
    return sanitizeForFirestore(next);
  }

  const diff: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    if (key.startsWith("_updated")) continue;
    const prevVal = prev[key];
    const nextVal = next[key];

    if (nextVal === undefined) {
      if (prevVal !== undefined) {
        diff[key] = deleteSentinel;
      }
      continue;
    }

    if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      diff[key] = sanitizeForFirestore(nextVal);
    }
  }

  return diff;
}

export async function salvarItemGranularFirestore(
  colecaoKey: ColecaoGranularKey,
  id: string,
  item: Record<string, unknown>,
  prevItem?: Record<string, unknown>,
  authorName?: string
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !id) return false;

  try {
    const diff = computeDiffFields(prevItem, item);
    if (prevItem && Object.keys(diff).length === 0) {
      return true;
    }

    const payload: Record<string, unknown> = {
      ...diff,
      _updatedBy: authorName || "Equipe",
      _updatedBySession: getSessionId(),
      _updatedAtMs: Date.now(),
    };

    const ref = doc(db, COLECOES_GRANULARES[colecaoKey], id);
    await setDoc(ref, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firebase] Erro ao salvar item granular em ${colecaoKey}/${id}:`, err);
    return false;
  }
}

export async function removerItemGranularFirestore(
  colecaoKey: ColecaoGranularKey,
  id: string
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !id) return false;

  try {
    await deleteDoc(doc(db, COLECOES_GRANULARES[colecaoKey], id));
    return true;
  } catch (err) {
    console.warn(`[Firebase] Erro ao remover item granular em ${colecaoKey}/${id}:`, err);
    return false;
  }
}

export async function salvarConfigGranularFirestore(
  docId: "enfermarias" | "categorias_modelo" | "equipe" | "atividades" | "metricas",
  data: Record<string, unknown>,
  authorName?: string
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const payload = {
      ...sanitizeForFirestore(data),
      _updatedBy: authorName || "Equipe",
      _updatedBySession: getSessionId(),
      _updatedAtMs: Date.now(),
    };
    await setDoc(doc(db, COL_CONFIG_GRANULAR, docId), payload, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firebase] Erro ao salvar config ${docId}:`, err);
    return false;
  }
}

async function commitBatchedWrites(
  db: Firestore,
  ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }>
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const slice = ops.slice(i, i + CHUNK_SIZE);
    for (const op of slice) {
      batch.set(op.ref, op.data, { merge: true });
    }
    await batch.commit();
  }
}

/**
 * Migra automaticamente e de forma idempotente os dados do documento legado
 * (`hospital_data/hospital_state_v1`) para as coleções granulares V2.
 */
export async function migrarLegadoParaGranularSeNecessario(seeds?: {
  medicosAmbulatorio?: Array<Record<string, unknown> & { id: string }>;
  modelos?: Array<Record<string, unknown> & { id: string }>;
}): Promise<{ migrated: boolean; alreadyDone: boolean }> {
  const db = getFirebaseDb();
  if (!db) return { migrated: false, alreadyDone: false };

  try {
    const migRef = doc(db, COL_CONFIG_GRANULAR, "migration_v2");
    const migSnap = await getDoc(migRef);
    if (migSnap.exists() && migSnap.data()?.migrated === true) {
      return { migrated: false, alreadyDone: true };
    }

    const legacySnap = await getDoc(doc(db, "hospital_data", "hospital_state_v1"));
    const legacy = legacySnap.exists() ? (legacySnap.data() as Partial<DatabaseState>) : {};

    const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
    const sessionId = getSessionId();
    const nowMs = Date.now();

    const enqueueCollection = (
      key: ColecaoGranularKey,
      items: Array<Record<string, unknown> & { id?: string }> | undefined
    ) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!item || !item.id) continue;
        ops.push({
          ref: doc(db, COLECOES_GRANULARES[key], String(item.id)),
          data: {
            ...sanitizeForFirestore(item),
            _updatedBy: "Migração",
            _updatedBySession: sessionId,
            _updatedAtMs: nowMs,
          },
        });
      }
    };

    enqueueCollection("admissoes", legacy.admissoes as unknown as Array<Record<string, unknown> & { id?: string }>);
    enqueueCollection("altas", legacy.altas as unknown as Array<Record<string, unknown> & { id?: string }>);
    enqueueCollection("pacientesPassagem", legacy.passagem as unknown as Array<Record<string, unknown> & { id?: string }>);
    enqueueCollection("pendencias", legacy.permanencia?.pendencias as unknown as Array<Record<string, unknown> & { id?: string }>);

    const medicos =
      Array.isArray(legacy.ambulantes) && legacy.ambulantes.length > 0
        ? legacy.ambulantes
        : seeds?.medicosAmbulatorio || [];
    enqueueCollection("medicosAmbulatorio", medicos as unknown as Array<Record<string, unknown> & { id?: string }>);

    const modelos =
      Array.isArray(legacy.modelos) && legacy.modelos.length > 0
        ? legacy.modelos
        : seeds?.modelos || [];
    enqueueCollection("modelos", modelos as unknown as Array<Record<string, unknown> & { id?: string }>);

    if (Array.isArray(legacy.enfermarias)) {
      ops.push({
        ref: doc(db, COL_CONFIG_GRANULAR, "enfermarias"),
        data: { items: legacy.enfermarias, _updatedBySession: sessionId, _updatedAtMs: nowMs },
      });
    }
    if (Array.isArray(legacy.categoriasModelos)) {
      ops.push({
        ref: doc(db, COL_CONFIG_GRANULAR, "categorias_modelo"),
        data: { items: legacy.categoriasModelos, _updatedBySession: sessionId, _updatedAtMs: nowMs },
      });
    }
    if (legacy.permanencia?.equipe) {
      ops.push({
        ref: doc(db, COL_CONFIG_GRANULAR, "equipe"),
        data: { equipe: legacy.permanencia.equipe, _updatedBySession: sessionId, _updatedAtMs: nowMs },
      });
    }
    if (Array.isArray(legacy.metricas)) {
      ops.push({
        ref: doc(db, COL_CONFIG_GRANULAR, "metricas"),
        data: { items: legacy.metricas, _updatedBySession: sessionId, _updatedAtMs: nowMs },
      });
    }

    if (ops.length > 0) {
      await commitBatchedWrites(db, ops);
    }

    await setDoc(
      migRef,
      {
        migrated: true,
        migratedAt: new Date().toISOString(),
        migratedBySession: sessionId,
        migratedCount: ops.length,
      },
      { merge: true }
    );

    return { migrated: true, alreadyDone: false };
  } catch (err) {
    console.warn("[Firebase] Erro na migração granular V2:", err);
    return { migrated: false, alreadyDone: false };
  }
}

function stripInternalFields(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "_updatedBy" || k === "_updatedBySession" || k === "_updatedAtMs") continue;
    clean[k] = v;
  }
  return clean;
}

export function escutarColecoesGranularesFirestore(callbacks: {
  onCollection: (
    key: ColecaoGranularKey,
    items: Record<string, unknown>[],
    remoteAuthors: RemoteAuthorUpdate[]
  ) => void;
  onConfig: (docId: string, data: Record<string, unknown>, remoteAuthor?: RemoteAuthorUpdate) => void;
  onSyncStatus?: (connected: boolean) => void;
}): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};

  const mySessionId = getSessionId();
  const unsubscribes: Array<() => void> = [];

  (Object.keys(COLECOES_GRANULARES) as ColecaoGranularKey[]).forEach((key) => {
    const colName = COLECOES_GRANULARES[key];
    const unsub = onSnapshot(
      collection(db, colName),
      (snapshot: QuerySnapshot) => {
        callbacks.onSyncStatus?.(true);
        if (snapshot.metadata.hasPendingWrites) return;

        const now = Date.now();
        const remoteAuthors: RemoteAuthorUpdate[] = [];
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const raw = change.doc.data() as Record<string, unknown>;
            const updatedBySession = raw._updatedBySession as string | undefined;
            const updatedBy = raw._updatedBy as string | undefined;
            const updatedAtMs = (raw._updatedAtMs as number | undefined) || 0;
            if (
              updatedBySession &&
              updatedBySession !== mySessionId &&
              now - updatedAtMs < 15000
            ) {
              remoteAuthors.push({
                id: change.doc.id,
                author: updatedBy || "Colega",
                updatedAtMs,
              });
            }
          }
        });

        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...stripInternalFields(d.data() as Record<string, unknown>),
        }));

        callbacks.onCollection(key, items, remoteAuthors);
      },
      (err) => {
        console.warn(`[Firebase] Erro no listener granular (${colName}):`, err);
        callbacks.onSyncStatus?.(false);
      }
    );
    unsubscribes.push(unsub);
  });

  const unsubConfig = onSnapshot(
    collection(db, COL_CONFIG_GRANULAR),
    (snapshot: QuerySnapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      const now = Date.now();
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") return;
        const docId = change.doc.id;
        if (docId === "migration_v2") return;
        const raw = change.doc.data() as Record<string, unknown>;
        const updatedBySession = raw._updatedBySession as string | undefined;
        const updatedBy = raw._updatedBy as string | undefined;
        const updatedAtMs = (raw._updatedAtMs as number | undefined) || 0;
        const remoteAuthor =
          updatedBySession && updatedBySession !== mySessionId && now - updatedAtMs < 15000
            ? { id: docId, author: updatedBy || "Colega", updatedAtMs }
            : undefined;
        callbacks.onConfig(docId, stripInternalFields(raw), remoteAuthor);
      });
    },
    (err) => {
      console.warn("[Firebase] Erro no listener de config granular:", err);
    }
  );
  unsubscribes.push(unsubConfig);

  return () => {
    unsubscribes.forEach((u) => {
      try {
        u();
      } catch {
        // ignore
      }
    });
  };
}

export async function registrarPresencaFirestore(usuario: {
  nome: string;
  perfil: string;
  activeTab: string;
}): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const sessionId = getSessionId();
    await setDoc(
      doc(db, COL_PRESENCA_GRANULAR, sessionId),
      {
        sessionId,
        nome: usuario.nome,
        perfil: usuario.perfil,
        activeTab: usuario.activeTab,
        lastSeenMs: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[Firebase] Erro ao registrar presença:", err);
  }
}

export async function removerPresencaFirestore(): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    await deleteDoc(doc(db, COL_PRESENCA_GRANULAR, getSessionId()));
  } catch (err) {
    console.warn("[Firebase] Erro ao remover presença:", err);
  }
}

export function escutarPresencaFirestore(
  onUsers: (users: PresencaUsuario[]) => void
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};

  const PRESENCA_TTL_MS = 65000;
  try {
    return onSnapshot(
      collection(db, COL_PRESENCA_GRANULAR),
      (snapshot: QuerySnapshot) => {
        const now = Date.now();
        const users: PresencaUsuario[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data() as Partial<PresencaUsuario>;
          if (!data.nome || !data.lastSeenMs) return;
          if (now - data.lastSeenMs <= PRESENCA_TTL_MS) {
            users.push({
              sessionId: data.sessionId || d.id,
              nome: data.nome,
              perfil: data.perfil || "Equipe",
              activeTab: data.activeTab || "passagem",
              lastSeenMs: data.lastSeenMs,
            });
          }
        });
        onUsers(users);
      },
      (err) => {
        console.warn("[Firebase] Erro no listener de presença:", err);
      }
    );
  } catch (err) {
    console.warn("[Firebase] Erro ao iniciar listener de presença:", err);
    return () => {};
  }
}
