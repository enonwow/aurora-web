import type {
  AreaEventScriptSourceCommand,
  AreaEventScriptSourceSnapshot,
  AreaEventScriptValidationResult,
} from "../domain/areaEventScriptPublication";
import {
  AreaEventScriptPortError,
  type AreaEventScriptPublicationPort,
  type AreaEventScriptPublicationResult,
  type AreaEventScriptSourceQuery,
} from "../ports/areaEventScriptPublicationPort";

export type AreaEventScriptOperationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code: string;
        status: number;
        retryable: boolean;
        message: string;
      }>;
    }>;

export interface AreaEventScriptPublicationFacade {
  readSource(
    accessToken: string,
    query: AreaEventScriptSourceQuery,
  ): Promise<AreaEventScriptOperationResult<AreaEventScriptSourceSnapshot>>;
  validate(
    accessToken: string,
    command: AreaEventScriptSourceCommand,
  ): Promise<AreaEventScriptOperationResult<AreaEventScriptValidationResult>>;
  publish(
    accessToken: string,
    command: AreaEventScriptSourceCommand,
  ): Promise<AreaEventScriptOperationResult<AreaEventScriptPublicationResult>>;
}

export function createAreaEventScriptPublicationFacade(
  port: AreaEventScriptPublicationPort,
  ids: Readonly<{ nextIdempotencyKey(): string }> = {
    nextIdempotencyKey: () => `area-script-${crypto.randomUUID()}`,
  },
): AreaEventScriptPublicationFacade {
  return Object.freeze({
    async readSource(accessToken: string, query: AreaEventScriptSourceQuery) {
      try {
        return success(await port.readSource(accessToken, query));
      } catch (error) {
        return failure("source", error);
      }
    },
    async validate(accessToken: string, command: AreaEventScriptSourceCommand) {
      try {
        return success(await port.validate(accessToken, command));
      } catch (error) {
        return failure("validation", error);
      }
    },
    async publish(accessToken: string, command: AreaEventScriptSourceCommand) {
      try {
        return success(await port.publish(
          accessToken,
          command,
          ids.nextIdempotencyKey(),
        ));
      } catch (error) {
        return failure("publication", error);
      }
    },
  });
}

function success<T>(value: T): AreaEventScriptOperationResult<T> {
  return Object.freeze({ ok: true, value });
}

function failure(
  operation: "source" | "validation" | "publication",
  error: unknown,
): AreaEventScriptOperationResult<never> {
  const portError = error instanceof AreaEventScriptPortError ? error : null;
  const code = portError?.code ?? "AREA_EVENT_SCRIPT_PORT_FAILURE";
  const message = operation === "source" && code === "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND"
    ? "The committed script source was not found."
    : operation === "source"
      ? "The committed script source could not be loaded."
      : operation === "validation"
        ? "The script source could not be validated."
        : "The script source could not be published.";
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code,
      status: portError?.status ?? 0,
      retryable: portError?.retryable ?? true,
      message,
    }),
  });
}
