import type { ProcessingGraphSnapshot } from "../../domain/processing-graph.types";

export const PROCESSING_GRAPH_SNAPSHOT_REPOSITORY = Symbol(
  "PROCESSING_GRAPH_SNAPSHOT_REPOSITORY"
);

export interface ProcessingGraphSnapshotRepositoryPort {
  getLatest(): Promise<ProcessingGraphSnapshot | null>;
  saveLatest(snapshot: ProcessingGraphSnapshot): Promise<void>;
}
