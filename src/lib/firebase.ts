import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
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
 * Salva atualizações parciais do estado no Firestore em tempo real.
 * Sanitiza campos undefined para evitar erros nativos do Firestore SDK.
 */
export async function sincronizarComFirestore(
  dados: Partial<DatabaseState>
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const docRef = doc(db, "hospital_data", DOC_ID);
    // Remove qualquer chave com valor undefined que possa quebrar o Firestore
    const payloadSanitizado = JSON.parse(
      JSON.stringify({
        ...dados,
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
