import {
  createAreaEventScriptSourceCommand,
  type AreaEventScriptSourceCommand,
  type AreaEventScriptValidationResult,
} from "../domain/areaEventScriptPublication";
import type { AreaEventScriptPublicationResult } from "../ports/areaEventScriptPublicationPort";

export interface AreaEventScriptEditorSession {
  readonly command: AreaEventScriptSourceCommand;
  readonly validation: Readonly<{
    commandCanonicalJson: string;
    result: AreaEventScriptValidationResult;
  }> | null;
  readonly publication: AreaEventScriptPublicationResult | null;
}

export type AreaEventScriptEditorChange = Partial<Readonly<{
  moduleId: string;
  targetResRef: string;
  expectedModuleRevision: string;
  sourceText: string;
  includeResRefs: readonly string[];
}>>;

export function createAreaEventScriptEditorSession(
  command: AreaEventScriptSourceCommand,
): AreaEventScriptEditorSession {
  return Object.freeze({ command, validation: null, publication: null });
}

export function applyAreaEventScriptEditorChange(
  session: AreaEventScriptEditorSession,
  change: AreaEventScriptEditorChange,
): AreaEventScriptEditorSession | null {
  const command = createAreaEventScriptSourceCommand({
    moduleId: change.moduleId ?? session.command.moduleId,
    targetResRef: change.targetResRef ?? session.command.targetResRef,
    expectedModuleRevision:
      change.expectedModuleRevision ?? session.command.expectedModuleRevision,
    sourceText: change.sourceText ?? session.command.sourceText,
    includeResRefs: change.includeResRefs ?? session.command.includeResRefs,
  });
  if (!command) return null;
  if (canonical(command) === canonical(session.command)) return session;
  return createAreaEventScriptEditorSession(command);
}

export function recordAreaEventScriptValidation(
  session: AreaEventScriptEditorSession,
  result: AreaEventScriptValidationResult,
): AreaEventScriptEditorSession | null {
  if (
    result.moduleId !== session.command.moduleId
    || result.targetResRef !== session.command.targetResRef
    || result.moduleRevision !== session.command.expectedModuleRevision
  ) return null;
  return Object.freeze({
    command: session.command,
    validation: Object.freeze({
      commandCanonicalJson: canonical(session.command),
      result,
    }),
    publication: null,
  });
}

export function canPublishAreaEventScriptEditorSession(
  session: AreaEventScriptEditorSession,
): boolean {
  return session.validation?.result.status === "compiled"
    && session.validation.commandCanonicalJson === canonical(session.command);
}

export function acceptAreaEventScriptPublication(
  session: AreaEventScriptEditorSession,
  publication: AreaEventScriptPublicationResult,
): AreaEventScriptEditorSession | null {
  const validation = session.validation?.result;
  const receipt = publication.receipt;
  if (
    !canPublishAreaEventScriptEditorSession(session)
    || !validation
    || receipt.moduleId !== session.command.moduleId
    || receipt.targetResRef !== session.command.targetResRef
    || receipt.previousModuleRevision !== session.command.expectedModuleRevision
    || receipt.sourceSha256 !== validation.sourceSha256
    || receipt.includeSetSha256 !== validation.includeSetSha256
    || receipt.executionProfileSha256 !== validation.executionProfileSha256
    || receipt.compilerReceiptSha256 !== validation.compilerReceiptSha256
    || JSON.stringify(receipt.provider) !== JSON.stringify(validation.provider)
  ) return null;
  const command = createAreaEventScriptSourceCommand({
    moduleId: session.command.moduleId,
    targetResRef: session.command.targetResRef,
    expectedModuleRevision: receipt.newModuleRevision,
    sourceText: session.command.sourceText,
    includeResRefs: session.command.includeResRefs,
  });
  if (!command) return null;
  return Object.freeze({
    command,
    validation: null,
    publication: Object.freeze({
      idempotency: publication.idempotency,
      receipt,
    }),
  });
}

function canonical(command: AreaEventScriptSourceCommand): string {
  return JSON.stringify(command);
}
