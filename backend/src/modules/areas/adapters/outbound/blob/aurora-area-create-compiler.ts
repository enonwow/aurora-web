import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
  type AtomicModuleSnapshotRepositoryPort,
} from "../../../application/ports/atomic-module-snapshot.port";
import {
  AREA_CREATE_TILESET_SOURCE,
  AreaCreateCompilerFailure,
  type AreaCreateCompilerPort,
  type AreaCreateTilesetSourcePort,
} from "../../../application/ports/area-create-transaction.port";
import type { AreaCreateCommand } from "../../../domain/area-create-command.types";
import {
  AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
  getAurS0505CreationProfile,
} from "../../../domain/area-create-profile";
import type {
  AreaCreateCandidateResource,
  AreaCreateCompiledCandidate,
  AreaCreateModuleState,
  AreaCreateResourceExtension,
} from "../../../domain/area-create-transaction.types";
import { serializeAurS0505AreaCreateCandidate } from "./aurora-gff-area-create-writer";
import { serializeEmptyAreaGic, serializeEmptyAreaGit } from "./aurora-gff-area-companion-writer";
import { patchModuleIfoAreaList } from "./aurora-gff-module-ifo-area-writer";

const RESOURCE_TYPES: Readonly<Record<AreaCreateResourceExtension, number>> =
  Object.freeze({ are: 2012, git: 2023, gic: 2046 });

@Injectable()
export class AuroraAreaCreateCompiler implements AreaCreateCompilerPort {
  constructor(
    @Inject(ATOMIC_MODULE_SNAPSHOT_REPOSITORY)
    private readonly repository: AtomicModuleSnapshotRepositoryPort,
    @Inject(AREA_CREATE_TILESET_SOURCE)
    private readonly tilesetSource: AreaCreateTilesetSourcePort,
  ) {}

  async compile(
    command: AreaCreateCommand,
    moduleState: AreaCreateModuleState,
    _transactionId: string,
  ): Promise<AreaCreateCompiledCandidate> {
    assertAdmittedProfile(command);
    const tileset = await this.tilesetSource.resolve(command.tileset.resRef);
    if (
      tileset.resRef.toLowerCase() !== command.tileset.resRef ||
      tileset.fingerprintSha256.toLowerCase() !== command.tileset.setFingerprintSha256
    ) {
      throw new AreaCreateCompilerFailure(
        "AREA_CREATE_TILESET_STALE",
        409,
        "The selected SET source changed after the Area draft was prepared.",
        [
          `expected=${command.tileset.setFingerprintSha256}`,
          `actual=${tileset.fingerprintSha256.toLowerCase()}`,
        ],
      );
    }

    const head = await this.repository.readHead(command.moduleId);
    if (!head || head.revision !== moduleState.revision || head.quarantined) {
      throw new AreaCreateCompilerFailure(
        "AREA_CREATE_STORAGE_UNAVAILABLE",
        503,
        "The captured module snapshot is unavailable, stale, or quarantined.",
      );
    }
    const manifest = await this.repository.readManifest(head.manifestKey);
    const ifoDescriptor = manifest?.objects.find(
      (object) => object.logicalKey.toLowerCase() === "module.ifo",
    );
    if (!manifest || manifest.revision !== head.revision || !ifoDescriptor) {
      throw new AreaCreateCompilerFailure(
        "AREA_CREATE_STORAGE_UNAVAILABLE",
        503,
        "The captured module snapshot has no verified module.ifo descriptor.",
      );
    }
    const ifo = await this.repository.readContent(ifoDescriptor.contentKey);
    if (
      !ifo ||
      ifo.size !== ifoDescriptor.size ||
      ifo.sha256 !== ifoDescriptor.sha256 ||
      sha256Hex(ifo.bytes) !== ifoDescriptor.sha256
    ) {
      throw new AreaCreateCompilerFailure(
        "AREA_CREATE_STORAGE_UNAVAILABLE",
        503,
        "The captured module.ifo content failed descriptor readback.",
      );
    }

    const are = serializeAurS0505AreaCreateCandidate(command);
    const git = serializeEmptyAreaGit();
    const gic = serializeEmptyAreaGic();
    const patched = patchModuleIfoAreaList(ifo.bytes, command.area.resRef);
    if (patched.alreadyPresent) {
      throw new AreaCreateCompilerFailure(
        "AREA_CREATE_DRAFT_INVALID",
        409,
        "module.ifo already contains the requested Area ResRef.",
      );
    }

    return Object.freeze({
      areaId: command.area.resRef,
      resources: Object.freeze([
        resource(command.area.resRef, "are", are),
        resource(command.area.resRef, "git", git),
        resource(command.area.resRef, "gic", gic),
      ]),
      moduleIfo: Object.freeze({
        key: ifoDescriptor.logicalKey,
        fileName: ifoDescriptor.logicalKey,
        resourceType: ifoDescriptor.resourceType,
        baselineBytes: Buffer.from(ifo.bytes),
        baselineSha256: ifoDescriptor.sha256,
        candidateBytes: Buffer.from(patched.bytes),
        candidateSha256: sha256Hex(patched.bytes),
      }),
    });
  }
}

function assertAdmittedProfile(command: AreaCreateCommand): void {
  const profile = getAurS0505CreationProfile();
  if (command.creationProfile.id !== profile.id) {
    throw new AreaCreateCompilerFailure(
      "AREA_CREATE_PROFILE_UNSUPPORTED",
      422,
      "The requested Area creation profile is not admitted.",
    );
  }
  if (command.creationProfile.fingerprintSha256 !== AUR_S05_05_CREATION_PROFILE_FINGERPRINT) {
    throw new AreaCreateCompilerFailure(
      "AREA_CREATE_PROFILE_STALE",
      409,
      "The Area creation profile changed after the draft was prepared.",
    );
  }
  const topologyMatches =
    command.tileset.resRef === profile.tilesetResRef &&
    command.dimensions.width === profile.width &&
    command.dimensions.height === profile.height &&
    command.initializer.algorithmVersion === profile.initializerAlgorithmVersion &&
    command.initializer.seed === profile.initializerSeed &&
    command.groupInstances.length === 0 &&
    JSON.stringify(command.tiles) === JSON.stringify(profile.tiles);
  if (!topologyMatches) {
    throw new AreaCreateCompilerFailure(
      "AREA_CREATE_PROFILE_UNSUPPORTED",
      422,
      "The Area topology is outside the exact AUR-S05-05 structural candidate profile.",
    );
  }
}

function resource(
  resRef: string,
  extension: AreaCreateResourceExtension,
  bytes: Buffer,
): AreaCreateCandidateResource {
  const candidate = Buffer.from(bytes);
  const fileName = `${resRef}.${extension}`;
  return Object.freeze({
    extension,
    key: fileName,
    fileName,
    resourceType: RESOURCE_TYPES[extension],
    bytes: candidate,
    size: candidate.length,
    sha256: sha256Hex(candidate),
  });
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
