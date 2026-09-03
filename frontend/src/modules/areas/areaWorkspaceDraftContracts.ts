import type { AreaScene } from "../scene/contracts";
import type { AreaApiDetail } from "./contracts";
import type {
  AreaDraftDocument,
  ProductionAreaDraftPayload,
} from "./ports/areaLifecyclePort";

export type AreaWorkspaceDraftPayload =
  | AreaScene
  | ProductionAreaDraftPayload<AreaApiDetail, AreaScene>;

export type AreaWorkspaceDraftDocument =
  AreaDraftDocument<AreaWorkspaceDraftPayload>;
