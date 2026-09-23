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

  const leitoValido = alta.leito?.trim();
  const cabecalho = leitoValido
    ? `LT ${leitoValido} - ${alta.nomePaciente || "Paciente"}`
    : `${alta.nomePaciente || "Paciente"}`;

  let msg = `${cabecalho}\n`;
  msg += `${linhaPO}\n`;
  msg += `QUEIXAS: ${queixaStr}\n`;
  msg += `DIETA: ${alta.parametros.dieta ? "✅" : "❌"}\n`;
  msg += `DEAMBULANDO ${alta.parametros.deambulou ? "✅" : "❌"}\n`;
  msg += `DIURESE ${alta.parametros.diurese ? "✅" : "❌"}\n`;
  msg += `EVACUAÇÃO ${alta.parametros.evacuacao ? "✅" : "❌"}`;

  const fc = alta.sinaisVitais?.frequenciaCardiaca;
  const sat = alta.sinaisVitais?.saturacaoO2;
  if (fc || sat) {
    if (fc && sat) {
      msg += `\nFC: ${fc} / Sat: ${sat}%`;
    } else if (fc) {
      msg += `\nFC: ${fc}`;
    } else if (sat) {
      msg += `\nSat: ${sat}%`;
    }
  }

  return msg.trim();
}

/**
 * Compartilha via Web Share API (suportando bloco de até 5 fotos) com legenda na última foto como fechamento,
 * e fallback completo para Área de Transferência e WhatsApp Web.
 */
export async function compartilharOuCopiar(
  texto: string,
  arquivosFotos?: File | File[] | null,
  titulo: string = "CheckList Hospitalar"
): Promise<{ compartilhado: boolean; copiado: boolean; mensagem: string }> {
  const fotos: File[] = Array.isArray(arquivosFotos)
    ? arquivosFotos.filter(Boolean)
    : arquivosFotos
    ? [arquivosFotos]
    : [];

  // Pré-cópia preventiva do texto para a área de transferência:
  // Garante que o texto esteja copiado no clipboard caso o app do WhatsApp no mobile ou desktop precise de colar na última foto
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {}
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      const shareData: ShareData = {
        title: titulo,
        text: texto,
      };

      if (fotos.length > 0 && navigator.canShare && navigator.canShare({ files: fotos })) {
        shareData.files = fotos;
      }

      await navigator.share(shareData);
      const mensagemSucesso = fotos.length > 1
        ? `Lote de ${fotos.length} fotos preparado com o texto na última foto como fechamento!`
        : fotos.length === 1
        ? "Foto preparada com a legenda da alta!"
        : "Mensagem de alta compartilhada!";

      return { compartilhado: true, copiado: true, mensagem: mensagemSucesso };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { compartilhado: false, copiado: false, mensagem: "Compartilhamento cancelado." };
      }
    }
  }

  // Fallback para Clipboard e WhatsApp Web (Desktop)
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(texto);

      if (fotos.length > 0 && typeof window !== "undefined") {
        fotos.forEach((foto, idx) => {
          setTimeout(() => {
            const url = URL.createObjectURL(foto);
            const a = document.createElement("a");
            a.href = url;
            a.download = foto.name || `foto_alta_${idx + 1}.webp`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }, idx * 200);
        });
      }

      const encoded = encodeURIComponent(texto);
      if (typeof window !== "undefined") {
        window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank");
      }

      return {
        compartilhado: false,
        copiado: true,
        mensagem:
          fotos.length > 1
            ? `Resumo copiado e ${fotos.length} fotos baixadas! Anexe no WhatsApp Web e cole o resumo como legenda da última foto.`
            : fotos.length === 1
            ? "Resumo copiado e foto baixada! Cole a legenda na foto ao anexar no WhatsApp Web."
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
