import type {
  CreatureApiAppearanceRowsQuery,
  CreatureApiAppearanceRowsResult,
  CreatureApiGenderRowsQuery,
  CreatureApiGenderRowsResult,
  CreatureApiAppendageRowsQuery,
  CreatureApiAppendageRowsResult,
  CreatureApiPerceptionRangeRowsQuery,
  CreatureApiPerceptionRangeRowsResult,
  CreatureApiWalkRateRowsQuery,
  CreatureApiWalkRateRowsResult,
  CreatureApiSoundSetRowsQuery,
  CreatureApiSoundSetRowsResult,
  CreatureApiStartingPackageRowsQuery,
  CreatureApiStartingPackageRowsResult,
  CreatureApiClassRowsQuery,
  CreatureApiClassRowsResult,
  CreatureApiSkillRowsQuery,
  CreatureApiSkillRowsResult,
  CreatureApiFeatRowsQuery,
  CreatureApiFeatRowsResult,
  CreatureApiSpecialAbilityRowsQuery,
  CreatureApiSpecialAbilityRowsResult,
  CreatureApiPhenotypeRowsQuery,
  CreatureApiPhenotypeRowsResult,
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
  listCreatureAppearanceRows(
    accessToken: string,
    query: CreatureApiAppearanceRowsQuery
  ): Promise<CreatureApiAppearanceRowsResult>;
  listCreatureGenderRows(
    accessToken: string,
    query: CreatureApiGenderRowsQuery
  ): Promise<CreatureApiGenderRowsResult>;
  listCreatureAppendageRows(
    accessToken: string,
    query: CreatureApiAppendageRowsQuery
  ): Promise<CreatureApiAppendageRowsResult>;
  listCreaturePerceptionRangeRows(
    accessToken: string,
    query: CreatureApiPerceptionRangeRowsQuery
  ): Promise<CreatureApiPerceptionRangeRowsResult>;
  listCreatureWalkRateRows(
    accessToken: string,
    query: CreatureApiWalkRateRowsQuery
  ): Promise<CreatureApiWalkRateRowsResult>;
  listCreatureSoundSetRows(
    accessToken: string,
    query: CreatureApiSoundSetRowsQuery
  ): Promise<CreatureApiSoundSetRowsResult>;
  listCreatureStartingPackageRows(
    accessToken: string,
    query: CreatureApiStartingPackageRowsQuery
  ): Promise<CreatureApiStartingPackageRowsResult>;
  listCreatureClassRows(
    accessToken: string,
    query: CreatureApiClassRowsQuery
  ): Promise<CreatureApiClassRowsResult>;
  listCreatureSkillRows(
    accessToken: string,
    query: CreatureApiSkillRowsQuery
  ): Promise<CreatureApiSkillRowsResult>;
  listCreatureFeatRows(
    accessToken: string,
    query: CreatureApiFeatRowsQuery
  ): Promise<CreatureApiFeatRowsResult>;
  listCreatureSpecialAbilityRows(
    accessToken: string,
    query: CreatureApiSpecialAbilityRowsQuery
  ): Promise<CreatureApiSpecialAbilityRowsResult>;
  listCreaturePhenotypeRows(
    accessToken: string,
    query: CreatureApiPhenotypeRowsQuery
  ): Promise<CreatureApiPhenotypeRowsResult>;
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
