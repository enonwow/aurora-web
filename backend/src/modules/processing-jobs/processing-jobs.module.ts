import { Module } from "@nestjs/common";
import { AreasModule } from "../areas/areas.module";
import { CatalogModule } from "../catalog/catalog.module";
import { ProcessingJobsController } from "./adapters/inbound/http/processing-jobs.controller";
import { ProcessingJobsApplicationService } from "./application/processing-jobs.application.service";

@Module({
  imports: [CatalogModule, AreasModule],
  controllers: [ProcessingJobsController],
  providers: [ProcessingJobsApplicationService],
  exports: [ProcessingJobsApplicationService]
})
export class ProcessingJobsModule {}
