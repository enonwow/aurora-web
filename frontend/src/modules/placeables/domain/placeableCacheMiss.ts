export const PLACEABLE_CACHE_NOT_FOUND_CODE = "PLACEABLE_CACHE_NOT_FOUND";

export function isPlaceableCacheNotFoundError(error: unknown): boolean {
  return (
    error !== null &&
    !Array.isArray(error) &&
    Object.prototype.hasOwnProperty.call(error, "code") &&
    (error as { code?: unknown }).code === PLACEABLE_CACHE_NOT_FOUND_CODE
  );
}

export function isPlaceableCacheNotFoundEnvelope(payload: unknown): boolean {
  return (
    payload !== null &&
    !Array.isArray(payload) &&
    Object.prototype.hasOwnProperty.call(payload, "error") &&
    isPlaceableCacheNotFoundError((payload as { error?: unknown }).error)
  );
}

export function resolvePlaceableAssetDeliveryCacheKey(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url, "http://aurora.local").pathname;
  } catch {
    return null;
  }
  const match = pathname.match(
    /\/catalog\/placeables\/cache\/([^/]+)\/assets\/[^/]+$/u
  );
  const encodedCacheKey = match?.[1];
  if (!encodedCacheKey) {
    return null;
  }
  try {
    const cacheKey = decodeURIComponent(encodedCacheKey);
    return !cacheKey.includes("/") ? cacheKey : null;
  } catch {
    return null;
  }
}
