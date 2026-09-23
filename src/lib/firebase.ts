import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Firestore,
  DocumentSnapshot,
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
