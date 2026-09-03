/** Exact Delphi/Aurora 32-bit LCG draw used by `FUN_00b90fe8`. */
export function drawAuroraNativeRandom(seed: number): { seed: number; value: number } {
  const nextSeed = (Math.imul(seed >>> 0, 0x015a4e35) + 1) >>> 0;
  return { seed: nextSeed, value: (nextSeed >>> 16) & 0x7fff };
}
