export const AREA_RENAME_HTTP_APPLICATION = Symbol("AREA_RENAME_HTTP_APPLICATION");
export const AREA_RENAME_PREVIEW_HTTP_APPLICATION = Symbol("AREA_RENAME_PREVIEW_HTTP_APPLICATION");

export interface AreaRenameHttpApplicationPort {
  rename(input: Readonly<{
    moduleId: string;
    areaResRef: string;
    actorId: string;
    idempotencyKey: string | undefined;
    ifMatchHeader: string | undefined;
    body: unknown;
  }>): Promise<Readonly<{
    idempotency: "created" | "replayed";
    receipt: Readonly<{ newModuleRevision: string }>;
  }>>;
}

export interface AreaRenamePreviewHttpApplicationPort {
  preview(input: Readonly<{
    actorId: string;
    moduleId: string;
    areaResRef: string;
    ifMatchHeader: string | undefined;
    body: unknown;
  }>): Promise<Readonly<{ moduleRevision: string }>>;
}
