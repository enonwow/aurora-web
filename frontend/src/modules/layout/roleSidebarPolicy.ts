import type { WorkspaceUserRole } from "./contracts";

export interface SidebarSection {
  key: string;
  title: string;
  items: string[];
}

export interface RoleWorkspacePanels {
  left: SidebarSection[];
  right: SidebarSection[];
}

const rolePanels: Record<WorkspaceUserRole, RoleWorkspacePanels> = {
  viewer: {
    left: [
      {
        key: "viewer-area-list",
        title: "Area Navigator",
        items: ["Shared areas", "My local drafts", "Recent opens"]
      },
      {
        key: "viewer-layers",
        title: "Visible Layers",
        items: ["Creatures", "Doors", "Items", "Placeables", "Sounds"]
      }
    ],
    right: [
      {
        key: "viewer-area-snapshot",
        title: "Area Snapshot",
        items: ["Tile count", "Object count", "Chunk coverage", "Last refresh"]
      },
      {
        key: "viewer-selection-inspector",
        title: "Selection Inspector",
        items: ["ResRef", "Tag", "Coordinates", "Bearing", "Visual transform"]
      }
    ]
  },
  builder: {
    left: [
      {
        key: "builder-tiles",
        title: "Tile Catalog",
        items: ["Features", "Groups", "Terrain", "Rotate texture", "Show plot"]
      },
      {
        key: "builder-paint",
        title: "Paint Tools",
        items: [
          "Paint terrain",
          "Paint creatures",
          "Paint doors",
          "Paint items",
          "Paint placeables",
          "Paint sounds"
        ]
      },
      {
        key: "builder-assets",
        title: "Asset Browser",
        items: ["Placeables", "Creatures", "Doors", "Items", "Sounds"]
      }
    ],
    right: []
  },
  dm: {
    left: [
      {
        key: "dm-session-list",
        title: "Session Overview",
        items: ["Connected players", "Current area", "Live events", "Active encounters"]
      },
      {
        key: "dm-spawn-palette",
        title: "Spawn Palette",
        items: ["Creatures", "Doors", "VFX presets", "Quick templates"]
      }
    ],
    right: [
      {
        key: "dm-command-payload",
        title: "Command Payload",
        items: ["ResRef", "Position", "Facing", "Priority", "TTL"]
      },
      {
        key: "dm-delivery",
        title: "Delivery Status",
        items: ["API accepted", "Redis queued", "NWNX consumed", "Script executed"]
      }
    ]
  },
  admin: {
    left: [
      {
        key: "admin-paths",
        title: "Path Configuration",
        items: ["Vanilla path", "HAK path", "Module path", "TLK paths", "Export path"]
      },
      {
        key: "admin-roles",
        title: "Role Matrix",
        items: ["Viewer", "Builder", "DM", "Admin", "Permission overrides"]
      },
      {
        key: "admin-import-export",
        title: "Import/Export",
        items: ["Load config", "Save config", "Validate", "Rollback"]
      }
    ],
    right: [
      {
        key: "admin-health",
        title: "System Health",
        items: ["API uptime", "Queue lag", "Render jobs", "Error rate"]
      },
      {
        key: "admin-storage",
        title: "Storage Buckets",
        items: ["Blob cache usage", "TTL policy", "Large object report", "Cleanup queue"]
      },
      {
        key: "admin-audit",
        title: "Audit Events",
        items: ["Auth events", "Role changes", "Exports", "DM commands"]
      }
    ]
  }
};

export function getRoleWorkspacePanels(role: WorkspaceUserRole): RoleWorkspacePanels {
  return rolePanels[role];
}
