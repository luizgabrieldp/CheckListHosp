export type StatusAdmissao = 'Aguardando' | 'Chegou' | 'Internou' | 'AIH' | 'Alta/ADM';

export interface AntecedentesClinicos {
  alergias: string;
  comorbidades: string;
  cirurgiasPrevias: string;
  habitos: string;
  hfMotx: string;
  muc: string; // Medicamentos de Uso Contínuo
}

export interface HistoricoClinico {
  hd: string; // Hipótese Diagnóstica
  hda: string; // História da Doença Atual
  antecedentes: AntecedentesClinicos;
  exameFisico: string;
  examesComplementares: string;
  conduta: string;
}

export interface AdmissaoPaciente {
  id: string;
  nome: string;
  enfermaria: string;
  leito?: string;
  dataAdmissaoAgendada: string; // YYYY-MM-DD
  dataNascimento?: string; // YYYY-MM-DD
  status: StatusAdmissao;
  // Status progressivos com emojis para o modelo WhatsApp e UI Base44:
  chegou?: boolean; // 🏥 Chegou
  internou?: boolean; // 🛏️ Internou
  aih?: boolean; // ✅ AIH pronta
  altaAdm?: boolean; // 🟦 Alta e ADM prontas
  cancelada: boolean;
  historiaFinalizada: boolean;
  anotacoesHistoria?: string; // Campo unificado de história clínica
  historicoClinico?: HistoricoClinico;
  ordemImpressao?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParametrosAlta {
  dieta: boolean;
  deambulou: boolean;
  diurese: boolean;
  evacuacao: boolean;
}

export interface SinaisVitaisAlta {
  frequenciaCardiaca: number; // bpm
  saturacaoO2: number; // %
  pressaoArterial?: string;
  temperatura?: number;
}

export interface AltaPaciente {
  id: string;
  leito: string;
  enfermaria: string;
  nomePaciente: string;
  tipoCirurgia: string; // PO
  temQueixas: boolean;
  detalhesQueixas?: string;
  parametros: ParametrosAlta;
  sinaisVitais: SinaisVitaisAlta;
  fotoFeridaUrl?: string; // Base64 ou URL WebP
  dataAlta: string;
  createdAt: string;
  updatedAt: string;
}

export type StatusPendencia = 'Pendente' | 'Em Realização' | 'Feito';
export type PrioridadePendencia = 'Normal' | 'Urgente';

export interface Pendencia {
  id: string;
  data?: string; // Data YYYY-MM-DD de referência da pendência
  titulo: string;
  responsavel?: string; // Mantido para retrocompatibilidade
  responsaveis?: string[]; // Múltiplos responsáveis pela tarefa
  status: StatusPendencia;
  prioridade: PrioridadePendencia;
  leito?: string; // Apenas número
  enfermaria?: string; // Enfermaria vinculada às configurações
  notaInterna?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipePlantao {
  doutorandos: string[];
  residentes: string[];
  preceptores: string[];
}

export interface DadosPermanencia {
  id: string;
  data: string; // YYYY-MM-DD
  equipe: EquipePlantao;
  pendencias: Pendencia[];
  createdAt: string;
  updatedAt: string;
}

export interface PrescricaoAntibiotico {
  id: string;
  nome: string;
  dose: string;
  frequenciaHoras: number; // ex: 8 para 8/8h
  horarioPrimeiraDose: string; // "14:00"
  dataInicio: string; // YYYY-MM-DD
  duracaoDias: number;
  dosesPerdidas: number;
  observacao?: string;
}

export interface CirurgiaProcedimento {
  id: string;
  tipoCirurgia: string; // ex: Colecistectomia VLP, Laparotomia exploradora
  dataCirurgia: string; // YYYY-MM-DD
  dpoManual?: number; // Ajuste manual opcional de DPO
}

export interface PacientePassagem {
  id: string;
  nome: string;
  leito: string;
  enfermaria: string;
  dataNascimento?: string;
  dataAdmissao: string;
  motivoInternamento?: string; // Motivo do internamento em destaque
  isCirurgico?: boolean;
  cirurgias?: CirurgiaProcedimento[]; // Múltiplas cirurgias / reoperações
  dataCirurgia?: string; // YYYY-MM-DD (legado)
  tipoCirurgia?: string; // ex: Colecistectomia (legado)
  dpoManual?: number; // Ajuste manual opcional de DPO (legado)
  temAlergia?: boolean;
  descricaoAlergia?: string;
  precaucaoContato?: boolean;
  hd: string;
  hda?: string;
  evolucao?: string;
  examesRealizados?: string;
  medicacoesUsoGeral?: string; // Texto livre para anotação geral de medicações
  antibioticos: PrescricaoAntibiotico[];
  pendencias: string[];
  sinaisVitais?: {
    fc?: number;
    satO2?: number;
    pa?: string;
    tax?: number;
  };
  conduta: string;
  createdAt: string;
  updatedAt: string;
}

export type DiaSemana = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta';
export type TurnoAmbulatorio = 'Manhã' | 'Tarde';

export interface HorarioMedico {
  dia: DiaSemana;
  turno: TurnoAmbulatorio;
}

export interface MedicoAmbulatorio {
  id: string;
  nome: string;
  especialidade?: string;
  sala?: string;
  horarios: HorarioMedico[];
}

export type CategoriaModelo =
  | 'Encaminhamento'
  | 'Alta'
  | 'ADM'
  | 'Evolução'
  | 'Orientações Gerais'
  | 'Orientações de Alta'
  | 'Receituário'
  | (string & {});

export interface ModeloTexto {
  id: string;
  titulo: string;
  categoria: CategoriaModelo;
  conteudo: string;
  createdAt: string;
}

export interface MetricasHistoricasDiarias {
  data: string; // YYYY-MM-DD
  totalAdmissoes: number;
  totalAltas: number;
  totalCancelamentos: number;
  totalCirurgias: number;
}

export interface DatabaseState {
  admissoes: AdmissaoPaciente[];
  altas: AltaPaciente[];
  permanencia: DadosPermanencia;
  passagem: PacientePassagem[];
  ambulantes: MedicoAmbulatorio[];
  modelos: ModeloTexto[];
  metricas: MetricasHistoricasDiarias[];
  lastSync: string;
}

export interface WebSocketMessage {
  type:
    | 'INIT'
    | 'SYNC_STATE'
    | 'UPDATE_ADMISSOES'
    | 'UPDATE_ALTAS'
    | 'UPDATE_PERMANENCIA'
    | 'UPDATE_PASSAGEM'
    | 'UPDATE_AMBULATORIO'
    | 'UPDATE_MODELOS'
    | 'PING'
    | 'PONG';
  payload?: any;
  timestamp: number;
  senderId?: string;
}
