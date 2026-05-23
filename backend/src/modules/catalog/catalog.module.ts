import { Module } from "@nestjs/common";
import { CatalogApplicationService } from "./application/catalog.application.service";
import {
  TEMPLATE_CATALOG_REPOSITORY
} from "./application/ports/template-catalog-repository.port";
import { CreaturesController } from "./adapters/inbound/http/creatures.controller";
import { ItemsController } from "./adapters/inbound/http/items.controller";
import { PlaceablesController } from "./adapters/inbound/http/placeables.controller";
import { StaticTemplateCatalogRepository } from "./adapters/outbound/memory/static-template-catalog.repository";

@Module({
  controllers: [PlaceablesController, CreaturesController, ItemsController],
  providers: [
    CatalogApplicationService,
    StaticTemplateCatalogRepository,
    {
      provide: TEMPLATE_CATALOG_REPOSITORY,
      useExisting: StaticTemplateCatalogRepository
    }
  ]
})
export class CatalogModule {}
