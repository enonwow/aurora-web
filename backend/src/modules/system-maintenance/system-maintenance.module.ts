import { Global, Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { SystemMaintenanceController } from "./adapters/inbound/http/system-maintenance.controller";
import { MemorySystemMaintenanceRepository } from "./adapters/outbound/memory/memory-system-maintenance.repository";
import { MySqlSystemMaintenanceRepository } from "./adapters/outbound/mysql/mysql-system-maintenance.repository";
import { SystemMaintenanceApplicationService } from "./application/system-maintenance.application.service";
import { SYSTEM_MAINTENANCE_REPOSITORY } from "./application/ports/system-maintenance-repository.port";

@Global()
@Module({
  controllers: [SystemMaintenanceController],
  providers: [
    SystemMaintenanceApplicationService,
    MemorySystemMaintenanceRepository,
    MySqlSystemMaintenanceRepository,
    {
      provide: SYSTEM_MAINTENANCE_REPOSITORY,
      inject: [
        AppConfigService,
        MemorySystemMaintenanceRepository,
        MySqlSystemMaintenanceRepository
      ],
      useFactory: (
        config: AppConfigService,
        memoryRepository: MemorySystemMaintenanceRepository,
        mysqlRepository: MySqlSystemMaintenanceRepository
      ) => (config.useMemoryInfrastructure ? memoryRepository : mysqlRepository)
    }
  ],
  exports: [SystemMaintenanceApplicationService]
})
export class SystemMaintenanceModule {}
