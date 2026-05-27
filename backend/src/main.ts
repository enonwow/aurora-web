import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { AppConfigService } from "./common/config/app-config.service";
import { setupCors } from "./common/http/cors";
import { setupSwagger } from "./common/openapi/swagger";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true
    })
  );

  app.setGlobalPrefix("api/v1");

  const config = app.get(AppConfigService);
  setupCors(app, config);
  setupSwagger(app, config);
  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();
