import {
  AdmissaoPaciente,
  AltaPaciente,
  ModeloTexto,
  PacientePassagem,
  Pendencia,
} from "@/types/hospital";
import { calcularDDayAntibiotico } from "@/lib/antibiotic-engine";

export function isPacienteCriticoPassagem(
  paciente: PacientePassagem,
  pendenciasPermanencia: Pendencia[] = [],
  agora: Date = new Date()
): boolean {
  if (paciente.temAlergia || paciente.precaucaoContato) {
    return true;
  }

  if (paciente.antibioticos && paciente.antibioticos.length > 0) {
    const temAtbCritico = paciente.antibioticos.some((atb) => {
      const calc = calcularDDayAntibiotico(atb, agora);
      if (calc.statusAlerta === "DESESCALONAR") return true;
      const msRestantes = calc.dataTerminoPrevista.getTime() - agora.getTime();
      return msRestantes <= 24 * 60 * 60 * 1000;
    });
    if (temAtbCritico) return true;
  }

  const leitoPaciente = paciente.leito?.trim().toLowerCase();
  const enfPaciente = paciente.enfermaria?.trim().toLowerCase();

  if (leitoPaciente && pendenciasPermanencia.length > 0) {
    const temPendenciaUrgente = pendenciasPermanencia.some((p) => {
      if (p.prioridade !== "Urgente" || p.status === "Feito") return false;
      const leitoPend = p.leito?.trim().toLowerCase();
      if (!leitoPend || leitoPend !== leitoPaciente) return false;
      const enfPend = p.enfermaria?.trim().toLowerCase();
      if (enfPend && enfPaciente && enfPend !== enfPaciente) return false;
      return true;
    });
    if (temPendenciaUrgente) return true;
  }

  return false;
}

export type TabBuscaGlobal = "admissoes" | "passagem" | "altas" | "permanencia" | "modelos";

export interface ResultadoBuscaGlobal {
  id: string;
  tab: TabBuscaGlobal;
  categoriaLabel: string;
  titulo: string;
  subtitulo: string;
  badge?: string;
}

function normalizarTextoBusca(str?: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buscarGlobal(
  termo: string,
  dados: {
    admissoes: AdmissaoPaciente[];
    passagem: PacientePassagem[];
    altas: AltaPaciente[];
    pendencias: Pendencia[];
    modelos: ModeloTexto[];
  }
): ResultadoBuscaGlobal[] {
  const q = normalizarTextoBusca(termo.trim());
  if (!q) return [];

  const resultados: ResultadoBuscaGlobal[] = [];

  for (const p of dados.passagem) {
    const texto = normalizarTextoBusca(
      `${p.nome} ${p.leito} ${p.enfermaria} ${p.hd} ${p.tipoCirurgia || ""} ${(p.cirurgias || []).map((c) => c.tipoCirurgia).join(" ")}`
    );
    if (texto.includes(q)) {
      resultados.push({
        id: `pass-${p.id}`,
        tab: "passagem",
        categoriaLabel: "Passagem",
        titulo: p.nome,
        subtitulo: [p.enfermaria, p.leito ? `Leito ${p.leito}` : "", p.hd].filter(Boolean).join(" · "),
        badge: p.temAlergia ? "Alergia" : p.precaucaoContato ? "Precaução" : undefined,
      });
    }
  }

  for (const a of dados.admissoes) {
    const texto = normalizarTextoBusca(
      `${a.nome} ${a.leito || ""} ${a.enfermaria} ${a.historicoClinico?.hd || ""} ${a.status}`
    );
    if (texto.includes(q)) {
      resultados.push({
        id: `adm-${a.id}`,
        tab: "admissoes",
        categoriaLabel: "Admissões",
        titulo: a.nome,
        subtitulo: [a.enfermaria, a.leito ? `Leito ${a.leito}` : "", a.dataAdmissaoAgendada].filter(Boolean).join(" · "),
        badge: a.cancelada ? "Cancelada" : a.status,
      });
    }
  }

  for (const al of dados.altas) {
    const texto = normalizarTextoBusca(
      `${al.nomePaciente} ${al.leito || ""} ${al.enfermaria} ${al.tipoCirurgia}`
    );
    if (texto.includes(q)) {
      resultados.push({
        id: `alta-${al.id}`,
        tab: "altas",
        categoriaLabel: "Altas",
        titulo: al.nomePaciente,
        subtitulo: [al.enfermaria, al.leito ? `Leito ${al.leito}` : "", al.tipoCirurgia].filter(Boolean).join(" · "),
        badge: al.dataAlta,
      });
    }
  }

  for (const pend of dados.pendencias) {
    const texto = normalizarTextoBusca(
      `${pend.titulo} ${pend.leito || ""} ${pend.enfermaria || ""} ${pend.responsavel || ""} ${(pend.responsaveis || []).join(" ")} ${pend.notaInterna || ""}`
    );
    if (texto.includes(q)) {
      resultados.push({
        id: `pend-${pend.id}`,
        tab: "permanencia",
        categoriaLabel: "Permanência",
        titulo: pend.titulo,
        subtitulo: [pend.enfermaria, pend.leito ? `Leito ${pend.leito}` : "", pend.responsavel || (pend.responsaveis || []).join(", ")].filter(Boolean).join(" · "),
        badge: pend.prioridade === "Urgente" ? "Urgente" : pend.status,
      });
    }
  }

  for (const mod of dados.modelos) {
    const texto = normalizarTextoBusca(`${mod.titulo} ${mod.categoria} ${mod.conteudo}`);
    if (texto.includes(q)) {
      resultados.push({
        id: `mod-${mod.id}`,
        tab: "modelos",
        categoriaLabel: "Modelos",
        titulo: mod.titulo,
        subtitulo: mod.categoria,
      });
    }
  }

  return resultados.slice(0, 30);
}
