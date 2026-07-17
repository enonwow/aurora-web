import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import {
  AREA_REPOSITORY,
  type AreaRepositoryPort
} from "../../areas/application/ports/area-repository.port";
import type {
  AreaObjectPlacement,
  AreaRecord
} from "../../areas/domain/area.types";
import {
  TEMPLATE_CATALOG_REPOSITORY,
  type TemplateCatalogRepositoryPort
} from "../../catalog/application/ports/template-catalog-repository.port";
import {
  PROCESSING_GRAPH_SNAPSHOT_REPOSITORY,
  type ProcessingGraphSnapshotRepositoryPort
} from "./ports/processing-graph-snapshot-repository.port";
import type { TemplateKind, TemplateRecord } from "../../catalog/domain/template.types";
import type {
  AreaSubgraphView,
  GraphEdge,
  GraphResourceNode,
  GraphSceneNode,
  ProcessingGraphCheckpointResult,
  ProcessingGraphDelta,
  ProcessingGraphIndexes,
  ProcessingGraphNodeDelta,
  ProcessingGraphSnapshot,
  ProcessingGraphStatistics
} from "../domain/processing-graph.types";

type TemplateShape = Pick<
  TemplateRecord,
  "templateId" | "kind" | "name" | "resref" | "category" | "placeableSubtype" | "metadata"
>;

@Injectable()
export class ProcessingGraphApplicationService {
  constructor(
    @Inject(AREA_REPOSITORY)
    private readonly areaRepository: AreaRepositoryPort,
    @Inject(TEMPLATE_CATALOG_REPOSITORY)
    private readonly templateRepository: TemplateCatalogRepositoryPort,
    @Inject(PROCESSING_GRAPH_SNAPSHOT_REPOSITORY)
    private readonly snapshotRepository: ProcessingGraphSnapshotRepositoryPort
  ) {}

  async getGraphSummary(): Promise<Omit<ProcessingGraphSnapshot, "sceneGraph">> {
    const snapshot = await this.buildSnapshot();
    return {
      generatedAt: snapshot.generatedAt,
      datasetHash: snapshot.datasetHash,
      statistics: snapshot.statistics,
      resourceGraph: snapshot.resourceGraph,
      indexes: snapshot.indexes
    };
  }

  async getAreaSubgraph(areaId: string): Promise<AreaSubgraphView> {
    const snapshot = await this.buildSnapshot();
    const areaNodeId = buildAreaNodeId(areaId);
    const areaNode = snapshot.sceneGraph.nodes.find((node) => node.id === areaNodeId);
    if (!areaNode) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }

    const objectIds = snapshot.indexes.objectsByArea[areaId] ?? [];
    const objectNodeIdSet = new Set(objectIds);
    const objectNodes = snapshot.sceneGraph.nodes.filter((node) =>
      objectNodeIdSet.has(node.id)
    );
    const relatedEdges = snapshot.sceneGraph.edges.filter(
      (edge) =>
        edge.fromNodeId === areaNodeId ||
        edge.toNodeId === areaNodeId ||
        objectNodeIdSet.has(edge.fromNodeId) ||
        objectNodeIdSet.has(edge.toNodeId)
    );

    const directResourceNodeIds = new Set(
      relatedEdges
        .filter((edge) => edge.kind !== "contains")
        .map((edge) =>
          objectNodeIdSet.has(edge.toNodeId) || edge.toNodeId === areaNodeId
            ? edge.fromNodeId
            : edge.toNodeId
        )
    );
    const resourceNodeIds = expandResourceDependencies(
      directResourceNodeIds,
      snapshot.resourceGraph.edges
    );

    const resourceNodes = snapshot.resourceGraph.nodes.filter((node) =>
      resourceNodeIds.has(node.id)
    );
    const resourceEdges = snapshot.resourceGraph.edges.filter(
      (edge) => resourceNodeIds.has(edge.fromNodeId) && resourceNodeIds.has(edge.toNodeId)
    );

    return {
      areaId,
      datasetHash: snapshot.datasetHash,
      generatedAt: snapshot.generatedAt,
      areaNode,
      objectNodes,
      resourceNodes,
      edges: [...relatedEdges, ...resourceEdges],
      stats: {
        objects: objectNodes.length,
        uniqueTemplates: (snapshot.indexes.templatesByArea[areaId] ?? []).length,
        uniqueResourceNodes: resourceNodes.length,
        edges: relatedEdges.length + resourceEdges.length
      }
    };
  }

  async getGraphSnapshot(): Promise<ProcessingGraphSnapshot> {
    return this.buildSnapshot();
  }

  async previewDeltaAgainstLatest(): Promise<ProcessingGraphDelta> {
    const [current, previous] = await Promise.all([
      this.buildSnapshot(),
      this.snapshotRepository.getLatest()
    ]);
    return buildDelta(previous, current);
  }

  async checkpointLatestSnapshot(
    triggeredBy: string
  ): Promise<ProcessingGraphCheckpointResult> {
    const [current, previous] = await Promise.all([
      this.buildSnapshot(),
      this.snapshotRepository.getLatest()
    ]);
    const delta = buildDelta(previous, current);
    const checkpointUpdated =
      !previous || previous.datasetHash !== current.datasetHash;
    if (checkpointUpdated) {
      await this.snapshotRepository.saveLatest(current);
    }

    return {
      checkpointUpdated,
      delta,
      snapshot: {
        datasetHash: current.datasetHash,
        generatedAt: current.generatedAt,
        statistics: current.statistics
      },
      triggeredAt: new Date().toISOString(),
      triggeredBy
    };
  }

  private async buildSnapshot(): Promise<ProcessingGraphSnapshot> {
    const [areas, templates] = await Promise.all([
      listAllAreas(this.areaRepository),
      listAllTemplates(this.templateRepository)
    ]);

    const generatedAt = new Date().toISOString();
    const resourceNodes = buildResourceNodes(areas, templates);
    const sceneNodes = buildSceneNodes(areas);
    const resourceEdges = buildResourceEdges(templates);
    const sceneEdges = buildSceneEdges(areas, templates, resourceNodes);
    const indexes = buildIndexes(areas);
    const statistics = buildStatistics(areas, resourceNodes, resourceEdges, sceneEdges);
    const datasetHash = buildDatasetHash({
      resourceNodes,
      sceneNodes,
      resourceEdges,
      sceneEdges,
      indexes
    });

    return {
      generatedAt,
      datasetHash,
      statistics,
      resourceGraph: {
        nodes: resourceNodes,
        edges: resourceEdges
      },
      sceneGraph: {
        nodes: sceneNodes,
        edges: sceneEdges
      },
      indexes
    };
  }
}

async function listAllAreas(repository: AreaRepositoryPort): Promise<AreaRecord[]> {
  const limit = 100;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const all: AreaRecord[] = [];

  while (offset < total) {
    const page = await repository.list({
      limit,
      offset
    });
    total = page.total;

    for (const listItem of page.items) {
      const area = await repository.findById(listItem.areaId);
      if (area) {
        all.push(area);
      }
    }

    if (page.items.length === 0) {
      break;
    }
    offset += page.items.length;
  }

  return all.sort((left, right) => left.areaId.localeCompare(right.areaId));
}

async function listAllTemplates(
  repository: TemplateCatalogRepositoryPort
): Promise<TemplateShape[]> {
  const kinds: TemplateKind[] = ["placeable", "creature", "item"];
  const all: TemplateShape[] = [];

  for (const kind of kinds) {
    const page = await repository.listByKind(kind, {
      limit: 500,
      offset: 0
    });
    for (const item of page.items) {
      all.push({
        templateId: item.templateId,
        kind: item.kind,
        name: item.name,
        resref: item.resref,
        category: item.category,
        placeableSubtype: item.placeableSubtype,
        metadata: item.metadata
      });
    }
  }

  return all.sort((left, right) => left.templateId.localeCompare(right.templateId));
}

function buildResourceNodes(
  areas: AreaRecord[],
  templates: TemplateShape[]
): GraphResourceNode[] {
  const nodes: GraphResourceNode[] = [];

  for (const template of templates) {
    nodes.push({
      id: buildTemplateNodeId(template.templateId),
      kind: "template",
      label: template.name,
      hash: hashValue({
        templateId: template.templateId,
        kind: template.kind,
        resref: template.resref,
        placeableSubtype: template.placeableSubtype ?? null,
        metadata: template.metadata
      }),
      metadata: {
        templateId: template.templateId,
        kind: template.kind,
        resref: template.resref,
        category: template.category,
        placeableSubtype: template.placeableSubtype ?? null
      }
    });
  }

  const textureAtlasIds = dedupeOrdered(areas.map((area) => area.textureAtlasId)).sort(
    (left, right) => left.localeCompare(right)
  );
  for (const atlasId of textureAtlasIds) {
    nodes.push({
      id: buildTextureAtlasNodeId(atlasId),
      kind: "texture_atlas",
      label: atlasId,
      hash: hashValue({ textureAtlasId: atlasId }),
      metadata: {
        textureAtlasId: atlasId
      }
    });
  }

  const vfxPresets = dedupeOrdered(
    templates.flatMap((template) =>
      typeof template.metadata.vfxPreset === "string" ? [template.metadata.vfxPreset] : []
    )
  ).sort((left, right) => left.localeCompare(right));
  for (const preset of vfxPresets) {
    nodes.push({
      id: buildVfxPresetNodeId(preset),
      kind: "vfx_preset",
      label: preset,
      hash: hashValue({ vfxPreset: preset }),
      metadata: {
        vfxPreset: preset
      }
    });
  }

  return nodes.sort((left, right) => left.id.localeCompare(right.id));
}

function buildSceneNodes(areas: AreaRecord[]): GraphSceneNode[] {
  const nodes: GraphSceneNode[] = [];
  for (const area of areas) {
    nodes.push({
      id: buildAreaNodeId(area.areaId),
      kind: "area",
      label: area.name,
      hash: hashValue({
        areaId: area.areaId,
        biome: area.biome,
        width: area.width,
        height: area.height,
        textureAtlasId: area.textureAtlasId,
        updatedAt: area.updatedAt
      }),
      metadata: {
        areaId: area.areaId,
        biome: area.biome,
        width: area.width,
        height: area.height,
        benchmark: area.benchmark,
        textureAtlasId: area.textureAtlasId
      }
    });

    for (const object of area.objects) {
      nodes.push({
        id: buildAreaObjectNodeId(area.areaId, object.objectId),
        kind: "area_object",
        label: object.objectId,
        hash: hashValue({
          areaId: area.areaId,
          objectId: object.objectId,
          kind: object.kind,
          templateId: object.templateId,
          x: object.x,
          y: object.y,
          z: object.z,
          bearing: object.bearing
        }),
        metadata: {
          areaId: area.areaId,
          objectId: object.objectId,
          kind: object.kind,
          templateId: object.templateId,
          x: object.x,
          y: object.y,
          z: object.z,
          bearing: object.bearing
        }
      });
    }
  }

  return nodes.sort((left, right) => left.id.localeCompare(right.id));
}

function buildResourceEdges(templates: TemplateShape[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const template of templates) {
    const vfxPreset = template.metadata.vfxPreset;
    if (typeof vfxPreset !== "string" || vfxPreset.trim().length === 0) {
      continue;
    }

    edges.push({
      fromNodeId: buildTemplateNodeId(template.templateId),
      toNodeId: buildVfxPresetNodeId(vfxPreset),
      kind: "references"
    });
  }

  return sortEdges(edges);
}

function buildSceneEdges(
  areas: AreaRecord[],
  templates: TemplateShape[],
  resourceNodes: GraphResourceNode[]
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const templateIds = new Set(templates.map((template) => template.templateId));
  const resourceNodeIds = new Set(resourceNodes.map((node) => node.id));

  for (const area of areas) {
    const areaNodeId = buildAreaNodeId(area.areaId);
    const atlasNodeId = buildTextureAtlasNodeId(area.textureAtlasId);
    if (resourceNodeIds.has(atlasNodeId)) {
      edges.push({
        fromNodeId: areaNodeId,
        toNodeId: atlasNodeId,
        kind: "uses"
      });
    }

    for (const object of area.objects) {
      const objectNodeId = buildAreaObjectNodeId(area.areaId, object.objectId);
      edges.push({
        fromNodeId: areaNodeId,
        toNodeId: objectNodeId,
        kind: "contains"
      });

      if (templateIds.has(object.templateId)) {
        edges.push({
          fromNodeId: objectNodeId,
          toNodeId: buildTemplateNodeId(object.templateId),
          kind: "uses"
        });
      }
    }
  }

  return sortEdges(edges);
}

function buildIndexes(areas: AreaRecord[]): ProcessingGraphIndexes {
  const areaByObject: Record<string, string> = {};
  const objectsByArea: Record<string, string[]> = {};
  const templatesByArea: Record<string, string[]> = {};
  const objectsByTemplate: Record<string, string[]> = {};
  const areasByTemplateSets = new Map<string, Set<string>>();

  for (const area of areas) {
    const objectNodeIds: string[] = [];
    const templateIdsInArea = new Set<string>();

    for (const object of area.objects) {
      const objectNodeId = buildAreaObjectNodeId(area.areaId, object.objectId);
      objectNodeIds.push(objectNodeId);
      areaByObject[objectNodeId] = area.areaId;
      templateIdsInArea.add(object.templateId);

      const templateObjects = objectsByTemplate[object.templateId] ?? [];
      templateObjects.push(objectNodeId);
      objectsByTemplate[object.templateId] = templateObjects;

      const templateAreas = areasByTemplateSets.get(object.templateId) ?? new Set<string>();
      templateAreas.add(area.areaId);
      areasByTemplateSets.set(object.templateId, templateAreas);
    }

    objectsByArea[area.areaId] = objectNodeIds.sort((left, right) => left.localeCompare(right));
    templatesByArea[area.areaId] = [...templateIdsInArea].sort((left, right) =>
      left.localeCompare(right)
    );
  }

  const areasByTemplate: Record<string, string[]> = {};
  for (const [templateId, areasSet] of areasByTemplateSets.entries()) {
    areasByTemplate[templateId] = [...areasSet].sort((left, right) =>
      left.localeCompare(right)
    );
  }

  for (const templateId of Object.keys(objectsByTemplate)) {
    objectsByTemplate[templateId].sort((left, right) => left.localeCompare(right));
  }

  return {
    areaByObject,
    objectsByArea,
    templatesByArea,
    objectsByTemplate,
    areasByTemplate
  };
}

function buildStatistics(
  areas: AreaRecord[],
  resourceNodes: GraphResourceNode[],
  resourceEdges: GraphEdge[],
  sceneEdges: GraphEdge[]
): ProcessingGraphStatistics {
  const templates = resourceNodes.filter((node) => node.kind === "template").length;
  const textureAtlases = resourceNodes.filter((node) => node.kind === "texture_atlas").length;
  const vfxPresets = resourceNodes.filter((node) => node.kind === "vfx_preset").length;
  const areaObjects = areas.reduce((sum, area) => sum + area.objects.length, 0);

  return {
    areas: areas.length,
    areaObjects,
    templates,
    textureAtlases,
    vfxPresets,
    edges: resourceEdges.length + sceneEdges.length
  };
}

function buildDatasetHash(input: {
  resourceNodes: GraphResourceNode[];
  sceneNodes: GraphSceneNode[];
  resourceEdges: GraphEdge[];
  sceneEdges: GraphEdge[];
  indexes: ProcessingGraphIndexes;
}): string {
  return hashValue({
    resourceNodes: input.resourceNodes,
    sceneNodes: input.sceneNodes,
    resourceEdges: input.resourceEdges,
    sceneEdges: input.sceneEdges,
    indexes: input.indexes
  });
}

function buildDelta(
  previous: ProcessingGraphSnapshot | null,
  current: ProcessingGraphSnapshot
): ProcessingGraphDelta {
  const resourceChanges = diffNodes(
    previous?.resourceGraph.nodes ?? [],
    current.resourceGraph.nodes,
    "resource"
  );
  const sceneChanges = diffNodes(
    previous?.sceneGraph.nodes ?? [],
    current.sceneGraph.nodes,
    "scene"
  );

  const impacted = computeImpactedScope(previous, current, resourceChanges, sceneChanges);
  const summary = summarizeNodeDeltas([...resourceChanges, ...sceneChanges]);

  return {
    baseline: previous ? "latest" : "none",
    previousDatasetHash: previous?.datasetHash,
    currentDatasetHash: current.datasetHash,
    changed: summary.added > 0 || summary.changed > 0 || summary.deleted > 0,
    summary,
    resource: {
      summary: summarizeNodeDeltas(resourceChanges),
      nodes: resourceChanges
    },
    scene: {
      summary: summarizeNodeDeltas(sceneChanges),
      nodes: sceneChanges
    },
    impacted
  };
}

function diffNodes(
  previousNodes: Array<{ id: string; kind: string; hash: string }>,
  currentNodes: Array<{ id: string; kind: string; hash: string }>,
  graph: "resource" | "scene"
): ProcessingGraphNodeDelta[] {
  const previousById = new Map(previousNodes.map((node) => [node.id, node]));
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const allIds = new Set([...previousById.keys(), ...currentById.keys()]);
  const changes: ProcessingGraphNodeDelta[] = [];

  for (const nodeId of allIds) {
    const previous = previousById.get(nodeId);
    const current = currentById.get(nodeId);

    if (!previous && current) {
      changes.push({
        nodeId,
        graph,
        nodeKind: current.kind,
        change: "added",
        currentHash: current.hash
      });
      continue;
    }

    if (previous && !current) {
      changes.push({
        nodeId,
        graph,
        nodeKind: previous.kind,
        change: "deleted",
        previousHash: previous.hash
      });
      continue;
    }

    if (!previous || !current || previous.hash === current.hash) {
      continue;
    }

    changes.push({
      nodeId,
      graph,
      nodeKind: current.kind,
      change: "changed",
      previousHash: previous.hash,
      currentHash: current.hash
    });
  }

  return changes.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
}

function summarizeNodeDeltas(changes: ProcessingGraphNodeDelta[]) {
  return changes.reduce(
    (summary, change) => {
      if (change.change === "added") {
        summary.added += 1;
      } else if (change.change === "changed") {
        summary.changed += 1;
      } else {
        summary.deleted += 1;
      }
      return summary;
    },
    {
      added: 0,
      changed: 0,
      deleted: 0
    }
  );
}

function computeImpactedScope(
  previous: ProcessingGraphSnapshot | null,
  current: ProcessingGraphSnapshot,
  resourceChanges: ProcessingGraphNodeDelta[],
  sceneChanges: ProcessingGraphNodeDelta[]
): {
  areas: string[];
  templates: string[];
  areaObjects: string[];
} {
  const areaIds = new Set<string>();
  const templateIds = new Set<string>();
  const areaObjectIds = new Set<string>();

  for (const change of sceneChanges) {
    if (change.nodeKind === "area") {
      const areaId = parseAreaId(change.nodeId);
      if (areaId) {
        areaIds.add(areaId);
      }
      continue;
    }

    if (change.nodeKind === "area_object") {
      areaObjectIds.add(change.nodeId);
      const areaId =
        current.indexes.areaByObject[change.nodeId] ??
        previous?.indexes.areaByObject[change.nodeId];
      if (areaId) {
        areaIds.add(areaId);
      }
    }
  }

  for (const change of resourceChanges) {
    if (change.nodeKind === "template") {
      const templateId = parseTemplateId(change.nodeId);
      if (!templateId) {
        continue;
      }
      templateIds.add(templateId);
      const currentAreas = current.indexes.areasByTemplate[templateId] ?? [];
      const previousAreas = previous?.indexes.areasByTemplate[templateId] ?? [];
      for (const areaId of [...currentAreas, ...previousAreas]) {
        areaIds.add(areaId);
      }
      const currentObjects = current.indexes.objectsByTemplate[templateId] ?? [];
      const previousObjects = previous?.indexes.objectsByTemplate[templateId] ?? [];
      for (const objectId of [...currentObjects, ...previousObjects]) {
        areaObjectIds.add(objectId);
      }
      continue;
    }

    if (change.nodeKind === "texture_atlas") {
      const atlasId = parseTextureAtlasId(change.nodeId);
      if (!atlasId) {
        continue;
      }
      for (const areaNode of current.sceneGraph.nodes) {
        if (
          areaNode.kind === "area" &&
          areaNode.metadata.textureAtlasId === atlasId
        ) {
          const areaId = parseAreaId(areaNode.id);
          if (areaId) {
            areaIds.add(areaId);
          }
        }
      }
      continue;
    }

    if (change.nodeKind === "vfx_preset") {
      const vfxPreset = parseVfxPresetId(change.nodeId);
      if (!vfxPreset) {
        continue;
      }
      for (const node of current.resourceGraph.nodes) {
        if (node.kind !== "template") {
          continue;
        }
        if (node.metadata.vfxPreset !== vfxPreset) {
          continue;
        }
        const templateId = parseTemplateId(node.id);
        if (!templateId) {
          continue;
        }
        templateIds.add(templateId);
        const mappedAreas = current.indexes.areasByTemplate[templateId] ?? [];
        for (const areaId of mappedAreas) {
          areaIds.add(areaId);
        }
      }
    }
  }

  return {
    areas: [...areaIds].sort((left, right) => left.localeCompare(right)),
    templates: [...templateIds].sort((left, right) => left.localeCompare(right)),
    areaObjects: [...areaObjectIds].sort((left, right) => left.localeCompare(right))
  };
}

function expandResourceDependencies(
  seedIds: Set<string>,
  resourceEdges: GraphEdge[]
): Set<string> {
  const visited = new Set(seedIds);
  const queue = [...seedIds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of resourceEdges) {
      if (edge.fromNodeId !== current) {
        continue;
      }
      if (visited.has(edge.toNodeId)) {
        continue;
      }
      visited.add(edge.toNodeId);
      queue.push(edge.toNodeId);
    }
  }

  return visited;
}

function sortEdges(edges: GraphEdge[]): GraphEdge[] {
  return [...edges].sort((left, right) => {
    if (left.fromNodeId !== right.fromNodeId) {
      return left.fromNodeId.localeCompare(right.fromNodeId);
    }
    if (left.toNodeId !== right.toNodeId) {
      return left.toNodeId.localeCompare(right.toNodeId);
    }
    return left.kind.localeCompare(right.kind);
  });
}

function dedupeOrdered(values: string[]): string[] {
  const unique = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || unique.has(value)) {
      continue;
    }
    unique.add(value);
    result.push(value);
  }
  return result;
}

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function buildAreaNodeId(areaId: string): string {
  return `area:${areaId}`;
}

function buildAreaObjectNodeId(areaId: string, objectId: string): string {
  return `area-object:${areaId}:${objectId}`;
}

function buildTemplateNodeId(templateId: string): string {
  return `template:${templateId}`;
}

function buildTextureAtlasNodeId(textureAtlasId: string): string {
  return `texture-atlas:${textureAtlasId}`;
}

function buildVfxPresetNodeId(vfxPreset: string): string {
  return `vfx-preset:${vfxPreset}`;
}

function parseAreaId(nodeId: string): string | null {
  if (!nodeId.startsWith("area:")) {
    return null;
  }
  const value = nodeId.slice("area:".length);
  return value.length > 0 ? value : null;
}

function parseTemplateId(nodeId: string): string | null {
  if (!nodeId.startsWith("template:")) {
    return null;
  }
  const value = nodeId.slice("template:".length);
  return value.length > 0 ? value : null;
}

function parseTextureAtlasId(nodeId: string): string | null {
  if (!nodeId.startsWith("texture-atlas:")) {
    return null;
  }
  const value = nodeId.slice("texture-atlas:".length);
  return value.length > 0 ? value : null;
}

function parseVfxPresetId(nodeId: string): string | null {
  if (!nodeId.startsWith("vfx-preset:")) {
    return null;
  }
  const value = nodeId.slice("vfx-preset:".length);
  return value.length > 0 ? value : null;
}
