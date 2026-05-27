import type { FastifyReply } from "fastify";

export interface BinaryPayloadHeaders {
  contentType: string;
  size: number;
  etag?: string | undefined;
}

export interface ApplyBinaryPayloadHeadersOptions {
  cacheControl?: string;
  includeContentLength?: boolean;
  extraHeaders?: Record<string, string | undefined>;
}

export function applyBinaryPayloadHeaders(
  response: FastifyReply,
  payload: BinaryPayloadHeaders,
  options: ApplyBinaryPayloadHeadersOptions = {}
) {
  response.header("Content-Type", payload.contentType);
  if (options.includeContentLength !== false) {
    response.header("Content-Length", String(payload.size));
  }
  if (options.cacheControl) {
    response.header("Cache-Control", options.cacheControl);
  }
  if (payload.etag) {
    response.header("ETag", payload.etag);
  }
  if (options.extraHeaders) {
    for (const [name, value] of Object.entries(options.extraHeaders)) {
      if (value !== undefined) {
        response.header(name, value);
      }
    }
  }
}

export function setInlineContentDisposition(response: FastifyReply, fileName: string) {
  response.header("Content-Disposition", `inline; filename="${sanitizeHeaderFileName(fileName)}"`);
}

export function sanitizeHeaderFileName(value: string): string {
  return value.replace(/["\\\r\n]/gu, "_");
}
