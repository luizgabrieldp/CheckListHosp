/**
 * Compressor e Otimizador de Fotos de Feridas Cirúrgicas no Cliente:
 * Converte para WebP de alta qualidade visual médica e garante tamanho <= 1MB.
 */
export interface ResultadoCompressao {
  arquivo: File;
  dataUrl: string;
  tamanhoOriginalBytes: number;
  tamanhoComprimidoBytes: number;
  tamanhoFormatado: string;
}

export async function comprimirImagemParaWebP(
  arquivoOriginal: File,
  maxSizeBytes: number = 75 * 1024, // 75KB (ideal para Firestore e sincronização rápida em 4G)
  maxDimensao: number = 900 // Resolução nítida para visualização cirúrgica
): Promise<ResultadoCompressao> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          let { width, height } = img;

          // Redimensionar proporcionalmente se exceder a dimensão máxima clínica
          if (width > maxDimensao || height > maxDimensao) {
            if (width > height) {
              height = Math.round((height * maxDimensao) / width);
              width = maxDimensao;
            } else {
              width = Math.round((width * maxDimensao) / height);
              height = maxDimensao;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Não foi possível inicializar o canvas 2D");
          }

          // Renderização suave de alta qualidade
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Tentar compressão em WebP com ajuste dinâmico de qualidade
          let qualidade = 0.8;
          let blob: Blob | null = null;

          while (qualidade >= 0.25) {
            blob = await new Promise<Blob | null>((res) =>
              canvas.toBlob((b) => res(b), "image/webp", qualidade)
            );

            if (blob && blob.size <= maxSizeBytes) {
              break;
            }
            qualidade -= 0.15;
          }

          // Se o navegador não suportar webp na toBlob, tentar jpeg
          if (!blob || blob.size > maxSizeBytes * 1.5) {
            qualidade = 0.7;
            blob = await new Promise<Blob | null>((res) =>
              canvas.toBlob((b) => res(b), "image/jpeg", qualidade)
            );
          }

          if (!blob) {
            throw new Error("Falha ao gerar blob comprimido");
          }

          const mimeType = blob.type || "image/webp";
          const extensao = mimeType.includes("jpeg") ? "jpg" : "webp";
          const nomeArquivoFinal = arquivoOriginal.name.replace(/\.[^/.]+$/, "") + `.${extensao}`;
          const arquivoComprimido = new File([blob], nomeArquivoFinal, {
            type: mimeType,
            lastModified: Date.now(),
          });

          const dataUrl = canvas.toDataURL(mimeType, qualidade);

          const tamanhoFormatado =
            blob.size < 1024 * 1024
              ? `${Math.round(blob.size / 1024)} KB`
              : `${(blob.size / (1024 * 1024)).toFixed(2)} MB`;

          resolve({
            arquivo: arquivoComprimido,
            dataUrl,
            tamanhoOriginalBytes: arquivoOriginal.size,
            tamanhoComprimidoBytes: blob.size,
            tamanhoFormatado,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error("Erro ao carregar imagem para compressão"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo selecionado"));
    reader.readAsDataURL(arquivoOriginal);
  });
}
