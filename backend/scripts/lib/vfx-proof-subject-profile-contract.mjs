const ROOT_KEYS = new Set(["version", "subjects"]);
const SUBJECT_KEYS = new Set([
  "subjectId",
  "subjectKind",
  "tags",
  "priority",
  "requiredCase",
  "title",
  "titleOverride",
  "manifestStatus",
  "behaviorClaim",
  "requiredEvidencePacket",
  "missingManifestFields",
  "additionalMissingPrerequisites",
  "additionalMissingEvidence",
  "nextOperatorAction",
  "renderVisibilityPolicy",
  "backlogProfile"
]);
const RENDER_VISIBILITY_KEYS = new Set(["kind", "requiredDrawLane"]);
const BACKLOG_KEYS = new Set(["first", "type", "title", "evidence", "recommendedAction"]);

export function parseVfxProofSubjectProfiles(input) {
  assertRecord(input, "profile root");
  assertKnownKeys(input, ROOT_KEYS, "profile root");
  if (input.version !== "aurora-vfx-proof-subject-profiles/v1") {
    throw new Error("Unsupported VFX proof subject profile version.");
  }
  if (!Array.isArray(input.subjects) || input.subjects.length === 0) {
    throw new Error("VFX proof subject profiles require a non-empty subjects array.");
  }

  const seenSubjectIds = new Set();
  const subjects = input.subjects.map((subject, index) => {
    const label = `subjects[${index}]`;
    assertRecord(subject, label);
    assertKnownKeys(subject, SUBJECT_KEYS, label);
    assertNonEmptyString(subject.subjectId, `${label}.subjectId`);
    if (seenSubjectIds.has(subject.subjectId)) {
      throw new Error(`Duplicate VFX proof subject profile: ${subject.subjectId}`);
    }
    seenSubjectIds.add(subject.subjectId);
    if (!new Set(["manifest-fixture", "catalog-item"]).has(subject.subjectKind)) {
      throw new Error(`${label}.subjectKind is invalid.`);
    }
    assertStringArray(subject.tags, `${label}.tags`);
    assertStringArray(subject.additionalMissingPrerequisites, `${label}.additionalMissingPrerequisites`);
    assertStringArray(subject.additionalMissingEvidence, `${label}.additionalMissingEvidence`);
    assertOptionalStringArray(subject.missingManifestFields, `${label}.missingManifestFields`);
    assertOptionalNonEmptyString(subject.requiredCase, `${label}.requiredCase`);
    assertOptionalNonEmptyString(subject.title, `${label}.title`);
    assertOptionalNonEmptyString(subject.titleOverride, `${label}.titleOverride`);
    assertOptionalNonEmptyString(subject.manifestStatus, `${label}.manifestStatus`);
    assertOptionalNonEmptyString(subject.behaviorClaim, `${label}.behaviorClaim`);
    assertOptionalNonEmptyString(subject.requiredEvidencePacket, `${label}.requiredEvidencePacket`);
    assertOptionalNonEmptyString(subject.nextOperatorAction, `${label}.nextOperatorAction`);
    if (subject.priority !== undefined && (!Number.isInteger(subject.priority) || subject.priority < 1)) {
      throw new Error(`${label}.priority must be a positive integer.`);
    }
    validateRenderVisibilityPolicy(subject.renderVisibilityPolicy, `${label}.renderVisibilityPolicy`);
    validateBacklogProfile(subject.backlogProfile, `${label}.backlogProfile`);
    return structuredClone(subject);
  });

  return { version: input.version, subjects };
}

export function indexVfxProofSubjectProfiles(profile) {
  return new Map(profile.subjects.map((subject) => [subject.subjectId, subject]));
}

function validateRenderVisibilityPolicy(policy, label) {
  if (policy === undefined) return;
  assertRecord(policy, label);
  assertKnownKeys(policy, RENDER_VISIBILITY_KEYS, label);
  if (policy.kind !== "contract-lane-without-canvas") {
    throw new Error(`${label}.kind is invalid.`);
  }
  assertNonEmptyString(policy.requiredDrawLane, `${label}.requiredDrawLane`);
}

function validateBacklogProfile(profile, label) {
  if (profile === undefined) return;
  assertRecord(profile, label);
  assertKnownKeys(profile, BACKLOG_KEYS, label);
  if (typeof profile.first !== "boolean") {
    throw new Error(`${label}.first must be boolean.`);
  }
  assertNonEmptyString(profile.type, `${label}.type`);
  assertOptionalNonEmptyString(profile.title, `${label}.title`);
  assertOptionalStringArray(profile.evidence, `${label}.evidence`);
  assertOptionalNonEmptyString(profile.recommendedAction, `${label}.recommendedAction`);
}

function assertRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertKnownKeys(value, knownKeys, label) {
  for (const key of Object.keys(value)) {
    if (!knownKeys.has(key)) {
      throw new Error(`${label} contains unknown field ${key}.`);
    }
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertOptionalNonEmptyString(value, label) {
  if (value !== undefined) assertNonEmptyString(value, label);
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }
}

function assertOptionalStringArray(value, label) {
  if (value !== undefined) assertStringArray(value, label);
}
