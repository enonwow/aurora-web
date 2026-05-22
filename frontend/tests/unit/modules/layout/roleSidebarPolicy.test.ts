import { getRoleWorkspacePanels } from "../../../../src/modules/layout/roleSidebarPolicy";
import type { UserRole } from "../../../../src/modules/auth/contracts";

describe("roleSidebarPolicy", () => {
  const roles: UserRole[] = ["viewer", "builder", "dm", "admin"];

  it.each(roles)("returns unique section keys and non-empty semantic data for %s", (role) => {
    const panels = getRoleWorkspacePanels(role);
    expect(panels).toHaveProperty("left");
    expect(panels).toHaveProperty("right");

    const allSections = [...panels.left, ...panels.right];
    const uniqueKeys = new Set(allSections.map((section) => section.key));
    expect(uniqueKeys.size).toBe(allSections.length);

    allSections.forEach((section) => {
      expect(section.key.trim().length).toBeGreaterThan(0);
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.items.length).toBeGreaterThan(0);
      section.items.forEach((item) => {
        expect(item.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it("keeps builder right sidebar reserved for scene objects runtime panel", () => {
    const builderPanels = getRoleWorkspacePanels("builder");
    expect(builderPanels.right).toEqual([]);
    expect(builderPanels.left.map((section) => section.title)).toEqual([
      "Tile Catalog",
      "Paint Tools",
      "Asset Browser"
    ]);
    expect(builderPanels.left.map((section) => section.key)).toEqual([
      "builder-tiles",
      "builder-paint",
      "builder-assets"
    ]);
  });

  it("contains DM operational sections for queue delivery flow", () => {
    const dmPanels = getRoleWorkspacePanels("dm");
    expect(dmPanels.left.map((section) => section.title)).toContain("Spawn Palette");
    expect(dmPanels.right.map((section) => section.title)).toContain("Delivery Status");
  });

  it("contains admin configuration and infrastructure sections", () => {
    const adminPanels = getRoleWorkspacePanels("admin");
    expect(adminPanels.left.map((section) => section.title)).toEqual(
      expect.arrayContaining(["Path Configuration", "Role Matrix", "Import/Export"])
    );
    expect(adminPanels.right.map((section) => section.title)).toEqual(
      expect.arrayContaining(["System Health", "Storage Buckets", "Audit Events"])
    );
  });
});
