import type {
  ItemApiBaseItemsResult,
  ItemApiBlueprintCreatePayload,
  ItemApiBlueprintCreateResult,
  ItemApiBlueprintDeleteResult,
  ItemApiCustomPaletteWritePayload,
  ItemApiCustomPaletteWriteResult,
  ItemApiGeneratorSupportResult,
  ItemApiListQuery,
  ItemApiListResult,
  ItemApiPaletteTreeResult,
  ItemApiProcessPayload,
  ItemApiProcessResult,
  ItemApiPropertyDictionaryResult
} from "../contracts";

export interface ItemApiPort {
  listItems(accessToken: string, query?: ItemApiListQuery): Promise<ItemApiListResult>;
  processItem(
    accessToken: string,
    payload: ItemApiProcessPayload
  ): Promise<ItemApiProcessResult>;
  createItemBlueprint(
    accessToken: string,
    payload: ItemApiBlueprintCreatePayload
  ): Promise<ItemApiBlueprintCreateResult>;
  updateItemBlueprint(
    accessToken: string,
    resRef: string,
    payload: ItemApiBlueprintCreatePayload
  ): Promise<ItemApiBlueprintCreateResult>;
  deleteItemBlueprint(
    accessToken: string,
    resRef: string
  ): Promise<ItemApiBlueprintDeleteResult>;
  getItemPropertyDictionary(accessToken: string): Promise<ItemApiPropertyDictionaryResult>;
  getItemBaseItems(accessToken: string): Promise<ItemApiBaseItemsResult>;
  getItemPaletteTree(accessToken: string): Promise<ItemApiPaletteTreeResult>;
  getItemGeneratorSupport(accessToken: string): Promise<ItemApiGeneratorSupportResult>;
  writeCustomItemPalette(
    accessToken: string,
    payload: ItemApiCustomPaletteWritePayload
  ): Promise<ItemApiCustomPaletteWriteResult>;
  getProcessedItem(accessToken: string, cacheKey: string): Promise<ItemApiProcessResult>;
}
