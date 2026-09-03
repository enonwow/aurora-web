import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { RuntimeSettingsApplicationService } from "../../../../runtime-settings/application/runtime-settings.application.service";
import { NwnKeyBifResourceReader } from "../../../../runtime-settings/application/nwn-key-bif-resource-reader";
import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  AreaObjectBlueprintSourceError,
  type AreaObjectBlueprintSourcePort,
  type AreaObjectBlueprintSourceRequest,
  type ResolvedAreaObjectBlueprint,
} from "../../../application/ports/area-object-blueprint-source.port";
import { AREA_SOUND_CONSTRUCTION_PROFILE } from "../../../domain/area-sound-construction-profile";
import {
  AREA_STORE_CONSTRUCTION_PROFILE,
  hashAreaStoreConstructionDependencies,
} from "../../../domain/area-store-construction-profile";
import { AREA_CREATURE_CONSTRUCTION_PROFILE } from "../../../domain/area-creature-construction-profile";
import { AREA_ITEM_CONSTRUCTION_PROFILE } from "../../../domain/area-item-construction-profile";
import { AREA_PLACEABLE_CONSTRUCTION_PROFILE } from "../../../domain/area-placeable-construction-profile";
import { AREA_WAYPOINT_CONSTRUCTION_PROFILE } from "../../../domain/area-waypoint-construction-profile";
import { AREA_TRIGGER_CONSTRUCTION_PROFILE } from "../../../domain/area-trigger-construction-profile";
import { AREA_ENCOUNTER_CONSTRUCTION_PROFILE } from "../../../domain/area-encounter-construction-profile";
import { AREA_DOOR_CONSTRUCTION_PROFILE } from "../../../domain/area-door-construction-profile";

export interface NwnBaseKeyAreaObjectBlueprintSourceDependencies {
  readonly openReader: typeof NwnKeyBifResourceReader.open;
  readonly sha256: (bytes: Uint8Array) => string;
}

export const NWN_BASE_KEY_AREA_OBJECT_BLUEPRINT_SOURCE_DEPENDENCIES = Symbol(
  "NWN_BASE_KEY_AREA_OBJECT_BLUEPRINT_SOURCE_DEPENDENCIES",
);

const DEFAULT_DEPENDENCIES: NwnBaseKeyAreaObjectBlueprintSourceDependencies = Object.freeze({
  openReader: NwnKeyBifResourceReader.open.bind(NwnKeyBifResourceReader),
  sha256: (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex"),
});

@Injectable()
export class NwnBaseKeyAreaObjectBlueprintSourceAdapter
implements AreaObjectBlueprintSourcePort {
  constructor(
    private readonly runtimeSettings: RuntimeSettingsApplicationService,
    @Optional()
    @Inject(NWN_BASE_KEY_AREA_OBJECT_BLUEPRINT_SOURCE_DEPENDENCIES)
    private readonly dependencies: NwnBaseKeyAreaObjectBlueprintSourceDependencies = DEFAULT_DEPENDENCIES,
  ) {}

  async resolve(
    request: AreaObjectBlueprintSourceRequest,
  ): Promise<ResolvedAreaObjectBlueprint> {
    const profile = request.sourceKind === "creature"
      ? AREA_CREATURE_CONSTRUCTION_PROFILE
      : request.sourceKind === "door"
        ? AREA_DOOR_CONSTRUCTION_PROFILE
        : request.sourceKind === "encounter"
        ? AREA_ENCOUNTER_CONSTRUCTION_PROFILE
      : request.sourceKind === "item"
        ? AREA_ITEM_CONSTRUCTION_PROFILE
        : request.sourceKind === "placeable"
        ? AREA_PLACEABLE_CONSTRUCTION_PROFILE
        : request.sourceKind === "sound"
          ? AREA_SOUND_CONSTRUCTION_PROFILE
          : request.sourceKind === "store"
            ? AREA_STORE_CONSTRUCTION_PROFILE
            : request.sourceKind === "trigger"
              ? AREA_TRIGGER_CONSTRUCTION_PROFILE
              : AREA_WAYPOINT_CONSTRUCTION_PROFILE;
    const displayKind = `${request.sourceKind.slice(0, 1).toUpperCase()}${request.sourceKind.slice(1)}`;
    if (
      request.sourceProfileId !== profile.id ||
      request.templateResRef !== profile.templateResRef ||
      request.expectedSha256 !== profile.sourceSha256
    ) {
      throw new AreaObjectBlueprintSourceError(
        "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
        `${displayKind} blueprint provenance is outside the admitted immutable profile.`,
        Object.freeze(["profile_or_identity_mismatch"]),
      );
    }

    let bytes: Buffer | null;
    let reader: NwnKeyBifResourceReader;
    try {
      const settings = await this.runtimeSettings.getRuntimeSettings();
      const vanillaRoot = settings.paths.vanillaDataPath.trim();
      if (vanillaRoot.length === 0) {
        throw new Error("vanilla root is not configured");
      }
      reader = await this.dependencies.openReader(
        resolve(vanillaRoot, "nwn_base.key"),
        vanillaRoot,
      );
      bytes = await reader.read(profile.templateResRef, profile.resourceType);
    } catch {
      throw new AreaObjectBlueprintSourceError(
        "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
        `The configured immutable ${request.sourceKind} blueprint source is unavailable.`,
        Object.freeze(["nwn_base_key_unavailable"]),
      );
    }
    if (!bytes) {
      throw new AreaObjectBlueprintSourceError(
        "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
        `The configured immutable ${request.sourceKind} blueprint resource is unavailable.`,
        Object.freeze([`${request.sourceKind}_resource_unavailable`]),
      );
    }
    const sha256 = this.dependencies.sha256(bytes);
    if (sha256 !== profile.sourceSha256) {
      throw new AreaObjectBlueprintSourceError(
        "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
        `The configured ${request.sourceKind} blueprint bytes differ from the admitted immutable source.`,
        Object.freeze(["source_sha256_mismatch"]),
      );
    }
    const dependencies = request.sourceKind === "store"
      ? await resolveStoreDependencies(reader, bytes, this.dependencies.sha256)
      : request.sourceKind === "door"
        ? await resolveDoorTilesetDependency(reader, this.dependencies.sha256)
        : undefined;
    return Object.freeze({
      sourceKind: request.sourceKind,
      sourceProfileId: profile.id,
      templateResRef: profile.templateResRef,
      sha256,
      bytes: Buffer.from(bytes),
      ...(dependencies ? { dependencies } : {}),
    });
  }
}

async function resolveDoorTilesetDependency(
  reader: Pick<NwnKeyBifResourceReader, "read">,
  sha256: (bytes: Uint8Array) => string,
): Promise<ResolvedAreaObjectBlueprint["dependencies"]> {
  const hook = AREA_DOOR_CONSTRUCTION_PROFILE.hook;
  let bytes: Buffer | null;
  try {
    bytes = await reader.read(hook.tilesetResRef, hook.resourceType);
  } catch {
    bytes = null;
  }
  if (!bytes) {
    throw new AreaObjectBlueprintSourceError(
      "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
      "The immutable door-hook tileset source is unavailable.",
      Object.freeze(["door_tileset_resource_unavailable"]),
    );
  }
  const actual = sha256(bytes);
  if (actual !== hook.tilesetSha256) {
    throw new AreaObjectBlueprintSourceError(
      "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      "The door-hook tileset bytes differ from the admitted immutable source.",
      Object.freeze(["door_tileset_sha256_mismatch"]),
    );
  }
  return Object.freeze([Object.freeze({
    templateResRef: hook.tilesetResRef,
    resourceType: hook.resourceType,
    sha256: actual,
    bytes: Buffer.from(bytes),
  })]);
}

async function resolveStoreDependencies(
  reader: Pick<NwnKeyBifResourceReader, "read">,
  storeBytes: Buffer,
  sha256: (bytes: Uint8Array) => string,
): Promise<ResolvedAreaObjectBlueprint["dependencies"]> {
  const document = parseRawGffDocument(storeBytes);
  if (!document) {
    throw invalidStoreDependencyManifest();
  }
  const storeLists = document.fields.filter((field) => field.label === "StoreList");
  if (storeLists.length !== 1) {
    throw invalidStoreDependencyManifest();
  }
  const storeList = storeLists[0]!;
  if (storeList.type !== "list") {
    throw invalidStoreDependencyManifest();
  }
  if (storeList.value.length !== 5) {
    throw invalidStoreDependencyManifest();
  }
  const merchandiseFields = storeList.value[4]!.fields;
  if (merchandiseFields.length !== 1) {
    throw invalidStoreDependencyManifest();
  }
  const itemListField = merchandiseFields[0]!;
  if (itemListField.label !== "ItemList") {
    throw invalidStoreDependencyManifest();
  }
  if (itemListField.type !== "list") {
    throw invalidStoreDependencyManifest();
  }
  const itemList = itemListField as Extract<SupportedGffField, { type: "list" }>;
  if (itemList.value.length !== AREA_STORE_CONSTRUCTION_PROFILE.dependencyCount) {
    throw invalidStoreDependencyManifest();
  }
  const resrefs = itemList.value.map((entry) => {
    const fields = entry.fields.filter((field) => field.label === "InventoryRes");
    if (fields.length !== 1) {
      throw invalidStoreDependencyManifest();
    }
    const field = fields[0]!;
    if (field.type !== "resref") throw invalidStoreDependencyManifest();
    return field.value;
  });
  let dependencyBytes: readonly (Buffer | null)[];
  try {
    dependencyBytes = await Promise.all(resrefs.map((templateResRef) => reader.read(
      templateResRef,
      AREA_STORE_CONSTRUCTION_PROFILE.dependencyResourceType,
    )));
  } catch {
    throw unavailableStoreDependency();
  }
  if (dependencyBytes.some((bytes) => bytes === null)) {
    throw unavailableStoreDependency();
  }
  const dependencies: readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
  }>[] = dependencyBytes.map((bytes, index) => Object.freeze({
    templateResRef: resrefs[index]!,
    resourceType: AREA_STORE_CONSTRUCTION_PROFILE.dependencyResourceType,
    sha256: sha256(bytes!),
    bytes: Buffer.from(bytes!),
  }));
  if (
    hashAreaStoreConstructionDependencies(dependencies) !==
    AREA_STORE_CONSTRUCTION_PROFILE.dependencySetSha256
  ) {
    throw new AreaObjectBlueprintSourceError(
      "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
      "The store inventory blueprint dependency set differs from the admitted immutable profile.",
      Object.freeze(["store_dependency_set_sha256_mismatch"]),
    );
  }
  return Object.freeze(dependencies);
}

function invalidStoreDependencyManifest(): AreaObjectBlueprintSourceError {
  return new AreaObjectBlueprintSourceError(
    "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
    "The configured store blueprint dependency manifest is invalid.",
    Object.freeze(["store_dependency_manifest_invalid"]),
  );
}

function unavailableStoreDependency(): AreaObjectBlueprintSourceError {
  return new AreaObjectBlueprintSourceError(
    "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
    "One or more immutable store inventory blueprint dependencies are unavailable.",
    Object.freeze(["store_dependency_unavailable"]),
  );
}
