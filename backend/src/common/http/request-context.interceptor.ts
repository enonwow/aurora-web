import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import { Observable } from "rxjs";
import type { AppRequest } from "./request.types";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<AppRequest>();
    const reply = httpContext.getResponse<FastifyReply>();

    const incomingHeader = request.headers["x-request-id"];
    const resolvedRequestId =
      typeof incomingHeader === "string" && incomingHeader.trim().length > 0
        ? incomingHeader.trim()
        : randomUUID();

    request.requestId = resolvedRequestId;
    reply.header("x-request-id", resolvedRequestId);

    return next.handle();
  }
}

