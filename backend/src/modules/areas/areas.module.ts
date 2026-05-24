import { Module } from "@nestjs/common";
import { AreasController } from "./adapters/inbound/http/areas.controller";
import { StaticAreaRepository } from "./adapters/outbound/memory/static-area.repository";
import { AreasApplicationService } from "./application/areas.application.service";
import { AREA_REPOSITORY } from "./application/ports/area-repository.port";

@Module({
  controllers: [AreasController],
  providers: [
    AreasApplicationService,
    StaticAreaRepository,
    {
      provide: AREA_REPOSITORY,
      useExisting: StaticAreaRepository
    }
  ],
  exports: [AREA_REPOSITORY]
})
export class AreasModule {}
