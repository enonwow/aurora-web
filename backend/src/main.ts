import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { AppConfigService } from "./common/config/app-config.service";
import { setupCors } from "./common/http/cors";
import { setupSwagger } from "./common/openapi/swagger";
import { registerAreaEventScriptHttpBodyLimit } from "./modules/areas/adapters/inbound/http/area-event-script-body-limit";

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: true,
  });
  registerAreaEventScriptHttpBodyLimit(adapter.getInstance());
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.setGlobalPrefix("api/v1");

  const config = app.get(AppConfigService);
  setupCors(app, config);
  setupSwagger(app, config);
  await app.listen(config.port, config.bindHost);
}

void bootstrap();
