// data/rab-weight-engine.ts
export type RABWeightMap = { [code: string]: number };

/** pastikan total = 1 */
export function normalizeWeights(w: RABWeightMap): RABWeightMap {
  const entries = Object.entries(w);
  if (entries.length === 0) return {};
  const sum = entries.reduce((s, [,v]) => s + v, 0);
  if (sum === 0) {
    const eq = 1 / entries.length;
    return Object.fromEntries(entries.map(([k]) => [k, eq]));
  }
  return Object.fromEntries(entries.map(([k,v]) => [k, v / sum]));
}

/** sinkron saat child bertambah/berkurang */
export function syncWeightsWithWBS(
  prev: RABWeightMap,
  childCodes: string[]
): RABWeightMap {
  const next: RABWeightMap = {};
  childCodes.forEach(c => { if (prev[c] != null) next[c] = prev[c]; });

  const missing = childCodes.filter(c => next[c] == null);
  if (missing.length) {
    const used = Object.values(next).reduce((s,v)=>s+v,0);
    const rem = used < 1 ? 1 - used : 0;
    const each = rem > 0 ? rem / missing.length : 1 / childCodes.length;
    missing.forEach(c => next[c] = each);
  }
  return normalizeWeights(next);
}

/** inline edit satu baris → lainnya auto-adjust */
export function updateWeight(
  w: RABWeightMap,
  target: string,
  val: number
): RABWeightMap {
  const v = Math.max(0, Math.min(1, val));
  const rest = Object.keys(w).filter(c => c !== target);
  const restSum = rest.reduce((s,c)=>s+(w[c]??0),0);
  const rem = 1 - v;

  const next: RABWeightMap = { ...w, [target]: v };
  if (rest.length === 0) return normalizeWeights(next);

  rest.forEach(c => {
    next[c] = restSum > 0 ? (w[c] / restSum) * rem : rem / rest.length;
  });
  return normalizeWeights(next);
}
