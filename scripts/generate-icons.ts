import fs from "fs";
import path from "path";
import zlib from "zlib";

// Tabela de CRC32 para PNG
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function encodeRGBAtoPNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk("IHDR", ihdr);

  // Scanlines: cada linha tem 1 byte de filter (0) + width * 4 bytes RGBA
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (1 + rowBytes));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + rowBytes);
    rawData[rawOffset] = 0; // Filter 0 (None)
    const srcOffset = y * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      rawData[rawOffset + 1 + x] = rgba[srcOffset + x];
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressed);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Função para desenhar o ícone médico de alta tecnologia
function renderIcon(size: number, isMaskable: boolean): Buffer {
  const rgba = new Uint8Array(size * size * 4);

  function setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    const prevA = rgba[idx + 3] / 255;
    const curA = a / 255;
    const outA = curA + prevA * (1 - curA);

    if (outA > 0) {
      rgba[idx] = Math.round((r * curA + rgba[idx] * prevA * (1 - curA)) / outA);
      rgba[idx + 1] = Math.round((g * curA + rgba[idx + 1] * prevA * (1 - curA)) / outA);
      rgba[idx + 2] = Math.round((b * curA + rgba[idx + 2] * prevA * (1 - curA)) / outA);
      rgba[idx + 3] = Math.round(outA * 255);
    }
  }

  // 1. Fundo Gradiente Elegante (Slate / Navy: #0f172a a #020617)
  for (let y = 0; y < size; y++) {
    const fy = y / size;
    for (let x = 0; x < size; x++) {
      const fx = x / size;
      // Gradiente radial sutil vindo do topo-esquerda
      const distFromCenter = Math.sqrt((fx - 0.4) ** 2 + (fy - 0.3) ** 2);
      const r = Math.max(10, Math.min(25, Math.round(22 - distFromCenter * 14)));
      const g = Math.max(16, Math.min(35, Math.round(32 - distFromCenter * 18)));
      const b = Math.max(30, Math.min(55, Math.round(52 - distFromCenter * 28)));
      setPixel(x, y, r, g, b, 255);
    }
  }

  // Escala normalizada de 0 a 1
  const scale = size;
  const padding = isMaskable ? 0.18 : 0.10; // Margem segura para maskable

  // 2. Card Central com cantos arredondados (Slate 900 com brilho sutil)
  const cardLeft = Math.round(scale * (padding + 0.04));
  const cardTop = Math.round(scale * (padding + 0.04));
  const cardRight = Math.round(scale * (1 - padding - 0.04));
  const cardBottom = Math.round(scale * (1 - padding - 0.04));
  const cardRadius = Math.round(scale * 0.12);

  for (let y = cardTop; y <= cardBottom; y++) {
    for (let x = cardLeft; x <= cardRight; x++) {
      // Verifica distância dos cantos para arredondamento
      let dx = 0;
      let dy = 0;
      if (x < cardLeft + cardRadius) dx = cardLeft + cardRadius - x;
      else if (x > cardRight - cardRadius) dx = x - (cardRight - cardRadius);
      if (y < cardTop + cardRadius) dy = cardTop + cardRadius - y;
      else if (y > cardBottom - cardRadius) dy = y - (cardBottom - cardRadius);

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= cardRadius) {
        // Dentro do card: Slate 850 / 900
        const isBorder = dist > cardRadius - 2 || x === cardLeft || x === cardRight || y === cardTop || y === cardBottom;
        if (isBorder) {
          // Borda ciano suave (#0ea5e9 com transparência)
          setPixel(x, y, 14, 165, 233, 90);
        } else {
          setPixel(x, y, 15, 23, 42, 220);
        }
      }
    }
  }

  // 3. Cruz Médica em Verde Esmeralda Vibrante (#10b981) com Ciano (#06b6d4)
  const cx = scale * 0.5;
  const cy = scale * 0.44; // Levemente acima do centro para dar espaço ao checklist
  const armLen = scale * 0.22;
  const armThick = scale * 0.09;

  // Braço vertical da cruz
  const vLeft = Math.round(cx - armThick / 2);
  const vRight = Math.round(cx + armThick / 2);
  const vTop = Math.round(cy - armLen);
  const vBottom = Math.round(cy + armLen);

  // Braço horizontal da cruz
  const hLeft = Math.round(cx - armLen);
  const hRight = Math.round(cx + armLen);
  const hTop = Math.round(cy - armThick / 2);
  const hBottom = Math.round(cy + armThick / 2);

  const crossRadius = Math.round(scale * 0.025);

  function insideCross(px: number, py: number): boolean {
    const inV = px >= vLeft && px <= vRight && py >= vTop && py <= vBottom;
    const inH = px >= hLeft && px <= hRight && py >= hTop && py <= hBottom;
    return inV || inH;
  }

  // Renderiza Cruz Médica com leve gradiente de Esmeralda (#10b981) para Ciano (#06b6d4)
  for (let y = Math.min(vTop, hTop) - 2; y <= Math.max(vBottom, hBottom) + 2; y++) {
    for (let x = Math.min(vLeft, hLeft) - 2; x <= Math.max(vRight, hRight) + 2; x++) {
      if (insideCross(x, y)) {
        const fy = (y - vTop) / (vBottom - vTop);
        // Gradiente vertical suave: Ciano no topo (#06b6d4) para Esmeralda na base (#10b981)
        const cr = Math.round(6 * (1 - fy) + 16 * fy);
        const cg = Math.round(182 * (1 - fy) + 185 * fy);
        const cb = Math.round(212 * (1 - fy) + 129 * fy);

        // Borda ou miolo
        setPixel(x, y, cr, cg, cb, 255);
      }
    }
  }

  // 4. Marca de Checklist (Prancheta / Visto de Verificação Clínico ✓)
  // Desenhado com brilho branco/ciano no centro da cruz
  const checkCx = cx;
  const checkCy = cy;
  const checkSize = scale * 0.08;

  // Linhas do Checkmark ✓
  // Ponto 1: checkCx - checkSize * 0.6, checkCy
  // Ponto 2: checkCx - checkSize * 0.1, checkCy + checkSize * 0.5
  // Ponto 3: checkCx + checkSize * 0.7, checkCy - checkSize * 0.5
  const strokeW = Math.max(2, Math.round(scale * 0.024));

  function drawSegment(x0: number, y0: number, x1: number, y1: number) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      for (let ox = -strokeW; ox <= strokeW; ox++) {
        for (let oy = -strokeW; oy <= strokeW; oy++) {
          if (ox * ox + oy * oy <= strokeW * strokeW) {
            setPixel(Math.round(px + ox), Math.round(py + oy), 255, 255, 255, 255);
          }
        }
      }
    }
  }

  drawSegment(
    checkCx - checkSize * 0.6,
    checkCy + checkSize * 0.05,
    checkCx - checkSize * 0.1,
    checkCy + checkSize * 0.55
  );
  drawSegment(
    checkCx - checkSize * 0.1,
    checkCy + checkSize * 0.55,
    checkCx + checkSize * 0.7,
    checkCy - checkSize * 0.45
  );

  // 5. Três Linhas de Checklist Clínico na parte inferior (#38bdf8 e #a7f3d0)
  const lineYStart = cy + armLen * 0.85;
  const lineGap = scale * 0.045;
  const lineWidth1 = scale * 0.28;
  const lineWidth2 = scale * 0.22;
  const lineWidth3 = scale * 0.16;
  const lineH = Math.max(2, Math.round(scale * 0.015));

  function drawCheckline(lx: number, ly: number, lw: number, r: number, g: number, b: number) {
    for (let y = Math.round(ly); y < Math.round(ly + lineH); y++) {
      for (let x = Math.round(lx - lw / 2); x <= Math.round(lx + lw / 2); x++) {
        setPixel(x, y, r, g, b, 200);
      }
    }
    // Ponto indicador de checklist à esquerda
    const dotX = Math.round(lx - lw / 2 - scale * 0.03);
    const dotY = Math.round(ly + lineH / 2);
    const dotR = Math.max(2, Math.round(scale * 0.012));
    for (let y = dotY - dotR; y <= dotY + dotR; y++) {
      for (let x = dotX - dotR; x <= dotX + dotR; x++) {
        if ((x - dotX) ** 2 + (y - dotY) ** 2 <= dotR * dotR) {
          setPixel(x, y, 16, 185, 129, 240); // Esmeralda
        }
      }
    }
  }

  drawCheckline(cx + scale * 0.02, lineYStart, lineWidth1, 56, 189, 248); // Ciano
  drawCheckline(cx + scale * 0.02, lineYStart + lineGap, lineWidth2, 167, 243, 208); // Esmeralda suave
  drawCheckline(cx + scale * 0.02, lineYStart + lineGap * 2, lineWidth3, 148, 163, 184); // Slate 400

  return encodeRGBAtoPNG(size, size, rgba);
}

// Diretório de saída
const iconsDir = path.join(process.cwd(), "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log("Gerando ícones PWA...");

// 1. icon-192x192.png
const p192 = renderIcon(192, false);
fs.writeFileSync(path.join(iconsDir, "icon-192x192.png"), p192);
console.log("✅ icon-192x192.png gerado com sucesso (" + p192.length + " bytes)");

// 2. icon-512x512.png
const p512 = renderIcon(512, false);
fs.writeFileSync(path.join(iconsDir, "icon-512x512.png"), p512);
console.log("✅ icon-512x512.png gerado com sucesso (" + p512.length + " bytes)");

// 3. icon-maskable-192x192.png
const pMask192 = renderIcon(192, true);
fs.writeFileSync(path.join(iconsDir, "icon-maskable-192x192.png"), pMask192);
console.log("✅ icon-maskable-192x192.png gerado com sucesso (" + pMask192.length + " bytes)");

// 4. icon-maskable-512x512.png
const pMask512 = renderIcon(512, true);
fs.writeFileSync(path.join(iconsDir, "icon-maskable-512x512.png"), pMask512);
console.log("✅ icon-maskable-512x512.png gerado com sucesso (" + pMask512.length + " bytes)");

// 5. apple-touch-icon.png (180x180 para iOS)
const pApple = renderIcon(180, false);
fs.writeFileSync(path.join(iconsDir, "apple-touch-icon.png"), pApple);
fs.writeFileSync(path.join(process.cwd(), "public", "apple-touch-icon.png"), pApple);
console.log("✅ apple-touch-icon.png gerado com sucesso (" + pApple.length + " bytes)");

// 6. favicon.png e favicon.ico (64x64)
const pFavicon = renderIcon(64, false);
fs.writeFileSync(path.join(process.cwd(), "public", "favicon.png"), pFavicon);
fs.writeFileSync(path.join(process.cwd(), "public", "favicon.ico"), pFavicon);
console.log("✅ favicon.ico gerado com sucesso (" + pFavicon.length + " bytes)");

console.log("Todos os ícones foram gerados com total fidelidade e qualidade!");
