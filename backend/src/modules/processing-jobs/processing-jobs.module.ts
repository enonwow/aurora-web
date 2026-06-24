import { Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { AreasModule } from "../areas/areas.module";
import { CatalogModule } from "../catalog/catalog.module";
import { VfxModule } from "../vfx/vfx.module";
import { ProcessingJobsController } from "./adapters/inbound/http/processing-jobs.controller";
import { MemoryProcessingJobsRepository } from "./adapters/outbound/memory/memory-processing-jobs.repository";
import { NoopProcessingJobsPublisher } from "./adapters/outbound/memory/noop-processing-jobs.publisher";
import { MySqlProcessingJobsRepository } from "./adapters/outbound/mysql/mysql-processing-jobs.repository";
import { RedisProcessingJobsPublisher } from "./adapters/outbound/redis/redis-processing-jobs.publisher";
import { ProcessingJobsApplicationService } from "./application/processing-jobs.application.service";
import {
  PROCESSING_JOBS_PUBLISHER
} from "./application/ports/processing-jobs-publisher.port";
import {
  PROCESSING_JOBS_REPOSITORY
} from "./application/ports/processing-jobs-repository.port";

@Module({
  imports: [CatalogModule, AreasModule, VfxModule],
  controllers: [ProcessingJobsController],
  providers: [
    ProcessingJobsApplicationService,
    MemoryProcessingJobsRepository,
    MySqlProcessingJobsRepository,
    NoopProcessingJobsPublisher,
    RedisProcessingJobsPublisher,
    {
      provide: PROCESSING_JOBS_REPOSITORY,
      inject: [AppConfigService, MemoryProcessingJobsRepository, MySqlProcessingJobsRepository],
      useFactory: (
        config: AppConfigService,
        memoryRepository: MemoryProcessingJobsRepository,
        mysqlRepository: MySqlProcessingJobsRepository
      ) => (config.useMemoryInfrastructure ? memoryRepository : mysqlRepository)
    },
    {
      provide: PROCESSING_JOBS_PUBLISHER,
      inject: [AppConfigService, NoopProcessingJobsPublisher, RedisProcessingJobsPublisher],
      useFactory: (
        config: AppConfigService,
        noopPublisher: NoopProcessingJobsPublisher,
        redisPublisher: RedisProcessingJobsPublisher
      ) => (config.useMemoryInfrastructure ? noopPublisher : redisPublisher)
    }
  ],
  exports: [ProcessingJobsApplicationService]
})
export class ProcessingJobsModule {}
