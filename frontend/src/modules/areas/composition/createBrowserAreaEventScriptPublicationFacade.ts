import { HttpAreaEventScriptPublicationPort } from "../adapters/httpAreaEventScriptPublicationPort";
import {
  createAreaEventScriptPublicationFacade,
  type AreaEventScriptPublicationFacade,
} from "../application/areaEventScriptPublicationFacade";

export function createBrowserAreaEventScriptPublicationFacade(
  baseUrl?: string,
): AreaEventScriptPublicationFacade {
  return createAreaEventScriptPublicationFacade(
    new HttpAreaEventScriptPublicationPort(undefined, baseUrl),
  );
}
