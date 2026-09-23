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
  console.log("Inicializando Firebase...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    console.log("Testando leitura de hospital_data/hospital_state_v1...");
    const docRef = doc(db, "hospital_data", "hospital_state_v1");
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      console.log("Documento hospital_state_v1 NÃO existe!");
      return;
    }

    const data = snap.data();
    const jsonStr = JSON.stringify(data);
    console.log("Documento lido com sucesso!");
    console.log(`Tamanho do documento: ${(jsonStr.length / 1024).toFixed(2)} KB (${jsonStr.length} bytes)`);

    console.log(`- admissoes: ${data.admissoes ? data.admissoes.length : 0} itens`);
    console.log(`- altas: ${data.altas ? data.altas.length : 0} itens`);
    console.log(`- passagem: ${data.passagem ? data.passagem.length : 0} itens`);
    console.log(`- permanencia pendencias: ${data.permanencia?.pendencias ? data.permanencia.pendencias.length : 0} itens`);

    // Testar escrita
    console.log("Testando escrita (setDoc merge)...");
    await setDoc(docRef, { testeConexaoTimestamp: Date.now() }, { merge: true });
    console.log("Escrita realizada com sucesso!");
  } catch (err: any) {
    console.error("ERRO NO FIRESTORE:", err.code, err.message);
  }
}

main().catch(console.error);
