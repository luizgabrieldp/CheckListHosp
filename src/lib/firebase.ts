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

// Configurações do Firebase
// Podem vir de variáveis de ambiente (NEXT_PUBLIC_FIREBASE_*)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
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
 * Salva atualizações parciais do estado no Firestore em tempo real
 */
export async function sincronizarComFirestore(
  dados: Partial<DatabaseState>
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const docRef = doc(db, "hospital_data", DOC_ID);
    await setDoc(
      docRef,
      {
        ...dados,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("[Firebase] Falha ao sincronizar com Firestore:", err);
    return false;
  }
}

/**
 * Escuta alterações no Firestore em tempo real e atualiza a store
 */
export function escutarAlteracoesFirestore(
  onAtualizacao: (dados: Partial<DatabaseState>) => void
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
