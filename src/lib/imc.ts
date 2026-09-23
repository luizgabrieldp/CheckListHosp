import { RegistroAntropometria, ControleAntropometrico } from "@/types/hospital";

/**
 * Normaliza a altura informada pelo usuário (suporta metros '1,70', '1.70' ou centímetros '170').
 * Sempre retorna a altura em metros com 2 casas decimais (ex: 1.70).
 */
export function normalizarAltura(valor: string | number): number {
  if (typeof valor === "number") {
    if (valor <= 0) return 0;
    // Se for > 3, assume-se que foi digitado em centímetros (ex: 170cm = 1.70m)
    return valor > 3 ? Math.round((valor / 100) * 100) / 100 : Math.round(valor * 100) / 100;
  }
  const limpo = String(valor).trim().replace(",", ".");
  const num = parseFloat(limpo);
  if (isNaN(num) || num <= 0) return 0;
  return num > 3 ? Math.round((num / 100) * 100) / 100 : Math.round(num * 100) / 100;
}

/**
 * Normaliza o peso informado (suporta vírgula ou ponto, ex: '112,5' -> 112.5).
 */
export function normalizarPeso(valor: string | number): number {
  if (typeof valor === "number") return valor > 0 ? Math.round(valor * 10) / 10 : 0;
  const limpo = String(valor).trim().replace(",", ".");
  const num = parseFloat(limpo);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 10) / 10;
}

/**
 * Calcula o Índice de Massa Corporal (IMC = peso / altura²).
 * Retorna arredondado para 1 casa decimal (ex: 38.9).
 */
export function calcularIMC(peso: number, alturaEmMetros: number): number {
  if (peso <= 0 || alturaEmMetros <= 0) return 0;
  const imc = peso / (alturaEmMetros * alturaEmMetros);
  return Math.round(imc * 10) / 10;
}

export interface ClassificacaoIMC {
  categoria: string;
  grau: number;
  corTexto: string;
  corBg: string;
  corBorda: string;
  corPontoSvg: string;
}

/**
 * Classificação do estado nutricional e graus de obesidade segundo a OMS.
 */
export function classificarIMC(imc: number): ClassificacaoIMC {
  if (imc <= 0) {
    return {
      categoria: "Não calculado",
      grau: 0,
      corTexto: "text-slate-600",
      corBg: "bg-slate-100",
      corBorda: "border-slate-200",
      corPontoSvg: "#94a3b8",
    };
  }
  if (imc < 18.5) {
    return {
      categoria: "Abaixo do peso",
      grau: 0,
      corTexto: "text-amber-700",
      corBg: "bg-amber-50",
      corBorda: "border-amber-200",
      corPontoSvg: "#f59e0b",
    };
  }
  if (imc < 25.0) {
    return {
      categoria: "Eutrofia (Peso normal)",
      grau: 0,
      corTexto: "text-emerald-700",
      corBg: "bg-emerald-50",
      corBorda: "border-emerald-200",
      corPontoSvg: "#10b981",
    };
  }
  if (imc < 30.0) {
    return {
      categoria: "Sobrepeso",
      grau: 0,
      corTexto: "text-yellow-700",
      corBg: "bg-yellow-50",
      corBorda: "border-yellow-200",
      corPontoSvg: "#eab308",
    };
  }
  if (imc < 35.0) {
    return {
      categoria: "Obesidade Grau I",
      grau: 1,
      corTexto: "text-orange-700",
      corBg: "bg-orange-50",
      corBorda: "border-orange-200",
      corPontoSvg: "#f97316",
    };
  }
  if (imc < 40.0) {
    return {
      categoria: "Obesidade Grau II",
      grau: 2,
      corTexto: "text-rose-700",
      corBg: "bg-rose-50",
      corBorda: "border-rose-200",
      corPontoSvg: "#f43f5e",
    };
  }
  return {
    categoria: "Obesidade Grau III (Mórbida)",
    grau: 3,
    corTexto: "text-purple-800",
    corBg: "bg-purple-50",
    corBorda: "border-purple-300",
    corPontoSvg: "#9333ea",
  };
}

export interface VariacaoPeso {
  deltaKg: number;
  deltaImc: number;
  textoFormatado: string;
  tipo: "perda" | "ganho" | "estavel" | "unico";
}

/**
 * Ordena os registros cronologicamente (da data mais antiga para a mais recente).
 */
export function ordenarHistoricoCronologico(historico: RegistroAntropometria[]): RegistroAntropometria[] {
  return [...historico].sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Calcula a variação de peso e IMC em relação à primeira pesagem inicial do paciente.
 */
export function calcularVariacaoPeso(historico: RegistroAntropometria[]): VariacaoPeso {
  if (!historico || historico.length < 2) {
    return { deltaKg: 0, deltaImc: 0, textoFormatado: "Ponto inicial", tipo: "unico" };
  }

  const ordenado = ordenarHistoricoCronologico(historico);
  const primeiro = ordenado[0];
  const ultimo = ordenado[ordenado.length - 1];

  const deltaKg = Math.round((ultimo.peso - primeiro.peso) * 10) / 10;
  const deltaImc = Math.round((ultimo.imc - primeiro.imc) * 10) / 10;

  if (deltaKg < 0) {
    return {
      deltaKg,
      deltaImc,
      textoFormatado: `${deltaKg} kg (${Math.abs(deltaKg)} kg perdidos)`,
      tipo: "perda",
    };
  }
  if (deltaKg > 0) {
    return {
      deltaKg,
      deltaImc,
      textoFormatado: `+${deltaKg} kg (${deltaKg} kg ganhos)`,
      tipo: "ganho",
    };
  }
  return { deltaKg: 0, deltaImc: 0, textoFormatado: "0,0 kg (peso estável)", tipo: "estavel" };
}

/**
 * Obtém o registro antropométrico mais recente do paciente.
 */
export function obterUltimaAntropometria(
  antropometria?: ControleAntropometrico
): RegistroAntropometria | undefined {
  if (!antropometria || !antropometria.historico || antropometria.historico.length === 0) {
    return undefined;
  }
  const ordenado = ordenarHistoricoCronologico(antropometria.historico);
  return ordenado[ordenado.length - 1];
}
