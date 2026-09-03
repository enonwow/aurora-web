import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseAreaMetadataFromAreGff } from "../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { NwnErfPackedModuleExtractorService } from "../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import { NwnKeyBifResourceReader } from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { parseRawGffDocument } from "../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from "../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const SHADER_RESOURCE_TYPE = 2069;
const NWN_ROOT = "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const SETTINGS_PATH = "C:/Users/enonw/Documents/Neverwinter Nights/settings.tml";
const CAPTURE_MODULE_PATH =
  "C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_vb_r216.mod";
const OUTPUT_PATH = resolve(
  "docs/aurora-reverse/artifacts/vfx-postprocessing-2026-07-19/active-retail-postprocessing-shader-audit.json"
);

const REQUIRED_RESREFS = ["fsfblvls", "fsfbshrp", "fsfbvib"] as const;
const POSTPROCESSING_INCLUDE_RESREFS = new Set([
  "inc_common",
  "inc_config",
  "inc_fog",
  "inc_framebuffer",
  "inc_lighting",
  "inc_material",
  "inc_postpr",
  "inc_postpr_dyn_c",
  "inc_postpr_shrp",
  "inc_postpr_vibr",
  "inc_tonemap"
]);

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readSection(settings: string, section: string): string {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return (
    settings.match(
      new RegExp(
        `^\\s*\\[${escaped}\\]\\s*$([\\s\\S]*?)(?=^\\s*\\[|(?![\\s\\S]))`,
        "mu"
      )
    )?.[1] ?? ""
  );
}

function readBoolean(section: string, key: string): boolean | null {
  const value = section.match(new RegExp(`^\\s*${key}\\s*=\\s*(true|false)\\s*$`, "mi"))?.[1];
  return value == null ? null : value.toLowerCase() === "true";
}

function readNumber(section: string, key: string): number | null {
  const value = section.match(
    new RegExp(`^\\s*${key}\\s*=\\s*([-+]?\\d+(?:\\.\\d+)?)\\s*$`, "mi")
  )?.[1];
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readModuleRootValue(
  fields: readonly SupportedGffField[],
  label: string
): string | number | null {
  const field = fields.find(
    (candidate) => candidate.label.toLowerCase() === label.toLowerCase()
  );
  return field && (typeof field.value === "string" || typeof field.value === "number")
    ? field.value
    : null;
}

async function main(): Promise<void> {
  const keyPaths = ["nwn_retail.key", "nwn_base.key"].map((name) =>
    resolve(NWN_ROOT, "data", name)
  );
  const readers = await Promise.all(
    keyPaths.map(async (keyPath) => ({
      keyPath,
      reader: await NwnKeyBifResourceReader.open(keyPath, NWN_ROOT)
    }))
  );
  const shaderNames = [
    ...new Set(readers.flatMap(({ reader }) => reader.list(SHADER_RESOURCE_TYPE).map(({ resref }) => resref)))
  ].sort();
  const candidateResrefs = shaderNames.filter((resref) =>
    POSTPROCESSING_INCLUDE_RESREFS.has(resref) ||
    /^(?:fs|vs)fb|lvls|levels|shrp|sharpen|vib|vibrance|post/i.test(resref)
  );
  const resources = await Promise.all(
    candidateResrefs.map(async (resref) => {
      for (const { keyPath, reader } of readers) {
        const bytes = await reader.read(resref, SHADER_RESOURCE_TYPE);
        if (!bytes) continue;
        return {
          resref,
          keyPath,
          sourceClass: keyPath.toLowerCase().endsWith("nwn_retail.key")
            ? "active-retail-override"
            : "base-fallback",
          bytes: bytes.length,
          sha256: sha256(bytes),
          source: bytes.toString("utf8")
        };
      }
      throw new Error(`Candidate shader disappeared during read: ${resref}`);
    })
  );
  const settings = await readFile(SETTINGS_PATH, "utf8");
  const moduleFiles = await new NwnErfPackedModuleExtractorService().extractFromPackedModule(
    CAPTURE_MODULE_PATH
  );
  const captureAreas = moduleFiles
    .filter(({ resourceType }) => resourceType === 2012)
    .flatMap(({ fileName, bytes }) => {
      const area = parseAreaMetadataFromAreGff(bytes);
      return area
        ? [
            {
              fileName,
              name: area.name ?? null,
              tag: area.tag ?? null,
              globalLighting: Object.fromEntries(
                area.globalLighting.fields.map(({ field, value }) => [field, value])
              )
            }
          ]
        : [];
    });
  const moduleIfo = moduleFiles.find(
    ({ fileName }) => fileName.toLowerCase() === "module.ifo"
  );
  const moduleDocument = moduleIfo ? parseRawGffDocument(moduleIfo.bytes) : null;
  const entryArea = moduleDocument
    ? readModuleRootValue(moduleDocument.fields, "Mod_Entry_Area")
    : null;
  const captureEntryArea =
    typeof entryArea === "string"
      ? captureAreas.find(
          ({ fileName }) =>
            fileName.toLowerCase() === `${entryArea.toLowerCase()}.are`
        ) ?? null
      : null;
  const highContrast = readSection(settings, "graphics.fbo.high-contrast");
  const sharpen = readSection(settings, "graphics.fbo.sharpen");
  const vibrance = readSection(settings, "graphics.fbo.vibrance");
  const profile = {
    highContrast: {
      enabled: readBoolean(highContrast, "enabled"),
      intensity: readNumber(highContrast, "intensity"),
      midpoint: readNumber(highContrast, "midpoint")
    },
    sharpen: {
      enabled: readBoolean(sharpen, "enabled")
    },
    vibrance: {
      enabled: readBoolean(vibrance, "enabled"),
      amount: readNumber(vibrance, "amount")
    }
  };
  const recoveredResrefs = new Set(resources.map(({ resref }) => resref));
  const resourceByResref = new Map(resources.map((resource) => [resource.resref, resource]));
  const activePostprocess = resourceByResref.get("inc_postpr");
  const activeConfig = resourceByResref.get("inc_config");
  const activeTonemap = resourceByResref.get("inc_tonemap");
  const activeColorCorrectionType = Number(
    activeConfig?.source.match(/#define\s+COLOR_CORRECTION_TYPE\s+(\d+)/)?.[1] ??
      Number.NaN
  );
  const activeColorCorrectionRecovered =
    activePostprocess?.source.includes("ApplyColorTonemap(Color.rgb);") === true &&
    activeTonemap?.source.includes("#elif COLOR_CORRECTION_TYPE != 0") === true &&
    activeTonemap.source.includes(
      "Color.rgb *= 1.0-sqr((fMax-1.0)/fMax);"
    ) &&
    activeColorCorrectionType === 4;
  const payload = {
    version: "aurora-retail-postprocessing-shader-audit/v3",
    generatedAt: new Date().toISOString(),
    status:
      REQUIRED_RESREFS.every((resref) => recoveredResrefs.has(resref)) &&
      activeColorCorrectionRecovered
      ? "active-retail-postprocessing-sources-recovered"
      : "incomplete",
    source: {
      resourceType: SHADER_RESOURCE_TYPE,
      keyPaths,
      resourcePrecedence: "nwn_retail.key-overrides-nwn_base.key",
      settingsPath: SETTINGS_PATH,
      captureModulePath: CAPTURE_MODULE_PATH,
      captureModule: {
        entryArea,
        startHour: moduleDocument
          ? readModuleRootValue(moduleDocument.fields, "Mod_StartHour")
          : null,
        minutesPerHour: moduleDocument
          ? readModuleRootValue(moduleDocument.fields, "Mod_MinPerHour")
          : null,
        entryAreaLighting: captureEntryArea
      },
      captureAreas,
      candidateResrefs,
      resources
    },
    captureProfile: profile,
    recovered: {
      activePostprocessSourceClass: activePostprocess?.sourceClass ?? null,
      activePostprocessSha256: activePostprocess?.sha256 ?? null,
      activeConfigSourceClass: activeConfig?.sourceClass ?? null,
      activeConfigSha256: activeConfig?.sha256 ?? null,
      activeTonemapSourceClass: activeTonemap?.sourceClass ?? null,
      activeTonemapSha256: activeTonemap?.sha256 ?? null,
      activeColorCorrectionType,
      postprocessCallsApplyColorTonemap:
        activePostprocess?.source.includes("ApplyColorTonemap(Color.rgb);") === true,
      type4UsesOverflowPreservingElseBranch:
        activeTonemap?.source.includes(
          "Color.rgb *= 1.0-sqr((fMax-1.0)/fMax);"
        ) === true,
      activeColorCorrectionRecovered
    },
    decompilationAnchors: [
      "Camera::DoFrameBufferEffects(int) 0x4a93f7-0x4a9478 applies framebuffer effect 2 after bloom",
      "CClientOptions::ConfigureFBEffectPostProcessing builds effect-2 feature mask: sharpen=1, dof=2, levels=4, vibrance=8, toon=0x20"
    ]
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      { output: OUTPUT_PATH, status: payload.status, candidateResrefs, profile },
      null,
      2
    )
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
