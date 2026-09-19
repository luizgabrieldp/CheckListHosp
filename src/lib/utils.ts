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

/**
 * Nível de progresso no fluxo de admissão:
 * 0: Não Chegou (pendente de entrada - prioridade no topo da lista)
 * 1: Chegou (na unidade)
 * 2: Internou (no leito)
 * 3: AIH Pronta (aguardando cirurgia)
 * 4: Alta/ADM Concluída (finalizado - base da lista)
 */
export function obterNivelProgressoAdmissao(p: {
  status?: string;
  chegou?: boolean;
  internou?: boolean;
  aih?: boolean;
  altaAdm?: boolean;
}): number {
  if (p.status === "Alta/ADM" || p.altaAdm) return 4;
  if (p.status === "AIH" || p.aih) return 3;
  if (p.status === "Internou" || p.internou) return 2;
  if (p.status === "Chegou" || p.chegou) return 1;
  return 0;
}

/**
 * Funil cumulativo clínico:
 * Uma etapa posterior implica que as etapas anteriores já foram cumpridas.
 */
export function atingiuEtapaAdmissao(
  p: {
    status?: string;
    chegou?: boolean;
    internou?: boolean;
    aih?: boolean;
    altaAdm?: boolean;
  },
  etapa: "chegou" | "internou" | "aih" | "altaAdm"
): boolean {
  const nivel = obterNivelProgressoAdmissao(p);
  switch (etapa) {
    case "chegou":
      return nivel >= 1;
    case "internou":
      return nivel >= 2;
    case "aih":
      return nivel >= 3;
    case "altaAdm":
      return nivel >= 4;
    default:
      return false;
  }
}
