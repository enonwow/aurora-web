import { describe, expect, it } from "vitest";
import {
  acceptAreaEventScriptPublication,
  applyAreaEventScriptEditorChange,
  canPublishAreaEventScriptEditorSession,
  createAreaEventScriptEditorSession,
  recordAreaEventScriptValidation,
} from "../../../../src/modules/areas/application/areaEventScriptEditorSession";
import { createAreaEventScriptSourceCommand } from "../../../../src/modules/areas/domain/areaEventScriptPublication";
import {
  SCRIPT_MODULE_ID,
  SCRIPT_NEXT_REVISION,
  SCRIPT_REVISION,
  SCRIPT_SOURCE,
  areaEventScriptPublicationReceiptFixture,
  areaEventScriptValidationFixture,
} from "./areaEventScriptPublicationFixture";

describe("Area event-script editor session", () => {
  it("requires one current compiled validation before publication", () => {
    const session = createAreaEventScriptEditorSession(command());
    expect(canPublishAreaEventScriptEditorSession(session)).toBe(false);

    const rejected = recordAreaEventScriptValidation(
      session,
      areaEventScriptValidationFixture("rejected"),
    );
    expect(rejected).not.toBeNull();
    expect(canPublishAreaEventScriptEditorSession(rejected!)).toBe(false);

    const compiled = recordAreaEventScriptValidation(
      session,
      areaEventScriptValidationFixture(),
    );
    expect(compiled).not.toBeNull();
    expect(canPublishAreaEventScriptEditorSession(compiled!)).toBe(true);
  });

  it.each([
    ["source", { sourceText: "void main() { SpeakString(\"changed\"); }\n" }],
    ["includes", { includeResRefs: ["shared"] }],
    ["revision", { expectedModuleRevision: "c".repeat(64) }],
    ["target", { targetResRef: "area_exit" }],
  ])("invalidates stale validation and publication after a %s change", (_label, change) => {
    const validated = recordAreaEventScriptValidation(
      createAreaEventScriptEditorSession(command()),
      areaEventScriptValidationFixture(),
    )!;
    const published = acceptAreaEventScriptPublication(
      validated,
      { idempotency: "created", receipt: areaEventScriptPublicationReceiptFixture() },
    )!;

    const changed = applyAreaEventScriptEditorChange(published, change);

    expect(changed).not.toBeNull();
    expect(changed?.validation).toBeNull();
    expect(changed?.publication).toBeNull();
    expect(canPublishAreaEventScriptEditorSession(changed!)).toBe(false);
  });

  it("advances the fenced revision only after a matching verified publication", () => {
    const validated = recordAreaEventScriptValidation(
      createAreaEventScriptEditorSession(command()),
      areaEventScriptValidationFixture(),
    )!;

    const published = acceptAreaEventScriptPublication(
      validated,
      { idempotency: "replayed", receipt: areaEventScriptPublicationReceiptFixture() },
    );

    expect(published?.command.expectedModuleRevision).toBe(SCRIPT_NEXT_REVISION);
    expect(published?.validation).toBeNull();
    expect(published?.publication?.idempotency).toBe("replayed");
    expect(Object.isFrozen(published)).toBe(true);
  });

  it("refuses receipts bound to another command identity", () => {
    const session = createAreaEventScriptEditorSession(command());
    const foreignValidation = structuredClone(areaEventScriptValidationFixture());
    foreignValidation.targetResRef = "area_exit";
    const foreignReceipt = structuredClone(areaEventScriptPublicationReceiptFixture());
    foreignReceipt.previousModuleRevision = "f".repeat(64);

    expect(recordAreaEventScriptValidation(session, foreignValidation)).toBeNull();
    expect(acceptAreaEventScriptPublication(session, {
      idempotency: "created",
      receipt: foreignReceipt,
    })).toBeNull();
  });
});

function command() {
  return createAreaEventScriptSourceCommand({
    moduleId: SCRIPT_MODULE_ID,
    targetResRef: "area_enter",
    expectedModuleRevision: SCRIPT_REVISION,
    sourceText: SCRIPT_SOURCE,
    includeResRefs: [],
  })!;
}
