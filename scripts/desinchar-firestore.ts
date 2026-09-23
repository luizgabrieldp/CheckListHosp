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

  console.log("1. Lendo hospital_state_v1 atual...");
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.error("Documento não existe!");
    return;
  }

  const data = snap.data();
  const tamanhoAntes = JSON.stringify(data).length;
  console.log(`Tamanho ANTES: ${(tamanhoAntes / 1024).toFixed(2)} KB (${tamanhoAntes} bytes)`);

  // Garantir que as fotos de cada alta estejam salvas na coleção hospital_fotos
  if (data.altas && Array.isArray(data.altas)) {
    for (const a of data.altas) {
      const listaFotos = (a.fotosFeridaUrls && a.fotosFeridaUrls.length > 0)
        ? a.fotosFeridaUrls
        : (a.fotoFeridaUrl ? [a.fotoFeridaUrl] : []);

      if (a.id && listaFotos.length > 0) {
        const fotoDocRef = doc(db, "hospital_fotos", `alta_${a.id}`);
        await setDoc(
          fotoDocRef,
          {
            altaId: a.id,
            fotosDataUrls: listaFotos,
            fotoDataUrl: listaFotos[0] || null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log(`Fotos salvas em hospital_fotos para alta ${a.id} (${listaFotos.length} fotos).`);
      }
    }

    // Agora remover os base64 do array de altas para desinchar o documento principal
    const altasLimpos = data.altas.map((a: any) => {
      const { fotoFeridaUrl, fotosFeridaUrls, ...resto } = a;
      const temFoto = Boolean((fotosFeridaUrls && fotosFeridaUrls.length > 0) || fotoFeridaUrl);
      const fotosCount = fotosFeridaUrls ? fotosFeridaUrls.length : (fotoFeridaUrl ? 1 : 0);
      return {
        ...resto,
        temFoto,
        fotosCount,
      };
    });

    data.altas = altasLimpos;
  }

  data.updatedAt = new Date().toISOString();

  // Remover campo temporário de teste
  delete data.testeConexaoTimestamp;

  console.log("2. Gravando documento desinchado no Firestore...");
  await setDoc(docRef, data);

  const tamanhoDepois = JSON.stringify(data).length;
  console.log(`Tamanho DEPOIS: ${(tamanhoDepois / 1024).toFixed(2)} KB (${tamanhoDepois} bytes)`);
  console.log(`Redução de: ${((tamanhoAntes - tamanhoDepois) / 1024).toFixed(2)} KB!`);
  console.log("Desinchaço concluído com 100% de sucesso!");
}

main().catch(console.error);
