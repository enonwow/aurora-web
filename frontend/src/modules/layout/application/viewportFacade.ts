import {
  buildCanvasGridSegments,
  MASTER_CELLS_PER_TILE,
  type GridSegment
} from "../canvasGrid";
import {
  isContextMenuGesture,
  isCtrlPanGesture,
  type ViewportMouseEventShape
} from "../viewportPointerPolicy";

export interface ViewportFacade {
  readonly defaultMasterCellsPerTile: number;
  isContextMenuGesture(event: ViewportMouseEventShape): boolean;
  isCtrlPanGesture(event: ViewportMouseEventShape): boolean;
  buildGridSegments(
    widthTiles: number,
    heightTiles: number,
    masterCellsPerTile?: number
  ): GridSegment[];
}

export function createViewportFacade(): ViewportFacade {
  return {
    defaultMasterCellsPerTile: MASTER_CELLS_PER_TILE,
    isContextMenuGesture(event) {
      return isContextMenuGesture(event);
    },
    isCtrlPanGesture(event) {
      return isCtrlPanGesture(event);
    },
    buildGridSegments(widthTiles, heightTiles, masterCellsPerTile) {
      return buildCanvasGridSegments(widthTiles, heightTiles, masterCellsPerTile);
    }
  };
}

export type { GridSegment, ViewportMouseEventShape };

