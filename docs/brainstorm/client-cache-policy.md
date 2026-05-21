# Client Cache Policy

## Goal
Use lightweight client-side caching to improve load times without cluttering user devices.

## Policy
1. Client cache is enabled for immutable hashed assets.
2. Hard cache size cap on client: `2 GB`.
3. User can clear local cache at any time from application settings.
4. Runtime scene cache should be released when leaving a location.
5. Persistent asset cache can remain only within the `2 GB` cap.

## Practical Behavior
1. Cache key strategy: content hash.
2. Eviction policy: `LRU` under hard cap.
3. Full cache clear action:
- removes persistent local asset cache;
- forces fresh revalidation/reload on next scene load.

## UX Requirement
1. Add visible action in UI: `Clear Local Cache`.
2. Show current cache size and last cleanup timestamp.

## Validation
1. Verify cache never exceeds `2 GB`.
2. Verify full clear action works without app restart.
3. Verify location change releases runtime-only scene cache.
