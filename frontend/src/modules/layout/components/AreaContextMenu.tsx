import type { Ref } from "react";
import type { AreaApiListItem } from "../../areas/contracts";

export type AreaContextMenuAction =
  | "open"
  | "terrain_readiness"
  | "texture_readiness"
  | "direct_texture_delivery"
  | "refresh";

interface AreaContextMenuProps {
  area: AreaApiListItem;
  x: number;
  y: number;
  menuRef?: Ref<HTMLElement>;
  canUseBackend: boolean;
  isOpeningArea: boolean;
  isCheckingTerrainReadiness: boolean;
  isCheckingTextureReadiness: boolean;
  isRefreshingAreas: boolean;
  onAction: (action: AreaContextMenuAction) => void;
}

export function AreaContextMenu({
  area,
  x,
  y,
  menuRef,
  canUseBackend,
  isOpeningArea,
  isCheckingTerrainReadiness,
  isCheckingTextureReadiness,
  isRefreshingAreas,
  onAction
}: AreaContextMenuProps) {
  return (
    <article
      ref={menuRef}
      className="canvas-context-menu area-context-menu"
      role="menu"
      aria-label={`area context menu for ${area.name}`}
      style={{ left: `${x}px`, top: `${y}px` }}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="canvas-context-menu-header">
        <strong>{area.name}</strong>
        <span>{area.width}x{area.height} area</span>
      </header>
      <button
        type="button"
        role="menuitem"
        onClick={() => onAction("open")}
        disabled={!canUseBackend || isOpeningArea}
      >
        Open Area
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => onAction("terrain_readiness")}
        disabled={!canUseBackend || isCheckingTerrainReadiness || isOpeningArea}
      >
        Check Terrain Readiness
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => onAction("texture_readiness")}
        disabled={!canUseBackend || isCheckingTextureReadiness}
      >
        Check Texture Readiness
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => onAction("direct_texture_delivery")}
        disabled={!canUseBackend || isCheckingTextureReadiness}
      >
        Check Direct Texture Delivery
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => onAction("refresh")}
        disabled={!canUseBackend || isRefreshingAreas}
      >
        Refresh Areas
      </button>
    </article>
  );
}
