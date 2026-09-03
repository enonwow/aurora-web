import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  areaTilePlaceholderDecompilationAuthoritySubjectSha256,
  areaTilePlaceholderEvidenceProfileSubjectSha256,
  assertAreaTilePlaceholderEvidenceCoverage,
  loadAreaTilePlaceholderEvidenceProfile,
  resolveAreaTilePlaceholderEvidence
} from "./lib/area-tile-placeholder-evidence-profile.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-tile-placeholder-evidence-"));
try {
  const evidenceDirectory = path.join(root, "evidence");
  const profileDirectory = path.join(root, "profiles");
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  fs.mkdirSync(profileDirectory, { recursive: true });
  const reviewedProfile = (profileLike, stem) => {
    const { review: _review, ...subject } = profileLike;
    const reviewArtifactPath = path.join(evidenceDirectory, `${stem}-review.json`);
    const reviewArtifactBytes = `${JSON.stringify({
      schema: "aurora-area-tile-placeholder-evidence-profile-review/v1",
      profileId: subject.profileId,
      subjectSha256: areaTilePlaceholderEvidenceProfileSubjectSha256(subject),
      status: "verified",
      reviewer: "independent-reviewer",
      reviewedAt: "2026-09-01T14:05:00.000Z",
      independentReview: true,
      notes: "Exact evidence, SET identity, and certified rows independently reviewed."
    })}\n`;
    fs.writeFileSync(reviewArtifactPath, reviewArtifactBytes, "utf8");
    return {
      ...subject,
      review: {
        artifactPath: `evidence/${stem}-review.json`,
        artifactSha256: sha256(reviewArtifactBytes)
      }
    };
  };
  const nativeFramePath = path.join(evidenceDirectory, "native-frame.json");
  const nativeFrameBytes = `${JSON.stringify({ status: "captured", subject: "opaque01:1" })}\n`;
  fs.writeFileSync(nativeFramePath, nativeFrameBytes, "utf8");
  const artifactPath = path.join(evidenceDirectory, "native-packet.json");
  const artifactBytes = `${JSON.stringify({
    schema: "aurora-area-tile-placeholder-evidence/v1",
    evidenceId: "native-packet",
    kind: "toolset_native",
    verdict: "verified",
    certifiedRowIds: ["opaque01:1"],
    authority: {
      binarySha256: "4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24",
      proofContractVersion: "aurora-toolset-prove/v1",
      settledState: {
        status: "verified",
        unexpectedFailedTileCount: 0,
        bridgeTileCount: 0
      },
      artifactBindings: [{
        artifactPath: "evidence/native-frame.json",
        artifactSha256: sha256(nativeFrameBytes)
      }]
    }
  })}\n`;
  fs.writeFileSync(artifactPath, artifactBytes, "utf8");
  const setSha256 = "1".repeat(64);
  const profile = reviewedProfile({
    schema: "aurora-area-tile-placeholder-evidence-profile/v1",
    profileId: "opaque-placeholder-proof-v1",
    generatedAt: "2026-09-01T14:00:00.000Z",
    evidence: [{
      evidenceId: "native-packet",
      kind: "toolset_native",
      artifactPath: "evidence/native-packet.json",
      artifactSha256: sha256(artifactBytes)
    }],
    rows: [{
      tilesetResRef: "opaque01",
      tileId: 1,
      setSha256,
      modelResRef: "looks_renderable",
      status: "intentional_placeholder",
      evidenceIds: ["native-packet"]
    }]
  }, "native-profile");
  const profilePath = path.join(profileDirectory, "profile.json");
  const profileBytes = `${JSON.stringify(profile, null, 2)}\n`;
  fs.writeFileSync(profilePath, profileBytes, "utf8");
  const loaded = loadAreaTilePlaceholderEvidenceProfile({
    profilePath,
    expectedSha256: sha256(profileBytes),
    evidenceRoot: root
  });

  const consumed = new Set();
  assert.equal(resolveAreaTilePlaceholderEvidence({
    profile: loaded,
    tilesetResRef: "opaque01",
    tileId: 1,
    setSha256,
    modelResRef: "looks_renderable",
    consumedRowIds: consumed
  }), true);
  assert.equal(resolveAreaTilePlaceholderEvidence({
    profile: loaded,
    tilesetResRef: "opaque01",
    tileId: 2,
    setSha256,
    modelResRef: "padding",
    consumedRowIds: consumed
  }), false);
  assertAreaTilePlaceholderEvidenceCoverage(loaded, consumed);

  assert.throws(
    () => resolveAreaTilePlaceholderEvidence({
      profile: loaded,
      tilesetResRef: "opaque01",
      tileId: 1,
      setSha256: "2".repeat(64),
      modelResRef: "looks_renderable"
    }),
    /SET SHA-256 mismatch/u
  );
  assert.throws(
    () => loadAreaTilePlaceholderEvidenceProfile({
      profilePath,
      expectedSha256: "3".repeat(64),
      evidenceRoot: root
    }),
    /profile SHA-256 mismatch/u
  );
  assert.throws(
    () => assertAreaTilePlaceholderEvidenceCoverage(loaded, new Set()),
    /not consumed/u
  );

  const reviewDriftProfilePath = path.join(profileDirectory, "review-drift-profile.json");
  const reviewDriftProfileBytes = `${JSON.stringify({
    ...profile,
    rows: [{ ...profile.rows[0], modelResRef: "unreviewed_change" }]
  }, null, 2)}\n`;
  fs.writeFileSync(reviewDriftProfilePath, reviewDriftProfileBytes, "utf8");
  assert.throws(
    () => loadAreaTilePlaceholderEvidenceProfile({
      profilePath: reviewDriftProfilePath,
      expectedSha256: sha256(reviewDriftProfileBytes),
      evidenceRoot: root
    }),
    /independent review is invalid/u
  );

  const invalidProfilePath = path.join(profileDirectory, "invalid-profile.json");
  const invalidProfileBytes = `${JSON.stringify(reviewedProfile({
    ...profile,
    rows: [{ ...profile.rows[0], evidenceIds: ["missing-evidence"] }]
  }, "invalid-profile"), null, 2)}\n`;
  fs.writeFileSync(invalidProfilePath, invalidProfileBytes, "utf8");
  assert.throws(
    () => loadAreaTilePlaceholderEvidenceProfile({
      profilePath: invalidProfilePath,
      expectedSha256: sha256(invalidProfileBytes),
      evidenceRoot: root
    }),
    /unknown evidence/u
  );

  const untypedArtifactPath = path.join(evidenceDirectory, "untyped.json");
  const untypedArtifactBytes = `${JSON.stringify({ verdict: "verified" })}\n`;
  fs.writeFileSync(untypedArtifactPath, untypedArtifactBytes, "utf8");
  const untypedProfilePath = path.join(profileDirectory, "untyped-profile.json");
  const untypedProfileBytes = `${JSON.stringify(reviewedProfile({
    ...profile,
    evidence: [{
      evidenceId: "native-packet",
      kind: "toolset_native",
      artifactPath: "evidence/untyped.json",
      artifactSha256: sha256(untypedArtifactBytes)
    }]
  }, "untyped-profile"), null, 2)}\n`;
  fs.writeFileSync(untypedProfilePath, untypedProfileBytes, "utf8");
  assert.throws(
    () => loadAreaTilePlaceholderEvidenceProfile({
      profilePath: untypedProfilePath,
      expectedSha256: sha256(untypedProfileBytes),
      evidenceRoot: root
    }),
    /unsupported evidence artifact schema/u
  );

  const lineageRoot = path.join(evidenceDirectory, "lineage");
  const lineageGenerationDirectory = path.join(lineageRoot, "generation");
  const lineageExportDirectory = path.join(lineageRoot, "export");
  fs.mkdirSync(lineageGenerationDirectory, { recursive: true });
  fs.mkdirSync(lineageExportDirectory, { recursive: true });
  const functionOutputPath = path.join(lineageExportDirectory, "FUN_OPAQUE.c");
  const functionOutputBytes = "if (tileRowEligible == 0) {\n    return excluded;\n}\n";
  fs.writeFileSync(functionOutputPath, functionOutputBytes, "utf8");
  const functionRecordsPath = path.join(lineageGenerationDirectory, "function-records.jsonl");
  const functionRecordsBytes = `${JSON.stringify({
    sessionId: "session-opaque-01",
    functionId: "0x00401000:FUN_OPAQUE",
    address: "0x00401000",
    name: "FUN_OPAQUE",
    decompileStatus: "success",
    outputPath: "FUN_OPAQUE.c",
    outputSha256: sha256(functionOutputBytes)
  })}\n`;
  fs.writeFileSync(functionRecordsPath, functionRecordsBytes, "utf8");
  const lineageDigest = "a".repeat(64);
  const binarySha256 = "b".repeat(64);
  const lineagePacketPath = path.join(lineageRoot, "producer.json");
  const lineagePacketBytes = `${JSON.stringify({
    schemaVersion: "aurora-decompilation-lineage/v2",
    packetType: "producer",
    authoritativeDecompilationClaim: false,
    portableRecordDigestSha256: lineageDigest,
    inputBinary: { file: { sha256: binarySha256 } },
    generation: {
      functionRecords: {
        file: {
          portablePath: "generation/function-records.jsonl",
          sha256: sha256(functionRecordsBytes)
        }
      }
    },
    export: { directoryPortablePath: "export" }
  })}\n`;
  fs.writeFileSync(lineagePacketPath, lineagePacketBytes, "utf8");
  const lineageValidationPath = path.join(lineageRoot, "validation.json");
  const lineageValidationBytes = `${JSON.stringify({
    schemaVersion: "aurora-decompilation-lineage-validation/v2",
    packetType: "validator-result",
    lineageComplete: true,
    authoritativeDecompilationClaim: true,
    inputPacket: "producer.json",
    producerPortableRecordDigestSha256: lineageDigest,
    recomputedProducerPortableRecordDigestSha256: lineageDigest,
    diagnostics: []
  })}\n`;
  fs.writeFileSync(lineageValidationPath, lineageValidationBytes, "utf8");
  const decompAuthoritySubject = {
    binarySha256,
    lineagePacketRootPath: "evidence/lineage",
    lineagePacketPath: "evidence/lineage/producer.json",
    lineagePacketSha256: sha256(lineagePacketBytes),
    lineageValidationPath: "evidence/lineage/validation.json",
    lineageValidationSha256: sha256(lineageValidationBytes),
    functionBindings: [{
      address: "0x00401000",
      outputSha256: sha256(functionOutputBytes),
      lineStart: 1,
      lineEnd: 2,
      finding: "Exact function establishes the opaque row as non-rendering."
    }]
  };
  const decompReviewPath = path.join(evidenceDirectory, "decomp-semantic-review.json");
  const decompReviewBytes = `${JSON.stringify({
    schema: "aurora-area-tile-placeholder-decompilation-semantic-review/v1",
    evidenceId: "decomp-packet",
    authoritySubjectSha256: areaTilePlaceholderDecompilationAuthoritySubjectSha256({
      evidenceId: "decomp-packet",
      certifiedRowIds: ["opaque02:2"],
      authority: decompAuthoritySubject
    }),
    certifiedRowIds: ["opaque02:2"],
    status: "verified",
    reviewer: "semantic-reviewer",
    reviewedAt: "2026-09-01T14:03:00.000Z",
    independentReview: true,
    notes: "The cited exact output lines establish the generic raw SET row exclusion rule."
  })}\n`;
  fs.writeFileSync(decompReviewPath, decompReviewBytes, "utf8");
  const decompArtifactPath = path.join(evidenceDirectory, "decomp-packet.json");
  const decompArtifact = {
    schema: "aurora-area-tile-placeholder-evidence/v2",
    evidenceId: "decomp-packet",
    kind: "aurora_decompilation",
    verdict: "verified",
    certifiedRowIds: ["opaque02:2"],
    authority: {
      ...decompAuthoritySubject,
      semanticReview: {
        artifactPath: "evidence/decomp-semantic-review.json",
        artifactSha256: sha256(decompReviewBytes)
      }
    }
  };
  const decompArtifactBytes = `${JSON.stringify(decompArtifact)}\n`;
  fs.writeFileSync(decompArtifactPath, decompArtifactBytes, "utf8");
  const decompProfilePath = path.join(profileDirectory, "decomp-profile.json");
  const decompProfile = reviewedProfile({
    ...profile,
    profileId: "opaque-decomp-proof-v1",
    evidence: [{
      evidenceId: "decomp-packet",
      kind: "aurora_decompilation",
      artifactPath: "evidence/decomp-packet.json",
      artifactSha256: sha256(decompArtifactBytes)
    }],
    rows: [{
      tilesetResRef: "opaque02",
      tileId: 2,
      setSha256,
      modelResRef: "opaque_model",
      status: "intentional_placeholder",
      evidenceIds: ["decomp-packet"]
    }]
  }, "decomp-profile");
  const decompProfileBytes = `${JSON.stringify(decompProfile, null, 2)}\n`;
  fs.writeFileSync(decompProfilePath, decompProfileBytes, "utf8");
  const loadedDecompProfile = loadAreaTilePlaceholderEvidenceProfile({
    profilePath: decompProfilePath,
    expectedSha256: sha256(decompProfileBytes),
    evidenceRoot: root
  });
  assert.equal(loadedDecompProfile.binding.certifiedRowCount, 1);

  const legacyDecompArtifactBytes = `${JSON.stringify({
    ...decompArtifact,
    schema: "aurora-area-tile-placeholder-evidence/v1"
  })}\n`;
  const legacyDecompArtifactPath = path.join(evidenceDirectory, "legacy-decomp-packet.json");
  fs.writeFileSync(legacyDecompArtifactPath, legacyDecompArtifactBytes, "utf8");
  const legacyDecompProfilePath = path.join(profileDirectory, "legacy-decomp-profile.json");
  const legacyDecompProfileBytes = `${JSON.stringify(reviewedProfile({
    ...decompProfile,
    evidence: [{
      ...decompProfile.evidence[0],
      artifactPath: "evidence/legacy-decomp-packet.json",
      artifactSha256: sha256(legacyDecompArtifactBytes)
    }]
  }, "legacy-decomp-profile"), null, 2)}\n`;
  fs.writeFileSync(legacyDecompProfilePath, legacyDecompProfileBytes, "utf8");
  assert.throws(
    () => loadAreaTilePlaceholderEvidenceProfile({
      profilePath: legacyDecompProfilePath,
      expectedSha256: sha256(legacyDecompProfileBytes),
      evidenceRoot: root
    }),
    /unsupported evidence artifact schema/u
  );

  const semanticDriftArtifactBytes = `${JSON.stringify({
    ...decompArtifact,
    authority: {
      ...decompArtifact.authority,
      functionBindings: [{
        ...decompArtifact.authority.functionBindings[0],
        finding: "Unreviewed semantic finding drift."
      }]
    }
  })}\n`;
  const semanticDriftArtifactPath = path.join(evidenceDirectory, "semantic-drift.json");
  fs.writeFileSync(semanticDriftArtifactPath, semanticDriftArtifactBytes, "utf8");
  const semanticDriftProfilePath = path.join(profileDirectory, "semantic-drift-profile.json");
  const semanticDriftProfileBytes = `${JSON.stringify(reviewedProfile({
    ...decompProfile,
    evidence: [{
      ...decompProfile.evidence[0],
      artifactPath: "evidence/semantic-drift.json",
      artifactSha256: sha256(semanticDriftArtifactBytes)
    }]
  }, "semantic-drift-profile"), null, 2)}\n`;
  fs.writeFileSync(semanticDriftProfilePath, semanticDriftProfileBytes, "utf8");
  assert.throws(
    () => loadAreaTilePlaceholderEvidenceProfile({
      profilePath: semanticDriftProfilePath,
      expectedSha256: sha256(semanticDriftProfileBytes),
      evidenceRoot: root
    }),
    /semantic review is invalid/u
  );

  const missingFunctionArtifactBytes = `${JSON.stringify({
    ...decompArtifact,
    authority: {
      ...decompArtifact.authority,
      functionBindings: [{
        address: "0x00409999",
        outputSha256: sha256(functionOutputBytes),
        lineStart: 1,
        lineEnd: 2,
        finding: "This address is not present in the authoritative packet."
      }]
    }
  })}\n`;
  const missingFunctionArtifactPath = path.join(evidenceDirectory, "missing-function.json");
  fs.writeFileSync(missingFunctionArtifactPath, missingFunctionArtifactBytes, "utf8");
  const missingFunctionProfilePath = path.join(
    profileDirectory,
    "missing-function-profile.json"
  );
  const missingFunctionProfileBytes = `${JSON.stringify(reviewedProfile({
    ...decompProfile,
    evidence: [{
      ...decompProfile.evidence[0],
      artifactPath: "evidence/missing-function.json",
      artifactSha256: sha256(missingFunctionArtifactBytes)
    }]
  }, "missing-function-profile"), null, 2)}\n`;
  fs.writeFileSync(missingFunctionProfilePath, missingFunctionProfileBytes, "utf8");
  assert.throws(
    () => loadAreaTilePlaceholderEvidenceProfile({
      profilePath: missingFunctionProfilePath,
      expectedSha256: sha256(missingFunctionProfileBytes),
      evidenceRoot: root
    }),
    /function binding lacks a successful lineage record/u
  );

  const inventorySource = fs.readFileSync(
    new URL("./audit-all-area-tiles.mjs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(inventorySource, /isIntentionalPlaceholderModel/u);
  assert.doesNotMatch(inventorySource, /tpad_/u);
  assert.match(inventorySource, /parseAreaTilePlaceholderExclusionConfig/u);
  assert.match(inventorySource, /placeholderExclusion\.mode === "evidence-profile"/u);
  assert.match(inventorySource, /resolveAreaTilePlaceholderEvidence/u);
  assert.match(inventorySource, /groupIds: tile\.groupIds \?\? \[\]/u);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write("area tile placeholder evidence profile: PASS\n");
