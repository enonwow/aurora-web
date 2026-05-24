import { Module } from "@nestjs/common";
import { AreasModule } from "../areas/areas.module";
import { CatalogModule } from "../catalog/catalog.module";
import { ProcessingGraphController } from "./adapters/inbound/http/processing-graph.controller";
import { FileProcessingGraphSnapshotRepository } from "./adapters/outbound/file/file-processing-graph-snapshot.repository";
import {
  PROCESSING_GRAPH_SNAPSHOT_REPOSITORY
} from "./application/ports/processing-graph-snapshot-repository.port";
import { ProcessingDeltaRebuildApplicationService } from "./application/processing-delta-rebuild.application.service";
import { ProcessingGraphApplicationService } from "./application/processing-graph.application.service";

@Module({
  imports: [AreasModule, CatalogModule],
  controllers: [ProcessingGraphController],
  providers: [
    ProcessingGraphApplicationService,
    ProcessingDeltaRebuildApplicationService,
    FileProcessingGraphSnapshotRepository,
    {
      provide: PROCESSING_GRAPH_SNAPSHOT_REPOSITORY,
      useExisting: FileProcessingGraphSnapshotRepository
    }
  ]
})
export class ProcessingGraphModule {}
