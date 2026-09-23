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

async function testar() {
  console.log("=== INICIANDO TESTE DE ADIÇÃO DE PACIENTES NO FIRESTORE ===");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const docRef = doc(db, "hospital_data", "hospital_state_v1");

  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Documento não encontrado");
  }

  const data = snap.data();
  console.log("Documento atual lido. Tamanho:", (JSON.stringify(data).length / 1024).toFixed(2), "KB");

  // 1. Simular Adição em Admissões
  const novoAdm = {
    id: `adm-test-${Date.now()}`,
    nome: "PACIENTE TESTE ADMISSAO",
    enfermaria: "",
    dataAdmissaoAgendada: "2026-09-23",
    status: "Aguardando",
    chegou: false,
    internou: false,
    aih: false,
    altaAdm: false,
    cancelada: false,
    historiaFinalizada: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const admissoesAtualizadas = [novoAdm, ...(data.admissoes || [])];
  console.log("Testando salvar nova admissão no Firestore...");
  await setDoc(docRef, { admissoes: admissoesAtualizadas, updatedAt: new Date().toISOString() }, { merge: true });
  console.log("✅ Nova admissão salva com sucesso!");

  // 2. Simular Adição em Altas (sem base64 no doc principal)
  const novaAlta = {
    id: `alta-test-${Date.now()}`,
    nomePaciente: "PACIENTE TESTE ALTA",
    enfermaria: "",
    dataAlta: "2026-09-23",
    temQueixas: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const altasAtualizadas = [novaAlta, ...(data.altas || [])];
  console.log("Testando salvar nova alta no Firestore...");
  await setDoc(docRef, { altas: altasAtualizadas, updatedAt: new Date().toISOString() }, { merge: true });
  console.log("✅ Nova alta salva com sucesso!");

  // 3. Simular Adição em Passagem
  const novoPass = {
    id: `pass-test-${Date.now()}`,
    nome: "PACIENTE TESTE PASSAGEM",
    leito: "Leito 99",
    enfermaria: "",
    dataAdmissao: "2026-09-23",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const passagemAtualizada = [novoPass, ...(data.passagem || [])];
  console.log("Testando salvar novo paciente na passagem no Firestore...");
  await setDoc(docRef, { passagem: passagemAtualizada, updatedAt: new Date().toISOString() }, { merge: true });
  console.log("✅ Novo paciente de passagem salvo com sucesso!");

  // Limpar os registros de teste para manter a base limpa
  console.log("Limpando registros temporários de teste...");
  const admLimpo = admissoesAtualizadas.filter(a => a.id !== novoAdm.id);
  const altaLimpa = altasAtualizadas.filter(a => a.id !== novaAlta.id);
  const passLimpo = passagemAtualizada.filter(p => p.id !== novoPass.id);
  await setDoc(docRef, { admissoes: admLimpo, altas: altaLimpa, passagem: passLimpo, updatedAt: new Date().toISOString() }, { merge: true });
  console.log("✅ Registros de teste removidos e base limpa com sucesso!");

  const snapFinal = await getDoc(docRef);
  const tamanhoFinal = JSON.stringify(snapFinal.data()).length;
  console.log("Tamanho final do documento no Firestore:", (tamanhoFinal / 1024).toFixed(2), "KB");
  console.log("=== TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ===");
}

testar().catch(console.error);
