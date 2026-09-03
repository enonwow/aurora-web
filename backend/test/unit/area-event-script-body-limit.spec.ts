import Fastify from "fastify";
import {
  AREA_EVENT_SCRIPT_HTTP_BODY_MAX_BYTES,
  registerAreaEventScriptHttpBodyLimit,
} from "../../src/modules/areas/adapters/inbound/http/area-event-script-body-limit";

describe("Area event-script HTTP body limit", () => {
  it("accepts the exact 512 KiB boundary for the script routes", async () => {
    const app = createApp();
    const payload = jsonWithExactBytes(AREA_EVENT_SCRIPT_HTTP_BODY_MAX_BYTES);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/modules/module%3Atest/scripts/area_enter/validate",
      headers: { "content-type": "application/json" },
      payload,
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it.each([
    ["POST", "/api/v1/modules/module%3Atest/scripts/area_enter/validate"],
    ["PUT", "/api/v1/modules/module%3Atest/scripts/area_enter"],
  ] as const)("rejects an oversized %s script command before its handler", async (method, url) => {
    const app = createApp();
    const payload = jsonWithExactBytes(AREA_EVENT_SCRIPT_HTTP_BODY_MAX_BYTES + 1);

    const response = await app.inject({
      method,
      url,
      headers: { "content-type": "application/json" },
      payload,
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual(expect.objectContaining({
      code: "FST_ERR_CTP_BODY_TOO_LARGE",
    }));
    await app.close();
  });

  it("does not lower the body budget for unrelated routes", async () => {
    const app = createApp();
    const payload = jsonWithExactBytes(AREA_EVENT_SCRIPT_HTTP_BODY_MAX_BYTES + 1);

    const response = await app.inject({
      method: "POST",
      url: "/unrelated",
      headers: { "content-type": "application/json" },
      payload,
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });
});

function createApp() {
  const app = Fastify({ bodyLimit: 1024 * 1024 });
  registerAreaEventScriptHttpBodyLimit(app);
  app.post(
    "/api/v1/modules/:moduleId/scripts/:targetResRef/validate",
    async () => ({ reached: true }),
  );
  app.put(
    "/api/v1/modules/:moduleId/scripts/:targetResRef",
    async () => ({ reached: true }),
  );
  app.post("/unrelated", async () => ({ reached: true }));
  return app;
}

function jsonWithExactBytes(size: number): string {
  const envelopeBytes = Buffer.byteLength('{"value":""}', "utf8");
  return JSON.stringify({ value: "x".repeat(size - envelopeBytes) });
}
