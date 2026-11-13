/**
 * Utilitários de mesclagem colaborativa 3-way (estilo Google Docs) para textos clínicos.
 * Permite que dois usuários editem pontos diferentes do mesmo texto ao mesmo tempo
 * sem perda de dados nem sobrescrita mútua.
 */

export const CAMPOS_TEXTO_COLABORATIVOS = [
  "anotacoesHistoria",
  "hda",
  "evolucao",
  "conduta",
  "examesRealizados",
  "medicacoesUsoGeral",
  "detalhesQueixas",
  "observacoes",
] as const;

/**
 * Mescla uma única linha modificada simultaneamente por dois usuários usando
 * prefixo comum e sufixo comum em relação à linha base.
 */
function mergeLinha3Way(base: string, local: string, remote: string): string {
  if (local === remote) return local;
  if (local === base) return remote;
  if (remote === base) return local;

  let prefixLen = 0;
  const minLen = Math.min(base.length, local.length, remote.length);
  while (
    prefixLen < minLen &&
    base[prefixLen] === local[prefixLen] &&
    base[prefixLen] === remote[prefixLen]
  ) {
    prefixLen++;
  }

  let suffixLen = 0;
  const maxSuffix = Math.min(
    base.length - prefixLen,
    local.length - prefixLen,
    remote.length - prefixLen
  );
  while (
    suffixLen < maxSuffix &&
    base[base.length - 1 - suffixLen] === local[local.length - 1 - suffixLen] &&
    base[base.length - 1 - suffixLen] === remote[remote.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const baseMid = base.slice(prefixLen, base.length - suffixLen);
  const localMid = local.slice(prefixLen, local.length - suffixLen);
  const remoteMid = remote.slice(prefixLen, remote.length - suffixLen);

  // Se um dos lados apenas manteve o trecho base e o outro alterou
  if (localMid === baseMid) return remote;
  if (remoteMid === baseMid) return local;

  // Se ambos adicionaram texto a partir do mesmo ponto (ex: um adicionou no início do trecho, outro no fim)
  if (baseMid === "") {
    if (localMid.includes(remoteMid)) return local;
    if (remoteMid.includes(localMid)) return remote;
    return `${local.slice(0, prefixLen)}${localMid} ${remoteMid}${local.slice(local.length - suffixLen)}`;
  }

  // Fallback seguro quando ambos alteram exatamente os mesmos caracteres:
  // preserva a edição local e anexa a edição remota se não estiver contida
  if (local.includes(remoteMid)) return local;
  if (remote.includes(localMid)) return remote;
  return `${local} / ${remoteMid}`.trim();
}

interface LcsMatch {
  baseIdx: number;
  targetIdx: number;
}

function computeLineLcs(baseLines: string[], targetLines: string[]): LcsMatch[] {
  const m = baseLines.length;
  const n = targetLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (baseLines[i] === targetLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = dp[i + 1][j] >= dp[i][j + 1] ? dp[i + 1][j] : dp[i][j + 1];
      }
    }
  }

  const matches: LcsMatch[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (baseLines[i] === targetLines[j]) {
      matches.push({ baseIdx: i, targetIdx: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return matches;
}

interface BaseChangeHunk {
  baseStart: number;
  baseEnd: number; // exclusivo
  replacement: string[];
}

function buildChangeHunks(baseLines: string[], targetLines: string[]): BaseChangeHunk[] {
  const matches = computeLineLcs(baseLines, targetLines);
  const hunks: BaseChangeHunk[] = [];
  let prevBase = 0;
  let prevTarget = 0;

  for (const match of matches) {
    if (match.baseIdx > prevBase || match.targetIdx > prevTarget) {
      hunks.push({
        baseStart: prevBase,
        baseEnd: match.baseIdx,
        replacement: targetLines.slice(prevTarget, match.targetIdx),
      });
    }
    prevBase = match.baseIdx + 1;
    prevTarget = match.targetIdx + 1;
  }

  if (prevBase < baseLines.length || prevTarget < targetLines.length) {
    hunks.push({
      baseStart: prevBase,
      baseEnd: baseLines.length,
      replacement: targetLines.slice(prevTarget),
    });
  }

  return hunks;
}

/**
 * Mescla 3-way por linhas entre `base`, `local` e `remote`.
 * - Se `local === base`, retorna `remote` (atualização em tempo real do colega).
 * - Se `remote === base`, retorna `local`.
 * - Se ambos editaram linhas/seções diferentes do mesmo texto, preserva ambas as edições.
 * - Se ambos editaram a mesma linha, mescla no nível de palavra/trecho.
 */
export function mergeTextoColaborativo(base: string, local: string, remote: string): string {
  if (local === remote) return local;
  if (local === base) return remote;
  if (remote === base) return local;

  const baseLines = base.split("\n");
  const localLines = local.split("\n");
  const remoteLines = remote.split("\n");

  const localHunks = buildChangeHunks(baseLines, localLines);
  const remoteHunks = buildChangeHunks(baseLines, remoteLines);

  const result: string[] = [];
  let basePos = 0;
  let li = 0;
  let ri = 0;

  while (li < localHunks.length || ri < remoteHunks.length) {
    const lh = localHunks[li];
    const rh = remoteHunks[ri];

    // Próximo hunk é apenas local e termina antes do próximo hunk remoto começar
    if (lh && (!rh || lh.baseEnd < rh.baseStart || (lh.baseEnd === rh.baseStart && lh.baseStart < rh.baseStart))) {
      while (basePos < lh.baseStart) {
        result.push(baseLines[basePos++]);
      }
      result.push(...lh.replacement);
      basePos = lh.baseEnd;
      li++;
      continue;
    }

    // Próximo hunk é apenas remoto e termina antes do próximo hunk local começar
    if (rh && (!lh || rh.baseEnd < lh.baseStart || (rh.baseEnd === lh.baseStart && rh.baseStart < lh.baseStart))) {
      while (basePos < rh.baseStart) {
        result.push(baseLines[basePos++]);
      }
      result.push(...rh.replacement);
      basePos = rh.baseEnd;
      ri++;
      continue;
    }

    // Ambos os hunks se sobrepõem ou inserem no mesmo ponto
    if (lh && rh) {
      const overlapStart = Math.min(lh.baseStart, rh.baseStart);
      while (basePos < overlapStart) {
        result.push(baseLines[basePos++]);
      }

      // Caso comum: ambos editaram a mesma quantidade de linhas na mesma região
      if (lh.baseStart === rh.baseStart && lh.baseEnd === rh.baseEnd) {
        const maxLines = Math.max(lh.replacement.length, rh.replacement.length);
        for (let k = 0; k < maxLines; k++) {
          const bLine = lh.baseStart + k < lh.baseEnd ? baseLines[lh.baseStart + k] : "";
          const lLine = lh.replacement[k];
          const rLine = rh.replacement[k];
          if (lLine !== undefined && rLine !== undefined) {
            result.push(mergeLinha3Way(bLine, lLine, rLine));
          } else if (lLine !== undefined) {
            result.push(lLine);
          } else if (rLine !== undefined) {
            result.push(rLine);
          }
        }
        basePos = lh.baseEnd;
        li++;
        ri++;
      } else {
        // Regiões parcialmente sobrepostas: preserva linhas locais e anexa adições remotas não duplicadas
        const localSet = new Set(lh.replacement);
        result.push(...lh.replacement);
        for (const rLine of rh.replacement) {
          if (!localSet.has(rLine)) {
            result.push(rLine);
          }
        }
        basePos = Math.max(lh.baseEnd, rh.baseEnd);
        li++;
        ri++;
      }
    }
  }

  while (basePos < baseLines.length) {
    result.push(baseLines[basePos++]);
  }

  return result.join("\n");
}
