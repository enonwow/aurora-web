import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { AppConfigService } from "../config/app-config.service";
import { AppException } from "./app-exception";
import type { ErrorEnvelope } from "./contract";
import type { AppRequest } from "./request.types";

@Injectable()
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  constructor(private readonly config: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<AppRequest>();
    const reply = httpContext.getResponse<FastifyReply>();

    const requestId = request.requestId ?? "req_missing";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "Unexpected server error.";
    let details: Array<{ path: string; reason: string }> = [];
    let retryable = false;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
      retryable = exception.retryable;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === "object" && response) {
        const maybe = response as {
          code?: string;
          message?: string | string[];
          details?: Array<{ path: string; reason: string }>;
          retryable?: boolean;
        };
        code = maybe.code ?? codeFromStatus(status);
        message = Array.isArray(maybe.message)
          ? maybe.message.join(", ")
          : (maybe.message ?? exception.message);
        details = maybe.details ?? [];
        retryable = maybe.retryable ?? false;
      } else if (typeof response === "string") {
        code = codeFromStatus(status);
        message = response;
      }
    }

    const payload: ErrorEnvelope = {
      contractVersion: this.config.contractVersion,
      requestId,
      error: {
        code,
        message,
        details,
        retryable
      }
    };

    void reply.status(status).send(payload);
  }
}

function codeFromStatus(status: number): string {
  if (status === HttpStatus.BAD_REQUEST) {
    return "BAD_REQUEST";
  }
  if (status === HttpStatus.UNAUTHORIZED) {
    return "UNAUTHORIZED";
  }
  if (status === HttpStatus.FORBIDDEN) {
    return "FORBIDDEN";
  }
  if (status === HttpStatus.NOT_FOUND) {
    return "NOT_FOUND";
  }
  if (status === HttpStatus.CONFLICT) {
    return "CONFLICT";
  }
  if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
    return "VALIDATION_FAILED";
  }
  return "INTERNAL_SERVER_ERROR";
}

