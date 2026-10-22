import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { CatalogModule } from "../catalog/catalog.module";
import { CatalogApplicationService } from "../catalog/application/catalog.application.service";
import {
  TEMPLATE_CATALOG_REPOSITORY,
  type TemplateCatalogRepositoryPort,
} from "../catalog/application/ports/template-catalog-repository.port";
import { RuntimeSettingsModule } from "../runtime-settings/runtime-settings.module";
import { ModuleSnapshotsModule } from "../module-snapshots/module-snapshots.module";
import { AuthModule } from "../auth/auth.module";
import { AreasController } from "./adapters/inbound/http/areas.controller";
import { AreaEditingController } from "./adapters/inbound/http/area-editing.controller";
import { AreaCertificationController } from "./adapters/inbound/http/area-certification.controller";
import { AreaEventScriptCatalogController } from "./adapters/inbound/http/area-event-script-catalog.controller";
import { ModuleAreaEventScriptPublicationController } from "./adapters/inbound/http/area-event-script-publication.controller";
import { AreaCreationProfilesController, ModuleAreaCreateController } from "./adapters/inbound/http/area-create.controller";
import { AreaDraftController, ProductionAreaDraftController } from "./adapters/inbound/http/area-draft.controller";
import { ModuleAreaUpdateValidationController } from "./adapters/inbound/http/area-update-validation.controller";
import { ModuleAreaUpdateController } from "./adapters/inbound/http/area-update.controller";
import { ModuleAreaDeletePreviewController } from "./adapters/inbound/http/area-delete-preview.controller";
import { ModuleAreaDeleteController } from "./adapters/inbound/http/area-delete.controller";
import {
  ModuleAreaRenameController,
  ModuleAreaRenamePreviewController,
} from "./adapters/inbound/http/area-rename.controller";
import { ModuleSnapshotAreaRepository } from "./adapters/outbound/blob/module-snapshot-area.repository";
import { S3AreaProcessingCacheRepository } from "./adapters/outbound/blob/s3-area-processing-cache.repository";
import { LayeredAreaProcessingCacheRepository } from "./adapters/outbound/layered/layered-area-processing-cache.repository";
import { MemoryAreaProcessingCacheRepository } from "./adapters/outbound/memory/memory-area-processing-cache.repository";
import { StaticAreaRepository } from "./adapters/outbound/memory/static-area.repository";
import { MemoryAreaCreateControlStore } from "./adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaLifecycleMutationControlStore } from "./adapters/outbound/memory/memory-area-lifecycle-mutation-control-store";
import { MemoryAreaEventScriptPublicationControlStore } from "./adapters/outbound/memory/memory-area-event-script-publication-control-store";
import { MemoryAreaDeleteControlStore } from "./adapters/outbound/memory/memory-area-delete-control-store";
import { MemoryAreaRenameControlStore } from "./adapters/outbound/memory/memory-area-rename-control-store";
import { MemoryAreaDraftRepository } from "./adapters/outbound/memory/memory-area-draft.repository";
import { MySqlAreaCreateControlStore } from "./adapters/outbound/mysql/mysql-area-create-control-store";
import { MySqlAreaLifecycleMutationControlStore } from "./adapters/outbound/mysql/mysql-area-lifecycle-mutation-control-store";
import { MySqlAreaEventScriptPublicationControlStore } from "./adapters/outbound/mysql/mysql-area-event-script-publication-control-store";
import { MySqlAreaDeleteControlStore } from "./adapters/outbound/mysql/mysql-area-delete-control-store";
import { MySqlAreaRenameControlStore } from "./adapters/outbound/mysql/mysql-area-rename-control-store";
import { MySqlAreaDraftRepository } from "./adapters/outbound/mysql/mysql-area-draft.repository";
import { AuthAreaCreateAuthorizationAdapter } from "./adapters/outbound/auth/auth-area-create-authorization.adapter";
import { AuthAreaUpdateAuthorizationAdapter } from "./adapters/outbound/auth/auth-area-update-authorization.adapter";
import { AuthAreaDeleteAuthorizationAdapter } from "./adapters/outbound/auth/auth-area-delete-authorization.adapter";
import { AuthAreaRenameAuthorizationAdapter } from "./adapters/outbound/auth/auth-area-rename-authorization.adapter";
import { AreaEditingTilesetSourceAdapter } from "./adapters/outbound/blob/area-editing-tileset-source.adapter";
import { NwnBaseKeyAreaObjectBlueprintSourceAdapter } from "./adapters/outbound/blob/nwn-base-key-area-object-blueprint-source.adapter";
import { AuroraAreaCreateCompiler } from "./adapters/outbound/blob/aurora-area-create-compiler";
import { AuroraAreaCreateCandidateValidator } from "./adapters/outbound/blob/aurora-area-create-candidate-validator";
import { AuroraAreaCreatePersistedReadbackVerifier } from "./adapters/outbound/blob/aurora-area-create-persisted-readback-verifier";
import { AuroraAreaUpdatePersistedReadbackVerifier } from "./adapters/outbound/blob/aurora-area-update-persisted-readback-verifier";
import { AtomicAreaCreateTransactionStorageAdapter } from "./adapters/outbound/snapshot/atomic-area-create-transaction-storage.adapter";
import { AtomicAreaDeleteTransactionStorageAdapter } from "./adapters/outbound/snapshot/atomic-area-delete-transaction-storage.adapter";
import { AtomicAreaRenameTransactionStorageAdapter } from "./adapters/outbound/snapshot/atomic-area-rename-transaction-storage.adapter";
import { AtomicAreaEventScriptPublicationStorageAdapter } from "./adapters/outbound/snapshot/atomic-area-event-script-publication-storage.adapter";
import { CommittedNwnScriptSourceSnapshotAdapter } from "./adapters/outbound/snapshot/committed-nwn-script-source-snapshot.adapter";
import { CommittedAreaEventScriptSourceQueryAdapter } from "./adapters/outbound/snapshot/committed-area-event-script-source-query.adapter";
import { StaticAreaCreateMaterializationGateAdapter } from "./adapters/outbound/certification/static-area-create-materialization-gate.adapter";
import { FileAreaCertificationLedgerSourceAdapter } from "./adapters/outbound/certification/file-area-certification-ledger-source.adapter";
import { AreasApplicationService } from "./application/areas.application.service";
import { AreaEditingApplicationService } from "./application/area-editing.application.service";
import { AreaTileCertificationQueryApplicationService } from "./application/area-tile-certification-query.application.service";
import { AreaEventScriptCatalogApplicationService } from "./application/area-event-script-catalog.application.service";
import {
  AreaEventScriptPublicationApplicationService,
  type AreaEventScriptPublicationApplicationDependencies,
} from "./application/area-event-script-publication.application.service";
import { NestAreaEventScriptCatalogTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-event-script-catalog-telemetry.adapter";
import { NestAreaEventScriptPublicationTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-event-script-publication-telemetry.adapter";
import { NestAreaDynamicItemBlueprintCopyTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-dynamic-item-blueprint-copy-telemetry.adapter";
import { NestAreaStoreCommerceTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-store-commerce-telemetry.adapter";
import { NestAreaStoreScriptResRefsTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-store-script-resrefs-telemetry.adapter";
import { NestAreaTriggerScriptResRefsTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-trigger-script-resrefs-telemetry.adapter";
import { NestAreaTriggerTransitionStorageTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-trigger-transition-storage-telemetry.adapter";
import { NestAreaTriggerCorePropertiesTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-trigger-core-properties-telemetry.adapter";
import { NestAreaTriggerTrapPropertiesTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-trigger-trap-properties-telemetry.adapter";
import { NestAreaTriggerVariableTableTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-trigger-variable-table-telemetry.adapter";
import { NestAreaStoreVariableTableTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-store-variable-table-telemetry.adapter";
import { NestAreaStoreRestrictionsTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-store-restrictions-telemetry.adapter";
import { NestAreaStoreInventoryTelemetryAdapter } from "./adapters/outbound/telemetry/nest-area-store-inventory-telemetry.adapter";
import { AREA_EVENT_SCRIPT_CATALOG_TELEMETRY } from "./application/ports/area-event-script-catalog-telemetry.port";
import { AREA_EVENT_SCRIPT_PUBLICATION_TELEMETRY } from "./application/ports/area-event-script-publication-telemetry.port";
import { AREA_DYNAMIC_ITEM_BLUEPRINT_COPY_TELEMETRY } from "./application/ports/area-dynamic-item-blueprint-copy-telemetry.port";
import { AREA_STORE_COMMERCE_TELEMETRY } from "./application/ports/area-store-commerce-telemetry.port";
import { AREA_STORE_SCRIPT_RESREFS_TELEMETRY } from "./application/ports/area-store-script-resrefs-telemetry.port";
import { AREA_TRIGGER_SCRIPT_RESREFS_TELEMETRY } from "./application/ports/area-trigger-script-resrefs-telemetry.port";
import { AREA_TRIGGER_TRANSITION_STORAGE_TELEMETRY } from "./application/ports/area-trigger-transition-storage-telemetry.port";
import { AREA_TRIGGER_CORE_PROPERTIES_TELEMETRY } from "./application/ports/area-trigger-core-properties-telemetry.port";
import { AREA_TRIGGER_TRAP_PROPERTIES_TELEMETRY } from "./application/ports/area-trigger-trap-properties-telemetry.port";
import { AREA_TRIGGER_VARIABLE_TABLE_TELEMETRY } from "./application/ports/area-trigger-variable-table-telemetry.port";
import { AREA_STORE_VARIABLE_TABLE_TELEMETRY } from "./application/ports/area-store-variable-table-telemetry.port";
import { AREA_STORE_RESTRICTIONS_TELEMETRY } from "./application/ports/area-store-restrictions-telemetry.port";
import { AREA_STORE_INVENTORY_TELEMETRY } from "./application/ports/area-store-inventory-telemetry.port";
import {
  DisabledNwnScriptCompilerAdapter,
  NwnScriptCompilerAdapter,
} from "./adapters/outbound/compiler/nwn-script-compiler.adapter";
import { NWN_SCRIPT_COMPILER } from "./application/ports/nwn-script-compiler.port";
import { NWN_SCRIPT_SOURCE_SNAPSHOT } from "./application/ports/nwn-script-source-snapshot.port";
import { AREA_EVENT_SCRIPT_SOURCE_QUERY } from "./application/ports/area-event-script-source-query.port";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_RECOVERY_STORAGE,
  AREA_EVENT_SCRIPT_PUBLICATION_STORAGE,
} from "./application/ports/area-event-script-publication-storage.port";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_IDEMPOTENCY,
  AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL,
  type AreaEventScriptPublicationIdempotencyPort,
  type AreaEventScriptPublicationJournalPort,
} from "./application/ports/area-event-script-publication.port";
import { AreaCreateApplicationService } from "./application/area-create.application.service";
import { AreaCreateRecoveryApplicationService } from "./application/area-create-recovery.application.service";
import { AreaEventScriptPublicationRecoveryApplicationService } from "./application/area-event-script-publication-recovery.application.service";
import { AreaUpdateApplicationService, type AreaUpdateApplicationDependencies } from "./application/area-update.application.service";
import {
  AreaUpdateCandidateCompiler,
  type AreaUpdateCandidateCompilerDependencies,
} from "./application/area-update-candidate.compiler";
import { AreaUpdateRecoveryApplicationService } from "./application/area-update-recovery.application.service";
import { AreaDeleteImpactScanner } from "./application/area-delete-impact-scanner";
import {
  AreaDeleteCandidateCompiler,
  type AreaDeleteCandidateCompilerDependencies,
} from "./application/area-delete-candidate.compiler";
import {
  AreaDeleteApplicationService,
  type AreaDeleteApplicationDependencies,
} from "./application/area-delete.application.service";
import { AreaDeleteRecoveryApplicationService } from "./application/area-delete-recovery.application.service";
import { AreaRenameImpactScanner } from "./application/area-rename-impact-scanner";
import {
  AreaRenameCandidateCompiler,
  type AreaRenameCandidateCompilerDependencies,
} from "./application/area-rename-candidate.compiler";
import {
  AreaRenameApplicationService,
  type AreaRenameApplicationDependencies,
} from "./application/area-rename.application.service";
import { AreaRenameRecoveryApplicationService } from "./application/area-rename-recovery.application.service";
import {
  AreaRenamePreviewApplicationService,
  type AreaRenamePreviewApplicationDependencies,
} from "./application/area-rename-preview.application.service";
import {
  AreaDeletePreviewApplicationService,
  type AreaDeletePreviewApplicationDependencies,
} from "./application/area-delete-preview.application.service";
import { AreaDraftApplicationService } from "./application/area-draft.application.service";
import {
  AreaUpdateValidationApplicationService,
  type AreaUpdateValidationDependencies,
} from "./application/area-update-validation.application.service";
import { ModuleSnapshotBootstrapApplicationService } from "./application/module-snapshot-bootstrap.application.service";
import { AREA_DRAFT_REPOSITORY } from "./application/ports/area-draft.repository.port";
import { AREA_PROCESSING_CACHE } from "./application/ports/area-processing-cache.port";
import { AREA_REPOSITORY } from "./application/ports/area-repository.port";
import {
  ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
  type AtomicModuleSnapshotRepositoryPort,
} from "./application/ports/atomic-module-snapshot.port";
import {
  AREA_CREATE_PERSISTED_READBACK_VERIFIER,
  type AreaCreatePersistedReadbackVerifierPort,
} from "./application/ports/area-create-readback-verifier.port";
import {
  AREA_CREATE_RECOVERY_STORAGE,
  AREA_CREATE_TRANSACTION_STORAGE,
  AREA_CREATE_AUTHORIZATION,
  AREA_CREATE_CANDIDATE_VALIDATOR,
  AREA_CREATE_COMPILER,
  AREA_CREATE_IDEMPOTENCY,
  AREA_CREATE_JOURNAL,
  AREA_CREATE_MODULE_LOCK,
  AREA_CREATE_TILESET_SOURCE,
} from "./application/ports/area-create-transaction.port";
import { AREA_CREATE_MATERIALIZATION_GATE } from "./application/ports/area-create-materialization-gate.port";
import { AREA_CERTIFICATION_LEDGER_SOURCE } from "./application/ports/area-certification-ledger-source.port";
import {
  AREA_TILE_PRODUCTION_ADMISSION,
  type AreaTileProductionAdmissionPort,
} from "./application/ports/area-tile-production-admission.port";
import { AREA_UPDATE_AUTHORIZATION } from "./application/ports/area-update-validation.port";
import { AREA_DELETE_AUTHORIZATION } from "./application/ports/area-delete.port";
import {
  AREA_UPDATE_COMPILER,
  AREA_UPDATE_IDEMPOTENCY,
  AREA_UPDATE_JOURNAL,
  AREA_UPDATE_MODULE_LOCK,
  AREA_UPDATE_RECOVERY_STORAGE,
  AREA_UPDATE_TRANSACTION_STORAGE,
  type AreaUpdateIdempotencyRepositoryPort,
  type AreaUpdateTransactionJournalPort,
} from "./application/ports/area-update-transaction.port";
import {
  AREA_DELETE_COMPILER,
  AREA_DELETE_IDEMPOTENCY,
  AREA_DELETE_JOURNAL,
  AREA_DELETE_MODULE_LOCK,
  AREA_DELETE_RECOVERY_STORAGE,
  AREA_DELETE_TRANSACTION_STORAGE,
  type AreaDeleteIdempotencyRepositoryPort,
  type AreaDeleteTransactionJournalPort,
} from "./application/ports/area-delete-transaction.port";
import {
  AREA_RENAME_AUTHORIZATION,
  AREA_RENAME_COMPILER,
  AREA_RENAME_IDEMPOTENCY,
  AREA_RENAME_JOURNAL,
  AREA_RENAME_MODULE_LOCK,
  AREA_RENAME_RECOVERY_STORAGE,
  AREA_RENAME_TRANSACTION_STORAGE,
  type AreaRenameIdempotencyRepositoryPort,
  type AreaRenameTransactionJournalPort,
} from "./application/ports/area-rename-transaction.port";
import {
  AREA_RENAME_HTTP_APPLICATION,
  AREA_RENAME_PREVIEW_HTTP_APPLICATION,
} from "./application/ports/area-rename-http.port";

const AREA_CREATE_CONTROL_STORE = Symbol("AREA_CREATE_CONTROL_STORE");
const MEMORY_AREA_UPDATE_CONTROL_STORE = Symbol("MEMORY_AREA_UPDATE_CONTROL_STORE");
const AREA_UPDATE_CONTROL_STORE = Symbol("AREA_UPDATE_CONTROL_STORE");
const MEMORY_AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE = Symbol(
  "MEMORY_AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE",
);
const AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE = Symbol(
  "AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE",
);
const MEMORY_AREA_DELETE_CONTROL_STORE = Symbol("MEMORY_AREA_DELETE_CONTROL_STORE");
const AREA_DELETE_CONTROL_STORE = Symbol("AREA_DELETE_CONTROL_STORE");
const MEMORY_AREA_RENAME_CONTROL_STORE = Symbol("MEMORY_AREA_RENAME_CONTROL_STORE");
const AREA_RENAME_CONTROL_STORE = Symbol("AREA_RENAME_CONTROL_STORE");
const AREA_DRAFT_STORE = Symbol("AREA_DRAFT_STORE");

@Module({
  imports: [RuntimeSettingsModule, ModuleSnapshotsModule, CatalogModule, AuthModule],
  controllers: [
    AreasController,
    AreaEditingController,
    AreaCertificationController,
    AreaEventScriptCatalogController,
    ModuleAreaEventScriptPublicationController,
    AreaCreationProfilesController,
    ModuleAreaCreateController,
    AreaDraftController,
    ProductionAreaDraftController,
    ModuleAreaUpdateValidationController,
    ModuleAreaUpdateController,
    ModuleAreaDeletePreviewController,
    ModuleAreaDeleteController,
    ModuleAreaRenamePreviewController,
    ModuleAreaRenameController,
  ],
  providers: [
    AreasApplicationService,
    AreaEditingApplicationService,
    AreaTileCertificationQueryApplicationService,
    AreaEventScriptCatalogApplicationService,
    NestAreaEventScriptCatalogTelemetryAdapter,
    {
      provide: AREA_EVENT_SCRIPT_CATALOG_TELEMETRY,
      useExisting: NestAreaEventScriptCatalogTelemetryAdapter,
    },
    NestAreaEventScriptPublicationTelemetryAdapter,
    {
      provide: AREA_EVENT_SCRIPT_PUBLICATION_TELEMETRY,
      useExisting: NestAreaEventScriptPublicationTelemetryAdapter,
    },
    NestAreaDynamicItemBlueprintCopyTelemetryAdapter,
    {
      provide: AREA_DYNAMIC_ITEM_BLUEPRINT_COPY_TELEMETRY,
      useExisting: NestAreaDynamicItemBlueprintCopyTelemetryAdapter,
    },
    NestAreaStoreCommerceTelemetryAdapter,
    {
      provide: AREA_STORE_COMMERCE_TELEMETRY,
      useExisting: NestAreaStoreCommerceTelemetryAdapter,
    },
    NestAreaStoreScriptResRefsTelemetryAdapter,
    {
      provide: AREA_STORE_SCRIPT_RESREFS_TELEMETRY,
      useExisting: NestAreaStoreScriptResRefsTelemetryAdapter,
    },
    NestAreaTriggerScriptResRefsTelemetryAdapter,
    {
      provide: AREA_TRIGGER_SCRIPT_RESREFS_TELEMETRY,
      useExisting: NestAreaTriggerScriptResRefsTelemetryAdapter,
    },
    NestAreaTriggerTransitionStorageTelemetryAdapter,
    {
      provide: AREA_TRIGGER_TRANSITION_STORAGE_TELEMETRY,
      useExisting: NestAreaTriggerTransitionStorageTelemetryAdapter,
    },
    NestAreaTriggerCorePropertiesTelemetryAdapter,
    {
      provide: AREA_TRIGGER_CORE_PROPERTIES_TELEMETRY,
      useExisting: NestAreaTriggerCorePropertiesTelemetryAdapter,
    },
    NestAreaTriggerTrapPropertiesTelemetryAdapter,
    {
      provide: AREA_TRIGGER_TRAP_PROPERTIES_TELEMETRY,
      useExisting: NestAreaTriggerTrapPropertiesTelemetryAdapter,
    },
    NestAreaTriggerVariableTableTelemetryAdapter,
    {
      provide: AREA_TRIGGER_VARIABLE_TABLE_TELEMETRY,
      useExisting: NestAreaTriggerVariableTableTelemetryAdapter,
    },
    NestAreaStoreVariableTableTelemetryAdapter,
    {
      provide: AREA_STORE_VARIABLE_TABLE_TELEMETRY,
      useExisting: NestAreaStoreVariableTableTelemetryAdapter,
    },
    NestAreaStoreRestrictionsTelemetryAdapter,
    {
      provide: AREA_STORE_RESTRICTIONS_TELEMETRY,
      useExisting: NestAreaStoreRestrictionsTelemetryAdapter,
    },
    NestAreaStoreInventoryTelemetryAdapter,
    {
      provide: AREA_STORE_INVENTORY_TELEMETRY,
      useExisting: NestAreaStoreInventoryTelemetryAdapter,
    },
    {
      provide: NWN_SCRIPT_COMPILER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        config.nwnScriptCompilerConfigured
          ? new NwnScriptCompilerAdapter({
              executablePath: config.nwnScriptCompilerPath,
              expectedExecutableSha256: config.nwnScriptCompilerSha256,
              expectedVersionMarker: config.nwnScriptCompilerVersionMarker,
              languageSpecPath: config.nwnScriptLanguageSpecPath,
              expectedLanguageSpecSha256: config.nwnScriptLanguageSpecSha256,
              runtimeLibraryDirectories: config.nwnScriptRuntimeLibraryDirectories,
              timeoutMs: config.nwnScriptCompilerTimeoutMs,
              maxCapturedOutputBytes: config.nwnScriptCompilerOutputBytes,
              maxArtifactBytes: config.nwnScriptCompilerArtifactBytes,
            })
          : new DisabledNwnScriptCompilerAdapter(),
    },
    AreaCreateApplicationService,
    AreaCreateRecoveryApplicationService,
    AreaEventScriptPublicationRecoveryApplicationService,
    AreaUpdateRecoveryApplicationService,
    AreaDeleteRecoveryApplicationService,
    AreaRenameRecoveryApplicationService,
    AreaDraftApplicationService,
    AuthAreaUpdateAuthorizationAdapter,
    AuthAreaDeleteAuthorizationAdapter,
    AuthAreaRenameAuthorizationAdapter,
    MemoryAreaDraftRepository,
    MySqlAreaDraftRepository,
    {
      provide: AREA_DRAFT_STORE,
      inject: [AppConfigService, MemoryAreaDraftRepository, MySqlAreaDraftRepository],
      useFactory: (
        config: AppConfigService,
        memory: MemoryAreaDraftRepository,
        mysql: MySqlAreaDraftRepository,
      ) => (config.useMemoryInfrastructure ? memory : mysql),
    },
    { provide: AREA_DRAFT_REPOSITORY, useExisting: AREA_DRAFT_STORE },
    StaticAreaRepository,
    AuroraAreaCreatePersistedReadbackVerifier,
    AuroraAreaUpdatePersistedReadbackVerifier,
    AuthAreaCreateAuthorizationAdapter,
    AreaEditingTilesetSourceAdapter,
    NwnBaseKeyAreaObjectBlueprintSourceAdapter,
    AuroraAreaCreateCompiler,
    AuroraAreaCreateCandidateValidator,
    StaticAreaCreateMaterializationGateAdapter,
    FileAreaCertificationLedgerSourceAdapter,
    ModuleSnapshotAreaRepository,
    MemoryAreaProcessingCacheRepository,
    S3AreaProcessingCacheRepository,
    LayeredAreaProcessingCacheRepository,
    MySqlAreaLifecycleMutationControlStore,
    MySqlAreaEventScriptPublicationControlStore,
    MySqlAreaDeleteControlStore,
    MySqlAreaRenameControlStore,
    {
      provide: AREA_CREATE_CONTROL_STORE,
      inject: [AppConfigService, MemoryAreaCreateControlStore, MySqlAreaCreateControlStore],
      useFactory: (
        config: AppConfigService,
        memory: MemoryAreaCreateControlStore,
        mysql: MySqlAreaCreateControlStore,
      ) => (config.useMemoryInfrastructure ? memory : mysql),
    },
    { provide: AREA_CREATE_MODULE_LOCK, useExisting: AREA_CREATE_CONTROL_STORE },
    { provide: AREA_CREATE_IDEMPOTENCY, useExisting: AREA_CREATE_CONTROL_STORE },
    { provide: AREA_CREATE_JOURNAL, useExisting: AREA_CREATE_CONTROL_STORE },
    {
      provide: MEMORY_AREA_UPDATE_CONTROL_STORE,
      inject: [MemoryAreaCreateControlStore],
      useFactory: (locks: MemoryAreaCreateControlStore) =>
        new MemoryAreaLifecycleMutationControlStore(locks),
    },
    {
      provide: AREA_UPDATE_CONTROL_STORE,
      inject: [
        AppConfigService,
        MEMORY_AREA_UPDATE_CONTROL_STORE,
        MySqlAreaLifecycleMutationControlStore,
      ],
      useFactory: (
        config: AppConfigService,
        memory: AreaUpdateIdempotencyRepositoryPort & AreaUpdateTransactionJournalPort,
        mysql: MySqlAreaLifecycleMutationControlStore,
      ) => (config.useMemoryInfrastructure ? memory : mysql),
    },
    { provide: AREA_UPDATE_MODULE_LOCK, useExisting: AREA_CREATE_MODULE_LOCK },
    { provide: AREA_UPDATE_IDEMPOTENCY, useExisting: AREA_UPDATE_CONTROL_STORE },
    { provide: AREA_UPDATE_JOURNAL, useExisting: AREA_UPDATE_CONTROL_STORE },
    {
      provide: MEMORY_AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE,
      inject: [MemoryAreaCreateControlStore],
      useFactory: (locks: MemoryAreaCreateControlStore) =>
        new MemoryAreaEventScriptPublicationControlStore(locks),
    },
    {
      provide: AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE,
      inject: [
        AppConfigService,
        MEMORY_AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE,
        MySqlAreaEventScriptPublicationControlStore,
      ],
      useFactory: (
        config: AppConfigService,
        memory: AreaEventScriptPublicationIdempotencyPort &
          AreaEventScriptPublicationJournalPort,
        mysql: MySqlAreaEventScriptPublicationControlStore,
      ) => (config.useMemoryInfrastructure ? memory : mysql),
    },
    {
      provide: AREA_EVENT_SCRIPT_PUBLICATION_IDEMPOTENCY,
      useExisting: AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE,
    },
    {
      provide: AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL,
      useExisting: AREA_EVENT_SCRIPT_PUBLICATION_CONTROL_STORE,
    },
    {
      provide: MEMORY_AREA_DELETE_CONTROL_STORE,
      inject: [MemoryAreaCreateControlStore],
      useFactory: (locks: MemoryAreaCreateControlStore) =>
        new MemoryAreaDeleteControlStore(locks),
    },
    {
      provide: AREA_DELETE_CONTROL_STORE,
      inject: [
        AppConfigService,
        MEMORY_AREA_DELETE_CONTROL_STORE,
        MySqlAreaDeleteControlStore,
      ],
      useFactory: (
        config: AppConfigService,
        memory: AreaDeleteIdempotencyRepositoryPort & AreaDeleteTransactionJournalPort,
        mysql: MySqlAreaDeleteControlStore,
      ) => (config.useMemoryInfrastructure ? memory : mysql),
    },
    { provide: AREA_DELETE_MODULE_LOCK, useExisting: AREA_CREATE_MODULE_LOCK },
    { provide: AREA_DELETE_IDEMPOTENCY, useExisting: AREA_DELETE_CONTROL_STORE },
    { provide: AREA_DELETE_JOURNAL, useExisting: AREA_DELETE_CONTROL_STORE },
    {
      provide: MEMORY_AREA_RENAME_CONTROL_STORE,
      inject: [MemoryAreaCreateControlStore],
      useFactory: (locks: MemoryAreaCreateControlStore) =>
        new MemoryAreaRenameControlStore(locks),
    },
    {
      provide: AREA_RENAME_CONTROL_STORE,
      inject: [
        AppConfigService,
        MEMORY_AREA_RENAME_CONTROL_STORE,
        MySqlAreaRenameControlStore,
      ],
      useFactory: (
        config: AppConfigService,
        memory: AreaRenameIdempotencyRepositoryPort & AreaRenameTransactionJournalPort,
        mysql: MySqlAreaRenameControlStore,
      ) => (config.useMemoryInfrastructure ? memory : mysql),
    },
    { provide: AREA_RENAME_MODULE_LOCK, useExisting: AREA_CREATE_MODULE_LOCK },
    { provide: AREA_RENAME_IDEMPOTENCY, useExisting: AREA_RENAME_CONTROL_STORE },
    { provide: AREA_RENAME_JOURNAL, useExisting: AREA_RENAME_CONTROL_STORE },
    { provide: AREA_CREATE_AUTHORIZATION, useExisting: AuthAreaCreateAuthorizationAdapter },
    { provide: AREA_UPDATE_AUTHORIZATION, useExisting: AuthAreaUpdateAuthorizationAdapter },
    { provide: AREA_DELETE_AUTHORIZATION, useExisting: AuthAreaDeleteAuthorizationAdapter },
    { provide: AREA_RENAME_AUTHORIZATION, useExisting: AuthAreaRenameAuthorizationAdapter },
    { provide: AREA_CREATE_TILESET_SOURCE, useExisting: AreaEditingTilesetSourceAdapter },
    {
      provide: AREA_CERTIFICATION_LEDGER_SOURCE,
      useExisting: FileAreaCertificationLedgerSourceAdapter,
    },
    {
      provide: AREA_TILE_PRODUCTION_ADMISSION,
      useExisting: AreaTileCertificationQueryApplicationService,
    },
    { provide: AREA_CREATE_COMPILER, useExisting: AuroraAreaCreateCompiler },
    { provide: AREA_CREATE_CANDIDATE_VALIDATOR, useExisting: AuroraAreaCreateCandidateValidator },
    {
      provide: AREA_CREATE_MATERIALIZATION_GATE,
      useExisting: StaticAreaCreateMaterializationGateAdapter,
    },
    {
      provide: AREA_CREATE_PERSISTED_READBACK_VERIFIER,
      useExisting: AuroraAreaCreatePersistedReadbackVerifier,
    },
    {
      provide: AREA_CREATE_TRANSACTION_STORAGE,
      inject: [
        ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
        AREA_CREATE_PERSISTED_READBACK_VERIFIER,
      ],
      useFactory: (
        repository: AtomicModuleSnapshotRepositoryPort,
        verifier: AreaCreatePersistedReadbackVerifierPort,
      ) => new AtomicAreaCreateTransactionStorageAdapter(repository, verifier),
    },
    {
      provide: AREA_CREATE_RECOVERY_STORAGE,
      useExisting: AREA_CREATE_TRANSACTION_STORAGE,
    },
    {
      provide: AREA_UPDATE_TRANSACTION_STORAGE,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY, AuroraAreaUpdatePersistedReadbackVerifier],
      useFactory: (
        repository: AtomicModuleSnapshotRepositoryPort,
        verifier: AreaCreatePersistedReadbackVerifierPort,
      ) => new AtomicAreaCreateTransactionStorageAdapter(repository, verifier),
    },
    { provide: AREA_UPDATE_RECOVERY_STORAGE, useExisting: AREA_UPDATE_TRANSACTION_STORAGE },
    {
      provide: AREA_DELETE_TRANSACTION_STORAGE,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY],
      useFactory: (repository: AtomicModuleSnapshotRepositoryPort) =>
        new AtomicAreaDeleteTransactionStorageAdapter(repository),
    },
    { provide: AREA_DELETE_RECOVERY_STORAGE, useExisting: AREA_DELETE_TRANSACTION_STORAGE },
    {
      provide: AREA_RENAME_TRANSACTION_STORAGE,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY],
      useFactory: (repository: AtomicModuleSnapshotRepositoryPort) =>
        new AtomicAreaRenameTransactionStorageAdapter(repository),
    },
    { provide: AREA_RENAME_RECOVERY_STORAGE, useExisting: AREA_RENAME_TRANSACTION_STORAGE },
    {
      provide: NWN_SCRIPT_SOURCE_SNAPSHOT,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY],
      useFactory: (repository: AtomicModuleSnapshotRepositoryPort) =>
        new CommittedNwnScriptSourceSnapshotAdapter(repository),
    },
    {
      provide: AREA_EVENT_SCRIPT_SOURCE_QUERY,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY],
      useFactory: (repository: AtomicModuleSnapshotRepositoryPort) =>
        new CommittedAreaEventScriptSourceQueryAdapter(repository),
    },
    {
      provide: AREA_EVENT_SCRIPT_PUBLICATION_STORAGE,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY],
      useFactory: (repository: AtomicModuleSnapshotRepositoryPort) =>
        new AtomicAreaEventScriptPublicationStorageAdapter(repository),
    },
    {
      provide: AREA_EVENT_SCRIPT_PUBLICATION_RECOVERY_STORAGE,
      useExisting: AREA_EVENT_SCRIPT_PUBLICATION_STORAGE,
    },
    {
      provide: AreaEventScriptPublicationApplicationService,
      inject: [
        ModuleSnapshotBootstrapApplicationService,
        AREA_UPDATE_AUTHORIZATION,
        NWN_SCRIPT_SOURCE_SNAPSHOT,
        AREA_EVENT_SCRIPT_SOURCE_QUERY,
        NWN_SCRIPT_COMPILER,
        AREA_CREATE_MODULE_LOCK,
        AREA_EVENT_SCRIPT_PUBLICATION_IDEMPOTENCY,
        AREA_EVENT_SCRIPT_PUBLICATION_STORAGE,
        AREA_EVENT_SCRIPT_PUBLICATION_JOURNAL,
        AREA_EVENT_SCRIPT_PUBLICATION_TELEMETRY,
        ModuleSnapshotAreaRepository,
        AreaEditingApplicationService,
        CatalogApplicationService,
      ],
      useFactory: (
        bootstrap: AreaEventScriptPublicationApplicationDependencies["bootstrap"],
        authorization: AreaEventScriptPublicationApplicationDependencies["authorization"],
        sourceSnapshot: AreaEventScriptPublicationApplicationDependencies["sourceSnapshot"],
        sourceQuery: AreaEventScriptPublicationApplicationDependencies["sourceQuery"],
        compiler: AreaEventScriptPublicationApplicationDependencies["compiler"],
        lock: AreaEventScriptPublicationApplicationDependencies["lock"],
        idempotency: AreaEventScriptPublicationApplicationDependencies["idempotency"],
        storage: AreaEventScriptPublicationApplicationDependencies["storage"],
        journal: AreaEventScriptPublicationApplicationDependencies["journal"],
        telemetry: AreaEventScriptPublicationApplicationDependencies["telemetry"],
        areas: ModuleSnapshotAreaRepository,
        editing: AreaEditingApplicationService,
        catalog: CatalogApplicationService,
      ) => new AreaEventScriptPublicationApplicationService({
        bootstrap,
        authorization,
        sourceSnapshot,
        sourceQuery,
        compiler,
        lock,
        idempotency,
        storage,
        journal,
        telemetry,
        ids: { nextTransactionId: () => randomUUID() },
        clock: { nowIso: () => new Date().toISOString() },
        caches: {
          invalidateAreas: () => areas.invalidateSnapshotIndex(),
          invalidateEditing: () => editing.invalidateSnapshotCache(),
          invalidateCatalog: () => catalog.invalidateTemplateSnapshotCaches(),
        },
      }),
    },
    {
      provide: AREA_UPDATE_COMPILER,
      inject: [
        ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
        AREA_DRAFT_REPOSITORY,
        AreaEditingApplicationService,
        NwnBaseKeyAreaObjectBlueprintSourceAdapter,
        TEMPLATE_CATALOG_REPOSITORY,
        AREA_DYNAMIC_ITEM_BLUEPRINT_COPY_TELEMETRY,
        AREA_STORE_COMMERCE_TELEMETRY,
        AREA_STORE_SCRIPT_RESREFS_TELEMETRY,
        AREA_TRIGGER_SCRIPT_RESREFS_TELEMETRY,
        AREA_TRIGGER_TRANSITION_STORAGE_TELEMETRY,
        AREA_TRIGGER_CORE_PROPERTIES_TELEMETRY,
        AREA_TRIGGER_TRAP_PROPERTIES_TELEMETRY,
        AREA_TRIGGER_VARIABLE_TABLE_TELEMETRY,
        AREA_STORE_VARIABLE_TABLE_TELEMETRY,
        AREA_STORE_RESTRICTIONS_TELEMETRY,
        AREA_STORE_INVENTORY_TELEMETRY,
      ],
      useFactory: (
        repository: AreaUpdateCandidateCompilerDependencies["repository"],
        drafts: AreaUpdateCandidateCompilerDependencies["drafts"],
        areaEditing: AreaUpdateCandidateCompilerDependencies["areaEditing"],
        blueprints: NwnBaseKeyAreaObjectBlueprintSourceAdapter,
        appearanceCatalog: TemplateCatalogRepositoryPort,
        dynamicItemTelemetry: AreaUpdateCandidateCompilerDependencies["dynamicItemTelemetry"],
        storeCommerceTelemetry: AreaUpdateCandidateCompilerDependencies["storeCommerceTelemetry"],
        storeScriptResRefsTelemetry: AreaUpdateCandidateCompilerDependencies["storeScriptResRefsTelemetry"],
        triggerScriptResRefsTelemetry: AreaUpdateCandidateCompilerDependencies["triggerScriptResRefsTelemetry"],
        triggerTransitionStorageTelemetry: AreaUpdateCandidateCompilerDependencies["triggerTransitionStorageTelemetry"],
        triggerCorePropertiesTelemetry: AreaUpdateCandidateCompilerDependencies["triggerCorePropertiesTelemetry"],
        triggerTrapPropertiesTelemetry: AreaUpdateCandidateCompilerDependencies["triggerTrapPropertiesTelemetry"],
        triggerVariableTableTelemetry: AreaUpdateCandidateCompilerDependencies["triggerVariableTableTelemetry"],
        storeVariableTableTelemetry: AreaUpdateCandidateCompilerDependencies["storeVariableTableTelemetry"],
        storeRestrictionsTelemetry: AreaUpdateCandidateCompilerDependencies["storeRestrictionsTelemetry"],
        storeInventoryTelemetry: AreaUpdateCandidateCompilerDependencies["storeInventoryTelemetry"],
      ) => new AreaUpdateCandidateCompiler({
        repository,
        drafts,
        areaEditing,
        blueprints,
        appearanceCatalog,
        dynamicItemTelemetry,
        storeCommerceTelemetry,
        storeScriptResRefsTelemetry,
        triggerScriptResRefsTelemetry,
        triggerTransitionStorageTelemetry,
        triggerCorePropertiesTelemetry,
        triggerTrapPropertiesTelemetry,
        triggerVariableTableTelemetry,
        storeVariableTableTelemetry,
        storeRestrictionsTelemetry,
        storeInventoryTelemetry,
      }),
    },
    {
      provide: AreaUpdateApplicationService,
      inject: [
        ModuleSnapshotBootstrapApplicationService,
        AREA_UPDATE_AUTHORIZATION,
        AREA_UPDATE_MODULE_LOCK,
        AREA_UPDATE_IDEMPOTENCY,
        AREA_UPDATE_TRANSACTION_STORAGE,
        AREA_UPDATE_COMPILER,
        AREA_TILE_PRODUCTION_ADMISSION,
        AREA_UPDATE_JOURNAL,
        ModuleSnapshotAreaRepository,
        AreaEditingApplicationService,
        CatalogApplicationService,
      ],
      useFactory: (
        bootstrap: AreaUpdateApplicationDependencies["bootstrap"],
        authorization: AreaUpdateApplicationDependencies["authorization"],
        lock: AreaUpdateApplicationDependencies["lock"],
        idempotency: AreaUpdateApplicationDependencies["idempotency"],
        storage: AreaUpdateApplicationDependencies["storage"],
        compiler: AreaUpdateApplicationDependencies["compiler"],
        tileAdmission: AreaTileProductionAdmissionPort,
        journal: AreaUpdateApplicationDependencies["journal"],
        areas: ModuleSnapshotAreaRepository,
        editing: AreaEditingApplicationService,
        catalog: CatalogApplicationService,
      ) => new AreaUpdateApplicationService({
        bootstrap,
        authorization,
        lock,
        idempotency,
        storage,
        compiler,
        tileAdmission,
        journal,
        ids: { nextTransactionId: () => randomUUID() },
        clock: { nowIso: () => new Date().toISOString() },
        caches: {
          invalidateAreas: () => areas.invalidateSnapshotIndex(),
          invalidateEditing: () => editing.invalidateSnapshotCache(),
          invalidateCatalog: () => catalog.invalidateTemplateSnapshotCaches(),
        },
      }),
    },
    {
      provide: AreaUpdateValidationApplicationService,
      inject: [
        ModuleSnapshotBootstrapApplicationService,
        AREA_UPDATE_AUTHORIZATION,
        AREA_UPDATE_TRANSACTION_STORAGE,
        AREA_UPDATE_COMPILER,
        AREA_TILE_PRODUCTION_ADMISSION,
      ],
      useFactory: (
        bootstrap: AreaUpdateValidationDependencies["bootstrap"],
        authorization: AreaUpdateValidationDependencies["authorization"],
        storage: AreaUpdateValidationDependencies["storage"],
        compiler: AreaUpdateValidationDependencies["compiler"],
        tileAdmission: AreaUpdateValidationDependencies["tileAdmission"],
      ) =>
        new AreaUpdateValidationApplicationService({
          bootstrap,
          authorization,
          storage,
          compiler,
          tileAdmission,
          ids: { nextValidationId: () => randomUUID() },
          clock: { now: () => new Date() },
        }),
    },
    {
      provide: AreaDeleteImpactScanner,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY],
      useFactory: (repository: AtomicModuleSnapshotRepositoryPort) =>
        new AreaDeleteImpactScanner(repository),
    },
    {
      provide: AreaRenameImpactScanner,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY],
      useFactory: (repository: AtomicModuleSnapshotRepositoryPort) =>
        new AreaRenameImpactScanner(repository),
    },
    {
      provide: AreaRenamePreviewApplicationService,
      inject: [
        ModuleSnapshotBootstrapApplicationService,
        AREA_RENAME_AUTHORIZATION,
        AreaRenameImpactScanner,
      ],
      useFactory: (
        bootstrap: AreaRenamePreviewApplicationDependencies["bootstrap"],
        authorization: AreaRenamePreviewApplicationDependencies["authorization"],
        scanner: AreaRenamePreviewApplicationDependencies["scanner"],
      ) => new AreaRenamePreviewApplicationService({ bootstrap, authorization, scanner }),
    },
    {
      provide: AREA_RENAME_COMPILER,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY, AreaRenameImpactScanner],
      useFactory: (
        repository: AreaRenameCandidateCompilerDependencies["repository"],
        scanner: AreaRenameCandidateCompilerDependencies["scanner"],
      ) => new AreaRenameCandidateCompiler({ repository, scanner }),
    },
    {
      provide: AreaRenameApplicationService,
      inject: [
        ModuleSnapshotBootstrapApplicationService,
        AREA_RENAME_AUTHORIZATION,
        AREA_RENAME_MODULE_LOCK,
        AREA_RENAME_IDEMPOTENCY,
        AREA_RENAME_TRANSACTION_STORAGE,
        AREA_RENAME_COMPILER,
        AREA_RENAME_JOURNAL,
        ModuleSnapshotAreaRepository,
        AreaEditingApplicationService,
        CatalogApplicationService,
      ],
      useFactory: (
        bootstrap: AreaRenameApplicationDependencies["bootstrap"],
        authorization: AreaRenameApplicationDependencies["authorization"],
        lock: AreaRenameApplicationDependencies["lock"],
        idempotency: AreaRenameApplicationDependencies["idempotency"],
        storage: AreaRenameApplicationDependencies["storage"],
        compiler: AreaRenameApplicationDependencies["compiler"],
        journal: AreaRenameApplicationDependencies["journal"],
        areas: ModuleSnapshotAreaRepository,
        editing: AreaEditingApplicationService,
        catalog: CatalogApplicationService,
      ) => new AreaRenameApplicationService({
        bootstrap,
        authorization,
        lock,
        idempotency,
        storage,
        compiler,
        journal,
        ids: { nextTransactionId: () => randomUUID() },
        clock: { nowIso: () => new Date().toISOString() },
        caches: {
          invalidateAreas: () => areas.invalidateSnapshotIndex(),
          invalidateEditing: () => editing.invalidateSnapshotCache(),
          invalidateCatalog: () => catalog.invalidateTemplateSnapshotCaches(),
        },
      }),
    },
    { provide: AREA_RENAME_HTTP_APPLICATION, useExisting: AreaRenameApplicationService },
    {
      provide: AREA_RENAME_PREVIEW_HTTP_APPLICATION,
      useExisting: AreaRenamePreviewApplicationService,
    },
    {
      provide: AreaDeletePreviewApplicationService,
      inject: [
        ModuleSnapshotBootstrapApplicationService,
        AREA_DELETE_AUTHORIZATION,
        AreaDeleteImpactScanner,
      ],
      useFactory: (
        bootstrap: AreaDeletePreviewApplicationDependencies["bootstrap"],
        authorization: AreaDeletePreviewApplicationDependencies["authorization"],
        scanner: AreaDeletePreviewApplicationDependencies["scanner"],
      ) => new AreaDeletePreviewApplicationService({ bootstrap, authorization, scanner }),
    },
    {
      provide: AREA_DELETE_COMPILER,
      inject: [ATOMIC_MODULE_SNAPSHOT_REPOSITORY, AreaDeleteImpactScanner],
      useFactory: (
        repository: AreaDeleteCandidateCompilerDependencies["repository"],
        scanner: AreaDeleteCandidateCompilerDependencies["scanner"],
      ) => new AreaDeleteCandidateCompiler({ repository, scanner }),
    },
    {
      provide: AreaDeleteApplicationService,
      inject: [
        ModuleSnapshotBootstrapApplicationService,
        AREA_DELETE_AUTHORIZATION,
        AREA_DELETE_MODULE_LOCK,
        AREA_DELETE_IDEMPOTENCY,
        AREA_DELETE_TRANSACTION_STORAGE,
        AREA_DELETE_COMPILER,
        AREA_DELETE_JOURNAL,
        ModuleSnapshotAreaRepository,
        AreaEditingApplicationService,
        CatalogApplicationService,
      ],
      useFactory: (
        bootstrap: AreaDeleteApplicationDependencies["bootstrap"],
        authorization: AreaDeleteApplicationDependencies["authorization"],
        lock: AreaDeleteApplicationDependencies["lock"],
        idempotency: AreaDeleteApplicationDependencies["idempotency"],
        storage: AreaDeleteApplicationDependencies["storage"],
        compiler: AreaDeleteApplicationDependencies["compiler"],
        journal: AreaDeleteApplicationDependencies["journal"],
        areas: ModuleSnapshotAreaRepository,
        editing: AreaEditingApplicationService,
        catalog: CatalogApplicationService,
      ) => new AreaDeleteApplicationService({
        bootstrap,
        authorization,
        lock,
        idempotency,
        storage,
        compiler,
        journal,
        ids: { nextTransactionId: () => randomUUID() },
        clock: { nowIso: () => new Date().toISOString() },
        caches: {
          invalidateAreas: () => areas.invalidateSnapshotIndex(),
          invalidateEditing: () => editing.invalidateSnapshotCache(),
          invalidateCatalog: () => catalog.invalidateTemplateSnapshotCaches(),
        },
      }),
    },
    {
      provide: AREA_REPOSITORY,
      inject: [AppConfigService, ModuleSnapshotAreaRepository, StaticAreaRepository],
      useFactory: (
        config: AppConfigService,
        moduleSnapshotRepository: ModuleSnapshotAreaRepository,
        staticRepository: StaticAreaRepository
      ) => (config.isTest ? staticRepository : moduleSnapshotRepository)
    },
    {
      provide: AREA_PROCESSING_CACHE,
      inject: [
        AppConfigService,
        LayeredAreaProcessingCacheRepository,
        MemoryAreaProcessingCacheRepository
      ],
      useFactory: (
        config: AppConfigService,
        layeredCache: LayeredAreaProcessingCacheRepository,
        memoryCache: MemoryAreaProcessingCacheRepository
      ) => (config.useMemoryInfrastructure ? memoryCache : layeredCache)
    }
  ],
  exports: [
    AREA_REPOSITORY,
    ModuleSnapshotsModule,
    AREA_CREATE_TRANSACTION_STORAGE,
    AREA_CREATE_RECOVERY_STORAGE,
    AreasApplicationService,
    AreaCreateApplicationService,
    AreaCreateRecoveryApplicationService,
    AreaEventScriptPublicationRecoveryApplicationService,
    AreaDeleteApplicationService,
    AreaDeleteRecoveryApplicationService,
    AreaRenameApplicationService,
    AreaRenameRecoveryApplicationService,
    NWN_SCRIPT_COMPILER,
  ]
})
export class AreasModule {}
