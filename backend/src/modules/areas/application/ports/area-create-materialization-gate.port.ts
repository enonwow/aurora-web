export const AREA_CREATE_MATERIALIZATION_GATE = Symbol(
  "AREA_CREATE_MATERIALIZATION_GATE",
);

export const AREA_CREATE_BLOCKING_PROOFS = [
  "runtime-canvas",
  "toolset-save-build",
  "nwn-runtime-load",
] as const;

export type AreaCreateBlockingProof =
  (typeof AREA_CREATE_BLOCKING_PROOFS)[number];

export type AreaCreateMaterializationPolicy =
  | Readonly<{
      persistenceStatus: "structural-candidate-awaiting-native-certification";
      materializationAllowed: false;
      certificationId: null;
      blockingProofs: readonly AreaCreateBlockingProof[];
    }>
  | Readonly<{
      persistenceStatus: "native-certified";
      materializationAllowed: true;
      certificationId: string;
      blockingProofs: readonly [];
    }>;

export interface AreaCreateMaterializationGatePort {
  resolve(input: Readonly<{
    profileId: string;
    profileFingerprintSha256: string;
  }>): Promise<AreaCreateMaterializationPolicy>;
}
