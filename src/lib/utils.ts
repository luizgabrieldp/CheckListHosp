import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarDataBR(dataStr?: string): string {
  if (!dataStr) return "-";
  try {
    const parts = dataStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dataStr;
  } catch {
    return dataStr;
  }
}

/**
 * Retorna a data no formato YYYY-MM-DD respeitando o fuso horário local do dispositivo
 * Evita o bug de toISOString() que pula para o dia seguinte a partir das 21:00 no Brasil (UTC-3)
 */
export function obterDataLocalHoje(d: Date = new Date()): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
