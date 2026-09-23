import { AdmissaoPaciente, AltaPaciente, DadosPermanencia, MetricasHistoricasDiarias } from "@/types/hospital";

/**
 * Anonimização LGPD para cabeçalhos e cartões clínicos:
 * Mantém visíveis apenas o 1º e 2º nome; substitui do 3º nome em diante por "xxxxx".
 * Exemplo: "João Carlos Silva Santos" -> "João Carlos xxxxx xxxxx"
 */
export function anonimizarNome(nomeCompleto: string): string {
  if (!nomeCompleto) return "";
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length <= 2) {
    return nomeCompleto;
  }
  const visiveis = partes.slice(0, 2);
  const mascarados = partes.slice(2).map(() => "xxxxx");
  return [...visiveis, ...mascarados].join(" ");
}

/**
 * Regra Crítica de Expurgo LGPD:
 * O prazo de 48 horas NÃO deve ser contado a partir do momento de criação no banco,
 * mas sim A PARTIR DA DATA AGENDADA DA ADMISSÃO do paciente.
 * 
 * Retorna true se a admissão já expirou (dataAgendada + 48h < agora)
 */
export function deveExpurgarAdmissao(dataAgendadaStr: string, agora: Date = new Date()): boolean {
  if (!dataAgendadaStr) return false;
  try {
    // Normalizar a data agendada para meia-noite do dia no timezone local
    const partes = dataAgendadaStr.split("T")[0].split("-");
    if (partes.length !== 3) return false;
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);
    
    // Fim do dia agendado (23:59:59)
    const dataAgendadaFim = new Date(ano, mes, dia, 23, 59, 59);
    
    // 48 horas após a data agendada
    const limiteExpurgo = new Date(dataAgendadaFim.getTime() + 48 * 60 * 60 * 1000);
    
    return agora.getTime() > limiteExpurgo.getTime();
  } catch {
    return false;
  }
}

/**
 * Expurgo de Alta: 48 horas após a data da alta do paciente.
 * Exclui prontuário, desfechos clínicos e apaga definitivamente fotos de feridas operatórias
 * (fotoFeridaUrl) para cumprir a LGPD e liberar armazenamento do dispositivo.
 * Retorna true se a alta já expirou (dataAlta + 48h < agora).
 */
export function deveExpurgarAlta(dataAltaStr: string, agora: Date = new Date()): boolean {
  if (!dataAltaStr) return false;
  try {
    const partes = dataAltaStr.split("T")[0].split("-");
    if (partes.length !== 3) return false;
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    // Fim do dia da alta (23:59:59)
    const dataAltaFim = new Date(ano, mes, dia, 23, 59, 59);

    // 48 horas após a data da alta
    const limiteExpurgo = new Date(dataAltaFim.getTime() + 48 * 60 * 60 * 1000);

    return agora.getTime() > limiteExpurgo.getTime();
  } catch {
    return false;
  }
}

/**
 * Expurgo de Permanência: 48 horas (2 dias) após a data do round
 */
export function deveExpurgarPermanencia(dataRoundStr: string, agora: Date = new Date()): boolean {
  if (!dataRoundStr) return false;
  try {
    const partes = dataRoundStr.split("T")[0].split("-");
    if (partes.length !== 3) return false;
    const dataRoundFim = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10), 23, 59, 59);
    const limite = new Date(dataRoundFim.getTime() + 48 * 60 * 60 * 1000);
    return agora.getTime() > limite.getTime();
  } catch {
    return false;
  }
}

/**
 * Agregação diária para métricas antes de expurgo
 */
export function agregarMetricasDiarias(
  dataStr: string,
  admissoes: AdmissaoPaciente[],
  altas: AltaPaciente[]
): MetricasHistoricasDiarias {
  const diaAdmissoes = admissoes.filter((a) => a.dataAdmissaoAgendada.startsWith(dataStr));
  const canceladas = diaAdmissoes.filter((a) => a.cancelada).length;
  const ativas = diaAdmissoes.filter((a) => !a.cancelada).length;
  const diaAltas = altas.filter((al) => al.dataAlta.startsWith(dataStr)).length;
  const cirurgias = altas.filter((al) => al.dataAlta.startsWith(dataStr) && al.tipoCirurgia).length;

  return {
    data: dataStr,
    totalAdmissoes: ativas,
    totalAltas: diaAltas,
    totalCancelamentos: canceladas,
    totalCirurgias: cirurgias,
  };
}

export interface ResultadoExpurgoAutomatico {
  houveExpurgo: boolean;
  expurgadasAdmissoes: number;
  expurgadasAltas: number;
  expurgadasPermanencia: boolean;
  novasAdmissoes: AdmissaoPaciente[];
  novasAltas: AltaPaciente[];
  novaPermanencia: DadosPermanencia;
  metricasAtualizadas: MetricasHistoricasDiarias[];
  altasIdsParaRemoverFotos: string[];
}

/**
 * Executa a rotina completa de expurgo automático e consolidação estatística LGPD
 * Regra: Dados expurgados 48h (2 dias) após a data do evento (23:59:59 + 48h).
 */
export function executarExpurgoAutomaticoCliente(
  estado: {
    admissoes: AdmissaoPaciente[];
    altas: AltaPaciente[];
    permanencia: DadosPermanencia;
    metricas: MetricasHistoricasDiarias[];
  },
  agora: Date = new Date(),
  gerarDataHoje: () => string = () => new Date().toISOString().split("T")[0]
): ResultadoExpurgoAutomatico {
  const admissoesParaExpurgo: AdmissaoPaciente[] = [];
  const novasAdmissoes: AdmissaoPaciente[] = [];

  for (const adm of estado.admissoes) {
    if (deveExpurgarAdmissao(adm.dataAdmissaoAgendada, agora)) {
      admissoesParaExpurgo.push(adm);
    } else {
      novasAdmissoes.push(adm);
    }
  }

  const altasParaExpurgo: AltaPaciente[] = [];
  const novasAltas: AltaPaciente[] = [];

  for (const alta of estado.altas) {
    if (deveExpurgarAlta(alta.dataAlta, agora)) {
      altasParaExpurgo.push(alta);
    } else {
      novasAltas.push(alta);
    }
  }

  const expurgadasPermanencia = Boolean(
    estado.permanencia && deveExpurgarPermanencia(estado.permanencia.data, agora)
  );

  let novaPermanencia = estado.permanencia;
  if (expurgadasPermanencia) {
    novaPermanencia = {
      id: `perm-${Date.now()}`,
      data: gerarDataHoje(),
      equipe: { doutorandos: [], residentes: [], preceptores: [] },
      pendencias: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const houveExpurgo =
    admissoesParaExpurgo.length > 0 ||
    altasParaExpurgo.length > 0 ||
    expurgadasPermanencia;

  let metricasAtualizadas = [...estado.metricas];

  // Se houve admissões ou altas a expurgar, consolidar totais anônimos nas métricas diárias
  if (admissoesParaExpurgo.length > 0 || altasParaExpurgo.length > 0) {
    const datasAfetadas = Array.from(
      new Set([
        ...admissoesParaExpurgo.map((a) => a.dataAdmissaoAgendada.split("T")[0]),
        ...altasParaExpurgo.map((al) => al.dataAlta.split("T")[0]),
      ])
    );

    for (const dataStr of datasAfetadas) {
      const metricasDia = agregarMetricasDiarias(dataStr, estado.admissoes, estado.altas);
      const idxExistente = metricasAtualizadas.findIndex((m) => m.data === dataStr);
      if (idxExistente >= 0) {
        metricasAtualizadas[idxExistente] = {
          ...metricasAtualizadas[idxExistente],
          totalAdmissoes: Math.max(metricasAtualizadas[idxExistente].totalAdmissoes, metricasDia.totalAdmissoes),
          totalAltas: Math.max(metricasAtualizadas[idxExistente].totalAltas, metricasDia.totalAltas),
          totalCancelamentos: Math.max(metricasAtualizadas[idxExistente].totalCancelamentos, metricasDia.totalCancelamentos),
          totalCirurgias: Math.max(metricasAtualizadas[idxExistente].totalCirurgias, metricasDia.totalCirurgias),
        };
      } else {
        metricasAtualizadas.push(metricasDia);
      }
    }

    metricasAtualizadas.sort((a, b) => a.data.localeCompare(b.data));
  }

  const altasIdsParaRemoverFotos = altasParaExpurgo.map((a) => a.id);

  return {
    houveExpurgo,
    expurgadasAdmissoes: admissoesParaExpurgo.length,
    expurgadasAltas: altasParaExpurgo.length,
    expurgadasPermanencia,
    novasAdmissoes,
    novasAltas,
    novaPermanencia,
    metricasAtualizadas,
    altasIdsParaRemoverFotos,
  };
}
