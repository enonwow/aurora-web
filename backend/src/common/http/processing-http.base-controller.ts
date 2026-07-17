import { AppConfigService } from "../config/app-config.service";
import { buildSuccessEnvelope } from "./contract";
import type { AppRequest } from "./request.types";

type RawObject = Record<string, unknown>;

export abstract class ProcessingHttpBaseController {
  protected constructor(protected readonly config: AppConfigService) {}

  protected success<TData>(request: AppRequest, data: TData) {
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  protected async handleParsedQuery<TQuery, TData>(
    request: AppRequest,
    rawQuery: RawObject,
    parse: (query: RawObject) => TQuery,
    execute: (query: TQuery) => Promise<TData>
  ) {
    const parsed = parse(rawQuery);
    const data = await execute(parsed);
    return this.success(request, data);
  }

  protected async handleParsedBody<TBody, TData>(
    request: AppRequest,
    rawBody: RawObject,
    parse: (body: RawObject) => TBody,
    execute: (body: TBody) => Promise<TData>
  ) {
    const parsed = parse(rawBody);
    const data = await execute(parsed);
    return this.success(request, data);
  }

  protected async handleById<TData>(
    request: AppRequest,
    id: string,
    execute: (id: string) => Promise<TData>
  ) {
    const data = await execute(id);
    return this.success(request, data);
  }

  protected async handleByIdAndParsedBody<TBody, TData>(
    request: AppRequest,
    id: string,
    rawBody: RawObject,
    parse: (body: RawObject) => TBody,
    execute: (id: string, body: TBody) => Promise<TData>
  ) {
    const parsed = parse(rawBody);
    const data = await execute(id, parsed);
    return this.success(request, data);
  }

  protected async handleCacheKey<TCacheKey, TData>(
    request: AppRequest,
    rawCacheKey: string,
    parse: (cacheKey: string) => TCacheKey,
    execute: (cacheKey: TCacheKey) => Promise<TData>
  ) {
    const cacheKey = parse(rawCacheKey);
    const data = await execute(cacheKey);
    return this.success(request, data);
  }

  protected async handleCacheKeyAndParsedQuery<TCacheKey, TQuery, TData>(
    request: AppRequest,
    rawCacheKey: string,
    rawQuery: RawObject,
    parseCacheKey: (cacheKey: string) => TCacheKey,
    parseQuery: (query: RawObject) => TQuery,
    execute: (cacheKey: TCacheKey, query: TQuery) => Promise<TData>
  ) {
    const cacheKey = parseCacheKey(rawCacheKey);
    const query = parseQuery(rawQuery);
    const data = await execute(cacheKey, query);
    return this.success(request, data);
  }
}
