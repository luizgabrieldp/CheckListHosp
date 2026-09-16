import { anonimizarNome, deveExpurgarAdmissao, deveExpurgarPermanencia } from "../src/lib/lgpd";
import { calcularDDayAntibiotico, calcularIdade, calcularTempoInternacao } from "../src/lib/antibiotic-engine";
import { gerarMensagemAdmissao, gerarMensagemAlta } from "../src/lib/whatsapp";
import { AdmissaoPaciente, PrescricaoAntibiotico } from "../src/types/hospital";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

console.log("=== INICIANDO TESTES DE REGRAS DE NEGÓCIO DO CHECKLIST HOSPITALAR ===\n");

// 1. TESTES DE AUTENTICAÇÃO GATEKEEPER (SENHA MESTRE "cgimip")
console.log("--- 1. Autenticação Gatekeeper (cgimip case-insensitive) ---");
function verificarSenha(s: string) {
  return s && s.trim().toLowerCase() === "cgimip";
}
assert(verificarSenha("cgimip") === true, "Senha 'cgimip' minúscula é aceita");
assert(verificarSenha("CGIMIP") === true, "Senha 'CGIMIP' maiúscula é aceita");
assert(verificarSenha("CgImIp") === true, "Senha 'CgImIp' mista é aceita");
assert(verificarSenha("  cgimip  ") === true, "Senha com espaços nas pontas é aceita");
assert(verificarSenha("senha_errada") === false, "Senha incorreta é rejeitada");

// 2. TESTES DE ANONIMIZAÇÃO LGPD
console.log("\n--- 2. Anonimização LGPD ---");
const nome1 = anonimizarNome("João Carlos Silva Santos");
assert(
  nome1 === "João Carlos xxxxx xxxxx",
  `Anonimização 4 nomes: esperado 'João Carlos xxxxx xxxxx', obtido '${nome1}'`
);

const nome2 = anonimizarNome("Maria Silva");
assert(nome2 === "Maria Silva", `Anonimização 2 nomes: esperado 'Maria Silva', obtido '${nome2}'`);

const nome3 = anonimizarNome("Ana Clara Pereira da Silva");
assert(
  nome3 === "Ana Clara xxxxx xxxxx xxxxx",
  `Anonimização 5 nomes: obtido '${nome3}'`
);

// 3. TESTES DA REGRA CRÍTICA DE EXPURGO LGPD (A PARTIR DA DATA AGENDADA)
console.log("\n--- 3. Expurgo LGPD por Data Agendada ---");
const agora = new Date("2026-09-15T12:00:00");

// Admissão agendada para 5 dias atrás (2026-09-10) -> já passou de 48h da data agendada -> expurga!
assert(
  deveExpurgarAdmissao("2026-09-10", agora) === true,
  "Admissão de 5 dias atrás é expurgada (>48h da data agendada)"
);

// Admissão agendada para 2 dias no futuro (2026-09-17) -> NÃO pode ser expurgada!
assert(
  deveExpurgarAdmissao("2026-09-17", agora) === false,
  "REGRA CRÍTICA: Admissão agendada futura (2 dias à frente) NÃO é expurgada"
);

// Admissão agendada para hoje (2026-09-15) -> NÃO pode ser expurgada
assert(
  deveExpurgarAdmissao("2026-09-15", agora) === false,
  "Admissão agendada para hoje NÃO é expurgada"
);

// 4. TESTES DO MOTOR DE ANTIBIOTICOTERAPIA D-DAY
console.log("\n--- 4. Motor de Antibioticoterapia & D-Day ---");
// Prescrição de Ceftriaxona 8/8h (3 doses por dia) iniciada em 2026-09-10 às 08:00
const atb8h: PrescricaoAntibiotico = {
  id: "atb-test-1",
  nome: "Ceftriaxona",
  dose: "1g IV",
  frequenciaHoras: 8, // 3 doses/dia
  horarioPrimeiraDose: "08:00",
  dataInicio: "2026-09-10",
  duracaoDias: 5,
  dosesPerdidas: 0,
};

// Teste D0: No momento da 1ª dose (apenas 1 dose)
const calcD0 = calcularDDayAntibiotico(atb8h, new Date("2026-09-10T09:00:00"));
assert(
  calcD0.rotuloDDay === "D0",
  `Regra 24h equivalentes: 1 dose em 8/8h deve ser D0 (obtido: ${calcD0.rotuloDDay})`
);

// Teste D0: No momento da 2ª dose (16:00, 2 doses)
const calcD0_2 = calcularDDayAntibiotico(atb8h, new Date("2026-09-10T17:00:00"));
assert(
  calcD0_2.rotuloDDay === "D0",
  `Regra 24h equivalentes: 2 doses em 8/8h deve ser D0 (obtido: ${calcD0_2.rotuloDDay})`
);

// Teste D1: No momento da 3ª dose (00:00 do dia seguinte -> completa 3 doses necessárias para fechar 24h!)
const calcD1 = calcularDDayAntibiotico(atb8h, new Date("2026-09-11T00:30:00"));
assert(
  calcD1.rotuloDDay === "D1",
  `Regra 24h equivalentes: 3 doses em 8/8h completam D1 (obtido: ${calcD1.rotuloDDay})`
);

// Teste Doses Perdidas: Se houver 1 dose perdida, as 3 doses caem para 2 doses efetivas -> volta para D0!
const atbComPerdida: PrescricaoAntibiotico = {
  ...atb8h,
  dosesPerdidas: 1,
};
const calcPerdida = calcularDDayAntibiotico(atbComPerdida, new Date("2026-09-11T00:30:00"));
assert(
  calcPerdida.rotuloDDay === "D0",
  `Desconto de Doses Perdidas: com 1 dose perdida, 3 doses passadas viram 2 efetivas = D0 (obtido: ${calcPerdida.rotuloDDay})`
);

// Teste de Alerta de Desescalonamento: data atual após o término
const calcFim = calcularDDayAntibiotico(atb8h, new Date("2026-09-20T12:00:00"));
assert(
  calcFim.statusAlerta === "DESESCALONAR",
  `Alerta de término: data após término gera status 'DESESCALONAR' (obtido: ${calcFim.statusAlerta})`
);
assert(
  calcFim.mensagemStatus.includes("Desescalonar"),
  `Mensagem de status exibe recomendação de desescalonamento`
);

// 5. TESTES DE ORDENAÇÃO ALFABÉTICA NA AGENDA AMBULATORIAL
console.log("\n--- 5. Ordenação Alfabética da Agenda Ambulatorial ---");
const medicosDesordenados = [
  { nome: "Dr. Gabriel Zampieri" },
  { nome: "Dr. Alexandre Fontes" },
  { nome: "Dra. Helena Vasconcelos" },
  { nome: "Dra. Beatriz Albuquerque" },
  { nome: "Dr. Carlos Eduardo Meireles" },
];
const medicosOrdenados = [...medicosDesordenados].sort((a, b) => a.nome.localeCompare(b.nome));
assert(
  medicosOrdenados[0].nome === "Dr. Alexandre Fontes",
  "1º médico ordenado: Dr. Alexandre Fontes"
);
assert(
  medicosOrdenados[1].nome === "Dr. Carlos Eduardo Meireles",
  "2º médico ordenado: Dr. Carlos Eduardo Meireles"
);
assert(
  medicosOrdenados[3].nome === "Dra. Beatriz Albuquerque",
  "4º médico ordenado: Dra. Beatriz Albuquerque"
);
assert(
  medicosOrdenados[4].nome === "Dra. Helena Vasconcelos",
  "Último médico ordenado: Dra. Helena Vasconcelos"
);

// 6. TESTES DE MENSAGEM WHATSAPP (NOVO FORMATO ALINHADO BASE44)
console.log("\n--- 6. Gerador de Mensagens WhatsApp ---");
import { gerarMensagemWhatsAppAdmissoes } from "../src/lib/whatsapp";

const pacientesExemplo: AdmissaoPaciente[] = [
  {
    id: "p1",
    nome: "TAMIRES SILVA SAMPAIO SANTOS",
    enfermaria: "IMIP",
    dataAdmissaoAgendada: "2026-09-15",
    status: "AIH",
    chegou: true,
    internou: true,
    aih: true,
    cancelada: false,
    historiaFinalizada: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "p2",
    nome: "ANTONIO EUGENIO DA SILVA",
    enfermaria: "FGH",
    dataAdmissaoAgendada: "2026-09-15",
    status: "Alta/ADM",
    chegou: true,
    internou: true,
    aih: true,
    altaAdm: true,
    cancelada: false,
    historiaFinalizada: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "p3",
    nome: "RENATA CAMILA ROCHA DA SILVA",
    enfermaria: "SEM ENFERMARIA",
    dataAdmissaoAgendada: "2026-09-15",
    status: "Chegou",
    chegou: true,
    cancelada: false,
    historiaFinalizada: false,
    createdAt: "",
    updatedAt: "",
  },
];

const msgWhats = gerarMensagemWhatsAppAdmissoes(pacientesExemplo, "2026-09-15");
console.log("Mensagem gerada:\n" + msgWhats);

assert(msgWhats.startsWith("Adms 15/09"), "Mensagem inicia com 'Adms 15/09'");
// Deve estar em ordem alfabética: ANTONIO, depois RENATA, depois TAMIRES
const idxAntonio = msgWhats.indexOf("ANTONIO EUGENIO DA SILVA");
const idxRenata = msgWhats.indexOf("RENATA CAMILA ROCHA DA SILVA");
const idxTamires = msgWhats.indexOf("TAMIRES SILVA SAMPAIO SANTOS");

assert(idxAntonio !== -1 && idxRenata !== -1 && idxTamires !== -1, "Todos os pacientes constam na mensagem");
assert(idxAntonio < idxRenata, "ANTONIO vem antes de RENATA (ordem alfabética)");
assert(idxRenata < idxTamires, "RENATA vem antes de TAMIRES (ordem alfabética)");
assert(msgWhats.includes("ANTONIO EUGENIO DA SILVA 🏥 🛏️ ✅ 🟦"), "ANTONIO possui os 4 emojis de status");
assert(msgWhats.includes("RENATA CAMILA ROCHA DA SILVA 🏥"), "RENATA possui apenas 🏥");
assert(msgWhats.includes("TAMIRES SILVA SAMPAIO SANTOS 🏥 🛏️ ✅"), "TAMIRES possui 🏥 🛏️ ✅");
assert(msgWhats.includes("🏥 Chegou"), "Mensagem contém legenda de Chegou");
assert(msgWhats.includes("🛏️ Internou"), "Mensagem contém legenda de Internou");
assert(msgWhats.includes("✅ AIH pronta"), "Mensagem contém legenda de AIH");
assert(msgWhats.includes("🟦 Alta e ADM prontas"), "Mensagem contém legenda de Alta/ADM");
assert(msgWhats.includes("Editada"), "Mensagem contém carimbo de horário 'Editada HH:MM'");

// 7. TESTES DE REGRAS DAS BOLINHAS DE STATUS (FLUXO E HISTÓRIA)
console.log("\n--- 7. Regras das Bolinhas de Status (Fluxo e História) ---");

function calcularBolinhas(paciente: Partial<AdmissaoPaciente>, agora: number) {
  const isCancelada = Boolean(paciente.cancelada);
  const isCompleto = Boolean(
    paciente.chegou && paciente.internou && paciente.aih && paciente.altaAdm
  );
  const dataRef = paciente.updatedAt || paciente.createdAt;
  const diferencaMs = dataRef ? agora - new Date(dataRef).getTime() : 0;
  const isInativo30Min = diferencaMs > 30 * 60 * 1000;

  let corFluxo: "vermelha" | "verde" | "amarela-pulsante" | null = null;
  if (isCancelada) corFluxo = "vermelha";
  else if (isCompleto) corFluxo = "verde";
  else if (isInativo30Min) corFluxo = "amarela-pulsante";

  let corHistoria: "azul" | null = paciente.historiaFinalizada ? "azul" : null;

  return { corFluxo, corHistoria };
}

const agoraMock = new Date("2026-09-16T15:00:00Z").getTime();
const data10MinAtras = new Date("2026-09-16T14:50:00Z").toISOString();
const data40MinAtras = new Date("2026-09-16T14:20:00Z").toISOString();

// Caso 1: Cancelada
const resCancelada = calcularBolinhas({ cancelada: true, updatedAt: data10MinAtras }, agoraMock);
assert(resCancelada.corFluxo === "vermelha", "Cirurgia cancelada gera exclusivamente bolinha vermelha");

// Caso 2: Completo (Chegou + Internou + AIH + Alta/ADM)
const resCompletoRecente = calcularBolinhas(
  { chegou: true, internou: true, aih: true, altaAdm: true, updatedAt: data10MinAtras },
  agoraMock
);
assert(resCompletoRecente.corFluxo === "verde", "Todos os 4 status completos geram a bolinha verde");

// Caso 3: Completo mesmo após 40 minutos NÃO vira amarelo, permanece verde
const resCompletoAntigo = calcularBolinhas(
  { chegou: true, internou: true, aih: true, altaAdm: true, updatedAt: data40MinAtras },
  agoraMock
);
assert(resCompletoAntigo.corFluxo === "verde", "Paciente 100% completo mantém bolinha verde mesmo após 30 min");

// Caso 4: Incompleto e mexido há 10 minutos (< 30 min) -> Nenhuma bolinha de fluxo
const resIncompletoRecente = calcularBolinhas(
  { chegou: true, internou: false, aih: false, altaAdm: false, updatedAt: data10MinAtras },
  agoraMock
);
assert(resIncompletoRecente.corFluxo === null, "Paciente incompleto com menos de 30 min sem mexer não tem bolinha de fluxo");

// Caso 5: Incompleto e sem mexer há 40 minutos (> 30 min) -> Bolinha amarela pulsante
const resIncompletoInativo = calcularBolinhas(
  { chegou: true, internou: true, aih: false, altaAdm: false, updatedAt: data40MinAtras },
  agoraMock
);
assert(resIncompletoInativo.corFluxo === "amarela-pulsante", "Paciente incompleto há mais de 30 min gera bolinha amarela pulsante");

// Caso 6: História finalizada e travada -> Bolinha azul presente
const resHistoriaTravada = calcularBolinhas(
  { historiaFinalizada: true, updatedAt: data10MinAtras },
  agoraMock
);
assert(resHistoriaTravada.corHistoria === "azul", "História clínica travada acende a bolinha azul");

// Caso 7: História aberta -> Bolinha azul ausente
const resHistoriaAberta = calcularBolinhas(
  { historiaFinalizada: false, updatedAt: data10MinAtras },
  agoraMock
);
assert(resHistoriaAberta.corHistoria === null, "História aberta não exibe bolinha azul");

// 8. TESTES DE GESTÃO DE ENFERMARIAS E MODELOS
console.log("\n--- 8. Gestão de Enfermarias e Categorias de Modelos ---");
let listaEnf = ["SEM ENFERMARIA", "FGH", "IMIP"];
function addEnf(lista: string[], nome: string) {
  const limpo = nome.trim();
  if (!limpo || lista.some(e => e.toLowerCase() === limpo.toLowerCase())) return lista;
  return [...lista, limpo];
}
function remEnf(lista: string[], nome: string) {
  return lista.filter(e => e !== nome);
}

listaEnf = addEnf(listaEnf, "UTI");
assert(listaEnf.includes("UTI"), "Enfermaria 'UTI' adicionada com sucesso");
listaEnf = addEnf(listaEnf, "uti"); // duplicata case-insensitive
assert(listaEnf.filter(e => e.toLowerCase() === "uti").length === 1, "Não permite duplicatas de enfermaria");
listaEnf = remEnf(listaEnf, "FGH");
assert(!listaEnf.includes("FGH"), "Enfermaria 'FGH' removida com sucesso");

console.log(`\n==============================================`);
console.log(`RESULTADO FINAL: ${passed} testes PASSARAM, ${failed} FALHARAM.`);
console.log(`==============================================`);

if (failed > 0) {
  process.exit(1);
}
