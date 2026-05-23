import {
  isOriginAllowed,
  parseAllowedOrigins,
  setupCors
} from "../../src/common/http/cors";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

describe("cors policy", () => {
  it("parses comma-separated allowlist and removes duplicates", () => {
    const parsed = parseAllowedOrigins(
      "http://localhost:5173, http://localhost:5173,https://aurora.local"
    );

    expect(parsed).toEqual([
      "http://localhost:5173",
      "https://aurora.local"
    ]);
  });

  it("drops empty allowlist entries created by trailing commas or whitespace", () => {
    const parsed = parseAllowedOrigins(
      "http://localhost:5173, ,   ,https://aurora.local,,"
    );

    expect(parsed).toEqual([
      "http://localhost:5173",
      "https://aurora.local"
    ]);
  });

  it("allows requests with no origin header", () => {
    const allowed = ["http://localhost:5173"];
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
  });

  it("allows configured origin", () => {
    const allowed = ["http://localhost:5173"];
    expect(isOriginAllowed("http://localhost:5173", allowed)).toBe(true);
  });

  it("blocks origin that is not on allowlist", () => {
    const allowed = ["http://localhost:5173"];
    expect(isOriginAllowed("http://evil.example", allowed)).toBe(false);
  });

  it("configures fastify CORS with credentials enabled and allowlist callback", () => {
    const enableCors = jest.fn();
    const app = {
      enableCors
    } as unknown as NestFastifyApplication;
    const config = {
      corsAllowedOrigins: ["http://localhost:5173"]
    } as unknown as AppConfigService;

    setupCors(app, config);

    expect(enableCors).toHaveBeenCalledTimes(1);
    const options = enableCors.mock.calls[0][0] as {
      credentials: boolean;
      origin: (
        requestOrigin: string | undefined,
        callback: (error: Error | null, allow: boolean) => void
      ) => void;
    };

    expect(options.credentials).toBe(true);

    const callback = jest.fn();
    options.origin("http://localhost:5173", callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);

    options.origin("http://evil.example", callback);
    expect(callback).toHaveBeenLastCalledWith(null, false);
  });
});
