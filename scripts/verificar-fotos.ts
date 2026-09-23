import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCHiqrR2MZQGVJw8SxEXA2tu2OINzk4X4M",
  authDomain: "checklist-hospitalar-bce7b.firebaseapp.com",
  projectId: "checklist-hospitalar-bce7b",
  storageBucket: "checklist-hospitalar-bce7b.firebasestorage.app",
  messagingSenderId: "985661538519",
  appId: "1:985661538519:web:c04b625957f6f6bf1c3092",
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const docRef = doc(db, "hospital_data", "hospital_state_v1");
  const snap = await getDoc(docRef);
  const data = snap.data() || {};

  console.log("Verificando se as fotos das altas estão na coleção hospital_fotos...");
  if (data.altas && Array.isArray(data.altas)) {
    for (const a of data.altas) {
      const listaFotos = (a.fotosFeridaUrls && a.fotosFeridaUrls.length > 0)
        ? a.fotosFeridaUrls
        : (a.fotoFeridaUrl ? [a.fotoFeridaUrl] : []);

      if (a.id && listaFotos.length > 0) {
        const fotoDocRef = doc(db, "hospital_fotos", `alta_${a.id}`);
        const fotoSnap = await getDoc(fotoDocRef);
        console.log(`Alta ${a.id} (${a.nomePaciente}): ${listaFotos.length} fotos. Existe em hospital_fotos? ${fotoSnap.exists()}`);
      }
    }
  }
}

main().catch(console.error);
