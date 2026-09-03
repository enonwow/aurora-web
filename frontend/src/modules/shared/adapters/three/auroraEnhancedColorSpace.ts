export const AURORA_ENHANCED_GAMMA_EXPONENT = 2.2;

export const AURORA_ENHANCED_COLOR_SPACE_SOURCE =
  "Retail inc_common.shd ApplyColorSpace (fixture source sha256 3a6f965d2eec5411b2075919e5dc0316d2ddbc783958de6c53730e94c75bfcab) uses sign(color)*pow(abs(color),2.2) when GAMMA_CORRECTION==1; inc_lighting.shd consumes lightAreaAmbient/lightAreaDiffuse without another ApplyColorSpace, inc_standard.shd debug output applies RevertColorSpace to materialFrontAmbient/materialFrontDiffuse, and nwmain.exe 0x1400b4339..0x1400b44c4 emits the active GAMMA_CORRECTION shader define.";

export function convertAuroraEnhancedGammaComponentToLinear(
  component: number
): number {
  if (!Number.isFinite(component)) return 0;
  return Math.sign(component) * Math.pow(Math.abs(component), AURORA_ENHANCED_GAMMA_EXPONENT);
}

export function convertAuroraEnhancedGammaTripletToLinear(
  gamma: readonly [number, number, number]
): [number, number, number] {
  return [
    convertAuroraEnhancedGammaComponentToLinear(gamma[0]),
    convertAuroraEnhancedGammaComponentToLinear(gamma[1]),
    convertAuroraEnhancedGammaComponentToLinear(gamma[2])
  ];
}
