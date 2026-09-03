const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;
const PROFILE_ID = /^[a-z0-9][a-z0-9-]{2,127}$/u;
const EDGES = Object.freeze(["top", "right", "bottom", "left"]);
const OPPOSITE_EDGE = Object.freeze({ top: "bottom", right: "left", bottom: "top", left: "right" });

const PROFILE_KEYS = Object.freeze([
  "schema",
  "id",
  "approved",
  "moduleSha256",
  "positiveAreaResRef",
  "negativeAreaResRef",
  "areaWidth",
  "areaHeight",
  "tilesetResRef",
  "definitionFingerprint",
  "rowId",
  "source",
  "partner",
  "matchingLanes",
  "negativeControl"
]);
const TILE_KEYS = Object.freeze(["tileId", "pathNode", "orientation", "edge", "row", "col"]);
const NEGATIVE_CONTROL_KEYS = Object.freeze([
  "referenceStatus",
  "source",
  "partner",
  "sourceLanes",
  "partnerLanes",
  "matchingLanes",
  "sourceOnlyLanes",
  "partnerOnlyLanes",
  "sourceRegionsByLane",
  "partnerRegionsByLane",
  "reason"
]);
const PACKET_KEYS = Object.freeze([
  "schema",
  "profileId",
  "profileSha256",
  "moduleSha256",
  "positiveAreaResRef",
  "negativeAreaResRef",
  "rowId",
  "toolsetReadback",
  "runtime",
  "artifacts"
]);
const TOOLSET_READBACK_KEYS = Object.freeze([
  "verified",
  "tilesetResRef",
  "definitionFingerprint",
  "dimensions",
  "positive",
  "negative"
]);
const RUNTIME_KEYS = Object.freeze(["verified", "engine", "positive", "negative", "failures"]);
const OUTCOME_KEYS = Object.freeze(["crossedSharedEdge", "reachedTarget", "timedOut"]);
const ARTIFACT_KINDS = Object.freeze([
  "toolsetReadback",
  "positiveRuntime",
  "negativeRuntime",
  "engineLog"
]);
const ARTIFACT_KEYS = Object.freeze(["path", "sha256"]);
const PROOF_KEYS = Object.freeze([
  "schema",
  "immutableToolsetNwnProfile",
  "crossEdgeDifferential",
  "binding",
  "artifacts"
]);
const PROOF_PROFILE_KEYS = Object.freeze([
  "schema",
  "id",
  "approved",
  "profilePath",
  "profileSha256",
  "moduleSha256",
  "positiveAreaResRef",
  "negativeAreaResRef",
  "areaWidth",
  "areaHeight"
]);
const PROOF_DIFFERENTIAL_KEYS = Object.freeze([
  "schema",
  "verified",
  "artifactPath",
  "artifactSha256",
  "toolsetReadbackVerified",
  "nwnRuntimeVerified",
  "positiveOutcome",
  "negativeControlOutcome"
]);
const PROOF_BINDING_KEYS = Object.freeze([
  "rowId",
  "tilesetResRef",
  "definitionFingerprint",
  "areaWidth",
  "areaHeight",
  "source",
  "partner",
  "matchingLanes",
  "negativeControl"
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function ownKeys(value) {
  return isRecord(value) ? Object.keys(value) : [];
}

function unexpectedKeys(value, allowed, prefix) {
  const allowedSet = new Set(allowed);
  return ownKeys(value)
    .filter((key) => !allowedSet.has(key))
    .sort()
    .map((key) => `${prefix}:${key}`);
}

function hasExactKeys(value, allowed) {
  if (!isRecord(value)) return false;
  const actual = ownKeys(value).sort();
  const expected = [...allowed].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isIntegerIn(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isTileId(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPathNode(value) {
  return typeof value === "string" && value.length === 1 && value.trim() === value;
}

function isEdge(value) {
  return EDGES.includes(value);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function sameJson(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function validMatchingLanes(value) {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every(Number.isFinite) &&
    value.every((lane, index) => index === 0 || lane > value[index - 1]);
}

function validSortedFiniteLanes(value) {
  return Array.isArray(value) &&
    value.every(Number.isFinite) &&
    value.every((lane, index) => index === 0 || lane > value[index - 1]);
}

function validRegionsByLane(value) {
  return Array.isArray(value) && value.every((entry, index) =>
    exactObjectKeysForProof(entry, ["lane", "regions"]) &&
    Number.isFinite(entry.lane) &&
    (index === 0 || entry.lane > value[index - 1].lane) &&
    Array.isArray(entry.regions) && entry.regions.length > 0 &&
    entry.regions.every((region, regionIndex) =>
      Number.isInteger(region) && region >= 0 &&
      (regionIndex === 0 || region > entry.regions[regionIndex - 1])
    )
  );
}

function exactObjectKeysForProof(value, keys) {
  return hasExactKeys(value, keys);
}

function matrixFixtureCell(row, role) {
  return Array.isArray(row?.fixture?.cells)
    ? row.fixture.cells.find((cell) => cell?.role === role) ?? null
    : null;
}

function validateProfileTile(value, role, errors) {
  const upper = role.toUpperCase();
  if (!hasExactKeys(value, TILE_KEYS)) {
    errors.add(`PATH_CONNECT_PROFILE_${upper}_SHAPE_INVALID`);
    unexpectedKeys(value, TILE_KEYS, `PATH_CONNECT_PROFILE_${upper}_UNEXPECTED_KEY`).forEach((error) => errors.add(error));
    return;
  }
  if (!isTileId(value.tileId)) errors.add(`PATH_CONNECT_PROFILE_${upper}_TILE_ID_INVALID`);
  if (!isPathNode(value.pathNode)) errors.add(`PATH_CONNECT_PROFILE_${upper}_PATH_NODE_INVALID`);
  if (!isIntegerIn(value.orientation, 0, 3)) errors.add(`PATH_CONNECT_PROFILE_${upper}_ORIENTATION_INVALID`);
  if (!isEdge(value.edge)) errors.add(`PATH_CONNECT_PROFILE_${upper}_EDGE_INVALID`);
  if (!isIntegerIn(value.row, 0, 31) || !isIntegerIn(value.col, 0, 31)) {
    errors.add(`PATH_CONNECT_PROFILE_${upper}_CELL_INVALID`);
  }
}

export function validatePathConnectDifferentialProfile(profile, row = null) {
  const errors = new Set();
  if (!isRecord(profile)) return ["PATH_CONNECT_PROFILE_INVALID"];
  unexpectedKeys(profile, PROFILE_KEYS, "PATH_CONNECT_PROFILE_UNEXPECTED_KEY").forEach((error) => errors.add(error));
  if (!hasExactKeys(profile, PROFILE_KEYS)) errors.add("PATH_CONNECT_PROFILE_SHAPE_INVALID");
  if (profile.schema !== "aurora-tile-path-connect-profile/v2") errors.add("PATH_CONNECT_PROFILE_SCHEMA_INVALID");
  if (typeof profile.id !== "string" || !PROFILE_ID.test(profile.id)) errors.add("PATH_CONNECT_PROFILE_ID_INVALID");
  if (profile.approved !== true) errors.add("PATH_CONNECT_PROFILE_NOT_APPROVED");
  if (typeof profile.moduleSha256 !== "string" || !SHA256.test(profile.moduleSha256)) errors.add("PATH_CONNECT_PROFILE_MODULE_SHA256_INVALID");
  if (typeof profile.definitionFingerprint !== "string" || !SHA256.test(profile.definitionFingerprint)) errors.add("PATH_CONNECT_PROFILE_DEFINITION_FINGERPRINT_INVALID");
  if (typeof profile.positiveAreaResRef !== "string" || !RESREF.test(profile.positiveAreaResRef) ||
    typeof profile.negativeAreaResRef !== "string" || !RESREF.test(profile.negativeAreaResRef) ||
    profile.negativeAreaResRef === profile.positiveAreaResRef) {
    errors.add("PATH_CONNECT_PROFILE_AREA_RESREF_INVALID");
  }
  if (!isIntegerIn(profile.areaWidth, 1, 32) || !isIntegerIn(profile.areaHeight, 1, 32)) {
    errors.add("PATH_CONNECT_PROFILE_AREA_DIMENSIONS_INVALID");
  }
  if (typeof profile.tilesetResRef !== "string" || !RESREF.test(profile.tilesetResRef)) errors.add("PATH_CONNECT_PROFILE_TILESET_RESREF_INVALID");
  if (typeof profile.rowId !== "string" || profile.rowId.length === 0) errors.add("PATH_CONNECT_PROFILE_ROW_ID_INVALID");
  validateProfileTile(profile.source, "source", errors);
  validateProfileTile(profile.partner, "partner", errors);
  if (isRecord(profile.source) && isRecord(profile.partner) && OPPOSITE_EDGE[profile.source.edge] !== profile.partner.edge) {
    errors.add("PATH_CONNECT_PROFILE_PARTNER_EDGE_MISMATCH");
  }
  if (!validMatchingLanes(profile.matchingLanes)) errors.add("PATH_CONNECT_PROFILE_MATCHING_LANES_INVALID");
  if (!hasExactKeys(profile.negativeControl, NEGATIVE_CONTROL_KEYS)) {
    errors.add("PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_INVALID");
  } else {
    const control = profile.negativeControl;
    const nestedErrors = new Set();
    validateProfileTile(control.source, "negative_source", nestedErrors);
    validateProfileTile(control.partner, "negative_partner", nestedErrors);
    if (control.referenceStatus !== "reference-mismatch" || nestedErrors.size > 0 ||
      !sameJson(control.source, profile.source) || control.partner?.tileId === profile.partner?.tileId ||
      OPPOSITE_EDGE[control.source?.edge] !== control.partner?.edge ||
      !validSortedFiniteLanes(control.sourceLanes) ||
      !validSortedFiniteLanes(control.partnerLanes) ||
      !validSortedFiniteLanes(control.matchingLanes) ||
      !validSortedFiniteLanes(control.sourceOnlyLanes) ||
      !validSortedFiniteLanes(control.partnerOnlyLanes) ||
      !validRegionsByLane(control.sourceRegionsByLane) ||
      !validRegionsByLane(control.partnerRegionsByLane) ||
      control.reason !== "path-node-reference-mismatch") {
      errors.add("PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_INVALID");
    }
  }

  if (row) {
    const sourceCell = matrixFixtureCell(row, "source");
    const partnerCell = matrixFixtureCell(row, "partner");
    if (profile.rowId !== row.id) errors.add("PATH_CONNECT_PROFILE_ROW_MISMATCH");
    if (profile.tilesetResRef !== row.tilesetResRef) errors.add("PATH_CONNECT_PROFILE_TILESET_MISMATCH");
    if (profile.definitionFingerprint !== row.definitionFingerprint) errors.add("PATH_CONNECT_PROFILE_DEFINITION_FINGERPRINT_MISMATCH");
    if (profile.source?.tileId !== row.tileId) errors.add("PATH_CONNECT_PROFILE_SOURCE_TILE_MISMATCH");
    if (profile.partner?.tileId !== row.connect?.partnerTileId) errors.add("PATH_CONNECT_PROFILE_PARTNER_TILE_MISMATCH");
    if (profile.source?.pathNode !== row.pathConnect?.sourcePathNode) errors.add("PATH_CONNECT_PROFILE_SOURCE_PATH_NODE_MISMATCH");
    if (profile.partner?.pathNode !== row.pathConnect?.partnerPathNode) errors.add("PATH_CONNECT_PROFILE_PARTNER_PATH_NODE_MISMATCH");
    if (profile.source?.orientation !== row.pathConnect?.reference?.source?.orientation) errors.add("PATH_CONNECT_PROFILE_SOURCE_ORIENTATION_MISMATCH");
    if (profile.partner?.orientation !== row.pathConnect?.reference?.partner?.orientation) errors.add("PATH_CONNECT_PROFILE_PARTNER_ORIENTATION_MISMATCH");
    if (profile.source?.edge !== row.pathConnect?.reference?.sourceEdge) errors.add("PATH_CONNECT_PROFILE_SOURCE_EDGE_MISMATCH");
    if (profile.partner?.edge !== row.pathConnect?.reference?.partnerEdge) errors.add("PATH_CONNECT_PROFILE_PARTNER_EDGE_MISMATCH");
    if (!sameJson(profile.matchingLanes, row.pathConnect?.reference?.matchingLanes)) errors.add("PATH_CONNECT_PROFILE_MATCHING_LANES_MISMATCH");
    if (!sourceCell || profile.source?.row !== sourceCell.row || profile.source?.col !== sourceCell.col || profile.source?.tileId !== sourceCell.tileId) {
      errors.add("PATH_CONNECT_PROFILE_SOURCE_CELL_MISMATCH");
    }
    if (!partnerCell || profile.partner?.row !== partnerCell.row || profile.partner?.col !== partnerCell.col || profile.partner?.tileId !== partnerCell.tileId) {
      errors.add("PATH_CONNECT_PROFILE_PARTNER_CELL_MISMATCH");
    }
    if (!sameJson(profile.negativeControl, row.pathConnect?.negativeControl)) {
      errors.add("PATH_CONNECT_PROFILE_NEGATIVE_CONTROL_MISMATCH");
    }
    if (profile.areaWidth !== row.fixture?.width || profile.areaHeight !== row.fixture?.height) {
      errors.add("PATH_CONNECT_PROFILE_AREA_DIMENSIONS_MISMATCH");
    }
  }
  return [...errors].sort();
}

function validateOutcome(value, expected, code, errors) {
  if (!hasExactKeys(value, OUTCOME_KEYS) || !sameJson(value, expected)) errors.add(code);
}

export function validatePathConnectDifferentialPacket(packet, profile, profileSha256) {
  const errors = new Set();
  if (!isRecord(packet)) return ["PATH_CONNECT_PACKET_INVALID"];
  unexpectedKeys(packet, PACKET_KEYS, "PATH_CONNECT_PACKET_UNEXPECTED_KEY").forEach((error) => errors.add(error));
  if (!hasExactKeys(packet, PACKET_KEYS)) errors.add("PATH_CONNECT_PACKET_SHAPE_INVALID");
  if (packet.schema !== "aurora-tile-path-connect-differential-packet/v2") errors.add("PATH_CONNECT_PACKET_SCHEMA_INVALID");
  if (packet.profileId !== profile?.id) errors.add("PATH_CONNECT_PACKET_PROFILE_ID_MISMATCH");
  if (typeof profileSha256 !== "string" || !SHA256.test(profileSha256) || packet.profileSha256 !== profileSha256) errors.add("PATH_CONNECT_PACKET_PROFILE_SHA256_MISMATCH");
  if (packet.moduleSha256 !== profile?.moduleSha256) errors.add("PATH_CONNECT_PACKET_MODULE_SHA256_MISMATCH");
  if (packet.positiveAreaResRef !== profile?.positiveAreaResRef ||
    packet.negativeAreaResRef !== profile?.negativeAreaResRef) {
    errors.add("PATH_CONNECT_PACKET_AREA_RESREF_MISMATCH");
  }
  if (packet.rowId !== profile?.rowId) errors.add("PATH_CONNECT_PACKET_ROW_MISMATCH");

  const readback = packet.toolsetReadback;
  if (!hasExactKeys(readback, TOOLSET_READBACK_KEYS) || readback.verified !== true ||
    readback.tilesetResRef !== profile?.tilesetResRef ||
    readback.definitionFingerprint !== profile?.definitionFingerprint ||
    !hasExactKeys(readback.dimensions, ["width", "height"]) ||
    readback.dimensions.width !== profile?.areaWidth ||
    readback.dimensions.height !== profile?.areaHeight) {
    errors.add("PATH_CONNECT_PACKET_TOOLSET_READBACK_INVALID");
  } else {
    if (!hasExactKeys(readback.positive, ["areaResRef", "source", "partner"]) ||
      readback.positive.areaResRef !== profile.positiveAreaResRef ||
      !sameJson(readback.positive.source, profile.source) ||
      !sameJson(readback.positive.partner, profile.partner)) {
      errors.add("PATH_CONNECT_PACKET_POSITIVE_READBACK_MISMATCH");
    }
    if (!hasExactKeys(readback.negative, ["areaResRef", "control"]) ||
      readback.negative.areaResRef !== profile.negativeAreaResRef ||
      !sameJson(readback.negative.control, profile.negativeControl)) {
      errors.add("PATH_CONNECT_PACKET_NEGATIVE_READBACK_MISMATCH");
    }
  }

  const runtime = packet.runtime;
  if (!hasExactKeys(runtime, RUNTIME_KEYS) || runtime.verified !== true) {
    errors.add("PATH_CONNECT_PACKET_RUNTIME_INVALID");
  } else {
    if (runtime.engine !== "nwmain") errors.add("PATH_CONNECT_PACKET_RUNTIME_ENGINE_INVALID");
    validateOutcome(runtime.positive, { crossedSharedEdge: true, reachedTarget: true, timedOut: false }, "PATH_CONNECT_PACKET_POSITIVE_OUTCOME_INVALID", errors);
    validateOutcome(runtime.negative, { crossedSharedEdge: false, reachedTarget: false, timedOut: false }, "PATH_CONNECT_PACKET_NEGATIVE_OUTCOME_INVALID", errors);
    if (!Array.isArray(runtime.failures) || runtime.failures.length !== 0) errors.add("PATH_CONNECT_PACKET_RUNTIME_FAILURES_PRESENT");
  }

  if (!hasExactKeys(packet.artifacts, ARTIFACT_KINDS)) {
    errors.add("PATH_CONNECT_PACKET_ARTIFACT_SET_INVALID");
  }
  for (const kind of ARTIFACT_KINDS) {
    const artifact = packet.artifacts?.[kind];
    if (!hasExactKeys(artifact, ARTIFACT_KEYS) || typeof artifact.path !== "string" || artifact.path.trim().length === 0 ||
      typeof artifact.sha256 !== "string" || !SHA256.test(artifact.sha256)) {
      errors.add(`PATH_CONNECT_PACKET_ARTIFACT_INVALID:${kind}`);
    }
  }
  return [...errors].sort();
}

export function buildPathConnectDifferentialProof({ profile, profilePath, profileSha256, packet, packetPath, packetSha256 }) {
  const profileErrors = validatePathConnectDifferentialProfile(profile);
  const packetErrors = validatePathConnectDifferentialPacket(packet, profile, profileSha256);
  const pathErrors = [
    ...(typeof profilePath === "string" && profilePath.trim().length > 0 ? [] : ["PATH_CONNECT_PROFILE_PATH_INVALID"]),
    ...(typeof packetPath === "string" && packetPath.trim().length > 0 ? [] : ["PATH_CONNECT_PACKET_PATH_INVALID"])
  ];
  if (profileErrors.length > 0 || packetErrors.length > 0 || pathErrors.length > 0 || typeof packetSha256 !== "string" || !SHA256.test(packetSha256)) {
    throw new Error([...profileErrors, ...packetErrors, ...pathErrors, ...(SHA256.test(String(packetSha256 ?? "")) ? [] : ["PATH_CONNECT_PACKET_SHA256_INVALID"])].join(","));
  }
  return {
    schema: "aurora-tile-path-connect-differential-proof/v2",
    immutableToolsetNwnProfile: {
      schema: profile.schema,
      id: profile.id,
      approved: true,
      profilePath,
      profileSha256,
      moduleSha256: profile.moduleSha256,
      positiveAreaResRef: profile.positiveAreaResRef,
      negativeAreaResRef: profile.negativeAreaResRef,
      areaWidth: profile.areaWidth,
      areaHeight: profile.areaHeight
    },
    crossEdgeDifferential: {
      schema: packet.schema,
      verified: true,
      artifactPath: packetPath,
      artifactSha256: packetSha256,
      toolsetReadbackVerified: true,
      nwnRuntimeVerified: true,
      positiveOutcome: { ...packet.runtime.positive },
      negativeControlOutcome: { ...packet.runtime.negative }
    },
    binding: {
      rowId: profile.rowId,
      tilesetResRef: profile.tilesetResRef,
      definitionFingerprint: profile.definitionFingerprint,
      areaWidth: profile.areaWidth,
      areaHeight: profile.areaHeight,
      source: { ...profile.source },
      partner: { ...profile.partner },
      matchingLanes: [...profile.matchingLanes],
      negativeControl: structuredClone(profile.negativeControl)
    },
    artifacts: Object.fromEntries(ARTIFACT_KINDS.map((kind) => [kind, { ...packet.artifacts[kind] }]))
  };
}

export function validatePathConnectDifferentialProofForRow(proof, row) {
  const errors = new Set();
  if (!isRecord(proof)) return ["PATH_CONNECT_PROOF_INVALID"];
  unexpectedKeys(proof, PROOF_KEYS, "PATH_CONNECT_PROOF_UNEXPECTED_KEY").forEach((error) => errors.add(error));
  if (!hasExactKeys(proof, PROOF_KEYS)) errors.add("PATH_CONNECT_PROOF_SHAPE_INVALID");
  if (proof.schema !== "aurora-tile-path-connect-differential-proof/v2") errors.add("PATH_CONNECT_PROOF_SCHEMA_INVALID");
  const immutable = proof.immutableToolsetNwnProfile;
  if (!hasExactKeys(immutable, PROOF_PROFILE_KEYS) || immutable.schema !== "aurora-tile-path-connect-profile/v2" ||
    immutable.approved !== true || typeof immutable.id !== "string" || !PROFILE_ID.test(immutable.id) ||
    typeof immutable.profilePath !== "string" || immutable.profilePath.trim().length === 0 ||
    typeof immutable.profileSha256 !== "string" || !SHA256.test(immutable.profileSha256) ||
    typeof immutable.moduleSha256 !== "string" || !SHA256.test(immutable.moduleSha256) ||
    typeof immutable.positiveAreaResRef !== "string" || !RESREF.test(immutable.positiveAreaResRef) ||
    typeof immutable.negativeAreaResRef !== "string" || !RESREF.test(immutable.negativeAreaResRef) ||
    immutable.negativeAreaResRef === immutable.positiveAreaResRef ||
    !isIntegerIn(immutable.areaWidth, 1, 32) || !isIntegerIn(immutable.areaHeight, 1, 32)) {
    errors.add("PATH_CONNECT_IMMUTABLE_PROFILE_INVALID");
  }
  const differential = proof.crossEdgeDifferential;
  if (!hasExactKeys(differential, PROOF_DIFFERENTIAL_KEYS) ||
    differential.schema !== "aurora-tile-path-connect-differential-packet/v2" || differential.verified !== true ||
    typeof differential.artifactPath !== "string" || differential.artifactPath.trim().length === 0 ||
    typeof differential.artifactSha256 !== "string" || !SHA256.test(differential.artifactSha256) ||
    differential.toolsetReadbackVerified !== true || differential.nwnRuntimeVerified !== true) {
    errors.add("PATH_CONNECT_CROSS_EDGE_DIFFERENTIAL_INVALID");
  } else {
    validateOutcome(differential.positiveOutcome, { crossedSharedEdge: true, reachedTarget: true, timedOut: false }, "PATH_CONNECT_PROOF_POSITIVE_OUTCOME_INVALID", errors);
    validateOutcome(differential.negativeControlOutcome, { crossedSharedEdge: false, reachedTarget: false, timedOut: false }, "PATH_CONNECT_PROOF_NEGATIVE_OUTCOME_INVALID", errors);
  }
  const binding = proof.binding;
  if (!hasExactKeys(binding, PROOF_BINDING_KEYS)) {
    errors.add("PATH_CONNECT_PROOF_BINDING_INVALID");
  } else {
    if (binding.rowId !== row?.id) errors.add("PATH_CONNECT_PROOF_ROW_MISMATCH");
    if (binding.tilesetResRef !== row?.tilesetResRef) errors.add("PATH_CONNECT_PROOF_TILESET_MISMATCH");
    if (binding.definitionFingerprint !== row?.definitionFingerprint) errors.add("PATH_CONNECT_PROOF_DEFINITION_FINGERPRINT_MISMATCH");
    if (binding.areaWidth !== row?.fixture?.width || binding.areaHeight !== row?.fixture?.height) {
      errors.add("PATH_CONNECT_PROOF_AREA_DIMENSIONS_MISMATCH");
    }
    if (binding.source?.tileId !== row?.tileId || binding.source?.pathNode !== row?.pathConnect?.sourcePathNode ||
      binding.source?.orientation !== row?.pathConnect?.reference?.source?.orientation ||
      binding.source?.edge !== row?.pathConnect?.reference?.sourceEdge) {
      errors.add("PATH_CONNECT_PROOF_SOURCE_BINDING_MISMATCH");
    }
    if (binding.partner?.tileId !== row?.connect?.partnerTileId || binding.partner?.pathNode !== row?.pathConnect?.partnerPathNode ||
      binding.partner?.orientation !== row?.pathConnect?.reference?.partner?.orientation ||
      binding.partner?.edge !== row?.pathConnect?.reference?.partnerEdge) {
      errors.add("PATH_CONNECT_PROOF_PARTNER_BINDING_MISMATCH");
    }
    const sourceCell = matrixFixtureCell(row, "source");
    const partnerCell = matrixFixtureCell(row, "partner");
    if (!sourceCell || binding.source?.row !== sourceCell.row || binding.source?.col !== sourceCell.col) errors.add("PATH_CONNECT_PROOF_SOURCE_CELL_MISMATCH");
    if (!partnerCell || binding.partner?.row !== partnerCell.row || binding.partner?.col !== partnerCell.col) errors.add("PATH_CONNECT_PROOF_PARTNER_CELL_MISMATCH");
    if (!validMatchingLanes(binding.matchingLanes) || !sameJson(binding.matchingLanes, row?.pathConnect?.reference?.matchingLanes)) {
      errors.add("PATH_CONNECT_PROOF_MATCHING_LANES_MISMATCH");
    }
    if (!sameJson(binding.negativeControl, row?.pathConnect?.negativeControl)) {
      errors.add("PATH_CONNECT_PROOF_NEGATIVE_CONTROL_MISMATCH");
    }
  }
  if (!hasExactKeys(proof.artifacts, ARTIFACT_KINDS)) errors.add("PATH_CONNECT_PROOF_ARTIFACT_SET_INVALID");
  for (const kind of ARTIFACT_KINDS) {
    const artifact = proof.artifacts?.[kind];
    if (!hasExactKeys(artifact, ARTIFACT_KEYS) || typeof artifact.path !== "string" || artifact.path.trim().length === 0 ||
      typeof artifact.sha256 !== "string" || !SHA256.test(artifact.sha256)) {
      errors.add(`PATH_CONNECT_PROOF_ARTIFACT_INVALID:${kind}`);
    }
  }
  return [...errors].sort();
}

export const PATH_CONNECT_DIFFERENTIAL_ARTIFACT_KINDS = ARTIFACT_KINDS;
