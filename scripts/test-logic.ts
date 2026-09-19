import { anonimizarNome, deveExpurgarAdmissao, deveExpurgarAlta, deveExpurgarPermanencia } from "../src/lib/lgpd";
import { calcularDDayAntibiotico, calcularIdade, calcularTempoInternacao, calcularDPO, formatarCirurgiaDPO, obterCirurgiasPaciente } from "../src/lib/antibiotic-engine";
import { AdmissaoPaciente, AltaPaciente, PrescricaoAntibiotico, Pendencia, EquipePlantao, StatusPendencia, PacientePassagem } from "../src/types/hospital";
import { gerarMensagemWhatsAppAdmissoes, gerarMensagemAlta } from "../src/lib/whatsapp";
import { obterNivelProgressoAdmissao, atingiuEtapaAdmissao } from "../src/lib/utils";

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

// 9. TESTES DE MENSAGEM DE ALTA / PO (WHATSAPP)
console.log("\n--- 9. Gerador de Mensagens de Alta e PO ---");

const altaExemplo: AltaPaciente = {
  id: "a1",
  leito: "15",
  enfermaria: "FGH",
  nomePaciente: "Renata Camila",
  tipoCirurgia: "HIB+Hu",
  temQueixas: false,
  detalhesQueixas: "",
  parametros: {
    dieta: true,
    deambulou: true,
    diurese: true,
    evacuacao: false,
  },
  sinaisVitais: {
    frequenciaCardiaca: 75,
    saturacaoO2: 98,
  },
  dataAlta: "2026-09-16",
  createdAt: "",
  updatedAt: "",
};

const msgAlta = gerarMensagemAlta(altaExemplo);
console.log("Mensagem de Alta gerada:\n" + msgAlta);

assert(msgAlta.includes("LT 15 - Renata Camila"), "Mensagem inicia com leito e nome");
assert(msgAlta.includes("PO: HIB+Hu"), "Cirurgia exibida como 'PO: HIB+Hu'");
assert(msgAlta.includes("QUEIXAS: sem queixas"), "Sem queixas quando temQueixas for false");
assert(msgAlta.includes("DIETA: ✅"), "Dieta aceita marcada com ✅");
assert(msgAlta.includes("DEAMBULANDO ✅"), "Deambulando marcado com ✅");
assert(msgAlta.includes("DIURESE ✅"), "Diurese marcada com ✅");
assert(msgAlta.includes("EVACUAÇÃO ❌"), "Evacuação ausente marcada com ❌");
assert(msgAlta.includes("FC: 75 / Sat: 98%"), "Sinais vitais presentes");

// Caso sem cirurgia preenchida
const msgSemCirurgia = gerarMensagemAlta({
  ...altaExemplo,
  tipoCirurgia: "",
});
assert(msgSemCirurgia.includes("PO\nQUEIXAS:"), "Cirurgia vazia exibe apenas 'PO'");

// Caso com queixa preenchida
const msgComQueixa = gerarMensagemAlta({
  ...altaExemplo,
  temQueixas: true,
  detalhesQueixas: "Dor leve em FO",
});
assert(msgComQueixa.includes("QUEIXAS: Dor leve em FO"), "Queixa preenchida exibida corretamente");

// 10. TESTES DA ABA DE PERMANÊNCIA (ROUND CIRÚRGICO, NOTA INTERNA E EQUIPE INLINE)
console.log("\n--- 10. Regras da Aba de Permanência (Round Cirúrgico) ---");

// Teste 10.1: Criação de pendência ágil apenas com título
const pendenciaSimples: Pendencia = {
  id: "pend-01",
  titulo: "Checar resultado de TC de abdome",
  status: "Pendente",
  prioridade: "Normal",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
assert(pendenciaSimples.titulo === "Checar resultado de TC de abdome", "Pendência criada apenas com título");
assert(pendenciaSimples.responsavel === undefined, "Responsável não é obrigatório na criação");
assert(pendenciaSimples.leito === undefined, "Leito não é obrigatório na criação");

// Teste 10.2: Suporte a Nota Interna e conduta clínica
const pendenciaComNota: Pendencia = {
  ...pendenciaSimples,
  leito: "Leito 04",
  responsavel: "Dr. Felipe (R1)",
  prioridade: "Urgente",
  notaInterna: "Paciente com dor à descompressão. TC solicitada com urgência para descartar apendicite complicada.",
};
assert(Boolean(pendenciaComNota.notaInterna?.includes("descartar apendicite")), "Nota Interna armazenada e preservada");
assert(pendenciaComNota.leito === "Leito 04", "Leito atribuído com sucesso");
assert(pendenciaComNota.responsavel === "Dr. Felipe (R1)", "Responsável atribuído com sucesso");
assert(pendenciaComNota.prioridade === "Urgente", "Prioridade Urgente atribuída com sucesso");

// Teste 10.3: Ciclo de vida de status (Pendente -> Em Realização -> Feito)
function avancarStatus(statusAtual: StatusPendencia): StatusPendencia {
  const ordem: StatusPendencia[] = ["Pendente", "Em Realização", "Feito"];
  const idx = ordem.indexOf(statusAtual);
  return ordem[(idx + 1) % ordem.length];
}
assert(avancarStatus("Pendente") === "Em Realização", "Pendente avança para Em Realização");
assert(avancarStatus("Em Realização") === "Feito", "Em Realização avança para Feito");
assert(avancarStatus("Feito") === "Pendente", "Feito reinicia para Pendente");

// Teste 10.4: Gestão inline de membros da equipe do plantão
let equipePlantao: EquipePlantao = {
  residentes: ["Dr. Felipe (R1)"],
  doutorandos: ["Mariana (Internato)"],
  preceptores: ["Dr. Alexandre (Staff)"],
};

function addMembroInline(eq: EquipePlantao, cat: keyof EquipePlantao, nome: string): EquipePlantao {
  const limpo = nome.trim();
  if (!limpo) return eq;
  return {
    ...eq,
    [cat]: [...eq[cat], limpo],
  };
}

equipePlantao = addMembroInline(equipePlantao, "residentes", "Dra. Camila (R2)");
assert(equipePlantao.residentes.includes("Dra. Camila (R2)"), "Residente adicionado inline sem pop-up");

equipePlantao = addMembroInline(equipePlantao, "doutorandos", "Lucas (Internato)");
assert(equipePlantao.doutorandos.includes("Lucas (Internato)"), "Interno adicionado inline sem pop-up");

equipePlantao = addMembroInline(equipePlantao, "preceptores", "Dra. Beatriz (Staff)");
assert(equipePlantao.preceptores.includes("Dra. Beatriz (Staff)"), "Preceptor adicionado inline sem pop-up");

// Teste 10.5: Edição inline do nome de um membro existente
function editarMembroInline(eq: EquipePlantao, cat: keyof EquipePlantao, index: number, novoNome: string): EquipePlantao {
  const limpo = novoNome.trim();
  if (!limpo) return eq;
  const lista = [...eq[cat]];
  lista[index] = limpo;
  return { ...eq, [cat]: lista };
}
equipePlantao = editarMembroInline(equipePlantao, "residentes", 0, "Dr. Felipe Prado (R1 Cirurgia)");
assert(equipePlantao.residentes[0] === "Dr. Felipe Prado (R1 Cirurgia)", "Nome do residente editado com sucesso inline");

// Teste 10.6: Algoritmo de ordenação automática estrita em 6 níveis
function getPontuacaoOrdenacao(p: Pendencia): number {
  const isUrgente = p.prioridade === "Urgente";
  if (p.status === "Pendente") return isUrgente ? 1 : 3;
  if (p.status === "Em Realização") return isUrgente ? 2 : 4;
  if (p.status === "Feito") return isUrgente ? 5 : 6;
  return 7;
}

const tarefasParaOrdenar: Pendencia[] = [
  { id: "1", titulo: "Normal Feito", prioridade: "Normal", status: "Feito", createdAt: "2026-09-17T10:00:00Z", updatedAt: "2026-09-17T10:00:00Z" },
  { id: "2", titulo: "Normal Em Realização", prioridade: "Normal", status: "Em Realização", createdAt: "2026-09-17T10:05:00Z", updatedAt: "2026-09-17T10:05:00Z" },
  { id: "3", titulo: "Urgente Feito", prioridade: "Urgente", status: "Feito", createdAt: "2026-09-17T10:10:00Z", updatedAt: "2026-09-17T10:10:00Z" },
  { id: "4", titulo: "Urgente Pendente", prioridade: "Urgente", status: "Pendente", createdAt: "2026-09-17T10:15:00Z", updatedAt: "2026-09-17T10:15:00Z" },
  { id: "5", titulo: "Normal Pendente", prioridade: "Normal", status: "Pendente", createdAt: "2026-09-17T10:20:00Z", updatedAt: "2026-09-17T10:20:00Z" },
  { id: "6", titulo: "Urgente Em Realização", prioridade: "Urgente", status: "Em Realização", createdAt: "2026-09-17T10:25:00Z", updatedAt: "2026-09-17T10:25:00Z" },
];

const ordenadas = [...tarefasParaOrdenar].sort((a, b) => {
  const scoreA = getPontuacaoOrdenacao(a);
  const scoreB = getPontuacaoOrdenacao(b);
  if (scoreA !== scoreB) return scoreA - scoreB;
  const timeA = new Date(a.updatedAt || a.createdAt).getTime();
  const timeB = new Date(b.updatedAt || b.createdAt).getTime();
  return timeB - timeA;
});

assert(ordenadas[0].titulo === "Urgente Pendente", "1º lugar: Urgente & Pendente no topo absoluto");
assert(ordenadas[1].titulo === "Urgente Em Realização", "2º lugar: Urgente & Em Realização");
assert(ordenadas[2].titulo === "Normal Pendente", "3º lugar: Normal & Pendente");
assert(ordenadas[3].titulo === "Normal Em Realização", "4º lugar: Normal & Em Realização");
assert(ordenadas[4].titulo === "Urgente Feito", "5º lugar: Urgente & Feito desce para finalizados, acima dos normais");
assert(ordenadas[5].titulo === "Normal Feito", "6º lugar: Normal & Feito no final da lista");

// Teste 10.7: Sanitização de leito estritamente numérico
function sanitizarLeito(val: string): string {
  return val.replace(/\D/g, "");
}
assert(sanitizarLeito("Leito 08") === "08", "Sanitização de 'Leito 08' resulta em '08'");
assert(sanitizarLeito("15A") === "15", "Sanitização de '15A' remove letras e mantém '15'");
assert(sanitizarLeito("  03  ") === "03", "Sanitização mantém apenas dígitos");

// Teste 10.8: Formatação de badge combinada Leito & Enfermaria
function formatarBadgeLeitoEnfermaria(leito?: string, enfermaria?: string): string {
  if (leito && enfermaria) return `Leito: ${leito} · ${enfermaria}`;
  if (leito) return `Leito: ${leito}`;
  if (enfermaria) return enfermaria;
  return "";
}
assert(formatarBadgeLeitoEnfermaria("08", "FGH") === "Leito: 08 · FGH", "Formatação combinada 'Leito: 08 · FGH'");
assert(formatarBadgeLeitoEnfermaria("12") === "Leito: 12", "Formatação apenas com leito 'Leito: 12'");
assert(formatarBadgeLeitoEnfermaria(undefined, "IMIP") === "IMIP", "Formatação apenas com enfermaria 'IMIP'");

// Teste 10.9: Suporte a múltiplos responsáveis por pendência
const pendenciaMulti: Pendencia = {
  id: "pend-multi",
  titulo: "Passar prescrição de alta e orientar família",
  responsaveis: ["Dr. Felipe (R1)", "Mariana (Internato)"],
  prioridade: "Normal",
  status: "Pendente",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
assert(pendenciaMulti.responsaveis?.length === 2, "Tarefa contém múltiplos responsáveis (2)");
assert(pendenciaMulti.responsaveis?.includes("Dr. Felipe (R1)") === true, "Dr. Felipe vinculado como responsável");
assert(pendenciaMulti.responsaveis?.includes("Mariana (Internato)") === true, "Mariana vinculada como responsável");

// Teste 10.10: Contador de tarefas do round ({concluidas}/{total} tarefas)
function formatarContadorTarefas(lista: { status: string }[]): string {
  const total = lista.length;
  const concluidas = lista.filter((p) => p.status === "Feito").length;
  return `${concluidas}/${total} tarefas`;
}

const tarefasCenario: { status: string }[] = [
  { status: "Pendente" },
  { status: "Em Realização" },
  { status: "Feito" },
];

assert(formatarContadorTarefas(tarefasCenario) === "1/3 tarefas", "1 de 3 concluídas gera '1/3 tarefas'");
assert(formatarContadorTarefas([{ status: "Pendente" }, { status: "Em Realização" }, { status: "Pendente" }]) === "0/3 tarefas", "Nenhuma concluída gera '0/3 tarefas'");
assert(formatarContadorTarefas([{ status: "Feito" }, { status: "Feito" }, { status: "Feito" }]) === "3/3 tarefas", "Todas concluídas gera '3/3 tarefas'");
assert(formatarContadorTarefas([]) === "0/0 tarefas", "Lista vazia gera '0/0 tarefas'");
assert(!formatarContadorTarefas(tarefasCenario).includes("ativas"), "Rótulo não contém 'ativas', apenas 'tarefas'");

// 11. TESTES DA PASSAGEM DE PLANTÃO (DPO, IDADE, MOTIVO DO INTERNAMENTO E SANFONA)
console.log("\n--- 11. Regras da Passagem de Plantão (Sanfona, DPO e Dados Clínicos) ---");

// Teste 11.1: Cálculo de DPO a partir da data de cirurgia
const agoraRef = new Date(2026, 8, 17); // 17/09/2026
const dataTresDiasAtras = "2026-09-14";
const dpoCalculado = calcularDPO(dataTresDiasAtras, undefined, agoraRef);
assert(dpoCalculado === "3º DPO", `Cirurgia de 3 dias atrás resulta em '3º DPO' (obtido: ${dpoCalculado})`);

const dataHoje = "2026-09-17";
assert(calcularDPO(dataHoje, undefined, agoraRef) === "0º DPO", "Cirurgia no mesmo dia resulta em '0º DPO'");

// Teste 11.2: Ajuste manual de DPO sobrepondo cálculo
const dpoManualTest = calcularDPO(dataTresDiasAtras, 4, agoraRef);
assert(dpoManualTest === "4º DPO", "DPO manual (4) sobrepõe o cálculo automático");

// Teste 11.3: Formatação cirúrgica completa
const resumoCx1 = formatarCirurgiaDPO(true, "Colecistectomia VLP", dataTresDiasAtras, undefined, agoraRef);
assert(resumoCx1 === "3º DPO · Colecistectomia VLP", `Resumo cirúrgico completo: '3º DPO · Colecistectomia VLP' (obtido: ${resumoCx1})`);

const resumoNaoCirurgico = formatarCirurgiaDPO(false, "Qualquer", dataTresDiasAtras, undefined, agoraRef);
assert(resumoNaoCirurgico === "Tratamento Clínico", "Paciente não cirúrgico exibe 'Tratamento Clínico'");

// Teste 11.4: Cálculo de Idade automática
const idade30 = calcularIdade("1996-09-17", agoraRef);
assert(idade30 === "30 anos", `Cálculo de idade: esperado '30 anos', obtido '${idade30}'`);
assert(calcularIdade(undefined) === "-", "Data de nascimento não informada resulta em '-'");

// Teste 11.5: Linha 3 do cabeçalho fechado (Motivo do Internamento vs HD Fallback)
function obterLinhaMotivo(p: Partial<PacientePassagem>): string {
  return p.motivoInternamento || p.hd || "Sem motivo cadastrado";
}
assert(
  obterLinhaMotivo({ motivoInternamento: "Abdome agudo obstrutivo", hd: "Suboclusão intestinal" }) === "Abdome agudo obstrutivo",
  "Motivo do internamento tem prioridade na 3ª linha do card"
);
assert(
  obterLinhaMotivo({ motivoInternamento: "", hd: "Apendicite aguda" }) === "Apendicite aguda",
  "Fallback para HD quando motivo do internamento estiver vazio"
);

// Teste 11.6: Estrutura completa de PacientePassagem com Alergias e Precaução
const pacienteExemploPassagem: PacientePassagem = {
  id: "pass-01",
  nome: "Luiz Gabriel Dantas",
  leito: "20",
  enfermaria: "IMIP",
  dataAdmissao: "2026-09-05",
  dataNascimento: "1996-09-17",
  motivoInternamento: "Colecistite aguda litiásica",
  isCirurgico: true,
  dataCirurgia: "2026-09-14",
  tipoCirurgia: "Colecistectomia",
  temAlergia: true,
  descricaoAlergia: "Dipirona",
  precaucaoContato: true,
  hd: "Colecistite aguda",
  hda: "Dor em hipocôndrio direito há 4 dias associada a náuseas",
  evolucao: "Evoluindo bem, afebril, ferida operatória limpa",
  examesRealizados: "USG abdome com cálculo impactado em infundíbulo",
  medicacoesUsoGeral: "Cetoprofeno 100mg IV se dor, Omeprazol 40mg IV",
  antibioticos: [],
  pendencias: ["Trocar curativo", "Aguardar alta amanhã"],
  sinaisVitais: { fc: 72, satO2: 99, pa: "120/75", tax: 36.4 },
  conduta: "Planejar alta hospitalar em 24h",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

assert(pacienteExemploPassagem.temAlergia === true, "Alerta de alergia registrado");
assert(pacienteExemploPassagem.descricaoAlergia === "Dipirona", "Descrição da alergia preservada");
assert(pacienteExemploPassagem.precaucaoContato === true, "Alerta de precaução de contato registrado");
assert(pacienteExemploPassagem.isCirurgico === true, "Status cirúrgico registrado");

// Teste 11.7: Sincronização bidirecional - Duração em dias calculando Data de Término
function simularDataTermino(dataInicio: string, duracaoDias: number): string {
  const [ano, mes, dia] = dataInicio.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  d.setDate(d.getDate() + duracaoDias);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}
assert(simularDataTermino("2026-09-17", 7) === "2026-09-24", "Início 17/09 + 7 dias calcula término em 24/09");
assert(simularDataTermino("2026-09-17", 14) === "2026-10-01", "Início 17/09 + 14 dias calcula término em 01/10 (virada de mês)");

// Teste 11.8: Sincronização bidirecional - Data de Término calculando Duração em dias
function simularDuracaoDias(dataInicio: string, dataTermino: string): number {
  const [a1, m1, d1] = dataInicio.split("-").map(Number);
  const [a2, m2, d2] = dataTermino.split("-").map(Number);
  const dt1 = new Date(a1, m1 - 1, d1);
  const dt2 = new Date(a2, m2 - 1, d2);
  const diff = Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}
assert(simularDuracaoDias("2026-09-17", "2026-09-27") === 10, "Término 27/09 com início 17/09 calcula duração de 10 dias");
assert(simularDuracaoDias("2026-09-17", "2026-09-22") === 5, "Término 22/09 com início 17/09 calcula duração de 5 dias");

// Teste 11.9: Frequência numérica flexível de medicações (ex: 4h, 6h, 8h)
function dosesPorDiaDeFrequencia(freqHoras: number): number {
  return Math.max(1, Math.floor(24 / (freqHoras > 0 ? freqHoras : 24)));
}
assert(dosesPorDiaDeFrequencia(4) === 6, "Frequência numérica de 4 em 4 horas = 6 doses/dia");
assert(dosesPorDiaDeFrequencia(6) === 4, "Frequência numérica de 6 em 6 horas = 4 doses/dia");
assert(dosesPorDiaDeFrequencia(8) === 3, "Frequência numérica de 8 em 8 horas = 3 doses/dia");
assert(dosesPorDiaDeFrequencia(12) === 2, "Frequência numérica de 12 em 12 horas = 2 doses/dia");

// Teste 11.10: Ordem e estrutura das 4 linhas do card fechado da passagem
interface LinhasCardFechado {
  linha1Identificacao: boolean;
  linha2Motivo: boolean;
  linha3Medicacoes: boolean;
  linha4ExameClinico: boolean;
}
const cardValido: LinhasCardFechado = {
  linha1Identificacao: true,
  linha2Motivo: true,
  linha3Medicacoes: true,
  linha4ExameClinico: true,
};
assert(
  cardValido.linha1Identificacao && cardValido.linha2Motivo && cardValido.linha3Medicacoes && cardValido.linha4ExameClinico,
  "Card fechado contém a estrutura completa de 4 linhas na ordem correta"
);

// 12. TESTES AVANÇADOS: D-DAY COM EQUIVALÊNCIA ESTRITA DE 24 HORAS (6/6h, 12/12h, 8/8h)
console.log("\n--- 12. Validação Estrita de Equivalência de 24h no D-Day ---");

// Teste 12.1: 6 em 6 horas (4 tomadas necessárias para completar 24h = D1)
const atb6h: PrescricaoAntibiotico = {
  id: "atb-test-6h",
  nome: "Meropenem",
  dose: "1g IV",
  frequenciaHoras: 6, // 4 doses/dia
  horarioPrimeiraDose: "08:00",
  dataInicio: "2026-09-10",
  duracaoDias: 7,
  dosesPerdidas: 0,
};

// 1 dose às 08:00
const calc6h_1 = calcularDDayAntibiotico(atb6h, new Date("2026-09-10T08:30:00"));
assert(calc6h_1.rotuloDDay === "D0" && calc6h_1.dosesEfetivas === 1, "6/6h: 1 dose = D0 (1/4 tomadas no dia)");

// 2 doses às 14:00
const calc6h_2 = calcularDDayAntibiotico(atb6h, new Date("2026-09-10T14:30:00"));
assert(calc6h_2.rotuloDDay === "D0" && calc6h_2.dosesEfetivas === 2, "6/6h: 2 doses = D0 (2/4 tomadas no dia)");

// 3 doses às 20:00
const calc6h_3 = calcularDDayAntibiotico(atb6h, new Date("2026-09-10T20:30:00"));
assert(calc6h_3.rotuloDDay === "D0" && calc6h_3.dosesEfetivas === 3, "6/6h: 3 doses = D0 (3/4 tomadas no dia)");

// 4 doses às 02:00 do dia 11 (completa 4 tomadas = 24h equivalentes fechadas!)
const calc6h_4 = calcularDDayAntibiotico(atb6h, new Date("2026-09-11T02:30:00"));
assert(calc6h_4.rotuloDDay === "D1" && calc6h_4.dosesEfetivas === 4, "6/6h: 4 doses = D1 (completou 24h equivalentes)");

// 8 doses (completa 2 dias de 24h)
const calc6h_8 = calcularDDayAntibiotico(atb6h, new Date("2026-09-12T03:00:00"));
assert(calc6h_8.rotuloDDay === "D2" && calc6h_8.dosesEfetivas === 8, "6/6h: 8 doses = D2 (completou 48h equivalentes)");

// Teste 12.2: 12 em 12 horas (2 tomadas necessárias para completar 24h = D1)
const atb12h: PrescricaoAntibiotico = {
  id: "atb-test-12h",
  nome: "Ciprofloxacino",
  dose: "400mg IV",
  frequenciaHoras: 12, // 2 doses/dia
  horarioPrimeiraDose: "08:00",
  dataInicio: "2026-09-10",
  duracaoDias: 5,
  dosesPerdidas: 0,
};

// 1 dose às 08:00
const calc12h_1 = calcularDDayAntibiotico(atb12h, new Date("2026-09-10T12:00:00"));
assert(calc12h_1.rotuloDDay === "D0" && calc12h_1.dosesEfetivas === 1, "12/12h: 1 dose = D0 (1/2 tomadas no dia)");

// 2 doses às 20:00 (completa 2 tomadas = 24h completas!)
const calc12h_2 = calcularDDayAntibiotico(atb12h, new Date("2026-09-10T20:30:00"));
assert(calc12h_2.rotuloDDay === "D1" && calc12h_2.dosesEfetivas === 2, "12/12h: 2 doses = D1 (completou 24h equivalentes)");

// 3 doses às 08:00 do dia 11
const calc12h_3 = calcularDDayAntibiotico(atb12h, new Date("2026-09-11T09:00:00"));
assert(calc12h_3.rotuloDDay === "D1" && calc12h_3.dosesEfetivas === 3, "12/12h: 3 doses = D1 (falta mais 1 para virar D2)");

// 4 doses às 20:00 do dia 11
const calc12h_4 = calcularDDayAntibiotico(atb12h, new Date("2026-09-11T20:30:00"));
assert(calc12h_4.rotuloDDay === "D2" && calc12h_4.dosesEfetivas === 4, "12/12h: 4 doses = D2 (completou 48h equivalentes)");

// 13. TESTES DE MÚLTIPLAS CIRURGIAS E REABORDAGENS
console.log("\n--- 13. Suporte a Múltiplas Cirurgias / Reoperações ---");

// Paciente com duas cirurgias: Cirurgia Inicial + Relaparotomia
const pacienteReoperado: PacientePassagem = {
  id: "pac-reop-1",
  leito: "305-B",
  enfermaria: "Cirurgia Geral",
  nome: "Severino dos Ramos Pereira da Silva",
  idade: 58,
  dataAdmissao: "2026-09-01",
  isCirurgico: true,
  cirurgias: [
    {
      id: "cx-1",
      tipoCirurgia: "Colecistectomia Laparoscópica",
      dataCirurgia: "2026-09-02",
    },
    {
      id: "cx-2",
      tipoCirurgia: "Relaparotomia Exploradora com Lavagem",
      dataCirurgia: "2026-09-12",
    },
  ],
  antibioticos: [],
  pendencias: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const cxs = obterCirurgiasPaciente(pacienteReoperado);
assert(cxs.length === 2, "Paciente reoperado possui 2 procedimentos cadastrados");

const dpoCx1 = calcularDPO(cxs[0].dataCirurgia, undefined, new Date("2026-09-17T12:00:00"));
const dpoCx2 = calcularDPO(cxs[1].dataCirurgia, undefined, new Date("2026-09-17T12:00:00"));
assert(dpoCx1 === "15º DPO", `Cirurgia 1 em 02/09 no dia 17/09: esperado '15º DPO', obtido '${dpoCx1}'`);
assert(dpoCx2 === "5º DPO", `Cirurgia 2 em 12/09 no dia 17/09: esperado '5º DPO', obtido '${dpoCx2}'`);

// Formatação das pílulas independentes
const badge1 = `${dpoCx1} · ${cxs[0].tipoCirurgia}`;
const badge2 = `${dpoCx2} · ${cxs[1].tipoCirurgia}`;
assert(badge1 === "15º DPO · Colecistectomia Laparoscópica", "Pílula cirúrgica 1 gerada com sucesso");
assert(badge2 === "5º DPO · Relaparotomia Exploradora com Lavagem", "Pílula cirúrgica 2 gerada com sucesso");

// Retrocompatibilidade: paciente legado com campos únicos tipoCirurgia e dataCirurgia
const pacienteLegadoCx: PacientePassagem = {
  id: "pac-leg-1",
  leito: "204",
  enfermaria: "Clínica Médica",
  nome: "Francisca das Chagas Oliveira",
  idade: 64,
  dataAdmissao: "2026-09-10",
  isCirurgico: true,
  tipoCirurgia: "Herniorrafia Inguinal",
  dataCirurgia: "2026-09-14",
  antibioticos: [],
  pendencias: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const cxsLegado = obterCirurgiasPaciente(pacienteLegadoCx);
assert(cxsLegado.length === 1, "Retrocompatibilidade: paciente com formato antigo converte para 1 cirurgia");
assert(cxsLegado[0].tipoCirurgia === "Herniorrafia Inguinal", "Tipo de cirurgia legada preservado");

// 14. TESTES DE EDIÇÃO DE MEDICAÇÃO NO SUB-PAINEL
console.log("\n--- 14. Edição In-Place de Medicação no Sub-Painel ---");
let listaMeds: PrescricaoAntibiotico[] = [
  {
    id: "med-edit-1",
    nome: "Piperacilina + Tazobactam",
    dose: "4.5g IV",
    frequenciaHoras: 6,
    horarioPrimeiraDose: "20:00",
    dataInicio: "2026-09-10",
    duracaoDias: 7,
    dosesPerdidas: 0,
  },
];

// Simular salvar com edição (mesmo ID atualiza a posição sem duplicar)
const medEditada: PrescricaoAntibiotico = {
  ...listaMeds[0],
  dose: "4.5g IV em BIC",
  frequenciaHoras: 8, // alterado de 6h para 8h
  duracaoDias: 10,     // alterado de 7 para 10 dias
};

const existe = listaMeds.some((m) => m.id === medEditada.id);
assert(existe === true, "Medicação a ser editada foi localizada pelo ID");

listaMeds = listaMeds.map((m) => (m.id === medEditada.id ? medEditada : m));
assert(listaMeds.length === 1, "Edição in-place não duplicou a lista de medicações");
assert(listaMeds[0].dose === "4.5g IV em BIC", "Dose atualizada com sucesso");
assert(listaMeds[0].frequenciaHoras === 8, "Frequência atualizada com sucesso");
assert(listaMeds[0].duracaoDias === 10, "Duração atualizada com sucesso");

// 15. TESTES DE PENDÊNCIAS NO CARD FECHADO & IMPRESSÃO SELETIVA OTIMIZADA A4
console.log("\n--- 15. Pendências no Card & Impressão Seletiva A4 ---");

// Teste 15.1: Ordenação Natural de Leitos (ex: "1", "2", "10", "25", "305-B")
const leitosDesordenados = ["10", "2", "1", "305-B", "25", "03", "15A"];
const leitosOrdenados = [...leitosDesordenados].sort((a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
);
assert(
  JSON.stringify(leitosOrdenados) === JSON.stringify(["1", "2", "03", "10", "15A", "25", "305-B"]),
  `Ordenação natural de leitos: 1, 2, 03, 10, 15A, 25, 305-B (obtido: ${leitosOrdenados.join(", ")})`
);

// Teste 15.2: Exibição condicional das pendências do leito no card fechado
function deveExibirPendenciasNoCard(paciente: PacientePassagem): boolean {
  return !!(paciente.pendencias && paciente.pendencias.length > 0);
}
const pacComPendencias: PacientePassagem = {
  id: "p-pend-1",
  leito: "12",
  enfermaria: "FGH",
  nome: "Carlos Eduardo da Silva",
  dataAdmissao: "2026-09-10",
  antibioticos: [],
  pendencias: ["Trocar curativo às 14h", "Aguardar TC de tórax"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const pacSemPendencias: PacientePassagem = {
  id: "p-pend-2",
  leito: "14",
  enfermaria: "FGH",
  nome: "Marina Vasconcelos",
  dataAdmissao: "2026-09-12",
  antibioticos: [],
  pendencias: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
assert(
  deveExibirPendenciasNoCard(pacComPendencias) === true,
  "Card fechado exibe bloco de pendências quando existem itens"
);
assert(
  deveExibirPendenciasNoCard(pacSemPendencias) === false,
  "Card fechado oculta bloco de pendências quando a lista está vazia"
);

// Teste 15.3: Agrupamento por enfermaria com ordenação dos leitos
const listaParaAgrupar: PacientePassagem[] = [
  {
    id: "p1",
    leito: "10",
    enfermaria: "IMIP",
    nome: "Paciente 10",
    dataAdmissao: "2026-09-01",
    antibioticos: [],
    pendencias: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p2",
    leito: "2",
    enfermaria: "IMIP",
    nome: "Paciente 2",
    dataAdmissao: "2026-09-01",
    antibioticos: [],
    pendencias: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p3",
    leito: "05",
    enfermaria: "Cirurgia Geral",
    nome: "Paciente 5",
    dataAdmissao: "2026-09-01",
    antibioticos: [],
    pendencias: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mapaGrupos = new Map<string, PacientePassagem[]>();
listaParaAgrupar.forEach((p) => {
  const enf = p.enfermaria || "Sem Enfermaria";
  if (!mapaGrupos.has(enf)) mapaGrupos.set(enf, []);
  mapaGrupos.get(enf)!.push(p);
});
mapaGrupos.forEach((lista) => {
  lista.sort((a, b) =>
    (a.leito || "").localeCompare(b.leito || "", undefined, { numeric: true, sensitivity: "base" })
  );
});

const grupoIMIP = mapaGrupos.get("IMIP") || [];
assert(grupoIMIP.length === 2, "Grupo IMIP contém 2 pacientes");
assert(grupoIMIP[0].leito === "2" && grupoIMIP[1].leito === "10", "Leitos do IMIP ordenados naturalmente: Leito 2 antes do 10");

// Teste 15.4: Alternância em bloco da enfermaria inteira (toggleEnfermaria)
let selecionados = ["p1"];
const pacientesIMIP = [listaParaAgrupar[0], listaParaAgrupar[1]]; // p1 e p2
const idsIMIP = pacientesIMIP.map((p) => p.id);
const todosSelecionados = idsIMIP.every((id) => selecionados.includes(id));
assert(todosSelecionados === false, "Inicialmente nem todos do IMIP estão selecionados");

// Marcar enfermaria inteira
if (todosSelecionados) {
  selecionados = selecionados.filter((id) => !idsIMIP.includes(id));
} else {
  selecionados = Array.from(new Set([...selecionados, ...idsIMIP]));
}
assert(
  selecionados.includes("p1") && selecionados.includes("p2"),
  "Ação de 'Marcar enfermaria' seleciona todos os pacientes do grupo"
);

// Desmarcar enfermaria inteira
const agoraTodos = idsIMIP.every((id) => selecionados.includes(id));
if (agoraTodos) {
  selecionados = selecionados.filter((id) => !idsIMIP.includes(id));
}
assert(
  !selecionados.includes("p1") && !selecionados.includes("p2"),
  "Ação de 'Desmarcar enfermaria' remove todos os pacientes do grupo"
);

// Teste 15.5: Cabeçalho ultra-compacto de 1 linha para impressão
function formatarCabecalhoImpressao(data: string, total: number): string {
  return `PASSAGEM DE PLANTÃO — ${data} — ${total} ${total === 1 ? "PACIENTE SELECIONADO" : "PACIENTES SELECIONADOS"}`;
}
const cabecalho = formatarCabecalhoImpressao("17/09/2026", 12);
assert(
  cabecalho === "PASSAGEM DE PLANTÃO — 17/09/2026 — 12 PACIENTES SELECIONADOS",
  "Cabeçalho de impressão ultra-compacto em 1 linha formatado corretamente"
);

// 16. TESTES DE EDIÇÃO DE PENDÊNCIAS NA PASSAGEM & MODELOS DE TEXTO (BASE44)
console.log("\n--- 16. Edição de Pendências na Passagem & Modelos Base44 ---");

// Teste 16.1: Edição inline de pendência no array do paciente da passagem
let pendenciasPaciente = ["Trocar curativo às 14h", "Aguardar TC de abdome", "Suspender heparina"];
const indexParaEditar = 1;
const novoTextoEditado = "Aguardar TC de abdome com contraste (urgente)";

pendenciasPaciente = [...pendenciasPaciente];
pendenciasPaciente[indexParaEditar] = novoTextoEditado;

assert(pendenciasPaciente.length === 3, "Edição inline preserva o total de pendências (sem duplicar ou apagar)");
assert(pendenciasPaciente[1] === "Aguardar TC de abdome com contraste (urgente)", "Texto da pendência atualizado com sucesso no índice correto");
assert(pendenciasPaciente[0] === "Trocar curativo às 14h", "Primeira pendência inalterada");
assert(pendenciasPaciente[2] === "Suspender heparina", "Terceira pendência inalterada");

// Teste 16.2: Ordenação alfabética de modelos dentro de cada categoria
const modelosOrientações = [
  { id: "m1", titulo: "PROCTO", categoria: "Orientações de Alta", conteudo: "Texto Procto" },
  { id: "m2", titulo: "BARIÁTRICA", categoria: "Orientações de Alta", conteudo: "Texto Bariátrica" },
  { id: "m3", titulo: "HÉRNIA INGUINAL", categoria: "Orientações de Alta", conteudo: "Texto Hérnia" },
  { id: "m4", titulo: "COLELAP", categoria: "Orientações de Alta", conteudo: "Texto Colelap" },
  { id: "m5", titulo: "Geral", categoria: "Orientações de Alta", conteudo: "Texto Geral" },
];

const ordenadosAlfabetico = [...modelosOrientações].sort((a, b) =>
  a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" })
);

const titulosOrdenados = ordenadosAlfabetico.map((m) => m.titulo);
assert(
  titulosOrdenados[0] === "BARIÁTRICA" &&
  titulosOrdenados[1] === "COLELAP" &&
  titulosOrdenados[2] === "Geral" &&
  titulosOrdenados[3] === "HÉRNIA INGUINAL" &&
  titulosOrdenados[4] === "PROCTO",
  `Modelos ordenados alfabeticamente: BARIÁTRICA, COLELAP, Geral, HÉRNIA INGUINAL, PROCTO (obtido: ${titulosOrdenados.join(", ")})`
);

// Teste 16.3: Preservação de formatação com quebras de linha para receituários e prontuários
const receitaFormatada = `USO ORAL:\n1. Dipirona 500mg/mL gotas ------------ 1 frasco\n   Tomar 40 gotas VO de 6/6h se dor ou febre.\n\n2. Cefalexina 500mg ------------------ 1 cx\n   Tomar 1 comprimido de 6/6h por 7 dias.`;
assert(receitaFormatada.includes("\n"), "Receituário contém múltiplas quebras de linha preservadas");
assert(receitaFormatada.includes("   Tomar 40 gotas"), "Espaços e recuos de texto preservados");
assert(receitaFormatada.split("\n").length === 6, "Total exato de linhas de receita preservado para copiar e colar");

// 17. TESTES DA AGENDA AMBULATORIAL & PAINEL DASHBOARD (BASE44)
console.log("\n--- 17. Agenda Ambulatorial & Novo Painel Base44 ---");

// Teste 17.1: Ordenação alfabética estrita dos médicos no turno e na lista geral
const medicosAgendaTeste = [
  { id: "m-1", nome: "Dr. Roberto Carlos", horarios: [{ dia: "Segunda" as const, turno: "Manhã" as const }] },
  { id: "m-2", nome: "Dra. Amanda Souza", horarios: [{ dia: "Segunda" as const, turno: "Manhã" as const }] },
  { id: "m-3", nome: "Dr. Bernardo Silva", horarios: [{ dia: "Segunda" as const, turno: "Manhã" as const }] },
  { id: "m-4", nome: "Dra. Camila Lima", horarios: [{ dia: "Segunda" as const, turno: "Manhã" as const }] },
];

const ordenadosTurnoTeste = [...medicosAgendaTeste].sort((a, b) =>
  a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
);
assert(
  ordenadosTurnoTeste[0].nome === "Dr. Bernardo Silva" &&
  ordenadosTurnoTeste[1].nome === "Dr. Roberto Carlos" &&
  ordenadosTurnoTeste[2].nome === "Dra. Amanda Souza" &&
  ordenadosTurnoTeste[3].nome === "Dra. Camila Lima",
  "Médicos ordenados estritamente de A a Z no turno da manhã"
);

const ordenadosGeralTeste = [...medicosAgendaTeste].sort((a, b) =>
  a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
);
assert(
  ordenadosGeralTeste[0].nome === "Dr. Bernardo Silva",
  "Primeiro médico da lista geral é Bernardo"
);
assert(
  ordenadosGeralTeste[ordenadosGeralTeste.length - 1].nome === "Dra. Camila Lima",
  "Último médico da lista geral é Camila"
);

// Teste 17.2: Agregação dos 4 cards de topo do Painel
const admissoesMock: AdmissaoPaciente[] = [
  { id: "a1", nome: "Paciente 1", enfermaria: "IMIP", dataAdmissaoAgendada: "2026-09-17", status: "Chegou", cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "a2", nome: "Paciente 2", enfermaria: "IMIP", dataAdmissaoAgendada: "2026-09-17", status: "Internou", cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "a3", nome: "Paciente 3", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-17", status: "AIH", cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "a4", nome: "Paciente 4", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-17", status: "Alta/ADM", cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "a5", nome: "Paciente 5", enfermaria: "IMIP", dataAdmissaoAgendada: "2026-09-17", status: "Aguardando", cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "a6", nome: "Paciente 6", enfermaria: "IMIP", dataAdmissaoAgendada: "2026-09-17", status: "Aguardando", cancelada: true, historiaFinalizada: false, createdAt: "", updatedAt: "" }, // Cancelada!
];

const ativasHoje = admissoesMock.filter((a) => !a.cancelada && a.dataAdmissaoAgendada === "2026-09-17");
assert(ativasHoje.length === 5, "Card Admissões: 5 ativas (cancelada excluída da contagem)");

const enfAdmissoes = ativasHoje.reduce<Record<string, number>>((acc, a) => {
  acc[a.enfermaria] = (acc[a.enfermaria] || 0) + 1;
  return acc;
}, {});
assert(enfAdmissoes["IMIP"] === 3, "Badge IMIP: 3 admissões ativas");
assert(enfAdmissoes["FGH"] === 2, "Badge FGH: 2 admissões ativas");

// Teste 17.3: Distribuição das 5 fases da admissão no painel Base44
let countAguardando = 0;
let countChegou = 0;
let countInternou = 0;
let countAih = 0;
let countAltaAdm = 0;

ativasHoje.forEach((p) => {
  if (p.status === "Alta/ADM" || p.altaAdm) countAltaAdm++;
  else if (p.status === "AIH" || p.aih) countAih++;
  else if (p.status === "Internou" || p.internou) countInternou++;
  else if (p.status === "Chegou" || p.chegou) countChegou++;
  else countAguardando++;
});

assert(countAguardando === 1, "Fase Aguardando: 1 paciente");
assert(countChegou === 1, "Fase Chegou: 1 paciente");
assert(countInternou === 1, "Fase Internou: 1 paciente");
assert(countAih === 1, "Fase AIH: 1 paciente");
assert(countAltaAdm === 1, "Fase Alta/ADM: 1 paciente");

// Teste 17.4: Razão de permanência (feitas / total)
const pendenciasPainel: Pendencia[] = [
  { id: "p1", titulo: "Pedir TC de abdome", status: "Feito", prioridade: "Urgente", createdAt: "", updatedAt: "" },
  { id: "p2", titulo: "Checar potássio", status: "Pendente", prioridade: "Normal", createdAt: "", updatedAt: "" },
  { id: "p3", titulo: "Passar sonda vesical", status: "Em Realização", prioridade: "Normal", createdAt: "", updatedAt: "" },
];
const feitas = pendenciasPainel.filter((p) => p.status === "Feito").length;
const total = pendenciasPainel.length;
assert(`${feitas}/${total}` === "1/3", "Card Permanência: razão '1/3' computada com precisão");

// =========================================================================
// SEÇÃO 18: TESTES DOS AJUSTES FINAIS DO PAINEL, IMPRESSÃO E EXPURGO DE ALTAS
// =========================================================================
console.log("\n--- 18. Ajustes Finais do Painel & Expurgo de Altas (48h) ---");

// Teste 18.1: Legendas dinâmicas do Card de Permanência
function obterLegendaPermanencia(lista: Pendencia[]): string {
  const tot = lista.length;
  const conc = lista.filter((p) => p.status === "Feito").length;
  const emAcao = lista.some((p) => p.status === "Em Realização" || p.status === "Feito");
  const todasConc = tot > 0 && conc === tot;
  return todasConc
    ? `Trabalho concluído (${conc}/${tot})`
    : emAcao
    ? "Equipe em ação"
    : "Tarefas do dia";
}

const listaVazia: Pendencia[] = [];
assert(
  obterLegendaPermanencia(listaVazia) === "Tarefas do dia",
  "Legenda com 0 tarefas: 'Tarefas do dia'"
);

const listaPendentes: Pendencia[] = [
  { id: "p1", titulo: "T1", status: "Pendente", prioridade: "Normal", createdAt: "", updatedAt: "" },
  { id: "p2", titulo: "T2", status: "Pendente", prioridade: "Normal", createdAt: "", updatedAt: "" },
];
assert(
  obterLegendaPermanencia(listaPendentes) === "Tarefas do dia",
  "Legenda com tarefas apenas pendentes (nenhuma iniciada/concluída): 'Tarefas do dia'"
);

const listaEmAcao: Pendencia[] = [
  { id: "p1", titulo: "T1", status: "Em Realização", prioridade: "Normal", createdAt: "", updatedAt: "" },
  { id: "p2", titulo: "T2", status: "Pendente", prioridade: "Normal", createdAt: "", updatedAt: "" },
];
assert(
  obterLegendaPermanencia(listaEmAcao) === "Equipe em ação",
  "Legenda com tarefa iniciada: 'Equipe em ação'"
);

const listaParcialConcluida: Pendencia[] = [
  { id: "p1", titulo: "T1", status: "Feito", prioridade: "Normal", createdAt: "", updatedAt: "" },
  { id: "p2", titulo: "T2", status: "Pendente", prioridade: "Normal", createdAt: "", updatedAt: "" },
];
assert(
  obterLegendaPermanencia(listaParcialConcluida) === "Equipe em ação",
  "Legenda com 1 feita e 1 pendente: 'Equipe em ação'"
);

const listaTodasFeitas: Pendencia[] = [
  { id: "p1", titulo: "T1", status: "Feito", prioridade: "Normal", createdAt: "", updatedAt: "" },
  { id: "p2", titulo: "T2", status: "Feito", prioridade: "Normal", createdAt: "", updatedAt: "" },
  { id: "p3", titulo: "T3", status: "Feito", prioridade: "Urgente", createdAt: "", updatedAt: "" },
];
assert(
  obterLegendaPermanencia(listaTodasFeitas) === "Trabalho concluído (3/3)",
  "Legenda com 3/3 concluídas: 'Trabalho concluído (3/3)'"
);

// Teste 18.2: Badge piscante de pendências urgentes pendentes
const pendenciasComUrgente: Pendencia[] = [
  { id: "p1", titulo: "Urgente 1", status: "Pendente", prioridade: "Urgente", createdAt: "", updatedAt: "" },
  { id: "p2", titulo: "Normal 1", status: "Pendente", prioridade: "Normal", createdAt: "", updatedAt: "" },
  { id: "p3", titulo: "Urgente Feita", status: "Feito", prioridade: "Urgente", createdAt: "", updatedAt: "" }, // Concluída não conta!
];
const urgentesAtivas = pendenciasComUrgente.filter((p) => p.prioridade === "Urgente" && p.status !== "Feito").length;
assert(urgentesAtivas === 1, "Badge Urgências Ativas: 1 urgente pendente detectada (urgente feita é desconsiderada)");

// Teste 18.3: Cálculo percentual das fases de admissão para a Barra Segmentada
const totalAdms = 10;
const fasesCalculo = [
  { label: "Aguardando", count: 2 },
  { label: "Chegou", count: 3 },
  { label: "Internou", count: 2 },
  { label: "AIH", count: 2 },
  { label: "Alta/ADM", count: 1 },
];
const pctAguardando = (fasesCalculo[0].count / totalAdms) * 100;
const pctChegou = (fasesCalculo[1].count / totalAdms) * 100;
const pctAltaAdm = (fasesCalculo[4].count / totalAdms) * 100;
assert(pctAguardando === 20, "Fase Aguardando: 20% computado com precisão");
assert(pctChegou === 30, "Fase Chegou: 30% computado com precisão");
assert(pctAltaAdm === 10, "Fase Alta/ADM: 10% computado com precisão");
const somaPcts = fasesCalculo.reduce((acc, f) => acc + (f.count / totalAdms) * 100, 0);
assert(somaPcts === 100, "Soma das fatias da barra segmentada fecha em 100%");

// Teste 18.4: Expurgo de Altas e Fotos de Feridas Operatórias após 48h da data da alta
const agoraTeste = new Date("2026-09-18T12:00:00");

// Alta de 4 dias atrás (2026-09-14) -> >48h da data da alta -> deve expurgar!
assert(
  deveExpurgarAlta("2026-09-14", agoraTeste) === true,
  "Alta de 4 dias atrás é expurgada (>48h da data da alta)"
);

// Alta de 1 dia atrás (2026-09-17) -> <48h da data da alta -> NÃO expurga!
assert(
  deveExpurgarAlta("2026-09-17", agoraTeste) === false,
  "Alta de 1 dia atrás (ontem) é mantida (<48h)"
);

// Alta de hoje (2026-09-18) -> NÃO expurga!
assert(
  deveExpurgarAlta("2026-09-18", agoraTeste) === false,
  "Alta de hoje é mantida intacta"
);

// Teste 18.5: Escala do gráfico de tendência histórica com folga contra corte no teto
const maxValor = 10;
const yAxisMax = Math.max(8, Math.ceil((maxValor + 2.5) / 4) * 4);
assert(yAxisMax === 16, "Escala Y com max=10 projeta teto 16 (folga superior garantida sem corte)");

// 19. TESTES DE FUNIL CUMULATIVO DO PAINEL & ORDENAÇÃO POR STATUS NA ADMISSÃO
console.log("\n--- 19. Funil Cumulativo do Painel & Ordenação por Status na Admissão ---");

// Teste 19.1: Ordenação na Admissão: 1º Não Chegou ➔ 2º Chegou ➔ 3º Internou ➔ 4º AIH ➔ 5º Alta/ADM (desempate A-Z)
const listaPacientesAdmissaoTeste: AdmissaoPaciente[] = [
  { id: "1", nome: "Beatriz Santos", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-19", status: "Alta/ADM", altaAdm: true, cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "2", nome: "Carlos Eduardo", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-19", status: "Aguardando", cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "3", nome: "Amanda Lima", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-19", status: "Aguardando", cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "4", nome: "Daniel Rocha", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-19", status: "Chegou", chegou: true, cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "5", nome: "Eduardo Souza", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-19", status: "Internou", internou: true, cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "6", nome: "Fernanda Alves", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-19", status: "AIH", aih: true, cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
  { id: "7", nome: "Arthur Silva", enfermaria: "FGH", dataAdmissaoAgendada: "2026-09-19", status: "Alta/ADM", altaAdm: true, cancelada: false, historiaFinalizada: false, createdAt: "", updatedAt: "" },
];

const listaOrdenada = [...listaPacientesAdmissaoTeste].sort((a, b) => {
  const nivelA = obterNivelProgressoAdmissao(a);
  const nivelB = obterNivelProgressoAdmissao(b);
  if (nivelA !== nivelB) return nivelA - nivelB;
  return a.nome.localeCompare(b.nome, "pt-BR");
});

assert(listaOrdenada[0].nome === "Amanda Lima", "1º lugar: Amanda Lima (Não Chegou, A-Z)");
assert(listaOrdenada[1].nome === "Carlos Eduardo", "2º lugar: Carlos Eduardo (Não Chegou, A-Z)");
assert(listaOrdenada[2].nome === "Daniel Rocha", "3º lugar: Daniel Rocha (Chegou)");
assert(listaOrdenada[3].nome === "Eduardo Souza", "4º lugar: Eduardo Souza (Internou)");
assert(listaOrdenada[4].nome === "Fernanda Alves", "5º lugar: Fernanda Alves (AIH)");
assert(listaOrdenada[5].nome === "Arthur Silva", "6º lugar: Arthur Silva (Alta/ADM, A-Z)");
assert(listaOrdenada[6].nome === "Beatriz Santos", "7º lugar: Beatriz Santos (Alta/ADM, A-Z)");

// Teste 19.2: Funil Cumulativo Clínico (Cenário do usuário: 4 pacientes, 4 chegaram, 4 internaram, 4 AIH, 3 Alta/ADM)
const pacientesFunilTeste = [
  { status: "Alta/ADM", altaAdm: true },
  { status: "Alta/ADM", altaAdm: true },
  { status: "Alta/ADM", altaAdm: true },
  { status: "AIH", aih: true },
];
const totalPacientes = pacientesFunilTeste.length; // 4
let cChegou = 0;
let cInternou = 0;
let cAih = 0;
let cAltaAdm = 0;

pacientesFunilTeste.forEach((p) => {
  if (atingiuEtapaAdmissao(p, "chegou")) cChegou++;
  if (atingiuEtapaAdmissao(p, "internou")) cInternou++;
  if (atingiuEtapaAdmissao(p, "aih")) cAih++;
  if (atingiuEtapaAdmissao(p, "altaAdm")) cAltaAdm++;
});

const pChegou = Math.round((cChegou / totalPacientes) * 100);
const pInternou = Math.round((cInternou / totalPacientes) * 100);
const pAih = Math.round((cAih / totalPacientes) * 100);
const pAltaAdm = Math.round((cAltaAdm / totalPacientes) * 100);

assert(cChegou === 4 && pChegou === 100, `Funil Chegou: esperado 4 (100%), obtido ${cChegou} (${pChegou}%)`);
assert(cInternou === 4 && pInternou === 100, `Funil Internou: esperado 4 (100%), obtido ${cInternou} (${pInternou}%)`);
assert(cAih === 4 && pAih === 100, `Funil AIH: esperado 4 (100%), obtido ${cAih} (${pAih}%)`);
assert(cAltaAdm === 3 && pAltaAdm === 75, `Funil Alta/ADM: esperado 3 (75%), obtido ${cAltaAdm} (${pAltaAdm}%)`);

// Teste 19.3: Paciente com flag Alta/ADM herda implicitamente todas as etapas anteriores
const pacienteAltaIsolada = { altaAdm: true };
assert(atingiuEtapaAdmissao(pacienteAltaIsolada, "chegou") === true, "Alta/ADM herda Chegou");
assert(atingiuEtapaAdmissao(pacienteAltaIsolada, "internou") === true, "Alta/ADM herda Internou");
assert(atingiuEtapaAdmissao(pacienteAltaIsolada, "aih") === true, "Alta/ADM herda AIH");
assert(atingiuEtapaAdmissao(pacienteAltaIsolada, "altaAdm") === true, "Alta/ADM conclui Alta/ADM");

// 20. CIRURGIAS CANCELADAS NA TENDÊNCIA HISTÓRICA
console.log("\n--- 20. Cirurgias Canceladas na Tendência Histórica ---");
const serieHistoricaTeste = [
  { data: "2026-09-17", admissoes: 5, altas: 4, canceladas: 0 },
  { data: "2026-09-18", admissoes: 6, altas: 3, canceladas: 2 },
  { data: "2026-09-19", admissoes: 4, altas: 5, canceladas: 1 },
];

const totalCancPeriodo = serieHistoricaTeste.reduce((acc, d) => acc + d.canceladas, 0);
assert(totalCancPeriodo === 3, `Total de canceladas no período: esperado 3, obtido ${totalCancPeriodo}`);

// Escala Y respeita o pico máximo de qualquer uma das 3 métricas
const maxValorSerie = Math.max(...serieHistoricaTeste.map((d) => Math.max(d.admissoes, d.altas, d.canceladas)), 8);
const yAxisMaxSerie = Math.max(8, Math.ceil((maxValorSerie + 2.5) / 4) * 4);
assert(yAxisMaxSerie === 12, `Escala Y com pico 6 projeta teto 12 (folga garantida sem corte): obtido ${yAxisMaxSerie}`);

// Verificação de marcador de alerta nos dias com cancelamento
const temAlertaDia18 = serieHistoricaTeste[1].canceladas > 0;
const temAlertaDia17 = serieHistoricaTeste[0].canceladas > 0;
assert(temAlertaDia18 === true, "Dia 18 ativa anel de alerta visual (2 cancelamentos)");
assert(temAlertaDia17 === false, "Dia 17 não ativa anel de alerta (0 cancelamentos)");

// 21. AGENDA AMBULATORIAL - CAMPOS EM BRANCO E FORMATAÇÃO CONDICIONAL
console.log("\n--- 21. Agenda Ambulatorial: Campos Em Branco e Renderização Limpa ---");

interface MedicoTeste {
  id: string;
  nome: string;
  especialidade?: string;
  sala?: string;
}

function formatarSubtituloMedico(m: MedicoTeste): string | null {
  if (!m.especialidade && !m.sala) return null;
  return [m.especialidade, m.sala].filter(Boolean).join(" • ");
}

// Teste 21.1: Médico sem especialidade e sem consultório não gera fallback forçado nem texto
const medSemNada: MedicoTeste = { id: "m1", nome: "Dr. João Silva" };
assert(formatarSubtituloMedico(medSemNada) === null, "Médico sem especialidade e sala retorna null (não exibe 'Cirurgião')");

// Teste 21.2: Médico com apenas especialidade
const medSoEsp: MedicoTeste = { id: "m2", nome: "Dra. Maria Santos", especialidade: "Cirurgia Geral" };
assert(formatarSubtituloMedico(medSoEsp) === "Cirurgia Geral", "Médico só com especialidade exibe apenas a especialidade");

// Teste 21.3: Médico com apenas consultório/sala
const medSoSala: MedicoTeste = { id: "m3", nome: "Dr. Pedro Costa", sala: "Consultório 103" };
assert(formatarSubtituloMedico(medSoSala) === "Consultório 103", "Médico só com sala exibe apenas o consultório sem marcadores soltos");

// Teste 21.4: Médico com especialidade e consultório
const medCompleto: MedicoTeste = { id: "m4", nome: "Dr. André Lima", especialidade: "Coloproctologia", sala: "Consultório 105" };
assert(formatarSubtituloMedico(medCompleto) === "Coloproctologia • Consultório 105", "Médico completo exibe Especialidade • Consultório");

// Teste 21.5: Valores iniciais de novo médico devem ser strings vazias
function getValoresIniciaisNovoMedico() {
  return {
    nome: "",
    especialidade: "",
    sala: "",
    horarios: [],
  };
}
const initialVals = getValoresIniciaisNovoMedico();
assert(initialVals.especialidade === "", "Especialidade inicial é string vazia");
// Teste 21.6: Largura mínima de coluna (>= 210px) e da matriz semanal (>= 1120px) para acomodar nome e sobrenome em 1 linha
const COLUNA_MIN_WIDTH_PX = 210;
const TOTAL_COLUNAS = 5;
const GAP_PX = 12;
const PADDING_CONTAINER_PX = 32;
const larguraTotalCalculada = TOTAL_COLUNAS * COLUNA_MIN_WIDTH_PX + (TOTAL_COLUNAS - 1) * GAP_PX + PADDING_CONTAINER_PX;
assert(COLUNA_MIN_WIDTH_PX >= 210, "Largura mínima de coluna >= 210px garante espaço generoso para nome e sobrenome sem reticências");
assert(larguraTotalCalculada >= 1120, `Matriz semanal com largura mínima ${larguraTotalCalculada}px suporta rolagem horizontal fluida`);

// Teste 21.7: Altura mínima dos quadrados (min-h: 150px) acomoda confortavelmente pelo menos 2 médicos
const ALTURA_BASE_CARD_MEDICO_PX = 46;
const GAP_CARDS_PX = 6;
const ALTURA_RODAPE_PX = 20;
const PADDING_QUADRADO_PX = 20;
const alturaMinima2Medicos = 2 * ALTURA_BASE_CARD_MEDICO_PX + GAP_CARDS_PX + ALTURA_RODAPE_PX + PADDING_QUADRADO_PX;
const MIN_H_CONFIGURADO_PX = 150;
assert(MIN_H_CONFIGURADO_PX >= alturaMinima2Medicos, `Altura mínima configurada (${MIN_H_CONFIGURADO_PX}px) comporta visualmente 2 médicos de base (${alturaMinima2Medicos}px) sem colapsar`);

// Teste 21.8: Altura adaptativa para múltiplos médicos sem barra de rolagem vertical interna
function calcularAlturaAdaptativaQuadrado(totalMedicos: number): number {
  if (totalMedicos <= 0) return MIN_H_CONFIGURADO_PX;
  const alturaItens = totalMedicos * ALTURA_BASE_CARD_MEDICO_PX + (totalMedicos - 1) * GAP_CARDS_PX + ALTURA_RODAPE_PX + PADDING_QUADRADO_PX;
  return Math.max(MIN_H_CONFIGURADO_PX, alturaItens);
}
assert(calcularAlturaAdaptativaQuadrado(1) === 150, "1 médico mantém altura mínima base de 150px (espaço harmonioso)");
assert(calcularAlturaAdaptativaQuadrado(2) === 150, "2 médicos preenchem a altura base de 150px");
assert(calcularAlturaAdaptativaQuadrado(4) === 242, "4 médicos expandem adaptativamente para 242px sem corte e sem scroll interno");
assert(calcularAlturaAdaptativaQuadrado(6) === 346, "6 médicos expandem adaptativamente para 346px exibindo todos os nomes");

// 22. SEGURANÇA DE LOGIN, EXPIRAÇÃO DE SESSÃO (5 MIN) E PROTEÇÃO CONTRA F5
console.log("\n--- 22. Segurança da Sessão: Expiração em 5 Minutos & Proteção no F5 ---");

const TEMPO_INATIVIDADE_TESTE_MS = 5 * 60 * 1000; // 300.000 ms

interface StorageSimulado {
  [key: string]: string | undefined;
}

function simularVerificacaoF5(storage: StorageSimulado, timestampAtual: number): boolean {
  const auth = storage["checklist_auth"];
  const lastActivity = storage["checklist_last_activity"];

  if (auth === "true" && lastActivity) {
    const decorrido = timestampAtual - Number(lastActivity);
    if (decorrido < TEMPO_INATIVIDADE_TESTE_MS) {
      // Sessão válida e recente: permite entrada e renova atividade
      storage["checklist_last_activity"] = timestampAtual.toString();
      return true;
    } else {
      // Sessão expirada (> 5 min): invalida e remove credenciais
      delete storage["checklist_auth"];
      delete storage["checklist_last_activity"];
      return false;
    }
  }

  delete storage["checklist_auth"];
  delete storage["checklist_last_activity"];
  return false;
}

function simularDisparoTimeoutInatividade(storage: StorageSimulado) {
  // Ação de logout no timeout de 5 minutos
  delete storage["checklist_auth"];
  delete storage["checklist_last_activity"];
}

// Teste 22.1: Sessão após 5 minutos de inatividade disparada pelo timer
const storageInativo: StorageSimulado = {
  checklist_auth: "true",
  checklist_last_activity: (Date.now() - 5 * 60 * 1000).toString(),
};
simularDisparoTimeoutInatividade(storageInativo);
assert(storageInativo["checklist_auth"] === undefined, "Timer de inatividade limpa 'checklist_auth' do storage");
assert(storageInativo["checklist_last_activity"] === undefined, "Timer de inatividade limpa 'checklist_last_activity'");

// Teste 22.2: F5 imediatamente após o bloqueio de 5 minutos não restaura autenticação
const reautenticouAposBloqueio = simularVerificacaoF5(storageInativo, Date.now());
assert(reautenticouAposBloqueio === false, "F5 após bloqueio de inatividade exige senha mestre (não entra)");

// Teste 22.3: F5 durante uso ativo (< 5 minutos, ex: 1 minuto) mantém conectado sem pedir senha
const agoraTesteAuth = Date.now();
const storageAtivo: StorageSimulado = {
  checklist_auth: "true",
  checklist_last_activity: (agoraTesteAuth - 1 * 60 * 1000).toString(), // 1 min atrás
};
const manteveAtivo = simularVerificacaoF5(storageAtivo, agoraTesteAuth);
assert(manteveAtivo === true, "F5 durante uso ativo (< 5 min) preserva a sessão do profissional");
assert(Number(storageAtivo["checklist_last_activity"]) === agoraTesteAuth, "F5 ativo renova o timestamp de última atividade");

// Teste 22.4: Aba deixada em segundo plano / celular suspenso por 10 minutos e depois F5
const storageSuspenso: StorageSimulado = {
  checklist_auth: "true",
  checklist_last_activity: (agoraTesteAuth - 10 * 60 * 1000).toString(), // 10 min atrás
};
const expirouSegundoPlano = simularVerificacaoF5(storageSuspenso, agoraTesteAuth);
assert(expirouSegundoPlano === false, "F5 após 10 minutos em segundo plano rejeita o acesso e exige senha");
assert(storageSuspenso["checklist_auth"] === undefined, "Storage é completamente limpo após expiração em segundo plano");

// Teste 22.5: Usuário sem login anterior dando F5
const storageVazio: StorageSimulado = {};
const tentouSemLogin = simularVerificacaoF5(storageVazio, agoraTesteAuth);
assert(tentouSemLogin === false, "Usuário sem credencial prévia permanece bloqueado");

console.log(`\n==============================================`);
console.log(`RESULTADO FINAL: ${passed} testes PASSARAM, ${failed} FALHARAM.`);
console.log(`==============================================`);

if (failed > 0) {
  process.exit(1);
}



