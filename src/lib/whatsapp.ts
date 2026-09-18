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
 * Monta mensagem formatada do WhatsApp para Alta / Evolução Cirúrgica PO
 */
export function gerarMensagemAlta(alta: AltaPaciente): string {
  const cirurgia = alta.tipoCirurgia?.trim();
  const linhaPO = cirurgia ? `PO: ${cirurgia}` : "PO";

  let queixaStr = "sem queixas";
  if (alta.temQueixas) {
    queixaStr = alta.detalhesQueixas?.trim() || "queixa relatada";
  }

  let msg = `LT ${alta.leito || "--"} - ${alta.nomePaciente || "Paciente"}\n`;
  msg += `${linhaPO}\n`;
  msg += `QUEIXAS: ${queixaStr}\n`;
  msg += `DIETA: ${alta.parametros.dieta ? "✅" : "❌"}\n`;
  msg += `DEAMBULANDO ${alta.parametros.deambulou ? "✅" : "❌"}\n`;
  msg += `DIURESE ${alta.parametros.diurese ? "✅" : "❌"}\n`;
  msg += `EVACUAÇÃO ${alta.parametros.evacuacao ? "✅" : "❌"}`;

  const fc = alta.sinaisVitais.frequenciaCardiaca;
  const sat = alta.sinaisVitais.saturacaoO2;
  if (fc || sat) {
    msg += `\nFC: ${fc || "--"} / Sat: ${sat ? `${sat}%` : "--%"}`;
  }

  return msg.trim();
}

/**
 * Compartilha via Web Share API com fallback para Área de Transferência e WhatsApp Web.
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
        return { compartilhado: false, copiado: false, mensagem: "Compartilhamento cancelado." };
      }
    }
  }

  // Fallback para Clipboard e WhatsApp Web
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(texto);

      if (arquivoFoto && typeof window !== "undefined") {
        const url = URL.createObjectURL(arquivoFoto);
        const a = document.createElement("a");
        a.href = url;
        a.download = arquivoFoto.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      const encoded = encodeURIComponent(texto);
      if (typeof window !== "undefined") {
        window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
      }

      return {
        compartilhado: false,
        copiado: true,
        mensagem: arquivoFoto
          ? "Mensagem copiada e foto baixada para anexar no WhatsApp Web!"
          : "Mensagem copiada para a área de transferência!",
      };
    } catch {}
  }

  return {
    compartilhado: false,
    copiado: false,
    mensagem: "Recurso de compartilhamento indisponível.",
  };
}
