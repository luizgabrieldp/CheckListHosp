import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

  console.log("TAMANHOS DOS CAMPOS NO FIRESTORE:");
  for (const [key, value] of Object.entries(data)) {
    const size = JSON.stringify(value).length;
    console.log(`- ${key}: ${(size / 1024).toFixed(2)} KB (${size} bytes)`);
  }

  if (data.altas && Array.isArray(data.altas)) {
    console.log("\nDETALHE DAS ALTAS:");
    data.altas.forEach((a: any, i: number) => {
      const aSize = JSON.stringify(a).length;
      const foto1Size = a.fotoFeridaUrl ? a.fotoFeridaUrl.length : 0;
      const fotosUrlsCount = a.fotosFeridaUrls ? a.fotosFeridaUrls.length : 0;
      const fotosUrlsTotalLen = a.fotosFeridaUrls ? a.fotosFeridaUrls.reduce((acc: number, f: string) => acc + f.length, 0) : 0;
      console.log(`  Alta [${i}] ${a.nomePaciente}: total ${(aSize/1024).toFixed(2)} KB | fotoFeridaUrl: ${(foto1Size/1024).toFixed(2)} KB | fotosFeridaUrls: ${fotosUrlsCount} fotos (${(fotosUrlsTotalLen/1024).toFixed(2)} KB)`);
    });
  }
}

main().catch(console.error);
