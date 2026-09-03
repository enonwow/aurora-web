import { createHttpAreaEditingApi } from "../adapters/httpAreaEditingApi";
import { HttpAreaTileCertificationPort } from "../adapters/httpAreaTileCertificationPort";
import {
  createHttpAreaEditingTransferPort,
  downloadAreaEditingAre,
} from "../adapters/httpAreaEditingExport";
import {
  createAreaEditingFacade,
  type AreaEditingFacade,
} from "../application/areaEditingFacade";

export function createBrowserAreaEditingFacade(
  baseUrl?: string,
): AreaEditingFacade {
  return createAreaEditingFacade({
    source: createHttpAreaEditingApi(undefined, baseUrl),
    certification: new HttpAreaTileCertificationPort(undefined, baseUrl),
    transfer: createHttpAreaEditingTransferPort(undefined, baseUrl),
    download: Object.freeze({ downloadAre: downloadAreaEditingAre }),
  });
}
