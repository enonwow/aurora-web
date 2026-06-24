import { Module } from "@nestjs/common";
import { RuntimeSettingsModule } from "../runtime-settings/runtime-settings.module";
import { VfxController } from "./adapters/inbound/http/vfx.controller";
import { VfxApplicationService } from "./application/vfx.application.service";

@Module({
  imports: [RuntimeSettingsModule],
  controllers: [VfxController],
  providers: [VfxApplicationService],
  exports: [VfxApplicationService]
})
export class VfxModule {}
