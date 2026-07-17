export type WalkmeshMetadataPrimitive = string | number | boolean | null;

export type WalkmeshMetadataValue =
  | WalkmeshMetadataPrimitive
  | readonly WalkmeshMetadataPrimitive[];

export type WalkmeshMetadataRecord = Readonly<
  Record<string, WalkmeshMetadataValue | undefined>
>;

export interface WalkmeshVertex {
  x: number;
  y: number;
  z: number;
  metadata?: WalkmeshMetadataRecord;
}

export interface WalkmeshTriangle {
  a: number;
  b: number;
  c: number;
  metadata?: WalkmeshMetadataRecord;
}

export interface WalkmeshDomainModel {
  schemaVersion: number;
  vertices: readonly WalkmeshVertex[];
  triangles: readonly WalkmeshTriangle[];
  metadata?: WalkmeshMetadataRecord;
}

export interface CreateWalkmeshDomainModelInput {
  schemaVersion?: number;
  vertices?: readonly WalkmeshVertex[];
  triangles?: readonly WalkmeshTriangle[];
  metadata?: WalkmeshMetadataRecord;
}

export type WalkmeshValidationCode =
  | "schema_version_invalid"
  | "vertex_coord_not_finite"
  | "triangle_index_not_integer"
  | "triangle_index_out_of_bounds"
  | "triangle_degenerate";

export interface WalkmeshValidationIssue {
  code: WalkmeshValidationCode;
  message: string;
  path: string;
}

export interface WalkmeshValidationResult {
  isValid: boolean;
  issues: readonly WalkmeshValidationIssue[];
}

export type WalkmeshNormalizationCode =
  | "payload_not_object"
  | "vertices_not_array"
  | "vertex_not_object"
  | "triangles_not_array"
  | "triangle_not_object"
  | WalkmeshValidationCode;

export interface WalkmeshNormalizationIssue {
  code: WalkmeshNormalizationCode;
  message: string;
  path: string;
}

export interface WalkmeshNormalizationResult {
  model: WalkmeshDomainModel;
  issues: readonly WalkmeshNormalizationIssue[];
}

const DEFAULT_WALKMESH_SCHEMA_VERSION = 1;

function createValidationIssue(
  code: WalkmeshValidationCode,
  message: string,
  path: string
): WalkmeshValidationIssue {
  return { code, message, path };
}

function createNormalizationIssue(
  code: WalkmeshNormalizationCode,
  message: string,
  path: string
): WalkmeshNormalizationIssue {
  return { code, message, path };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMetadataPrimitive(value: unknown): value is WalkmeshMetadataPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isIntegerNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function cloneMetadataRecord(
  metadata: WalkmeshMetadataRecord | undefined
): WalkmeshMetadataRecord | undefined {
  if (!metadata) {
    return undefined;
  }
  const entries = Object.entries(metadata).map(([key, value]) => {
    if (Array.isArray(value)) {
      return [key, [...value] as const] as const;
    }
    return [key, value] as const;
  });
  return Object.freeze(Object.fromEntries(entries));
}

function normalizeMetadataRecord(metadata: unknown): WalkmeshMetadataRecord | undefined {
  if (!isRecord(metadata)) {
    return undefined;
  }

  const normalized: Record<string, WalkmeshMetadataValue | undefined> = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (value === undefined) {
      normalized[key] = undefined;
      return;
    }
    if (isMetadataPrimitive(value)) {
      normalized[key] = value;
      return;
    }
    if (Array.isArray(value) && value.every(isMetadataPrimitive)) {
      normalized[key] = [...value] as readonly WalkmeshMetadataPrimitive[];
    }
  });
  return cloneMetadataRecord(normalized);
}

function cloneVertex(vertex: WalkmeshVertex): WalkmeshVertex {
  return Object.freeze({
    x: vertex.x,
    y: vertex.y,
    z: vertex.z,
    metadata: cloneMetadataRecord(vertex.metadata)
  });
}

function cloneTriangle(triangle: WalkmeshTriangle): WalkmeshTriangle {
  return Object.freeze({
    a: triangle.a,
    b: triangle.b,
    c: triangle.c,
    metadata: cloneMetadataRecord(triangle.metadata)
  });
}

/**
 * Preserve-first walkmesh contract container.
 * No pathing traversal/runtime behavior is inferred from this model.
 */
export function createWalkmeshDomainModel(
  input: CreateWalkmeshDomainModelInput
): WalkmeshDomainModel {
  return Object.freeze({
    schemaVersion: isPositiveInteger(input.schemaVersion)
      ? input.schemaVersion
      : DEFAULT_WALKMESH_SCHEMA_VERSION,
    vertices: Object.freeze((input.vertices ?? []).map(cloneVertex)),
    triangles: Object.freeze((input.triangles ?? []).map(cloneTriangle)),
    metadata: cloneMetadataRecord(input.metadata)
  });
}

export function validateWalkmeshDomainModel(
  model: WalkmeshDomainModel
): WalkmeshValidationResult {
  const issues: WalkmeshValidationIssue[] = [];
  const vertexCount = model.vertices.length;

  if (!isPositiveInteger(model.schemaVersion)) {
    issues.push(
      createValidationIssue(
        "schema_version_invalid",
        "schemaVersion must be a positive integer.",
        "schemaVersion"
      )
    );
  }

  model.vertices.forEach((vertex, vertexIndex) => {
    (["x", "y", "z"] as const).forEach((axis) => {
      if (!isFiniteNumber(vertex[axis])) {
        issues.push(
          createValidationIssue(
            "vertex_coord_not_finite",
            "vertex coordinates must be finite numbers.",
            `vertices[${vertexIndex}].${axis}`
          )
        );
      }
    });
  });

  model.triangles.forEach((triangle, triangleIndex) => {
    const keys = ["a", "b", "c"] as const;
    keys.forEach((key) => {
      const value = triangle[key];
      if (!isIntegerNumber(value)) {
        issues.push(
          createValidationIssue(
            "triangle_index_not_integer",
            "triangle indexes must be integers.",
            `triangles[${triangleIndex}].${key}`
          )
        );
        return;
      }
      if (value < 0 || value >= vertexCount) {
        issues.push(
          createValidationIssue(
            "triangle_index_out_of_bounds",
            `triangle indexes must be in range 0..${Math.max(vertexCount - 1, 0)}.`,
            `triangles[${triangleIndex}].${key}`
          )
        );
      }
    });

    if (triangle.a === triangle.b || triangle.a === triangle.c || triangle.b === triangle.c) {
      issues.push(
        createValidationIssue(
          "triangle_degenerate",
          "triangle indexes must reference three unique vertices.",
          `triangles[${triangleIndex}]`
        )
      );
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
}

export function normalizeWalkmeshPayload(payload: unknown): WalkmeshNormalizationResult {
  const issues: WalkmeshNormalizationIssue[] = [];
  if (!isRecord(payload)) {
    issues.push(
      createNormalizationIssue(
        "payload_not_object",
        "walkmesh payload must be an object.",
        "$"
      )
    );
    return {
      model: createWalkmeshDomainModel({}),
      issues
    };
  }

  const rawSchemaVersion = payload.schemaVersion;
  const schemaVersion = isPositiveInteger(rawSchemaVersion)
    ? rawSchemaVersion
    : DEFAULT_WALKMESH_SCHEMA_VERSION;
  if (rawSchemaVersion !== undefined && !isPositiveInteger(rawSchemaVersion)) {
    issues.push(
      createNormalizationIssue(
        "schema_version_invalid",
        "schemaVersion must be a positive integer.",
        "schemaVersion"
      )
    );
  }

  const rawVertices = payload.vertices;
  const nextVertices: WalkmeshVertex[] = [];
  if (rawVertices !== undefined && !Array.isArray(rawVertices)) {
    issues.push(
      createNormalizationIssue("vertices_not_array", "vertices must be an array.", "vertices")
    );
  } else {
    (rawVertices ?? []).forEach((entry, vertexIndex) => {
      if (!isRecord(entry)) {
        issues.push(
          createNormalizationIssue(
            "vertex_not_object",
            "each vertex must be an object.",
            `vertices[${vertexIndex}]`
          )
        );
        return;
      }

      const x = asFiniteNumber(entry.x, 0);
      const y = asFiniteNumber(entry.y, 0);
      const z = asFiniteNumber(entry.z, 0);
      if (!isFiniteNumber(entry.x)) {
        issues.push(
          createNormalizationIssue(
            "vertex_coord_not_finite",
            "vertex coordinates must be finite numbers.",
            `vertices[${vertexIndex}].x`
          )
        );
      }
      if (!isFiniteNumber(entry.y)) {
        issues.push(
          createNormalizationIssue(
            "vertex_coord_not_finite",
            "vertex coordinates must be finite numbers.",
            `vertices[${vertexIndex}].y`
          )
        );
      }
      if (!isFiniteNumber(entry.z)) {
        issues.push(
          createNormalizationIssue(
            "vertex_coord_not_finite",
            "vertex coordinates must be finite numbers.",
            `vertices[${vertexIndex}].z`
          )
        );
      }

      const normalizedMetadata = normalizeMetadataRecord(entry.metadata);
      nextVertices.push({
        x,
        y,
        z,
        ...(normalizedMetadata
          ? {
              metadata: normalizedMetadata
            }
          : {})
      });
    });
  }

  const rawTriangles = payload.triangles;
  const nextTriangles: WalkmeshTriangle[] = [];
  if (rawTriangles !== undefined && !Array.isArray(rawTriangles)) {
    issues.push(
      createNormalizationIssue(
        "triangles_not_array",
        "triangles must be an array.",
        "triangles"
      )
    );
  } else {
    (rawTriangles ?? []).forEach((entry, triangleIndex) => {
      if (!isRecord(entry)) {
        issues.push(
          createNormalizationIssue(
            "triangle_not_object",
            "each triangle must be an object.",
            `triangles[${triangleIndex}]`
          )
        );
        return;
      }

      const a = entry.a;
      const b = entry.b;
      const c = entry.c;
      if (!isIntegerNumber(a)) {
        issues.push(
          createNormalizationIssue(
            "triangle_index_not_integer",
            "triangle indexes must be integers.",
            `triangles[${triangleIndex}].a`
          )
        );
        return;
      }
      if (!isIntegerNumber(b)) {
        issues.push(
          createNormalizationIssue(
            "triangle_index_not_integer",
            "triangle indexes must be integers.",
            `triangles[${triangleIndex}].b`
          )
        );
        return;
      }
      if (!isIntegerNumber(c)) {
        issues.push(
          createNormalizationIssue(
            "triangle_index_not_integer",
            "triangle indexes must be integers.",
            `triangles[${triangleIndex}].c`
          )
        );
        return;
      }

      const normalizedMetadata = normalizeMetadataRecord(entry.metadata);
      nextTriangles.push({
        a,
        b,
        c,
        ...(normalizedMetadata
          ? {
              metadata: normalizedMetadata
            }
          : {})
      });
    });
  }

  const normalizedPayloadMetadata = normalizeMetadataRecord(payload.metadata);
  const normalizedModel = createWalkmeshDomainModel({
    schemaVersion,
    vertices: nextVertices,
    triangles: nextTriangles,
    ...(normalizedPayloadMetadata
      ? {
          metadata: normalizedPayloadMetadata
        }
      : {})
  });

  const validation = validateWalkmeshDomainModel(normalizedModel);
  validation.issues.forEach((issue) => {
    issues.push(createNormalizationIssue(issue.code, issue.message, issue.path));
  });

  return {
    model: normalizedModel,
    issues
  };
}
