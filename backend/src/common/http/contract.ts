import type { AppRequest } from "./request.types";

export interface SuccessEnvelope<T> {
  contractVersion: string;
  requestId: string;
  data: T;
}

export interface ErrorEnvelope {
  contractVersion: string;
  requestId: string;
  error: {
    code: string;
    message: string;
    details: Array<{ path: string; reason: string }>;
    retryable: boolean;
  };
}

export function buildSuccessEnvelope<T>(
  contractVersion: string,
  request: AppRequest,
  data: T
): SuccessEnvelope<T> {
  return {
    contractVersion,
    requestId: request.requestId ?? "req_missing",
    data
  };
}

