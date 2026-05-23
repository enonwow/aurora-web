import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppConfigService } from "../config/app-config.service";

export function setupSwagger(
  app: NestFastifyApplication,
  config: AppConfigService
): void {
  if (!config.swaggerEnabled) {
    return;
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle("Aurora Web Backend API")
    .setDescription(
      "Aurora Web backend contract-first API for authentication, drafts, export and administration."
    )
    .setVersion(config.contractVersion)
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "token"
      },
      "bearer"
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup(config.swaggerPath, app, documentFactory, {
    useGlobalPrefix: true,
    jsonDocumentUrl: config.swaggerJsonPath
  });
}

