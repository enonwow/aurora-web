export type GraphResourceNodeKind = "template" | "texture_atlas" | "vfx_preset";
export type GraphSceneNodeKind = "area" | "area_object";
export type GraphEdgeKind = "contains" | "uses" | "references";

export interface GraphResourceNode {
  id: string;
  kind: GraphResourceNodeKind;
  label: string;
  hash: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface GraphSceneNode {
  id: string;
  kind: GraphSceneNodeKind;
  label: string;
  hash: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  fromNodeId: string;
  toNodeId: string;
  kind: GraphEdgeKind;
}

export interface ProcessingGraphIndexes {
  areaByObject: Record<string, string>;
  objectsByArea: Record<string, string[]>;
  templatesByArea: Record<string, string[]>;
  objectsByTemplate: Record<string, string[]>;
  areasByTemplate: Record<string, string[]>;
}

export interface ProcessingGraphStatistics {
  areas: number;
  areaObjects: number;
  templates: number;
  textureAtlases: number;
  vfxPresets: number;
  edges: number;
}

export interface ProcessingGraphSnapshot {
  generatedAt: string;
  datasetHash: string;
  statistics: ProcessingGraphStatistics;
  resourceGraph: {
    nodes: GraphResourceNode[];
    edges: GraphEdge[];
  };
  sceneGraph: {
    nodes: GraphSceneNode[];
    edges: GraphEdge[];
  };
  indexes: ProcessingGraphIndexes;
}

export interface AreaSubgraphView {
  areaId: string;
  datasetHash: string;
  generatedAt: string;
  areaNode: GraphSceneNode;
  objectNodes: GraphSceneNode[];
  resourceNodes: GraphResourceNode[];
  edges: GraphEdge[];
  stats: {
    objects: number;
    uniqueTemplates: number;
    uniqueResourceNodes: number;
    edges: number;
  };
}

export interface ProcessingGraphNodeDelta {
  nodeId: string;
  graph: "resource" | "scene";
  nodeKind: string;
  change: "added" | "changed" | "deleted";
  previousHash?: string;
  currentHash?: string;
}

export interface ProcessingGraphDeltaSummary {
  added: number;
  changed: number;
  deleted: number;
}

export interface ProcessingGraphDelta {
  baseline: "none" | "latest";
  previousDatasetHash?: string;
  currentDatasetHash: string;
  changed: boolean;
  summary: ProcessingGraphDeltaSummary;
  resource: {
    summary: ProcessingGraphDeltaSummary;
    nodes: ProcessingGraphNodeDelta[];
  };
  scene: {
    summary: ProcessingGraphDeltaSummary;
    nodes: ProcessingGraphNodeDelta[];
  };
  impacted: {
    areas: string[];
    templates: string[];
    areaObjects: string[];
  };
}

export interface ProcessingGraphCheckpointResult {
  checkpointUpdated: boolean;
  delta: ProcessingGraphDelta;
  snapshot: {
    datasetHash: string;
    generatedAt: string;
    statistics: ProcessingGraphStatistics;
  };
  triggeredAt: string;
  triggeredBy: string;
}
