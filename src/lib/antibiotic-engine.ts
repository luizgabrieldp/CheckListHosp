import { PrescricaoAntibiotico } from "@/types/hospital";
import { differenceInYears, differenceInMonths, differenceInDays } from "date-fns";

export interface ResultadoCalculoAntibiotico {
  dosesPorDia: number;
  dosesPassadasTeoricas: number;
  dosesEfetivas: number;
  diaAtualCalculado: number; // 0 para D0, 1 para D1, etc.
  rotuloDDay: string; // "D0", "D1", "D2"...
  progressoDosesDia: { atuais: number; necessarias: number };
  dataTerminoPrevista: Date;
  dataTerminoFormatada: string;
  statusAlerta: 'EM_CURSO' | 'DESESCALONAR';
  mensagemStatus: string;
  totalDosesPlanejadas: number;
}

/**
 * Motor de Cálculo de D-Day de Antibióticos:
 * - 1 dia completo (D1, D2...) só é computado após o cumprimento das 24h equivalentes
 *   ao número de doses necessárias (ex: se 8/8h, precisa de 3 doses para fechar D1; antes disso é D0).
 * - Doses perdidas são subtraídas das doses efetivas.
 * - Calcula a data final prevista considerando reposição ou término das doses.
 * - Alerta para 'Desescalonar / Reavaliar Antibiótico' quando a data atual atingir ou passar da data final.
 */
export function calcularDDayAntibiotico(
  atb: PrescricaoAntibiotico,
  agora: Date = new Date()
): ResultadoCalculoAntibiotico {
  const frequencia = atb.frequenciaHoras > 0 ? atb.frequenciaHoras : 24;
  const dosesPorDia = Math.max(1, Math.floor(24 / frequencia));
  const totalDosesPlanejadas = atb.duracaoDias * dosesPorDia;

  // Montar data e hora da primeira dose
  const [hora, minuto] = (atb.horarioPrimeiraDose || "12:00").split(":").map((v) => parseInt(v, 10) || 0);
  const [ano, mes, dia] = (atb.dataInicio || new Date().toISOString().split("T")[0])
    .split("-")
    .map((v) => parseInt(v, 10));

  const primeiraDose = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);

  let dosesPassadasTeoricas = 0;
  if (agora.getTime() >= primeiraDose.getTime()) {
    const diffHoras = (agora.getTime() - primeiraDose.getTime()) / (1000 * 60 * 60);
    // 1ª dose já foi tomada no instante t0, a cada 'frequencia' horas mais uma é tomada
    dosesPassadasTeoricas = 1 + Math.floor(diffHoras / frequencia);
  }

  // Descontar doses perdidas
  const dosesPerdidas = Math.max(0, atb.dosesPerdidas || 0);
  const dosesEfetivas = Math.max(0, dosesPassadasTeoricas - dosesPerdidas);

  // Regra de Contagem de Dias: 1 dia completo só após o cumprimento das 24h equivalentes
  // Ex: se 8/8h (3 doses/dia): 0, 1 ou 2 doses = D0. Ao fechar 3 doses = D1. Ao fechar 6 doses = D2.
  const diaAtualCalculado = Math.floor(dosesEfetivas / dosesPorDia);
  const rotuloDDay = `D${diaAtualCalculado}`;
  const progressoDosesDia = {
    atuais: dosesEfetivas % dosesPorDia,
    necessarias: dosesPorDia,
  };

  // Cálculo da data de término prevista (última dose planejada + compensação de perdidas)
  const dosesTotaisComPerdidas = totalDosesPlanejadas + dosesPerdidas;
  const horasTotaisAteUltimaDose = Math.max(0, (dosesTotaisComPerdidas - 1) * frequencia);
  const dataTerminoPrevista = new Date(primeiraDose.getTime() + horasTotaisAteUltimaDose * 60 * 60 * 1000);

  const diaTermino = String(dataTerminoPrevista.getDate()).padStart(2, "0");
  const mesTermino = String(dataTerminoPrevista.getMonth() + 1).padStart(2, "0");
  const anoTermino = dataTerminoPrevista.getFullYear();
  const horaTermino = String(dataTerminoPrevista.getHours()).padStart(2, "0");
  const minTermino = String(dataTerminoPrevista.getMinutes()).padStart(2, "0");
  const dataTerminoFormatada = `${diaTermino}/${mesTermino}/${anoTermino} ${horaTermino}:${minTermino}`;

  // Alerta de Status
  const prazoExcedido = agora.getTime() >= dataTerminoPrevista.getTime() || diaAtualCalculado >= atb.duracaoDias;
  const statusAlerta: 'EM_CURSO' | 'DESESCALONAR' = prazoExcedido ? 'DESESCALONAR' : 'EM_CURSO';
  const mensagemStatus = prazoExcedido
    ? "Desescalonar / Reavaliar Antibiótico"
    : `Em curso (${rotuloDDay}/${atb.duracaoDias}d)`;

  return {
    dosesPorDia,
    dosesPassadasTeoricas,
    dosesEfetivas,
    diaAtualCalculado,
    rotuloDDay,
    progressoDosesDia,
    dataTerminoPrevista,
    dataTerminoFormatada,
    statusAlerta,
    mensagemStatus,
    totalDosesPlanejadas,
  };
}

/**
 * Cálculo automático de idade a partir da Data de Nascimento
 */
export function calcularIdade(dataNascimentoStr?: string, agora: Date = new Date()): string {
  if (!dataNascimentoStr) return "-";
  try {
    const [ano, mes, dia] = dataNascimentoStr.split("-").map((v) => parseInt(v, 10));
    const dtNasc = new Date(ano, mes - 1, dia);
    if (isNaN(dtNasc.getTime())) return "-";

    const anos = differenceInYears(agora, dtNasc);
    if (anos >= 1) {
      return `${anos} anos`;
    }
    const meses = differenceInMonths(agora, dtNasc);
    return `${meses} meses`;
  } catch {
    return "-";
  }
}

/**
 * Cálculo automático do tempo de internação ("D1", "D2"...) a partir da Data de Admissão
 */
export function calcularTempoInternacao(dataAdmissaoStr?: string, agora: Date = new Date()): string {
  if (!dataAdmissaoStr) return "D1";
  try {
    const [ano, mes, dia] = dataAdmissaoStr.split("-").map((v) => parseInt(v, 10));
    const dtAdm = new Date(ano, mes - 1, dia, 0, 0, 0);
    if (isNaN(dtAdm.getTime())) return "D1";

    const dias = differenceInDays(agora, dtAdm);
    // No mesmo dia da admissão é D1 de internação
    const dDay = Math.max(1, dias + 1);
    return `D${dDay}`;
  } catch {
    return "D1";
  }
}
