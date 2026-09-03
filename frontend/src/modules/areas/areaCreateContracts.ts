import type {
  AreaTileProductionAdmissionBinding,
} from "./areaTileProductionAdmissionContracts";

export const AREA_CREATE_COMMAND_SCHEMA_VERSION = "area-create-command.v1" as const;
export const AREA_CREATE_RECEIPT_SCHEMA_VERSION = "area-create-receipt.v1" as const;

export type AreaCreateOrientation = 0 | 1 | 2 | 3;
export type AreaCreateResourceExtension = "are" | "git" | "gic";

export interface AreaCreateTile {
  readonly row: number;
  readonly col: number;
  readonly tileId: number;
  readonly orientation: AreaCreateOrientation;
  readonly height: number;
  readonly mainLight1: number;
  readonly mainLight2: number;
  readonly sourceLight1: number;
  readonly sourceLight2: number;
  readonly animLoop1: number;
  readonly animLoop2: number;
  readonly animLoop3: number;
}

export interface AreaCreateGroupCell {
  readonly row: number;
  readonly col: number;
}

export interface AreaCreateGroupInstance {
  readonly groupId: string;
  readonly anchorRow: number;
  readonly anchorCol: number;
  readonly orientation: AreaCreateOrientation;
  readonly cells: readonly AreaCreateGroupCell[];
}

export interface AreaCreateCommand {
  readonly schemaVersion: typeof AREA_CREATE_COMMAND_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly expectedModuleRevision: string;
  readonly creationProfile: Readonly<{
    id: string;
    fingerprintSha256: string;
  }>;
  readonly area: Readonly<{
    name: string;
    resRef: string;
    tag: string;
  }>;
  readonly tileset: Readonly<{
    resRef: string;
    setFingerprintSha256: string;
  }>;
  readonly dimensions: Readonly<{
    width: number;
    height: number;
  }>;
  readonly initializer: Readonly<{
    algorithmVersion: string;
    seed: number;
  }>;
  readonly tiles: readonly AreaCreateTile[];
  readonly groupInstances: readonly AreaCreateGroupInstance[];
  readonly draft: Readonly<{
    id: string;
    revision: number;
    normalizedSha256: string;
  }>;
  readonly clientCommandId: string;
}

interface AreaCreateProfileBase {
  readonly id: string;
  readonly evidenceScope: "aur-s05-05-structural-candidate";
  readonly tilesetResRef: string;
  readonly width: number;
  readonly height: number;
  readonly initializerAlgorithmVersion: string;
  readonly initializerSeed: number;
  readonly tiles: readonly AreaCreateTile[];
  readonly groupInstances: readonly AreaCreateGroupInstance[];
  readonly fingerprintSha256: string;
  readonly setFingerprintSha256: string;
}

export type AreaCreateProfile = AreaCreateProfileBase &
  (
    | Readonly<{
        persistenceStatus: "structural-candidate-awaiting-native-certification";
        materializationAllowed: false;
        certificationId: null;
        blockingProofs: readonly (
          | "runtime-canvas"
          | "toolset-save-build"
          | "nwn-runtime-load"
        )[];
      }>
    | Readonly<{
        persistenceStatus: "native-certified";
        materializationAllowed: true;
        certificationId: string;
        blockingProofs: readonly [];
      }>
  );

export interface AreaCreateProfileCatalog {
  readonly moduleId: string;
  readonly moduleRevision: string;
  readonly profiles: readonly AreaCreateProfile[];
}

export interface AreaCreateResourceDescriptor {
  readonly extension: AreaCreateResourceExtension;
  readonly fileName: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaCreateValidationReceipt {
  readonly validationId: string;
  readonly commandHash: string;
  readonly moduleId: string;
  readonly moduleRevision: string;
  readonly profileFingerprintSha256: string;
  readonly setFingerprintSha256: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly validatorVersion: string;
  readonly resources: readonly AreaCreateResourceDescriptor[];
  readonly moduleIfo: Readonly<{
    fileName: string;
    size: number;
    sha256: string;
  }>;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface AreaCreatePersistedResource extends AreaCreateResourceDescriptor {
  readonly key: string;
}

export interface AreaCreateReceipt {
  readonly schemaVersion: typeof AREA_CREATE_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly areaId: string;
  readonly resRef: string;
  readonly name: string;
  readonly tag: string;
  readonly moduleId: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly profileId: string;
  readonly profileFingerprintSha256: string;
  readonly setFingerprintSha256: string;
  readonly tileProductionAdmission: AreaTileProductionAdmissionBinding;
  readonly draftNormalizedSha256: string;
  readonly commandHash: string;
  readonly validatorVersion: string;
  readonly resources: readonly AreaCreatePersistedResource[];
  readonly moduleIfo: Readonly<{
    key: string;
    size: number;
    sha256: string;
  }>;
  readonly readbackStatus: "verified";
  readonly warnings: readonly string[];
  readonly createdAt: string;
}

export interface AreaCreateExecution {
  readonly idempotency: "created" | "replayed";
  readonly receipt: AreaCreateReceipt;
}
