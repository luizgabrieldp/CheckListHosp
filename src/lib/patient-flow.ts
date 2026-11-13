import {
  AdmissaoPaciente,
  AltaPaciente,
  ModeloTexto,
  PacientePassagem,
  Pendencia,
} from "@/types/hospital";
import { calcularDDayAntibiotico, obterCirurgiasPaciente } from "@/lib/antibiotic-engine";
import { obterDataLocalHoje } from "@/lib/utils";

function extrairAlergiaDeAdmissao(textoAlergia?: string): {
  temAlergia: boolean;
  descricaoAlergia?: string;
} {
  const limpo = textoAlergia?.trim();
  if (!limpo) return { temAlergia: false };

  const normalizado = limpo.toLowerCase();
  const semAlergiaPadroes = [
    "nega",
    "negado",
    "sem alergia",
    "sem alergias",
    "nenhuma",
    "ndn",
    "não",
    "nao",
    "nkda",
  ];
  if (semAlergiaPadroes.some((p) => normalizado === p || normalizado.startsWith(`${p} `) || normalizado.startsWith(`${p}.`))) {
    return { temAlergia: false };
  }

  return { temAlergia: true, descricaoAlergia: limpo };
}

export function converterAdmissaoParaPassagem(
  admissao: AdmissaoPaciente,
  existente?: PacientePassagem,
  agora: Date = new Date()
): PacientePassagem {
  const nowIso = agora.toISOString();
  const hoje = obterDataLocalHoje(agora);
  const alergia = extrairAlergiaDeAdmissao(admissao.historicoClinico?.antecedentes?.alergias);
  const hd = admissao.historicoClinico?.hd?.trim() || existente?.hd || "";
  const hda =
    admissao.historicoClinico?.hda?.trim() ||
    admissao.anotacoesHistoria?.trim() ||
    existente?.hda ||
    "";
  const conduta = admissao.historicoClinico?.conduta?.trim() || existente?.conduta || "";
  const muc = admissao.historicoClinico?.antecedentes?.muc?.trim() || existente?.medicacoesUsoGeral || "";

  if (existente) {
    return {
      ...existente,
      nome: admissao.nome || existente.nome,
      leito: admissao.leito?.trim() || existente.leito,
      enfermaria: admissao.enfermaria || existente.enfermaria,
      dataNascimento: admissao.dataNascimento || existente.dataNascimento,
      dataAdmissao: admissao.dataAdmissaoAgendada || existente.dataAdmissao || hoje,
      hd,
      hda,
      conduta,
      medicacoesUsoGeral: muc,
      temAlergia: existente.temAlergia || alergia.temAlergia,
      descricaoAlergia: existente.descricaoAlergia || alergia.descricaoAlergia,
      updatedAt: nowIso,
    };
  }

  return {
    id: `pass-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nome: admissao.nome,
    leito: admissao.leito?.trim() || "",
    enfermaria: admissao.enfermaria || "",
    dataNascimento: admissao.dataNascimento,
    dataAdmissao: admissao.dataAdmissaoAgendada || hoje,
    motivoInternamento: hd || undefined,
    isCirurgico: true,
    cirurgias: [],
    temAlergia: alergia.temAlergia,
    descricaoAlergia: alergia.descricaoAlergia,
    precaucaoContato: false,
    hd,
    hda,
    evolucao: "",
    examesRealizados: admissao.historicoClinico?.examesComplementares?.trim() || "",
    medicacoesUsoGeral: muc,
    antibioticos: [],
    pendencias: [],
    conduta,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function converterPassagemParaAlta(
  paciente: PacientePassagem,
  agora: Date = new Date()
): AltaPaciente {
  const nowIso = agora.toISOString();
  const hoje = obterDataLocalHoje(agora);
  const cirurgias = obterCirurgiasPaciente(paciente);
  const tipoCirurgia =
    cirurgias.length > 0
      ? cirurgias.map((c) => c.tipoCirurgia).filter(Boolean).join(" + ")
      : paciente.tipoCirurgia?.trim() || paciente.hd?.trim() || "";

  const resumoClinico = [paciente.evolucao?.trim(), paciente.conduta?.trim()]
    .filter(Boolean)
    .join(" | ");

  return {
    id: `alta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    leito: paciente.leito || undefined,
    enfermaria: paciente.enfermaria || "",
    nomePaciente: paciente.nome,
    tipoCirurgia,
    temQueixas: false,
    detalhesQueixas: resumoClinico || undefined,
    parametros: {
      dieta: true,
      deambulou: true,
      diurese: true,
      evacuacao: false,
    },
    sinaisVitais: paciente.sinaisVitais
      ? {
          frequenciaCardiaca: paciente.sinaisVitais.fc,
          saturacaoO2: paciente.sinaisVitais.satO2,
          pressaoArterial: paciente.sinaisVitais.pa,
          temperatura: paciente.sinaisVitais.tax,
        }
      : undefined,
    dataAlta: hoje,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

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
