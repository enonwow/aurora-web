import { HttpException } from "@nestjs/common";

export interface AppExceptionOptions {
  status: number;
  code: string;
  message: string;
  details?: Array<{ path: string; reason: string }>;
  retryable?: boolean;
}

export class AppException extends HttpException {
  readonly code: string;
  readonly details: Array<{ path: string; reason: string }>;
  readonly retryable: boolean;

  constructor(options: AppExceptionOptions) {
    super(
      {
        code: options.code,
        message: options.message,
        details: options.details ?? [],
        retryable: options.retryable ?? false
      },
      options.status
    );
    this.code = options.code;
    this.details = options.details ?? [];
    this.retryable = options.retryable ?? false;
  }
}

