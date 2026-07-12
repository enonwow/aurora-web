import type {
  CreatureApiBlueprintCreatePayload,
  CreatureApiBlueprintCreateResult,
  CreatureApiBlueprintDeleteResult,
  CreatureApiListQuery,
  CreatureApiListResult,
  CreatureApiProcessPayload,
  CreatureApiProcessResult,
  CreatureApiResourceOptionKind,
  CreatureApiResourceOptionsResult
} from "../contracts";

export interface CreatureApiPort {
  listCreatures(
    accessToken: string,
    query?: CreatureApiListQuery
  ): Promise<CreatureApiListResult>;
  processCreature(
    accessToken: string,
    payload: CreatureApiProcessPayload
  ): Promise<CreatureApiProcessResult>;
  listCreatureResourceOptions(
    accessToken: string,
    kind: CreatureApiResourceOptionKind,
    query?: string
  ): Promise<CreatureApiResourceOptionsResult>;
  createCreatureBlueprint(
    accessToken: string,
    payload: CreatureApiBlueprintCreatePayload
  ): Promise<CreatureApiBlueprintCreateResult>;
  updateCreatureBlueprint(
    accessToken: string,
    resRef: string,
    payload: CreatureApiBlueprintCreatePayload
  ): Promise<CreatureApiBlueprintCreateResult>;
  renameCreatureBlueprint(
    accessToken: string,
    resRef: string,
    nextResRef: string
  ): Promise<CreatureApiBlueprintCreateResult>;
  deleteCreatureBlueprint(
    accessToken: string,
    resRef: string
  ): Promise<CreatureApiBlueprintDeleteResult>;
  getProcessedCreature(
    accessToken: string,
    cacheKey: string
  ): Promise<CreatureApiProcessResult>;
}
