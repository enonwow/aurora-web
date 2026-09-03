import { createHash } from "node:crypto";

import {
  comparePathNodeReferenceBoundary,
  PATH_NODE_REFERENCE_CORPUS
} from "./tile-path-node-reference.mjs";
import { validatePathConnectDifferentialProofForRow } from "./tile-path-connect-differential-proof.mjs";
import {
  MATRIX_RUNTIME_BUILD_BINDING_SCHEMA,
  MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA,
  validateMatrixRuntimeBuildBinding
} from "./tile-add-connect-runtime-build-profile.mjs";
import {
  MATRIX_RUNTIME_SOURCE_IDENTITY_ALGORITHM,
  MATRIX_RUNTIME_SOURCE_IDENTITY_SCHEMA
} from "./tile-add-connect-runtime-source-identity.mjs";

const MAX_AREA_DIMENSION = 32;
const PAIRS_PER_ROW = Math.floor(MAX_AREA_DIMENSION / 2);
const DEFAULT_GROUP_CHUNK_AREA_CELL_LIMIT = 16;

// A persisted matrix is a proof-plan contract, not a cache.  Bump this
// revision whenever planner semantics change so an older plan can never be
// resumed against new evidence gates by accident.
export const MATRIX_MANIFEST_SCHEMA = "aurora-tile-add-connect-matrix/v2";
export const MATRIX_CONTRACT_REVISION = "path-node-aware-v8";
const MATRIX_CONTRACT_FINGERPRINT_INPUT = Object.freeze({
  revision: MATRIX_CONTRACT_REVISION,
  runtimeBuildIdentity: {
    profileSchema: MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA,
    bindingSchema: MATRIX_RUNTIME_BUILD_BINDING_SCHEMA,
    sourceIdentitySchema: MATRIX_RUNTIME_SOURCE_IDENTITY_SCHEMA,
    sourceIdentityAlgorithm: MATRIX_RUNTIME_SOURCE_IDENTITY_ALGORITHM
  },
  pathNodeReference: {
    schema: PATH_NODE_REFERENCE_CORPUS.schema,
    authority: PATH_NODE_REFERENCE_CORPUS.authority,
    source: PATH_NODE_REFERENCE_CORPUS.source
  }
});
export const MATRIX_CONTRACT_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify(MATRIX_CONTRACT_FINGERPRINT_INPUT))
  .digest("hex");

export const MATRIX_CONTRACT = Object.freeze({
  ...MATRIX_CONTRACT_FINGERPRINT_INPUT,
  fingerprint: MATRIX_CONTRACT_FINGERPRINT
});

const SIDE_FIELDS = {
  right: {
    terrain: ["topRight", "bottomRight"],
    crosser: "right"
  },
  left: {
    terrain: ["topLeft", "bottomLeft"],
    crosser: "left"
  }
};

function normalizeToken(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function rawPathNode(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTileId(value) {
  const tileId = Number(value);
  if (!Number.isInteger(tileId) || tileId < 0) {
    throw new Error(`Tile_ID must be a non-negative integer; received ${String(value)}.`);
  }
  return tileId;
}

function normalizeTilesetResRef(value) {
  const resref = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{1,16}$/u.test(resref)) {
    throw new Error(`tilesetResRef must be a valid Aurora ResRef; received ${String(value)}.`);
  }
  return resref;
}

function blocker(code, resumeCondition) {
  return { code, resumeCondition };
}

const MODEL_SOURCE_STATUSES = new Set([
  "source_resolved",
  "source_missing",
  "intentional_placeholder",
  "invalid_missing_model_field"
]);

function tileModelEligibility(tile) {
  const modelResRef = normalizeToken(tile?.modelResRef) || null;
  const rawStatus = normalizeToken(tile?.modelSourceStatus);
  const modelSourceStatus = rawStatus || null;

  if (modelSourceStatus === "intentional_placeholder") {
    return {
      eligible: false,
      modelResRef,
      modelSourceStatus,
      blocker: blocker(
        "TILE_MODEL_INTENTIONAL_PLACEHOLDER",
        `Replace intentional placeholder${modelResRef ? ` model ${modelResRef}` : " declaration"} with an eligible source before visual capture.`
      )
    };
  }
  if (!modelResRef || modelSourceStatus === "invalid_missing_model_field") {
    return {
      eligible: false,
      modelResRef,
      modelSourceStatus,
      blocker: blocker(
        "TILE_MODEL_UNDECLARED",
        "Resolve a model resref and its source classification for this Tile_ID before visual capture."
      )
    };
  }
  if (modelSourceStatus === null) {
    // Small hand-authored/unit fixtures predate the source-bound catalog. The
    // complete v2 catalog loader rejects absent statuses before planning.
    return { eligible: true, modelResRef, modelSourceStatus: null, legacyUnbound: true };
  }
  if (!MODEL_SOURCE_STATUSES.has(modelSourceStatus)) {
    return {
      eligible: false,
      modelResRef,
      modelSourceStatus,
      blocker: blocker(
        "TILE_MODEL_SOURCE_STATUS_UNBOUND",
        `Bind Tile_ID ${String(tile?.tileId)} to a supported model-source status before visual capture.`
      )
    };
  }
  if (modelSourceStatus === "source_missing") {
    return {
      eligible: false,
      modelResRef,
      modelSourceStatus,
      blocker: blocker(
        "TILE_MODEL_SOURCE_MISSING",
        `Provide a hash-bound source for model ${modelResRef} before visual capture.`
      )
    };
  }
  return { eligible: true, modelResRef, modelSourceStatus };
}

function tilesetDefinitionFingerprintPayload(definition, includeModelSourceStatus) {
  const tiles = Array.isArray(definition?.tiles)
    ? definition.tiles
      .map((tile) => {
        const normalized = {
          tileId: normalizeTileId(tile.tileId),
          modelResRef: normalizeToken(tile.modelResRef),
          pathNode: rawPathNode(tile.pathNode),
          terrain: tile.terrain ?? {},
          crossers: tile.crossers ?? {}
        };
        return includeModelSourceStatus
          ? { ...normalized, modelSourceStatus: normalizeToken(tile.modelSourceStatus) || null }
          : normalized;
      })
      .sort((left, right) => left.tileId - right.tileId)
    : [];
  const groups = Array.isArray(definition?.groups)
    ? definition.groups
      .map((group) => ({
        id: typeof group?.id === "string" ? group.id.trim().toLowerCase() : null,
        rows: Number.isInteger(group?.rows) ? group.rows : null,
        columns: Number.isInteger(group?.columns) ? group.columns : null,
        tileIds: Array.isArray(group?.tileIds)
          ? group.tileIds.map((tileId) => tileId === null || tileId === -1 ? null : normalizeTileId(tileId))
          : null
      }))
      .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    : [];
  return { tiles, groups };
}

export function tilesetDefinitionFingerprint(definition) {
  return createHash("sha256")
    .update(JSON.stringify(tilesetDefinitionFingerprintPayload(definition, true)))
    .digest("hex");
}

export function tilesetRuntimeDefinitionFingerprint(definition) {
  return createHash("sha256")
    .update(JSON.stringify(tilesetDefinitionFingerprintPayload(definition, false)))
    .digest("hex");
}

export function buildSideDescriptor(tile, side) {
  const fields = SIDE_FIELDS[side];
  if (!fields) throw new Error(`Unsupported tile side: ${String(side)}.`);
  const terrain = tile?.terrain ?? {};
  const crossers = tile?.crossers ?? {};
  const values = [
    normalizeToken(terrain[fields.terrain[0]]),
    normalizeToken(terrain[fields.terrain[1]]),
    normalizeToken(crossers[fields.crosser])
  ];
  return {
    side,
    topTerrain: values[0] || null,
    bottomTerrain: values[1] || null,
    crosser: values[2] || null,
    key: values.join("|"),
    declared: values.some(Boolean)
  };
}

function rankPathNodePartners(candidates, sourceTile) {
  const rankByReferenceStatus = {
    "reference-match": 0,
    "reference-mismatch": 1,
    "reference-unavailable": 2
  };
  const nonSelfCandidates = candidates.filter((candidate) => candidate.tileId !== sourceTile.tileId);
  const eligibleCandidates = nonSelfCandidates.length > 0 ? nonSelfCandidates : candidates;
  return eligibleCandidates
    .map((candidate) => ({
      candidate,
      reference: comparePathNodeReferenceBoundary({
        source: { pathNode: sourceTile.pathNode, orientation: 0 },
        sourceEdge: "right",
        partner: { pathNode: candidate.pathNode, orientation: 0 },
        partnerEdge: "left"
      })
    }))
    .sort((left, right) =>
      (rankByReferenceStatus[left.reference.status] ?? Number.MAX_SAFE_INTEGER) -
        (rankByReferenceStatus[right.reference.status] ?? Number.MAX_SAFE_INTEGER) ||
      left.candidate.tileId - right.candidate.tileId
    );
}

function rowState(add, connect) {
  return add.status === "planned" && connect.status === "planned" ? "planned" : "blocked";
}

function pathNodeCompatibilityUnproven(sourceTile, partnerTile = null, reference = null) {
  const sourcePathNode = rawPathNode(sourceTile?.pathNode) || null;
  const partnerPathNode = rawPathNode(partnerTile?.pathNode) || null;
  const blockerDetails = reference?.status === "reference-match"
    ? {
        code: "PATH_NODE_AURORA_DIFFERENTIAL_PROOF_REQUIRED",
        resumeCondition: "Capture and validate the same edge, orientations, and lane set in Aurora/NWN before claiming click-to-move connectivity."
      }
    : reference?.status === "reference-mismatch"
      ? {
          code: "PATH_NODE_REFERENCE_MISMATCH",
          resumeCondition: "Select a neighbor with an exact reference PathNode lane-set match, then confirm it with Aurora/NWN evidence."
        }
      : reference
        ? {
            code: "PATH_NODE_REFERENCE_UNKNOWN",
            resumeCondition: "Resolve the raw PathNode symbol in the versioned reference corpus and confirm it with Aurora/NWN evidence."
          }
        : {
            code: "PATH_NODE_COMPATIBILITY_UNPROVEN",
            resumeCondition: "Resolve the versioned Aurora PathNode edge, rotation, and region contract before claiming click-to-move connectivity."
          };
  return {
    status: "blocked",
    sourcePathNode,
    partnerPathNode,
    ...(reference ? { reference } : {}),
    blocker: blocker(blockerDetails.code, blockerDetails.resumeCondition)
  };
}

function pathNodeNegativeControl(sourceTile, rankedPartners) {
  const negative = rankedPartners.find(
    (entry) => entry.reference.status === "reference-mismatch"
  );
  if (!negative) return null;
  return {
    referenceStatus: "reference-mismatch",
    source: {
      tileId: sourceTile.tileId,
      pathNode: rawPathNode(sourceTile.pathNode),
      orientation: negative.reference.source.orientation,
      edge: negative.reference.sourceEdge,
      row: null,
      col: null
    },
    partner: {
      tileId: negative.candidate.tileId,
      pathNode: rawPathNode(negative.candidate.pathNode),
      orientation: negative.reference.partner.orientation,
      edge: negative.reference.partnerEdge,
      row: null,
      col: null
    },
    sourceLanes: [...negative.reference.sourceLanes],
    partnerLanes: [...negative.reference.partnerLanes],
    matchingLanes: [...negative.reference.matchingLanes],
    sourceOnlyLanes: [...negative.reference.sourceOnlyLanes],
    partnerOnlyLanes: [...negative.reference.partnerOnlyLanes],
    sourceRegionsByLane: structuredClone(negative.reference.sourceRegionsByLane),
    partnerRegionsByLane: structuredClone(negative.reference.partnerRegionsByLane),
    reason: "path-node-reference-mismatch"
  };
}

function normalizeGroupMemberTileId(value) {
  if (value === null || value === -1) return null;
  return normalizeTileId(value);
}

function normalizeTileOrientation(value) {
  const orientation = Number(value ?? 0);
  return Number.isInteger(orientation) ? ((orientation % 4) + 4) % 4 : 0;
}

/**
 * Returns the deterministic diagnostic underlay for a multi-cell-group proof
 * chunk. The underlay fills every Area cell before the group fixture command
 * runs, so initial Area randomness cannot leave unrelated models unsettled.
 * It is proof scaffolding only; it never describes Aurora group semantics.
 */
export function buildGroupChunkBackgroundFixture(chunk) {
  if (chunk?.kind !== "group") {
    throw new Error("A group background fixture requires a group matrix chunk.");
  }
  const width = Number(chunk.width);
  const height = Number(chunk.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("A group background fixture requires positive integer chunk dimensions.");
  }
  const tileId = normalizeTileId(chunk.backgroundTileId);
  return Array.from({ length: width * height }, (_, index) => ({
    row: Math.floor(index / width),
    col: index % width,
    tileId
  }));
}

function collectMultiCellGroups(definition, tilesById) {
  const memberships = new Map();
  const groups = [];
  for (const rawGroup of Array.isArray(definition?.groups) ? definition.groups : []) {
    const rows = Number(rawGroup?.rows);
    const columns = Number(rawGroup?.columns);
    const groupId = typeof rawGroup?.id === "string" ? rawGroup.id.trim().toLowerCase() : "";
    const rawTileIds = Array.isArray(rawGroup?.tileIds) ? rawGroup.tileIds : null;
    const members = [];
    let invalidMember = false;
    if (rawTileIds) {
      rawTileIds.forEach((rawTileId, memberIndex) => {
        try {
          const tileId = normalizeGroupMemberTileId(rawTileId);
          if (tileId !== null) members.push({ tileId, memberIndex });
        } catch {
          invalidMember = true;
        }
      });
    }
    if (members.length <= 1) continue;
    const validLayout =
      Boolean(groupId) &&
      Number.isInteger(rows) &&
      Number.isInteger(columns) &&
      rows > 0 &&
      columns > 0 &&
      Array.isArray(rawTileIds) &&
      rawTileIds.length === rows * columns &&
      invalidMember === false;
    const unavailableMember = members
      .map((member) => ({ member, eligibility: tileModelEligibility(tilesById.get(member.tileId)) }))
      .find((entry) => !tilesById.has(entry.member.tileId) || !entry.eligibility.eligible) ?? null;
    const group = {
      groupId,
      rows,
      columns,
      members: members.map((member) => ({
        ...member,
        orientation: normalizeTileOrientation(tilesById.get(member.tileId)?.orientation)
      })),
      validLayout,
      captureEligible: unavailableMember === null,
      unavailableMember: unavailableMember
        ? {
            tileId: unavailableMember.member.tileId,
            blocker: unavailableMember.eligibility.blocker ?? blocker(
              "TILE_MODEL_UNDECLARED",
              `Add the missing Tile_ID ${String(unavailableMember.member.tileId)} definition before group capture.`
            )
          }
        : null,
      layoutBlocker: !groupId || !Number.isInteger(rows) || !Number.isInteger(columns) || rows <= 0 || columns <= 0 ||
        !Array.isArray(rawTileIds) || rawTileIds.length !== rows * columns || invalidMember
        ? "MULTI_CELL_GROUP_LAYOUT_INVALID"
        : null
    };
    groups.push(group);
    for (const member of members) {
      const entries = memberships.get(member.tileId) ?? [];
      entries.push({
        groupId,
        rows,
        columns,
        validLayout,
        captureEligible: group.captureEligible,
        unavailableMemberTileId: group.unavailableMember?.tileId ?? null
      });
      memberships.set(member.tileId, entries);
    }
  }
  return { groups, memberships };
}

function chooseGroupFixtures(groups) {
  const eligible = groups
    .map((group) => {
      if (
        !group.validLayout ||
        !group.captureEligible ||
        group.rows > MAX_AREA_DIMENSION ||
        group.columns > MAX_AREA_DIMENSION
      ) {
        return null;
      }
      return group;
    })
    .filter(Boolean);
  const uncovered = new Set(eligible.flatMap((group) => group.members.map((member) => member.tileId)));
  const selected = [];
  while (uncovered.size > 0) {
    const candidate = eligible
      .map((group) => ({ group, coverage: group.members.filter((member) => uncovered.has(member.tileId)).length }))
      .filter((entry) => entry.coverage > 0)
      .sort((left, right) =>
        right.coverage - left.coverage ||
        right.group.members.length - left.group.members.length ||
        left.group.groupId.localeCompare(right.group.groupId)
      )[0] ?? null;
    if (!candidate) break;
    selected.push(candidate.group);
    candidate.group.members.forEach((member) => uncovered.delete(member.tileId));
  }
  return selected;
}

export function planTilesetAddConnect(tileset) {
  const tilesetResRef = normalizeTilesetResRef(tileset?.tilesetResRef);
  const definition = tileset?.definition ?? {};
  const definitionFingerprint = tilesetDefinitionFingerprint(definition);
  const runtimeDefinitionFingerprint = tilesetRuntimeDefinitionFingerprint(definition);
  const tiles = Array.isArray(definition.tiles)
    ? definition.tiles
      .map((tile) => ({ ...tile, tileId: normalizeTileId(tile.tileId) }))
      .sort((left, right) => left.tileId - right.tileId)
    : [];
  const tilesById = new Map(tiles.map((tile) => [tile.tileId, tile]));
  const { groups: multiCellGroups, memberships: groupedTileMembership } = collectMultiCellGroups(definition, tilesById);
  const selectedGroupFixtures = chooseGroupFixtures(multiCellGroups);
  const leftIndex = new Map();

  for (const tile of tiles) {
    if (!tileModelEligibility(tile).eligible || groupedTileMembership.has(tile.tileId)) continue;
    const descriptor = buildSideDescriptor(tile, "left");
    if (!descriptor.declared) continue;
    const candidates = leftIndex.get(descriptor.key) ?? [];
    candidates.push(tile);
    leftIndex.set(descriptor.key, candidates);
  }

  const rows = tiles.map((tile) => {
    const modelEligibility = tileModelEligibility(tile);
    const modelResRef = modelEligibility.modelResRef;
    const rightDescriptor = buildSideDescriptor(tile, "right");
    const groups = groupedTileMembership.get(tile.tileId) ?? [];
    const groupSourceUnavailable = groups.length > 0 && groups.every((group) =>
      group.captureEligible === false && group.unavailableMemberTileId !== null
    );
    const groupSourceBlocker = groupSourceUnavailable
      ? blocker(
          "MULTI_CELL_GROUP_MODEL_SOURCE_UNAVAILABLE",
          `Provide an eligible model source for every member of the declared group (first unavailable Tile_ID: ${String(groups[0]?.unavailableMemberTileId)}).`
        )
      : null;
    const add = !modelEligibility.eligible
      ? {
          status: "blocked",
          blocker: modelEligibility.blocker
        }
      : groupSourceUnavailable
      ? {
          status: "blocked",
          groups,
          blocker: groupSourceBlocker
        }
      : groups.length > 0
      ? {
          status: "blocked",
          groups,
          blocker: blocker(
            "MULTI_CELL_GROUP_PLACEMENT_REQUIRED",
            "Capture this Tile_ID through one complete declared SET group; individual Tile_ID replacement is correctly locked."
          )
        }
      : { status: "planned", fixtureKind: "tile" };
    let connect;
    let pathPartner = null;
    let pathNodeReference = null;
    let negativeControl = null;

    if (!modelEligibility.eligible) {
      connect = {
        status: "blocked",
        blocker: modelEligibility.blocker
      };
    } else if (groupSourceUnavailable) {
      connect = {
        status: "blocked",
        blocker: groupSourceBlocker
      };
    } else if (groups.length > 0) {
      connect = {
        status: "blocked",
        blocker: blocker(
          "MULTI_CELL_GROUP_PLACEMENT_REQUIRED",
          "Capture this Tile_ID through one complete declared SET group before evaluating adjacent connections."
        )
      };
    } else if (!rightDescriptor.declared) {
      connect = {
        status: "blocked",
        sourceDescriptor: rightDescriptor,
        blocker: blocker(
          "NO_DECLARED_RIGHT_DESCRIPTOR",
          "Capture add-only evidence or obtain primary Aurora evidence for a descriptor-free connection."
        )
      };
    } else {
      const rankedPartners = rankPathNodePartners(leftIndex.get(rightDescriptor.key) ?? [], tile);
      const selectedPartner = rankedPartners[0] ?? null;
      if (!selectedPartner) {
        connect = {
          status: "blocked",
          sourceDescriptor: rightDescriptor,
          blocker: blocker(
            "NO_DECLARED_RIGHT_LEFT_PARTNER",
            "Add or recover a Tile_ID with an exact declared left descriptor."
          )
        };
      } else {
        pathPartner = selectedPartner.candidate;
        pathNodeReference = selectedPartner.reference;
        if (pathNodeReference.status === "reference-match") {
          negativeControl = pathNodeNegativeControl(tile, rankedPartners);
        }
        const candidateCounts = rankedPartners.reduce((counts, entry) => {
          counts[entry.reference.status] = (counts[entry.reference.status] ?? 0) + 1;
          return counts;
        }, {});
        connect = {
          status: "planned",
          sourceDescriptor: rightDescriptor,
          partnerTileId: pathPartner.tileId,
          partnerModelResRef: normalizeToken(pathPartner.modelResRef),
          partnerDescriptor: buildSideDescriptor(pathPartner, "left"),
          match: {
            kind: "render_descriptor_exact_right_left",
            pathNodeReferenceStatus: pathNodeReference.status,
            candidateSelection: {
              strategy: "path_node_reference_match_then_tile_id",
              candidateCount: rankedPartners.length,
              selectedRank: 1,
              referenceStatusCounts: candidateCounts
            }
          }
        };
      }
    }

    const pathConnect = connect.status === "planned"
      ? {
          ...pathNodeCompatibilityUnproven(tile, pathPartner, pathNodeReference),
          ...(negativeControl ? { negativeControl } : {})
        }
      : {
          status: "blocked",
          sourcePathNode: rawPathNode(tile.pathNode) || null,
          partnerPathNode: null,
          blocker: connect.blocker
        };

    return {
      schema: "aurora-tile-add-connect-matrix-row/v1",
      id: `${tilesetResRef}:${tile.tileId}`,
      tilesetResRef,
      tileId: tile.tileId,
      modelResRef,
      modelSourceStatus: modelEligibility.modelSourceStatus,
      definitionFingerprint,
      add,
      connect,
      pathConnect,
      state: rowState(add, connect),
      fixture: null
    };
  });

  const rowsByTileId = new Map(rows.map((row) => [row.tileId, row]));
  const groupFixtures = selectedGroupFixtures.map((group) => {
    const rowIds = [];
    for (const member of group.members) {
      const row = rowsByTileId.get(member.tileId);
      if (!row || !groupedTileMembership.get(member.tileId)?.some((entry) => entry.groupId === group.groupId)) {
        throw new Error(`Selected group ${group.groupId} cannot cover Tile_ID ${member.tileId}.`);
      }
      if (row.add.status === "blocked") {
        row.add = {
          status: "planned",
          fixtureKind: "group",
          groupId: group.groupId,
          groupRows: group.rows,
          groupColumns: group.columns
        };
        row.connect = {
          status: "planned",
          groupId: group.groupId,
          match: { kind: "declared_set_group_layout" }
        };
        row.pathConnect = pathNodeCompatibilityUnproven(tilesById.get(member.tileId));
        row.state = "planned";
      }
      rowIds.push(row.id);
    }
    return { ...group, rowIds };
  });

  return {
    tilesetResRef,
    sourceKey: typeof tileset?.sourceKey === "string" ? tileset.sourceKey : null,
    etag: typeof tileset?.etag === "string" ? tileset.etag : null,
    definitionFingerprint,
    runtimeDefinitionFingerprint,
    rows,
    groupFixtures
  };
}

function assertCaseLimit(value) {
  const caseLimit = Number(value);
  if (!Number.isInteger(caseLimit) || caseLimit < 1 || caseLimit > PAIRS_PER_ROW * MAX_AREA_DIMENSION) {
    throw new Error(`caseLimit must be an integer in 1..${PAIRS_PER_ROW * MAX_AREA_DIMENSION}.`);
  }
  return caseLimit;
}

function assertGroupChunkAreaCellLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 4 || limit > MAX_AREA_DIMENSION * MAX_AREA_DIMENSION) {
    throw new Error(`groupChunkAreaCellLimit must be an integer in 4..${MAX_AREA_DIMENSION * MAX_AREA_DIMENSION}.`);
  }
  return limit;
}

function chooseDirectChunkLayout(caseCount) {
  let chosen = null;
  for (let pairsPerRow = 1; pairsPerRow <= Math.min(PAIRS_PER_ROW, caseCount); pairsPerRow += 1) {
    const width = pairsPerRow * 2;
    const height = Math.max(2, Math.ceil(caseCount / pairsPerRow));
    if (height > MAX_AREA_DIMENSION) continue;
    const candidate = {
      pairsPerRow,
      width,
      height,
      area: width * height,
      aspectDistance: Math.abs(width - height)
    };
    if (
      !chosen ||
      candidate.area < chosen.area ||
      (candidate.area === chosen.area && candidate.aspectDistance < chosen.aspectDistance) ||
      (candidate.area === chosen.area &&
        candidate.aspectDistance === chosen.aspectDistance &&
        candidate.pairsPerRow > chosen.pairsPerRow)
    ) {
      chosen = candidate;
    }
  }
  if (!chosen) throw new Error(`Cannot fit ${caseCount} direct matrix cases into the Area bound.`);
  return chosen;
}

function assignChunks(tilesetPlan, caseLimit) {
  const eligible = tilesetPlan.rows.filter(
    (row) => row.add.status === "planned" && row.add.fixtureKind !== "group"
  );
  const chunks = [];
  for (let offset = 0; offset < eligible.length; offset += caseLimit) {
    const chunkRows = eligible.slice(offset, offset + caseLimit);
    const index = chunks.length;
    const chunkId = `${tilesetPlan.tilesetResRef}-chunk-${String(index + 1).padStart(4, "0")}`;
    const { pairsPerRow, width, height } = chooseDirectChunkLayout(chunkRows.length);
    const cases = chunkRows.map((row, caseIndex) => {
      const fixtureRow = Math.floor(caseIndex / pairsPerRow);
      const fixtureCol = (caseIndex % pairsPerRow) * 2;
      const cells = [
        { role: "source", row: fixtureRow, col: fixtureCol, tileId: row.tileId }
      ];
      if (row.connect.status === "planned") {
        cells.push({
          role: "partner",
          row: fixtureRow,
          col: fixtureCol + 1,
          tileId: row.connect.partnerTileId
        });
      }
      row.fixture = { kind: "tile", chunkId, caseIndex, width, height, cells };
      if (row.pathConnect?.negativeControl) {
        row.pathConnect.negativeControl.source.row = fixtureRow;
        row.pathConnect.negativeControl.source.col = fixtureCol;
        row.pathConnect.negativeControl.partner.row = fixtureRow;
        row.pathConnect.negativeControl.partner.col = fixtureCol + 1;
      }
      return { rowId: row.id, cells };
    });
    chunks.push({
      kind: "tile",
      id: chunkId,
      tilesetResRef: tilesetPlan.tilesetResRef,
      sourceKey: tilesetPlan.sourceKey,
      etag: tilesetPlan.etag,
      definitionFingerprint: tilesetPlan.definitionFingerprint,
      runtimeDefinitionFingerprint: tilesetPlan.runtimeDefinitionFingerprint,
      width,
      height,
      caseCount: cases.length,
      cases
    });
  }
  return chunks;
}

function assignGroupChunks(tilesetPlan, caseLimit, groupChunkAreaCellLimit) {
  const chunks = [];
  const preferredBackgroundTileId =
    tilesetPlan.rows.find(
      (row) => row.add.status === "planned" && row.add.fixtureKind === "tile"
    )?.tileId ?? null;
  let fixtures = [];
  let memberTileCount = 0;
  let cursorRow = 0;
  let cursorCol = 0;
  let rowHeight = 0;
  let usedWidth = 0;

  const flush = () => {
    if (fixtures.length === 0) return;
    const chunkIndex = chunks.length + 1;
    const chunkId = `${tilesetPlan.tilesetResRef}-group-chunk-${String(chunkIndex).padStart(4, "0")}`;
    const cases = fixtures.map((fixture, caseIndex) => {
      const caseId = `${tilesetPlan.tilesetResRef}:${fixture.groupId}:${caseIndex}`;
      const memberCells = fixture.members.map((member) => ({
        role: "group-member",
        rowId: fixture.rowIds[fixture.members.indexOf(member)],
        memberIndex: member.memberIndex,
        row: fixture.anchor.row + Math.floor(member.memberIndex / fixture.columns),
        col: fixture.anchor.col + (member.memberIndex % fixture.columns),
        tileId: member.tileId,
        orientation: member.orientation
      }));
      for (const member of memberCells) {
        const row = tilesetPlan.rows.find((candidate) => candidate.id === member.rowId);
        if (row) {
          row.fixture = {
            kind: "group",
            chunkId,
            caseId,
            groupId: fixture.groupId,
            cell: {
              row: member.row,
              col: member.col,
              tileId: member.tileId,
              orientation: member.orientation,
              memberIndex: member.memberIndex
            }
          };
        }
      }
      return {
        id: caseId,
        groupId: fixture.groupId,
        anchor: fixture.anchor,
        rows: fixture.rows,
        columns: fixture.columns,
        memberCells
      };
    });
    chunks.push({
      kind: "group",
      id: chunkId,
      tilesetResRef: tilesetPlan.tilesetResRef,
      sourceKey: tilesetPlan.sourceKey,
      etag: tilesetPlan.etag,
      definitionFingerprint: tilesetPlan.definitionFingerprint,
      runtimeDefinitionFingerprint: tilesetPlan.runtimeDefinitionFingerprint,
      width: Math.max(2, usedWidth),
      height: Math.max(2, cursorRow + rowHeight),
      caseCount: cases.length,
      memberTileCount,
      backgroundTileId: preferredBackgroundTileId ?? fixtures[0].members[0].tileId,
      cases
    });
    fixtures = [];
    memberTileCount = 0;
    cursorRow = 0;
    cursorCol = 0;
    rowHeight = 0;
    usedWidth = 0;
  };

  for (const fixture of [...tilesetPlan.groupFixtures].sort((left, right) => left.groupId.localeCompare(right.groupId))) {
    if (fixture.rows > MAX_AREA_DIMENSION || fixture.columns > MAX_AREA_DIMENSION) {
      throw new Error(`Group ${fixture.groupId} cannot fit the ${MAX_AREA_DIMENSION}x${MAX_AREA_DIMENSION} fixture bound.`);
    }
    if (memberTileCount > 0 && memberTileCount + fixture.members.length > caseLimit) flush();
    if (cursorCol > 0 && cursorCol + fixture.columns > MAX_AREA_DIMENSION) {
      cursorRow += rowHeight + 1;
      cursorCol = 0;
      rowHeight = 0;
    }
    if (cursorRow + fixture.rows > MAX_AREA_DIMENSION) {
      flush();
    }
    const projectedWidth = Math.max(usedWidth, cursorCol + fixture.columns);
    const projectedHeight = Math.max(cursorRow + rowHeight, cursorRow + fixture.rows);
    if (fixtures.length > 0 && projectedWidth * projectedHeight > groupChunkAreaCellLimit) {
      flush();
    }
    fixture.anchor = { row: cursorRow, col: cursorCol };
    fixtures.push(fixture);
    memberTileCount += fixture.members.length;
    usedWidth = Math.max(usedWidth, cursorCol + fixture.columns);
    rowHeight = Math.max(rowHeight, fixture.rows);
    cursorCol += fixture.columns + 1;
  }
  flush();
  return chunks;
}

export function buildMatrixManifest({
  tilesets,
  runtimeBuildBinding,
  caseLimit = 16,
  groupChunkAreaCellLimit = DEFAULT_GROUP_CHUNK_AREA_CELL_LIMIT,
  generatedAt = new Date().toISOString()
}) {
  if (!Array.isArray(tilesets) || tilesets.length === 0) {
    throw new Error("tilesets must contain at least one tileset definition.");
  }
  const runtimeBuildErrors = validateMatrixRuntimeBuildBinding(runtimeBuildBinding);
  if (runtimeBuildErrors.length > 0) {
    throw new Error(
      `runtimeBuildBinding is invalid: ${runtimeBuildErrors.join(", ")}.`
    );
  }
  const normalizedCaseLimit = assertCaseLimit(caseLimit);
  const normalizedGroupChunkAreaCellLimit = assertGroupChunkAreaCellLimit(groupChunkAreaCellLimit);
  const plans = tilesets
    .map(planTilesetAddConnect)
    .sort((left, right) => left.tilesetResRef.localeCompare(right.tilesetResRef));
  const directChunks = plans.flatMap((plan) => assignChunks(plan, normalizedCaseLimit));
  const groupChunks = plans.flatMap((plan) =>
    assignGroupChunks(plan, normalizedCaseLimit, normalizedGroupChunkAreaCellLimit)
  );
  // Complete SET groups run first: their members cannot be honestly proven by
  // the loose-tile lane, and the small median footprint provides the quickest
  // fail-closed evidence that the group fixture path is usable.
  const chunks = [...groupChunks, ...directChunks];
  const rows = plans.flatMap((plan) => plan.rows);
  const pathReferenceStatus = (row) => row.pathConnect?.reference?.status ?? null;
  const summary = {
    tilesetCount: plans.length,
    totalRows: rows.length,
    addPlannedRows: rows.filter((row) => row.add.status === "planned").length,
    connectPlannedRows: rows.filter((row) => row.connect.status === "planned").length,
    pathConnectAcceptedRows: rows.filter((row) => row.pathConnect?.status === "accepted").length,
    pathConnectBlockedRows: rows.filter((row) => row.pathConnect?.status === "blocked").length,
    pathReferenceMatchRows: rows.filter((row) => pathReferenceStatus(row) === "reference-match").length,
    pathReferenceMismatchRows: rows.filter((row) => pathReferenceStatus(row) === "reference-mismatch").length,
    pathReferenceUnknownRows: rows.filter((row) => {
      const status = pathReferenceStatus(row);
      return status !== null && status !== "reference-match" && status !== "reference-mismatch";
    }).length,
    pathReferenceNotEvaluatedRows: rows.filter((row) => pathReferenceStatus(row) === null).length,
    blockedRows: rows.filter((row) => row.state === "blocked").length,
    chunkCount: chunks.length,
    directChunkCount: directChunks.length,
    groupChunkCount: groupChunks.length,
    groupFixtureCount: plans.flatMap((plan) => plan.groupFixtures).length,
    groupPlannedRows: rows.filter((row) => row.add.status === "planned" && row.add.fixtureKind === "group").length,
    caseLimit: normalizedCaseLimit,
    groupChunkAreaCellLimit: normalizedGroupChunkAreaCellLimit
  };
  return {
    schema: MATRIX_MANIFEST_SCHEMA,
    contract: MATRIX_CONTRACT,
    runtimeBuildBinding: structuredClone(runtimeBuildBinding),
    generatedAt,
    summary,
    rows,
    chunks
  };
}

export function validateMatrixManifest(manifest) {
  const errors = new Set();
  if (manifest?.schema !== MATRIX_MANIFEST_SCHEMA) {
    errors.add("MATRIX_MANIFEST_SCHEMA_UNSUPPORTED");
  }
  if (manifest?.contract?.revision !== MATRIX_CONTRACT_REVISION) {
    errors.add("MATRIX_CONTRACT_REVISION_UNSUPPORTED");
  }
  if (manifest?.contract?.fingerprint !== MATRIX_CONTRACT_FINGERPRINT) {
    errors.add("MATRIX_CONTRACT_FINGERPRINT_MISMATCH");
  }
  validateMatrixRuntimeBuildBinding(manifest?.runtimeBuildBinding)
    .forEach((error) => errors.add(error));
  if (
    manifest?.contract?.runtimeBuildIdentity?.profileSchema !==
      MATRIX_RUNTIME_BUILD_PROFILE_SCHEMA ||
    manifest?.contract?.runtimeBuildIdentity?.bindingSchema !==
      MATRIX_RUNTIME_BUILD_BINDING_SCHEMA
  ) {
    errors.add("MATRIX_RUNTIME_BUILD_CONTRACT_MISMATCH");
  }
  if (
    manifest?.contract?.pathNodeReference?.schema !== PATH_NODE_REFERENCE_CORPUS.schema ||
    manifest?.contract?.pathNodeReference?.authority !== PATH_NODE_REFERENCE_CORPUS.authority ||
    manifest?.contract?.pathNodeReference?.source?.url !== PATH_NODE_REFERENCE_CORPUS.source.url ||
    manifest?.contract?.pathNodeReference?.source?.version !== PATH_NODE_REFERENCE_CORPUS.source.version ||
    manifest?.contract?.pathNodeReference?.source?.bodySha256 !== PATH_NODE_REFERENCE_CORPUS.source.bodySha256
  ) {
    errors.add("PATH_NODE_REFERENCE_CORPUS_MISMATCH");
  }
  const rows = Array.isArray(manifest?.rows) ? manifest.rows : [];
  const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
  const knownChunkIds = new Set();
  const knownRowIds = new Set();

  for (const chunk of chunks) {
    if (knownChunkIds.has(chunk.id)) errors.add("DUPLICATE_CHUNK_ID");
    knownChunkIds.add(chunk.id);
    validateMatrixChunk(chunk).forEach((error) => errors.add(error));
  }

  for (const row of rows) {
    if (knownRowIds.has(row.id)) errors.add("DUPLICATE_MATRIX_ROW_ID");
    knownRowIds.add(row.id);
    if (row.add?.status === "planned" && !row.fixture) {
      errors.add("PLANNED_ADD_WITHOUT_FIXTURE");
    }
    if (!row.pathConnect || typeof row.pathConnect !== "object" || row.pathConnect.status === undefined) {
      errors.add("PATH_CONNECT_STATUS_MISSING");
    } else if (row.pathConnect.status !== "accepted" && row.pathConnect.status !== "blocked") {
      errors.add("PATH_CONNECT_STATUS_INVALID");
    } else if (
      row.pathConnect.status === "blocked" &&
      (typeof row.pathConnect.blocker?.code !== "string" || row.pathConnect.blocker.code.trim().length === 0)
    ) {
      errors.add("PATH_CONNECT_BLOCKER_MISSING");
    } else if (row.pathConnect.status === "accepted") {
      validatePathConnectDifferentialProofForRow(row.pathConnect.proof, row)
        .forEach((error) => errors.add(error));
    }
    if (row.fixture && !knownChunkIds.has(row.fixture.chunkId)) {
      errors.add("ROW_REFERENCES_UNKNOWN_CHUNK");
    }
  }

  return [...errors].sort((left, right) => left.localeCompare(right));
}

/**
 * Validates one self-contained capture fixture before it is handed to the
 * browser runner.  A matrix chunk is intentionally safe to persist on its
 * own: it contains no credentials and no command capable of changing a
 * server-side Area, only the local-draft Tile_ID placements to prove.
 */
export function validateMatrixChunk(chunk) {
  const errors = new Set();
  if (!chunk || typeof chunk !== "object") {
    return ["MATRIX_CHUNK_MISSING"];
  }
  if (typeof chunk.id !== "string" || chunk.id.trim().length === 0) {
    errors.add("MATRIX_CHUNK_ID_INVALID");
  }
  if (!/^[a-f0-9]{64}$/u.test(chunk.runtimeDefinitionFingerprint ?? "")) {
    errors.add("MATRIX_CHUNK_RUNTIME_DEFINITION_FINGERPRINT_INVALID");
  }
  try {
    normalizeTilesetResRef(chunk.tilesetResRef);
  } catch {
    errors.add("MATRIX_CHUNK_TILESET_RESREF_INVALID");
  }
  if (!Number.isInteger(chunk.width) || !Number.isInteger(chunk.height) ||
    chunk.width < 2 || chunk.width > MAX_AREA_DIMENSION ||
    chunk.height < 2 || chunk.height > MAX_AREA_DIMENSION) {
    errors.add("CHUNK_DIMENSION_OUT_OF_RANGE");
  }
  const cases = Array.isArray(chunk.cases) ? chunk.cases : null;
  if (!cases || cases.length === 0) {
    errors.add("MATRIX_CHUNK_CASES_MISSING");
  }
  if (Number(chunk.caseCount) !== (cases?.length ?? 0)) {
    errors.add("MATRIX_CHUNK_CASE_COUNT_MISMATCH");
  }
  const kind = chunk.kind ?? "tile";
  if (kind !== "tile" && kind !== "group") errors.add("MATRIX_CHUNK_KIND_INVALID");
  if (kind === "group") {
    if (chunk.backgroundTileId !== undefined) {
      try {
        normalizeTileId(chunk.backgroundTileId);
      } catch {
        errors.add("MATRIX_GROUP_BACKGROUND_TILE_ID_INVALID");
      }
    }
    const seenCases = new Set();
    const seenCells = new Set();
    let observedMembers = 0;
    for (const matrixCase of cases ?? []) {
      if (typeof matrixCase?.id !== "string" || matrixCase.id.trim().length === 0 || seenCases.has(matrixCase.id)) {
        errors.add("MATRIX_GROUP_CASE_ID_INVALID");
      }
      seenCases.add(matrixCase?.id);
      if (typeof matrixCase?.groupId !== "string" || matrixCase.groupId.trim().length === 0) {
        errors.add("MATRIX_GROUP_ID_INVALID");
      }
      const rows = Number(matrixCase?.rows);
      const columns = Number(matrixCase?.columns);
      const anchor = matrixCase?.anchor;
      if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1 ||
        !Number.isInteger(anchor?.row) || !Number.isInteger(anchor?.col) ||
        anchor.row < 0 || anchor.col < 0 || anchor.row + rows > chunk.height || anchor.col + columns > chunk.width) {
        errors.add("MATRIX_GROUP_LAYOUT_INVALID");
      }
      const memberCells = Array.isArray(matrixCase?.memberCells) ? matrixCase.memberCells : [];
      if (memberCells.length < 2) errors.add("MATRIX_GROUP_MEMBER_CELLS_MISSING");
      for (const cell of memberCells) {
        observedMembers += 1;
        const key = `${cell?.row}:${cell?.col}`;
        if (seenCells.has(key)) errors.add("DUPLICATE_FIXTURE_CELL");
        seenCells.add(key);
        if (typeof cell?.rowId !== "string" || !cell.rowId.trim()) {
          errors.add("MATRIX_GROUP_MEMBER_ROW_ID_INVALID");
        }
        if (cell?.role !== "group-member") errors.add("MATRIX_GROUP_MEMBER_ROLE_INVALID");
        if (!Number.isInteger(cell?.memberIndex) || cell.memberIndex < 0 || cell.memberIndex >= rows * columns ||
          cell?.row !== anchor?.row + Math.floor(cell.memberIndex / columns) ||
          cell?.col !== anchor?.col + (cell.memberIndex % columns)) {
          errors.add("MATRIX_GROUP_MEMBER_LAYOUT_MISMATCH");
        }
        if (!Number.isInteger(cell?.row) || !Number.isInteger(cell?.col) ||
          cell.row < 0 || cell.col < 0 || cell.row >= chunk.height || cell.col >= chunk.width) {
          errors.add("FIXTURE_CELL_OUT_OF_BOUNDS");
        }
        try {
          normalizeTileId(cell?.tileId);
        } catch {
          errors.add("MATRIX_FIXTURE_TILE_ID_INVALID");
        }
        if (![0, 1, 2, 3].includes(cell?.orientation)) errors.add("MATRIX_GROUP_MEMBER_ORIENTATION_INVALID");
      }
    }
    if (Number(chunk.memberTileCount) !== observedMembers) errors.add("MATRIX_GROUP_MEMBER_COUNT_MISMATCH");
    return [...errors].sort((left, right) => left.localeCompare(right));
  }
  const seenRows = new Set();
  const seenCells = new Set();
  for (const matrixCase of cases ?? []) {
    if (typeof matrixCase?.rowId !== "string" || matrixCase.rowId.trim().length === 0) {
      errors.add("MATRIX_CASE_ROW_ID_INVALID");
    } else if (seenRows.has(matrixCase.rowId)) {
      errors.add("DUPLICATE_MATRIX_CASE_ROW_ID");
    } else {
      seenRows.add(matrixCase.rowId);
    }
    const cells = Array.isArray(matrixCase?.cells) ? matrixCase.cells : [];
    if (cells.length < 1 || cells.length > 2) {
      errors.add("MATRIX_CASE_CELL_COUNT_INVALID");
      continue;
    }
    const source = cells.find((cell) => cell?.role === "source") ?? null;
    const partner = cells.find((cell) => cell?.role === "partner") ?? null;
    if (!source) errors.add("MATRIX_CASE_SOURCE_CELL_MISSING");
    if (cells.some((cell) => cell?.role !== "source" && cell?.role !== "partner")) {
      errors.add("MATRIX_FIXTURE_CELL_ROLE_INVALID");
    }
    if (partner && (!source || partner.row !== source.row || partner.col !== source.col + 1)) {
      errors.add("MATRIX_CASE_PARTNER_CELL_INVALID");
    }
    for (const cell of cells) {
      const key = `${cell?.row}:${cell?.col}`;
      if (seenCells.has(key)) errors.add("DUPLICATE_FIXTURE_CELL");
      seenCells.add(key);
      if (!Number.isInteger(cell?.row) || !Number.isInteger(cell?.col) ||
        cell.row < 0 || cell.col < 0 || cell.row >= chunk.height || cell.col >= chunk.width) {
        errors.add("FIXTURE_CELL_OUT_OF_BOUNDS");
      }
      try {
        normalizeTileId(cell?.tileId);
      } catch {
        errors.add("MATRIX_FIXTURE_TILE_ID_INVALID");
      }
    }
  }
  return [...errors].sort((left, right) => left.localeCompare(right));
}
