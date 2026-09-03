export interface ClientAssetCacheKey {
  readonly url: string;
  readonly lineageSha256: string;
  readonly scopeKey: string;
}

export interface ClientAssetCacheSnapshot {
  readonly status: "ready" | "unsupported";
  readonly budgetBytes: number;
  readonly usedBytes: number;
  readonly entryCount: number;
  readonly overBudget: boolean;
}

export interface ClientAssetCacheClearResult {
  readonly clearedEntries: number;
  readonly clearedBytes: number;
}

export interface ClientAssetCachePutResult {
  readonly stored: boolean;
  readonly reason: "stored" | "unsupported" | "response_not_ok" | "entry_over_budget";
  readonly snapshot: ClientAssetCacheSnapshot;
}

export interface ClientAssetCacheDiagnosticEvent {
  readonly operation: "inspect" | "enforce" | "match" | "put" | "clear" | "fetch";
  readonly outcome: "ready" | "unsupported" | "hit" | "miss" | "stored" | "skipped" | "failed";
  readonly assetUrl?: string;
  readonly lineageSha256?: string;
  readonly statusCode?: number;
  readonly budgetBytes?: number;
  readonly usedBytes?: number;
  readonly entryCount?: number;
  readonly clearedBytes?: number;
  readonly clearedEntries?: number;
  readonly errorCode?: string;
}

export type ClientAssetCacheDiagnosticSink = (
  event: ClientAssetCacheDiagnosticEvent,
) => void;

export interface ClientAssetCachePort {
  inspect(): Promise<ClientAssetCacheSnapshot>;
  match(key: ClientAssetCacheKey): Promise<Response | null>;
  put(key: ClientAssetCacheKey, response: Response): Promise<ClientAssetCachePutResult>;
  enforceBudget(): Promise<ClientAssetCacheSnapshot>;
  clear(): Promise<ClientAssetCacheClearResult>;
}
