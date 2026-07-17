export function isVitestRuntime(): boolean {
  const env = import.meta.env as ImportMetaEnv & {
    readonly VITEST?: boolean | string;
  };
  return env.VITEST === true || env.VITEST === "true";
}
