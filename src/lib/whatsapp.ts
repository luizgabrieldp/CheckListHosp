import { AdmissaoPaciente, AltaPaciente } from "@/types/hospital";

/**
 * Coleta os emojis ativos de status do paciente na ordem:
 * 🏥 Chegou | 🛏️ Internou | ✅ AIH pronta | 🟦 Alta e ADM prontas
 */
export function obterEmojisStatusAdmissao(paciente: AdmissaoPaciente): string[] {
  const emojis: string[] = [];

  // Checar flags booleanas ou status compatível
  const chegou = paciente.chegou ?? ["Chegou", "Internou", "AIH", "Alta/ADM"].includes(paciente.status);
  const internou = paciente.internou ?? ["Internou", "AIH", "Alta/ADM"].includes(paciente.status);
  const aih = paciente.aih ?? ["AIH", "Alta/ADM"].includes(paciente.status);
  const altaAdm = paciente.altaAdm ?? paciente.status === "Alta/ADM";

  if (chegou) emojis.push("🏥");
  if (internou) emojis.push("🛏️");
  if (aih) emojis.push("✅");
  if (altaAdm) emojis.push("🟦");

  return emojis;
}

/**
 * Gerador de mensagem para o WhatsApp no modelo exato alinhado com o usuário:
 * 
 * Adms 15/09
 * • ANTONIO EUGENIO DA SILVA 🏥 🛏️ ✅ 🟦
 * • CLEIDE CREUZA DA SILVA SANTOS 🏥 🛏️ ✅ 🟦
 * • ...
 * 
 * 🏥 Chegou
 * 🛏️ Internou
 * ✅ AIH pronta
 * 🟦 Alta e ADM prontas
 * 
 * Editada HH:MM
 * 
 * REGRA MANDATÓRIA: Pacientes SEMPRE ordenados em ordem alfabética estrita (A a Z).
 */
export function gerarMensagemWhatsAppAdmissoes(
  admissoes: AdmissaoPaciente[],
  dataSelecionadaStr?: string
): string {
  const hoje = new Date();
  let diaMes = "";

  if (dataSelecionadaStr) {
    const parts = dataSelecionadaStr.split("T")[0].split("-");
    if (parts.length === 3) {
      diaMes = `${parts[2]}/${parts[1]}`;
    }
  }

  if (!diaMes) {
    const d = String(hoje.getDate()).padStart(2, "0");
    const m = String(hoje.getMonth() + 1).padStart(2, "0");
    diaMes = `${d}/${m}`;
  }

  // Filtrar apenas pacientes não cancelados
  const pacientesAtivos = admissoes.filter((p) => !p.cancelada);

  // Ordenação estritamente alfabética por nome
  const pacientesOrdenados = [...pacientesAtivos].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
  );

  let msg = `Adms ${diaMes}\n`;

  pacientesOrdenados.forEach((paciente) => {
    const emojis = obterEmojisStatusAdmissao(paciente);
    const emojisStr = emojis.length > 0 ? ` ${emojis.join(" ")}` : "";
    msg += `• ${paciente.nome.toUpperCase()}${emojisStr}\n`;
  });

  if (pacientesOrdenados.length === 0) {
    msg += `(Nenhum paciente cadastrado para esta data)\n`;
  }

  msg += `\n🏥 Chegou\n🛏️ Internou\n✅ AIH pronta\n🟦 Alta e ADM prontas\n`;

  const horas = String(hoje.getHours()).padStart(2, "0");
  const minutos = String(hoje.getMinutes()).padStart(2, "0");
  msg += `\nEditada ${horas}:${minutos}`;

  return msg.trim();
}

/**
 * Mensagem formatada individual para uma admissão
 */
export function gerarMensagemAdmissao(paciente: AdmissaoPaciente): string {
  return gerarMensagemWhatsAppAdmissoes([paciente], paciente.dataAdmissaoAgendada);
}

/**
 * Monta mensagem formatada em Markdown do WhatsApp para Alta Cirúrgica
 */
export function gerarMensagemAlta(alta: AltaPaciente): string {
  let msg = `🏥 *CHECKLIST HOSPITALAR - ALTA / EVOLUÇÃO PO* 🏥\n\n`;
  msg += `🛏️ *Leito:* ${alta.leito} | *Enfermaria:* ${alta.enfermaria}\n`;
  msg += `👤 *Paciente:* ${alta.nomePaciente}\n`;
  msg += `✂️ *Procedimento:* ${alta.tipoCirurgia || "Pós-Operatório"}\n\n`;

  msg += `📊 *Parâmetros de Recuperação:*\n`;
  msg += `• Dieta: ${alta.parametros.dieta ? "✅ Aceitou/Tolerou" : "❌ Em jejum / Não tolerou"}\n`;
  msg += `• Deambulação: ${alta.parametros.deambulou ? "✅ Deambulou" : "❌ Acamado"}\n`;
  msg += `• Diurese: ${alta.parametros.diurese ? "✅ Presente" : "⚠️ Ausente / Retenção"}\n`;
  msg += `• Evacuação: ${alta.parametros.evacuacao ? "✅ Presente" : "⚠️ Ausente"}\n\n`;

  msg += `💓 *Sinais Vitais:*\n`;
  msg += `• Frequência Cardíaca (FC): *${alta.sinaisVitais.frequenciaCardiaca || "-"} bpm*\n`;
  msg += `• Saturação de O2: *${alta.sinaisVitais.saturacaoO2 || "-"}%*\n\n`;

  if (alta.temQueixas) {
    msg += `⚠️ *Queixas Atuais:*\n${alta.detalhesQueixas || "Sem detalhes informados"}\n\n`;
  } else {
    msg += `✨ *Queixas:* Nega queixas álgicas ou intercorrências.\n\n`;
  }

  if (alta.fotoFeridaUrl) {
    msg += `📸 *Ferida Operatória:* Foto anexada para avaliação da equipe.\n\n`;
  }

  msg += `🔒 _Registro de fluxo da enfermaria cirúrgica._`;
  return msg.trim();
}

/**
 * Compartilha via Web Share API com fallback para Área de Transferência.
 */
export async function compartilharOuCopiar(
  texto: string,
  arquivoFoto?: File | null,
  titulo: string = "CheckList Hospitalar"
): Promise<{ compartilhado: boolean; copiado: boolean; mensagem: string }> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const shareData: ShareData = {
        title: titulo,
        text: texto,
      };

      if (arquivoFoto && navigator.canShare && navigator.canShare({ files: [arquivoFoto] })) {
        shareData.files = [arquivoFoto];
      }

      await navigator.share(shareData);
      return { compartilhado: true, copiado: false, mensagem: "Compartilhado com sucesso!" };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { compartilhado: false, copiado: false, mensagem: "Compartilhamento cancelado" };
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return {
        compartilhado: false,
        copiado: true,
        mensagem: "Mensagem copiada para a Área de Transferência!",
      };
    } catch {
      return {
        compartilhado: false,
        copiado: false,
        mensagem: "Não foi possível copiar automaticamente.",
      };
    }
  }

  return {
    compartilhado: false,
    copiado: false,
    mensagem: "Recurso de compartilhamento indisponível.",
  };
}
