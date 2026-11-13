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

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erro ao converter imagem comprimida"));
    reader.readAsDataURL(blob);
  });
}

function canvasParaBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  qualidade: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mimeType, qualidade));
}

export async function comprimirImagemParaWebP(
  arquivoOriginal: File,
  maxSizeBytes: number = 75 * 1024, // 75KB (ideal para Firestore e sincronização rápida em 4G)
  maxDimensao: number = 900 // Resolução nítida para visualização cirúrgica
): Promise<ResultadoCompressao> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const usarObjectUrl = typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
    const objectUrl = usarObjectUrl ? URL.createObjectURL(arquivoOriginal) : null;

    const liberarUrl = () => {
      if (objectUrl && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onload = async () => {
      liberarUrl();
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

        // 1. Tentar compressão em WebP com ajuste dinâmico de qualidade
        let blob: Blob | null = null;
        for (let q = 0.8; q >= 0.25; q = Number((q - 0.15).toFixed(2))) {
          const tentativa = await canvasParaBlob(canvas, "image/webp", q);
          // No Safari/iOS, toBlob("image/webp") pode fazer fallback silencioso para image/png.
          // Nesse caso, abortar WebP imediatamente e usar JPEG com compressão real.
          if (!tentativa || tentativa.type !== "image/webp") {
            blob = null;
            break;
          }
          blob = tentativa;
          if (blob.size <= maxSizeBytes) {
            break;
          }
        }

        // 2. Fallback para JPEG (Safari/iOS ou quando WebP excede o limite)
        if (!blob || blob.size > maxSizeBytes * 1.5) {
          let melhorJpeg: Blob | null = null;
          for (let q = 0.75; q >= 0.25; q = Number((q - 0.15).toFixed(2))) {
            const tentativa = await canvasParaBlob(canvas, "image/jpeg", q);
            if (!tentativa) break;
            melhorJpeg = tentativa;
            if (tentativa.size <= maxSizeBytes) {
              break;
            }
          }
          if (melhorJpeg && (!blob || melhorJpeg.size < blob.size)) {
            blob = melhorJpeg;
          }
        }

        if (!blob) {
          throw new Error("Falha ao gerar blob comprimido");
        }

        const mimeType = blob.type || "image/jpeg";
        const extensao = mimeType.includes("jpeg")
          ? "jpg"
          : mimeType.includes("png")
          ? "png"
          : "webp";
        const nomeArquivoFinal = arquivoOriginal.name.replace(/\.[^/.]+$/, "") + `.${extensao}`;
        const arquivoComprimido = new File([blob], nomeArquivoFinal, {
          type: mimeType,
          lastModified: Date.now(),
        });

        const dataUrl = await blobParaDataUrl(blob);

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

    img.onerror = () => {
      liberarUrl();
      reject(new Error("Erro ao carregar imagem para compressão"));
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo selecionado"));
      reader.readAsDataURL(arquivoOriginal);
    }
  });
}
