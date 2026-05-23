import type { FastifyRequest } from "fastify";
import type { RequestAuthContext } from "../../modules/auth/domain/auth.types";

export interface AppRequest extends FastifyRequest {
  requestId?: string;
  auth?: RequestAuthContext;
}
