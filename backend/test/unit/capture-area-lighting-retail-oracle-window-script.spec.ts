import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("capture-area-lighting-retail-oracle-window.ps1", () => {
  it("exposes a safe capture mode that avoids focus, topmost, and keyboard automation", async () => {
    const scriptPath = resolve(
      __dirname,
      "../../scripts/capture-area-lighting-retail-oracle-window.ps1"
    );
    const script = await readFile(scriptPath, "utf8");

    expect(script).toContain("[switch]$NoFocus");
    expect(script).toContain("[switch]$NoTopMost");
    expect(script).toContain("[switch]$AllowTopMostWithoutFocus");
    expect(script).toContain("[switch]$NoEscape");
    expect(script).toContain("[switch]$AllowFocusInput");
    expect(script).toContain("public static readonly IntPtr HWND_TOP = new IntPtr(0);");
    expect(script).toContain('[string]$UserDirectory = ""');
    expect(script).toContain("[int]$FallbackSnapshotSeconds = 0");
    expect(script).toContain('[string]$FallbackSnapshotName = "retail-oracle-window-fallback.png"');
    expect(script).toContain('if ($UserDirectory)');
    expect(script).toContain('"-userdirectory"');
    expect(script).toContain("if (-not $AllowFocusInput)");
    expect(script).toContain("$NoFocus = $true");
    expect(script).toContain("if (-not $AllowTopMostWithoutFocus)");
    expect(script).toContain("$NoTopMost = $true");
    expect(script).toContain("$NoEscape = $true");
    expect(script).toContain("if ($NoFocus)");
    expect(script).toContain("$flags = $flags -bor 0x0010");
    expect(script).toContain("focusInputRequiresExplicitOptIn = $true");
    expect(script).toContain("allowFocusInput = [bool]$AllowFocusInput");
    expect(script).toContain("if (-not $NoFocus)");
    expect(script).toContain("if (-not $NoTopMost)");
    expect(script).toContain("if (-not $NoEscape -and -not $sentEscape");
    expect(script).toContain("$FallbackSnapshotSeconds -gt 0");
    expect(script).toContain("fallback snapshot after $FallbackSnapshotSeconds seconds without ALS_CAPTURE cue");
    expect(script).toContain("safeNoFocusMode = [bool]($NoFocus -and $NoEscape)");
    expect(script).toContain("noFocusTopMostMode = [bool]($NoFocus -and (-not $NoTopMost) -and $NoEscape)");
    expect(script).toContain("usesGlobalKeyboard = -not $NoEscape");
    expect(script).toContain("usesForegroundWindow = -not $NoFocus");
    expect(script).toContain("usesTopmost = -not $NoTopMost");
    expect(script).toContain("userDirectory = $UserDirectory");
  });
});
