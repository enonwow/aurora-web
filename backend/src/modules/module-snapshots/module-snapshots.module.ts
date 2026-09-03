import { Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { RuntimeSettingsModule } from "../runtime-settings/runtime-settings.module";
import { MemoryAreaCreateControlStore } from "../areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAtomicModuleSnapshotRepository } from "../areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { MySqlAreaCreateControlStore } from "../areas/adapters/outbound/mysql/mysql-area-create-control-store";
import { MySqlAtomicModuleSnapshotRepository } from "../areas/adapters/outbound/mysql/mysql-atomic-module-snapshot.repository";
import { ModuleSnapshotBootstrapApplicationService } from "../areas/application/module-snapshot-bootstrap.application.service";
import { CommittedModuleSnapshotReaderService } from "./adapters/committed-module-snapshot-reader.service";
import { COMMITTED_MODULE_SNAPSHOT_READER } from "./application/ports/committed-module-snapshot-reader.port";
import {
  ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
  type AtomicModuleSnapshotRepositoryPort,
} from "../areas/application/ports/atomic-module-snapshot.port";

@Module({
  imports: [RuntimeSettingsModule],
  providers: [
    MemoryAreaCreateControlStore,
    MySqlAreaCreateControlStore,
    MySqlAtomicModuleSnapshotRepository,
    {
      provide: ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
      inject: [
        AppConfigService,
        MemoryAreaCreateControlStore,
        MySqlAtomicModuleSnapshotRepository,
      ],
      useFactory: (
        config: AppConfigService,
        memoryControl: MemoryAreaCreateControlStore,
        mysqlRepository: MySqlAtomicModuleSnapshotRepository,
      ): AtomicModuleSnapshotRepositoryPort =>
        config.useMemoryInfrastructure
          ? new MemoryAtomicModuleSnapshotRepository(memoryControl)
          : mysqlRepository,
    },
    ModuleSnapshotBootstrapApplicationService,
    CommittedModuleSnapshotReaderService,
    {
      provide: COMMITTED_MODULE_SNAPSHOT_READER,
      useExisting: CommittedModuleSnapshotReaderService,
    },
  ],
  exports: [
    ATOMIC_MODULE_SNAPSHOT_REPOSITORY,
    MemoryAreaCreateControlStore,
    MySqlAreaCreateControlStore,
    ModuleSnapshotBootstrapApplicationService,
    COMMITTED_MODULE_SNAPSHOT_READER,
  ],
})
export class ModuleSnapshotsModule {}
