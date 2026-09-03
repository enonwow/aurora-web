import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("read-only Toolset VCL binding probe", () => {
  it("pins the Toolset binary and never represents object binding as camera readback", async () => {
    const source = await readFile(resolve(__dirname, "../../scripts/probe-toolset-vcl-viewer-readback.mjs"), "utf8");
    expect(source).toContain("4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24");
    expect(source).toContain('status: "bound_not_camera_readable"');
    expect(source).toContain('readback: "vcl_object_binding"');
    expect(source).toContain("function writeResult(result)");
    expect(source).toContain("$windowProcessId");
    expect(source).toContain("Find-VclObject");
    expect(source).toContain("GetClassLongPtrW");
    expect(source).toContain("EnumPropsExW");
    expect(source).toContain("window-property");
    expect(source).toContain("toolset_vcl_object_slot_unavailable");
    expect(source).not.toContain("[uint32]$pid=0");
    expect(source).toContain("processMemoryWrites=$false");
    expect(source).not.toContain("WriteProcessMemory");
  });
});
