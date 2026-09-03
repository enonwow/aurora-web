import { Transform } from "node:stream";
import type { FastifyInstance, FastifyRequest } from "fastify";

export const AREA_EVENT_SCRIPT_HTTP_BODY_MAX_BYTES = 512 * 1024;

const SCRIPT_VALIDATE_PATH =
  /^\/api\/v1\/modules\/[^/?]+\/scripts\/[^/?]+\/validate(?:\?.*)?$/u;
const SCRIPT_PUBLISH_PATH =
  /^\/api\/v1\/modules\/[^/?]+\/scripts\/[^/?]+(?:\?.*)?$/u;

export function registerAreaEventScriptHttpBodyLimit(
  fastify: FastifyInstance,
): void {
  fastify.addHook("onRequest", async (request) => {
    if (!isAreaEventScriptCommandRequest(request)) return;
    const raw = request.headers["content-length"];
    const contentLength = Array.isArray(raw) ? raw[0] : raw;
    if (
      contentLength !== undefined &&
      /^\d+$/u.test(contentLength) &&
      Number(contentLength) > AREA_EVENT_SCRIPT_HTTP_BODY_MAX_BYTES
    ) {
      throw bodyTooLarge();
    }
  });

  fastify.addHook("preParsing", async (request, _reply, payload) => {
    if (!isAreaEventScriptCommandRequest(request)) return payload;
    let receivedBytes = 0;
    const limited = new Transform({
      transform(chunk: Buffer | string, encoding, callback) {
        const bytes = Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, encoding);
        receivedBytes += bytes;
        if (receivedBytes > AREA_EVENT_SCRIPT_HTTP_BODY_MAX_BYTES) {
          callback(bodyTooLarge());
          return;
        }
        callback(null, chunk);
      },
    }) as Transform & { readonly receivedEncodedLength?: number };
    Object.defineProperty(limited, "receivedEncodedLength", {
      enumerable: true,
      get: () => payload.receivedEncodedLength ?? receivedBytes,
    });
    payload.on("error", (error) => limited.destroy(error));
    payload.pipe(limited);
    return limited;
  });
}

function isAreaEventScriptCommandRequest(request: FastifyRequest): boolean {
  return (
    (request.method === "POST" && SCRIPT_VALIDATE_PATH.test(request.url)) ||
    (request.method === "PUT" && SCRIPT_PUBLISH_PATH.test(request.url))
  );
}

function bodyTooLarge(): Error & { code: string; statusCode: number } {
  return Object.assign(
    new Error(
      `Area event-script command body exceeds ${AREA_EVENT_SCRIPT_HTTP_BODY_MAX_BYTES} bytes.`,
    ),
    {
      code: "FST_ERR_CTP_BODY_TOO_LARGE",
      statusCode: 413,
    },
  );
}
