import { describe, expect, it } from "vitest";
import {
  createWalkmeshDomainModel,
  normalizeWalkmeshPayload,
  validateWalkmeshDomainModel
} from "../../../../../src/modules/scene/domain/walkmesh";

describe("walkmesh domain contract stub", () => {
  it("normalizes valid payload and keeps preserve-first data shape", () => {
    const result = normalizeWalkmeshPayload({
      schemaVersion: 2,
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0, metadata: { zone: "entry" } }
      ],
      triangles: [{ a: 0, b: 1, c: 2, metadata: { areaId: 7 } }],
      metadata: { source: "are_git", revision: 3 }
    });

    expect(result.issues).toEqual([]);
    expect(result.model).toEqual({
      schemaVersion: 2,
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0, metadata: { zone: "entry" } }
      ],
      triangles: [{ a: 0, b: 1, c: 2, metadata: { areaId: 7 } }],
      metadata: { source: "are_git", revision: 3 }
    });
    expect(Object.isFrozen(result.model)).toBe(true);
    expect(Object.isFrozen(result.model.vertices)).toBe(true);
    expect(Object.isFrozen(result.model.triangles)).toBe(true);
  });

  it("falls back to empty baseline model for non-object payload", () => {
    const result = normalizeWalkmeshPayload("broken");

    expect(result.model).toEqual({
      schemaVersion: 1,
      vertices: [],
      triangles: []
    });
    expect(result.issues).toEqual([
      {
        code: "payload_not_object",
        message: "walkmesh payload must be an object.",
        path: "$"
      }
    ]);
  });

  it("drops corrupted entries and records defensive issues", () => {
    const result = normalizeWalkmeshPayload({
      schemaVersion: -3,
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: "bad", y: Number.NaN, z: 1, metadata: { invalid: { nested: true } } },
        "invalid_vertex"
      ],
      triangles: [
        { a: 0, b: 0, c: 1 },
        { a: 0, b: 1, c: 6 },
        { a: 0, b: "bad", c: 1 },
        "invalid_triangle"
      ]
    });

    expect(result.model).toEqual({
      schemaVersion: 1,
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1, metadata: {} }
      ],
      triangles: [
        { a: 0, b: 0, c: 1 },
        { a: 0, b: 1, c: 6 }
      ]
    });

    expect(result.issues.some((issue) => issue.code === "schema_version_invalid")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "vertex_coord_not_finite")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "vertex_not_object")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "triangle_index_not_integer")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "triangle_not_object")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "triangle_degenerate")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "triangle_index_out_of_bounds")).toBe(true);
  });

  it("validates typed model bounds and index constraints without traversal semantics", () => {
    const model = createWalkmeshDomainModel({
      schemaVersion: 1,
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 }
      ],
      triangles: [{ a: 0, b: 1, c: 1 }]
    });

    const validation = validateWalkmeshDomainModel(model);
    expect(validation.isValid).toBe(false);
    expect(validation.issues.some((issue) => issue.code === "triangle_degenerate")).toBe(true);
  });

  it("keeps normalized payload stable across parse+roundtrip", () => {
    const first = normalizeWalkmeshPayload({
      schemaVersion: 3,
      vertices: [
        {
          x: 0,
          y: 0,
          z: 0,
          metadata: {
            tag: "v0",
            flags: [true, false, null]
          }
        },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 }
      ],
      triangles: [
        {
          a: 0,
          b: 1,
          c: 2,
          metadata: {
            passable: true
          }
        }
      ],
      metadata: {
        revision: 11,
        labels: ["entry", "hall"]
      }
    });

    const second = normalizeWalkmeshPayload(first.model);
    expect(first.issues).toEqual([]);
    expect(second.issues).toEqual([]);
    expect(second.model).toEqual(first.model);
  });
});
