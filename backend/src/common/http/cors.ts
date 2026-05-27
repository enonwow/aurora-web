import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type * as fastifyCors from "@fastify/cors";
import { AppConfigService } from "../config/app-config.service";

export function parseAllowedOrigins(value: string): string[] {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return Array.from(new Set(items));
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return true;
  }
  return allowedOrigins.includes(origin);
}

export function setupCors(
  app: NestFastifyApplication,
  config: AppConfigService
): void {
  const allowedOrigins = config.corsAllowedOrigins;
  const origin: fastifyCors.OriginFunction = (requestOrigin, callback) => {
    callback(null, isOriginAllowed(requestOrigin, allowedOrigins));
  };

  app.enableCors({
    origin,
    credentials: true
  });
}
