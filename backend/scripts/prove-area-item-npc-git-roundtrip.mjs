import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const { serializeAreaToGitGff } = require(
  "../dist/src/modules/areas/adapters/outbound/blob/aurora-gff-area-writer.js"
);
const { parseAreaObjectsFromGitGff } = require(
  "../dist/src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser.js"
);

const outputDirectory = path.resolve(
  process.argv[2] ??
    "docs/aurora-reverse/evidence/items-area-npc-2026-07-13"
);

const area = {
  areaId: "item_npc_proof",
  name: "Item and NPC Proof",
  biome: "proof",
  width: 2,
  height: 2,
  tags: ["proof"],
  benchmark: false,
  previewImageUrl: "",
  textureAtlasId: "proof",
  textureAtlasObjectKey: "proof",
  textureAtlasContentType: "image/webp",
  textureAtlasSizeBytes: 0,
  textureAtlasFingerprint: "proof",
  objects: [
    {
      objectId: "proof:item:0",
      kind: "item",
      templateId: "custom_hide_armo",
      resRef: "custom_hide_armo",
      tag: "CUSTOM_HIDE_ARMOR",
      localizedName: "Custom Hide Armor",
      itemMetadata: { baseItem: 16, identified: true },
      x: 1.5,
      y: 1.5,
      z: 0,
      bearing: 0
    },
    {
      objectId: "proof:creature:0",
      kind: "creature",
      templateId: "d_guard",
      resRef: "d_guard",
      tag: "D_GUARD",
      creatureMetadata: {
        inventoryItemListEntries: JSON.stringify([
          {
            resRef: "custom_hide_armo",
            x: 0,
            y: 0,
            dropable: true,
            pickpocketable: false,
            infinite: false
          }
        ]),
        equipItemListEntries: JSON.stringify([
          {
            resRef: "nw_it_mbracer013",
            slotMask: 8,
            dropable: true,
            pickpocketable: false,
            infinite: false
          }
        ])
      },
      x: 2.5,
      y: 2.5,
      z: 0,
      bearing: 90
    }
  ],
  soundscape: {
    bindingKeys: {
      areaKey: "GI_sound_area",
      randomKey: "GI_sound_rndm",
      positionalKey: "GI_sound_pos"
    },
    area: [],
    random: [],
    positional: []
  },
  updatedAt: new Date().toISOString()
};

const gitBytes = serializeAreaToGitGff(area);
const parsed = parseAreaObjectsFromGitGff(gitBytes);
const creature = parsed?.creatures?.[0];
const inventoryEntries = JSON.parse(
  String(creature?.creatureMetadata?.inventoryItemListEntries ?? "[]")
);
const equippedEntries = JSON.parse(
  String(creature?.creatureMetadata?.equipItemListEntries ?? "[]")
);
const summary = {
  proofStatus: "pass",
  generatedAt: new Date().toISOString(),
  gitFileType: gitBytes.subarray(0, 4).toString("ascii"),
  gitSizeBytes: gitBytes.length,
  placedItemCount: parsed?.items?.length ?? 0,
  placedCreatureCount: parsed?.creatures?.length ?? 0,
  placedItemResRef: parsed?.items?.[0]?.templateResRef,
  creatureResRef: creature?.templateResRef,
  inventoryEntries,
  equippedEntries
};

if (
  summary.gitFileType !== "GIT " ||
  summary.placedItemCount !== 1 ||
  summary.placedCreatureCount !== 1 ||
  summary.placedItemResRef !== "custom_hide_armo" ||
  inventoryEntries[0]?.resRef !== "custom_hide_armo" ||
  equippedEntries[0]?.resRef !== "nw_it_mbracer013" ||
  equippedEntries[0]?.slotMask !== 8
) {
  throw new Error(`Area item/NPC GIT round-trip failed: ${JSON.stringify(summary)}`);
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "item-npc-roundtrip.git"), gitBytes);
await writeFile(
  path.join(outputDirectory, "summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8"
);
console.log(JSON.stringify({ outputDirectory, ...summary }));
