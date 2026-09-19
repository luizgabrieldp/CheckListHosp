import fs from "fs";
import path from "path";
import {
  AdmissaoPaciente,
  AltaPaciente,
  DadosPermanencia,
  DatabaseState,
  MedicoAmbulatorio,
  MetricasHistoricasDiarias,
  ModeloTexto,
  PacientePassagem,
} from "@/types/hospital";
import { deveExpurgarAdmissao, deveExpurgarAlta, deveExpurgarPermanencia, agregarMetricasDiarias } from "./lgpd";
import { obterDataLocalHoje } from "./utils";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "hospital-db.json");

// Modelos de texto clínicos padrão
const MODELOS_PADRAO: ModeloTexto[] = [
  {
    id: "mod-1",
    titulo: "Alta Hospitalar - Pós-Operatório Geral",
    categoria: "Alta",
    conteudo: `HOSPITAL REGIONAL / ENFERMARIA DE CIRURGIA GERAL
RESUMO DE ALTA HOSPITALAR

Paciente em pós-operatório sem intercorrências no período de internação.
Dieta tolerada com boa aceitação.
Deambulação ativa, sem queixas álgicas incapacitantes.
Eliminações fisiológicas presentes e espontâneas.
Ferida operatória limpa e seca, sem sinais flogísticos ou secreções patológicas.

ORIENTAÇÕES:
1. Retorno ambulatorial em 7 a 10 dias para revisão cirúrgica e retirada de pontos.
2. Manter curativo limpo e seco conforme orientações da equipe de enfermagem.
3. Não realizar esforços físicos intensos ou carregar peso superior a 5kg por 30 dias.
4. Sinais de alarme: febre (Tax > 37.8°C), dor súbita intensa, hiperemia ou secreção purulenta na incisão cirúrgica -> procurar pronto atendimento imediatamente.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mod-2",
    titulo: "Encaminhamento - Especialidades Cirúrgicas",
    categoria: "Encaminhamento",
    conteudo: `AO SERVIÇO DE CIRURGIA ESPECIALIZADA

Encaminhamos o(a) paciente acima identificado(a) para avaliação complementar especializada.
Histórico: Paciente acompanhado na enfermaria cirúrgica com hipótese diagnóstica em investigação.
Exames realizados durante o internamento:
- Hemograma e coagulograma sem alterações graves.
- TC de abdome com contraste anexada ao relatório.
Conduta prévia e justificativa: Necessita seguimento ambulatorial especializado para definição de programação operatória eletiva definitiva.

Atenciosamente,
Equipe de Cirurgia Geral`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mod-3",
    titulo: "Admissão Cirúrgica (ADM) - Padrão",
    categoria: "ADM",
    conteudo: `CHECKLIST ADMISSÃO CIRÚRGICA
Data: [DATA] | Leito: [LEITO]

HD: [HIPÓTESE DIAGNÓSTICA]
HDA: Paciente admitido para propedêutica e tratamento cirúrgico.
Antecedentes:
- Alergias: [ALERGIAS]
- Comorbidades: [HAS / DM / OUTRAS]
- Cirurgias Prévias: [CIRURGIAS]
- MUC: [MEDICAMENTOS EM USO]
Exame Físico: BEG, LOTE, acianótico, anictérico, afebril. Abdome flácido, indolor à palpação, RHA presentes.
Conduta: Jejum a partir das 00:00, hidratação venosa se indicado, reserva de sangue e consentimento esclarecido assinado.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mod-4",
    titulo: "Receituário Padrão de Alta - Analgesia e Profilaxia",
    categoria: "Receituário",
    conteudo: `RECEITUÁRIO MÉDICO

USO ORAL:
1. Dipirona 500mg/mL gotas ou comprimido de 1g ---------- 1 frasco / cx
   Tomar 1 comprimido ou 40 gotas VO de 6/6h em caso de dor ou febre.

2. Cetoprofeno 100mg ------------------------------------ 1 cx
   Tomar 1 comprimido VO de 12/12h após as refeições por 3 dias (se dor moderada e sem contraindicações).

3. Cefalexina 500mg (se prescrito) ---------------------- 1 cx
   Tomar 1 cápsula VO de 6/6h por 7 dias nos horários programados.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mod-5",
    titulo: "Evolução Diária de Enfermaria",
    categoria: "Evolução",
    conteudo: `EVOLUÇÃO CLÍNICA CIRÚRGICA
D_ PO de [CIRURGIA]

S: Paciente refere noite tranquila, nega náuseas ou dor importante.
O: BEG, corado, hidratado. Sinais vitais estáveis. Abdome globoso/plano, depressível, indolor. Ferida cirúrgica com bom aspecto, bordas coaptadas.
A: Boa evolução pós-operatória.
P: Progredir dieta para branda, manter deambulação, programar alta hospitalar para amanhã.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mod-6",
    titulo: "Orientações Gerais Beira-Leito",
    categoria: "Orientações Gerais",
    conteudo: `ORIENTAÇÕES DE CUIDADOS NO LEITO:
- Manter cabeceira elevada a 30-45 graus.
- Estímulo à deambulação precoce assistida pela equipe ou acompanhante.
- Exercícios respiratórios a cada 2 horas com inspirômetro de incentivo.
- Comunicar imediatamente a enfermagem em caso de sangramento em curativo ou náuseas.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "mod-7",
    titulo: "Orientações de Alta e Cuidados Domiciliares",
    categoria: "Orientações de Alta",
    conteudo: `INSTRUÇÕES PARA O DOMICÍLIO:
- Lavar a ferida operatória no banho com água corrente e sabão neutro.
- Secar bem com toalha limpa e manter o local ventilado ou com curativo seco microporado.
- Não retirar crostas ou mexer nos pontos cirúrgicos.
- Dieta habitual rica em fibras e boa hidratação (mínimo 2 litros de água ao dia).`,
    createdAt: new Date().toISOString(),
  },
];

// Médicos padrão para Agenda de Ambulatório
const AMBULATORIO_PADRAO: MedicoAmbulatorio[] = [
  {
    id: "med-1",
    nome: "Dr. Alexandre Fontes",
    especialidade: "Cirurgia Geral & Parede Abdominal",
    sala: "Consultório 102",
    horarios: [
      { dia: "Segunda", turno: "Manhã" },
      { dia: "Quarta", turno: "Tarde" },
    ],
  },
  {
    id: "med-2",
    nome: "Dra. Beatriz Albuquerque",
    especialidade: "Cirurgia Videolaparoscópica",
    sala: "Consultório 105",
    horarios: [
      { dia: "Segunda", turno: "Manhã" },
      { dia: "Sexta", turno: "Manhã" },
    ],
  },
  {
    id: "med-3",
    nome: "Dr. Carlos Eduardo Meireles",
    especialidade: "Cirurgia do Aparelho Digestivo",
    sala: "Consultório 101",
    horarios: [
      { dia: "Terça", turno: "Manhã" },
      { dia: "Quinta", turno: "Tarde" },
    ],
  },
  {
    id: "med-4",
    nome: "Dra. Daniela Prado",
    especialidade: "Coloproctologia",
    sala: "Consultório 104",
    horarios: [
      { dia: "Segunda", turno: "Tarde" },
      { dia: "Quarta", turno: "Manhã" },
    ],
  },
  {
    id: "med-5",
    nome: "Dr. Gabriel Zampieri",
    especialidade: "Cirurgia Geral & Trauma",
    sala: "Consultório 103",
    horarios: [
      { dia: "Terça", turno: "Tarde" },
      { dia: "Quinta", turno: "Manhã" },
    ],
  },
  {
    id: "med-6",
    nome: "Dra. Helena Vasconcelos",
    especialidade: "Cirurgia Bariátrica e Metabólica",
    sala: "Consultório 106",
    horarios: [
      { dia: "Sexta", turno: "Tarde" },
      { dia: "Terça", turno: "Manhã" },
    ],
  },
];

// Dados iniciais realistas para a enfermaria
const hojeIso = obterDataLocalHoje();
const ontemDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
const ontemIso = obterDataLocalHoje(ontemDate);
const anteontemDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
const anteontemIso = obterDataLocalHoje(anteontemDate);
const amanhaDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
const amanhaIso = obterDataLocalHoje(amanhaDate);

const INITIAL_STATE: DatabaseState = {
  admissoes: [
    {
      id: "adm-1",
      nome: "RENATA CAMILA ROCHA DA SILVA",
      enfermaria: "SEM ENFERMARIA",
      leito: "Leito 01",
      dataAdmissaoAgendada: hojeIso,
      status: "Chegou",
      chegou: true,
      internou: false,
      aih: false,
      altaAdm: false,
      cancelada: false,
      historiaFinalizada: false,
      anotacoesHistoria: `HD:
- COLELITÍASE SINTOMÁTICA

HDA: PACIENTE COM DIAGNÓSTICO PRÉVIO DE COLECISTOLITÍASE RETORNA A ENFERMARIA PARA REALIZAÇÃO DE COLELAP. REFERE DOR EM HCD COM PIORA PÓS-PRANDIAL. NEGA NOVAS QUEIXAS ATUALMENTE.

ANTECEDENTES:
- Nega alergias ou comorbidades conhecidas.

CONDUTA:
- Programada colecistectomia videolaparoscópica. Jejum após 00:00.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "adm-2",
      nome: "ANTONIO EUGENIO DA SILVA",
      enfermaria: "FGH",
      leito: "Leito 02",
      dataAdmissaoAgendada: hojeIso,
      status: "Alta/ADM",
      chegou: true,
      internou: true,
      aih: true,
      altaAdm: true,
      cancelada: false,
      historiaFinalizada: true,
      anotacoesHistoria: `HD:
- HÉRNIA INGUINAL DIREITA

HDA: Paciente admitido para herniorrafia inguinal eletiva. Procedimento realizado sem intercorrências.

CONDUTA:
- Alta hospitalar com orientações e receita.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "adm-3",
      nome: "MARIA LEDA TAVARES DE SOUZA",
      enfermaria: "FGH",
      leito: "Leito 03",
      dataAdmissaoAgendada: hojeIso,
      status: "Alta/ADM",
      chegou: true,
      internou: true,
      aih: true,
      altaAdm: true,
      cancelada: false,
      historiaFinalizada: true,
      anotacoesHistoria: `HD:
- HÉRNIA UMBILICAL

HDA: PO 1 de herniorrafia umbilical. Dieta aceita, deambulando, diurese e evacuação presentes.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "adm-4",
      nome: "TAMIRES SILVA SAMPAIO SANTOS",
      enfermaria: "IMIP",
      leito: "Leito 04",
      dataAdmissaoAgendada: hojeIso,
      status: "AIH",
      chegou: true,
      internou: true,
      aih: true,
      altaAdm: false,
      cancelada: false,
      historiaFinalizada: false,
      anotacoesHistoria: `HD:
- APENDICITE AGUDA SUBAGUDA

HDA: Paciente admitida via pronto-socorro. AIH autorizada. Programado procedimento cirúrgico.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "adm-5",
      nome: "CLEIDE CREUZA DA SILVA SANTOS",
      enfermaria: "IMIP",
      leito: "Leito 05",
      dataAdmissaoAgendada: hojeIso,
      status: "Alta/ADM",
      chegou: true,
      internou: true,
      aih: true,
      altaAdm: true,
      cancelada: false,
      historiaFinalizada: true,
      anotacoesHistoria: `HD:
- COLECISTECTOMIA VLP

HDA: Alta e documentação administrativa (ADM) prontas.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "adm-6",
      nome: "JOSÉ LEONARDO GOMES FILHO",
      enfermaria: "IMIP",
      leito: "Leito 06",
      dataAdmissaoAgendada: hojeIso,
      status: "Alta/ADM",
      chegou: true,
      internou: true,
      aih: true,
      altaAdm: true,
      cancelada: false,
      historiaFinalizada: true,
      anotacoesHistoria: `HD:
- CISTO SEBÁCEO DORSAL

HDA: Ressecção realizada sob anestesia local. Alta programada.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "adm-7",
      nome: "SILVANIA JOSÉ DA SILVA",
      enfermaria: "IMIP",
      leito: "Leito 07",
      dataAdmissaoAgendada: hojeIso,
      status: "Alta/ADM",
      chegou: true,
      internou: true,
      aih: true,
      altaAdm: true,
      cancelada: false,
      historiaFinalizada: true,
      anotacoesHistoria: `HD:
- LIPOMA DE ANTEBRAÇO

HDA: Alta e ADM concluídas.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "adm-8",
      nome: "ZULEIDE MIRANDA DE SANTANA",
      enfermaria: "FGH",
      leito: "Leito 08",
      dataAdmissaoAgendada: hojeIso,
      status: "Alta/ADM",
      chegou: true,
      internou: true,
      aih: true,
      altaAdm: true,
      cancelada: false,
      historiaFinalizada: true,
      anotacoesHistoria: `HD:
- PO HÉRNIA INCISIONAL

HDA: Procedimento e documentação de alta concluídos.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  altas: [
    {
      id: "alta-1",
      leito: "Leito 03",
      enfermaria: "Cirurgia Geral 1",
      nomePaciente: "Roberto Dias de Matos",
      tipoCirurgia: "PO 1 Colecistectomia Videolaparoscópica",
      temQueixas: false,
      parametros: {
        dieta: true,
        deambulou: true,
        diurese: true,
        evacuacao: true,
      },
      sinaisVitais: {
        frequenciaCardiaca: 74,
        saturacaoO2: 98,
        pressaoArterial: "120/80 mmHg",
        temperatura: 36.4,
      },
      dataAlta: hojeIso,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "alta-2",
      leito: "Leito 04",
      enfermaria: "Cirurgia Geral 1",
      nomePaciente: "Juliana Mendes Garcia",
      tipoCirurgia: "PO 2 Herniorrafia Umbilical",
      temQueixas: true,
      detalhesQueixas: "Leve dor em queimação na cicatriz cirúrgica, bem controlada após Dipirona venosa.",
      parametros: {
        dieta: true,
        deambulou: true,
        diurese: true,
        evacuacao: false,
      },
      sinaisVitais: {
        frequenciaCardiaca: 82,
        saturacaoO2: 97,
        pressaoArterial: "115/75 mmHg",
        temperatura: 36.6,
      },
      dataAlta: hojeIso,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  permanencia: {
    id: "perm-hoje",
    data: hojeIso,
    equipe: {
      doutorandos: ["Lucas Pinheiro (Internato)", "Mariana Vasquez (Internato)"],
      residentes: ["Dr. Felipe Prado (R1 Cirurgia)", "Dra. Camila Nogueira (R2 Cirurgia)"],
      preceptores: ["Dr. Alexandre Fontes (Staff Chefe)"],
    },
    pendencias: [
      {
        id: "pend-1",
        titulo: "Checar resultado de TC de Abdome com contraste do Leito 05",
        responsavel: "Dr. Felipe Prado (R1)",
        status: "Em Realização",
        prioridade: "Urgente",
        leito: "Leito 05",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "pend-2",
        titulo: "Coletar hemograma e PCR de controle do Leito 08 (PO 3 Apendicectomia)",
        responsavel: "Lucas Pinheiro (Interno)",
        status: "Pendente",
        prioridade: "Normal",
        leito: "Leito 08",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "pend-3",
        titulo: "Passar prescrição de alta e orientações para Leito 03",
        responsavel: "Dra. Camila Nogueira (R2)",
        status: "Feito",
        prioridade: "Normal",
        leito: "Leito 03",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  passagem: [
    {
      id: "pass-1",
      nome: "Marcos Vinicius de Souza Lima",
      leito: "Leito 08",
      enfermaria: "Cirurgia Geral 2",
      dataNascimento: "1984-06-15",
      dataAdmissao: anteontemIso,
      hd: "PO 3 Apendicectomia por Apendicite Aguda Perfurada (Fase IV)",
      antibioticos: [
        {
          id: "atb-1",
          nome: "Ceftriaxona",
          dose: "1g IV",
          frequenciaHoras: 12, // 2 doses / dia
          horarioPrimeiraDose: "08:00",
          dataInicio: anteontemIso,
          duracaoDias: 5,
          dosesPerdidas: 0,
          observacao: "Cobrir germes entéricos Gram negativos",
        },
        {
          id: "atb-2",
          nome: "Metronidazol",
          dose: "500mg IV",
          frequenciaHoras: 8, // 3 doses / dia
          horarioPrimeiraDose: "08:00",
          dataInicio: anteontemIso,
          duracaoDias: 5,
          dosesPerdidas: 1, // 1 dose perdida
          observacao: "Cobertura de anaeróbios",
        },
      ],
      pendencias: [
        "Monitorar débito do dreno tubular de aspiração",
        "Aguardar leucograma e PCR de 48h",
      ],
      sinaisVitais: {
        fc: 78,
        satO2: 98,
        pa: "120/75 mmHg",
        tax: 36.8,
      },
      conduta: "Manter ATB venoso combinado, progredir dieta branda se boa aceitação, retirar dreno se débito sero-hemático < 30ml/24h.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pass-2",
      nome: "Geraldo da Conceição Neto",
      leito: "Leito 09",
      enfermaria: "Cirurgia Geral 2",
      dataNascimento: "1960-01-28",
      dataAdmissao: "2026-09-08",
      hd: "PO 7 Drenagem de Abscesso Hepático Amebiano",
      antibioticos: [
        {
          id: "atb-3",
          nome: "Ciprofloxacino",
          dose: "400mg IV",
          frequenciaHoras: 12,
          horarioPrimeiraDose: "06:00",
          dataInicio: "2026-09-08",
          duracaoDias: 7, // Já completou 7 dias!
          dosesPerdidas: 0,
          observacao: "Tempo planejado completado",
        },
      ],
      pendencias: [
        "Reavaliação ultrassonográfica de controle",
        "Retirar acesso venoso se afebril por 48h",
      ],
      sinaisVitais: {
        fc: 70,
        satO2: 99,
        pa: "130/80 mmHg",
        tax: 36.5,
      },
      conduta: "Suspender antibioticoterapia venosa (atingiu meta de 7d com resolução clínica), iniciar transição para alta.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  ambulantes: AMBULATORIO_PADRAO,
  modelos: MODELOS_PADRAO,
  metricas: [
    {
      data: "2026-09-09",
      totalAdmissoes: 6,
      totalAltas: 5,
      totalCancelamentos: 0,
      totalCirurgias: 5,
    },
    {
      data: "2026-09-10",
      totalAdmissoes: 8,
      totalAltas: 7,
      totalCancelamentos: 1,
      totalCirurgias: 6,
    },
    {
      data: "2026-09-11",
      totalAdmissoes: 7,
      totalAltas: 6,
      totalCancelamentos: 0,
      totalCirurgias: 6,
    },
    {
      data: "2026-09-12",
      totalAdmissoes: 5,
      totalAltas: 4,
      totalCancelamentos: 0,
      totalCirurgias: 4,
    },
    {
      data: "2026-09-13",
      totalAdmissoes: 4,
      totalAltas: 4,
      totalCancelamentos: 0,
      totalCirurgias: 3,
    },
    {
      data: "2026-09-14",
      totalAdmissoes: 9,
      totalAltas: 8,
      totalCancelamentos: 1,
      totalCirurgias: 8,
    },
    {
      data: hojeIso,
      totalAdmissoes: 7,
      totalAltas: 6,
      totalCancelamentos: 0,
      totalCirurgias: 5,
    },
  ],
  lastSync: new Date().toISOString(),
};

class DatabaseManager {
  private state: DatabaseState;

  constructor() {
    this.ensureDirectory();
    this.state = this.load();
    this.executarExpurgoLGPD();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          ...INITIAL_STATE,
          ...parsed,
          ambulantes: parsed.ambulantes || AMBULATORIO_PADRAO,
          modelos: parsed.modelos || MODELOS_PADRAO,
        };
      }
    } catch (err) {
      console.error("[DatabaseManager] Erro ao carregar banco, usando padrão:", err);
    }
    this.save(INITIAL_STATE);
    return INITIAL_STATE;
  }

  private save(state: DatabaseState) {
    try {
      this.ensureDirectory();
      state.lastSync = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (err) {
      console.error("[DatabaseManager] Erro ao salvar banco:", err);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public updateState(updater: (prev: DatabaseState) => DatabaseState): DatabaseState {
    this.state = updater(this.state);
    this.save(this.state);
    return this.state;
  }

  /**
   * Rotina de Expurgo LGPD e Agregação Quantitativa:
   * - Admissões/Altas com data superior a 48h são expurgadas do detalhamento clínico
   * - Fotos de feridas operatórias (fotoFeridaUrl) e dados sensíveis são excluídos definitivamente
   * - Admissões e altas recentes permanecem intactas
   * - Métricas quantitativas diárias agregadas são consolidadas para alimentar gráficos de 7, 14 e 30 dias
   */
  public executarExpurgoLGPD(): { expurgadasAdmissoes: number; expurgadasAltas: number; expurgadasPermanencia: boolean } {
    const agora = new Date();
    let expurgadasAdmissoes = 0;
    let expurgadasAltas = 0;
    let expurgadasPermanencia = false;

    // Encontrar admissões a expurgar
    const admissoesParaExpurgo: AdmissaoPaciente[] = [];
    const admissoesAtivas: AdmissaoPaciente[] = [];

    for (const adm of this.state.admissoes) {
      if (deveExpurgarAdmissao(adm.dataAdmissaoAgendada, agora)) {
        admissoesParaExpurgo.push(adm);
        expurgadasAdmissoes++;
      } else {
        admissoesAtivas.push(adm);
      }
    }

    // Encontrar altas a expurgar (> 48h da data da alta)
    const altasParaExpurgo: AltaPaciente[] = [];
    const altasAtivas: AltaPaciente[] = [];

    for (const alta of this.state.altas) {
      if (deveExpurgarAlta(alta.dataAlta, agora)) {
        altasParaExpurgo.push(alta);
        expurgadasAltas++;
      } else {
        altasAtivas.push(alta);
      }
    }

    // Se houve admissões ou altas a expurgar, consolidar suas métricas anônimas
    if (admissoesParaExpurgo.length > 0 || altasParaExpurgo.length > 0) {
      const datasAgrupadas = Array.from(
        new Set([
          ...admissoesParaExpurgo.map((a) => a.dataAdmissaoAgendada),
          ...altasParaExpurgo.map((al) => al.dataAlta.split("T")[0]),
        ])
      );

      for (const d of datasAgrupadas) {
        const metricasDia = agregarMetricasDiarias(d, this.state.admissoes, this.state.altas);
        const idx = this.state.metricas.findIndex((m) => m.data === d);
        if (idx >= 0) {
          this.state.metricas[idx] = metricasDia;
        } else {
          this.state.metricas.push(metricasDia);
        }
      }
      this.state.admissoes = admissoesAtivas;
      this.state.altas = altasAtivas;
    }

    // Expurgo da permanência após 24h
    if (this.state.permanencia && deveExpurgarPermanencia(this.state.permanencia.data, agora)) {
      expurgadasPermanencia = true;
      this.state.permanencia = {
        id: `perm-${obterDataLocalHoje(agora)}`,
        data: obterDataLocalHoje(agora),
        equipe: { doutorandos: [], residentes: [], preceptores: [] },
        pendencias: [],
        createdAt: agora.toISOString(),
        updatedAt: agora.toISOString(),
      };
    }

    // Ordenar métricas por data
    this.state.metricas.sort((a, b) => a.data.localeCompare(b.data));

    if (expurgadasAdmissoes > 0 || expurgadasAltas > 0 || expurgadasPermanencia) {
      this.save(this.state);
      console.log(
        `[LGPD Expurgo] Concluído: ${expurgadasAdmissoes} admissão(ões) e ${expurgadasAltas} alta(s) arquivadas em métricas anônimas.`
      );
    }

    return { expurgadasAdmissoes, expurgadasAltas, expurgadasPermanencia };
  }
}

export const db = new DatabaseManager();
