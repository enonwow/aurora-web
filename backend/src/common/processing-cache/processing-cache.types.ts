export interface ProcessingCacheEntryLike<TValue> {
  key: string;
  value: TValue;
  storedAt: string;
  hits: number;
}

export interface ProcessingCacheBackend<
  TValue,
  TEntry extends ProcessingCacheEntryLike<TValue>
> {
  get(key: string): Promise<TEntry | null>;
  set(key: string, value: TValue): Promise<TEntry>;
}
