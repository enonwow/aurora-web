#!/usr/bin/env python3
"""Generate a compact maintainer-only Aurora reverse symbol index."""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path


STRING_FILES = [
    Path("export/strings.tsv"),
    Path("export/strings_2da.tsv"),
    Path("export/xrefs_domain.txt"),
]

CATEGORY_PATTERNS = {
    "toolset_dialogs": re.compile(r"\bTdlg[A-Za-z0-9_]+"),
    "toolset_frames": re.compile(r"\bT(?:fra|frm)[A-Za-z0-9_]+"),
    "templates": re.compile(r"\bTNW[A-Za-z0-9_]+Template\b"),
    "instances": re.compile(r"\bTNW[A-Za-z0-9_]+Instance\b"),
    "objects": re.compile(r"\bTNW[A-Za-z0-9_]+\b"),
    "module_fields": re.compile(r"\bMod_[A-Za-z0-9_]+"),
    "resource_extensions": re.compile(r"\*\.[A-Z0-9]{3}\b"),
    "resource_systems": re.compile(r"\b(?:C2DA|CRes2DA|CResGFF|CTlkTable|TNWHakPak(?:List|Resource|ResourceList)?|TGITFile|ResourceInHak|dialog\.tlk|HAK V1\.0)\b"),
}

QA_HINTS = [
    "can't",
    "cannot",
    "could not",
    "does not exist",
    "invalid",
    "caught exception",
    "error:",
    "no model",
    "not found",
]

DOMAIN_HINTS = {
    "areas": ["TdlgAreaWizard", "TdlgAreaProperties", "DefaultAreaProperties", "*.ARE"],
    "door_transition": ["TdlgDoorEdit", "TdlgDoorWizard", "TdlgAreaTransition", "TNWDoorInstance", "*.UTD"],
    "triggers": ["TdlgTriggerEdit", "TdlgTriggerWizard", "TNWTriggerInstance", "triggerpalcus.itp"],
    "sounds": ["TdlgSoundEdit", "TdlgSoundWizard", "TdlgSoundSetSelect", "TdlgResOpenSound", "TNWSoundInstance"],
    "placeables": ["TdlgPlaceableEdit", "TdlgPlaceableWizard", "TNWPlaceableInstance", "*.UTP"],
    "items_inventory": ["TdlgItemEdit", "TdlgItemWizard", "TdlgItemGeneratorEdit", "TdlgInventory", "TNWItemInstance", "*.UTI"],
    "creatures_encounters": ["TdlgCreatureEdit", "TdlgCreatureWizard", "TNWCreatureInstance", "TNWEncounterInstance", "*.UTC"],
    "conversation_script": ["TdlgConversationEditor", "TdlgConversationInput", "TdlgConversationSearch", "TdlgConversationTest", "TdlgScriptEditor", "TdlgScriptWizard"],
    "custom_content": ["C2DA", "CRes2DA", "CTlkTable", "TNWHakPak", "ResourceInHak", "Mod_CustomTlk", "Mod_HakList"],
    "git_placed_objects": ["TGITFile", "CResGFF", "TNWCreatureInstance", "TNWDoorInstance", "TNWItemInstance", "TNWPlaceableInstance", "TNWSoundInstance", "TNWTriggerInstance"],
}


@dataclass
class SymbolRecord:
    symbol: str
    sources: set[str] = field(default_factory=set)
    examples: set[str] = field(default_factory=set)


def clean_value(value: str) -> str:
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    return value.replace("\\n", " ").replace("\n", " ").replace("\r", " ").strip()


def iter_text_rows(reverse_root: Path) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for relative in STRING_FILES:
        path = reverse_root / relative
        if not path.exists():
            continue
        if path.suffix == ".tsv":
            with path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
                reader = csv.reader(handle, delimiter="\t")
                for record in reader:
                    if not record:
                        continue
                    if len(record) >= 5:
                        rows.append((str(relative), clean_value(record[4])))
                    else:
                        rows.append((str(relative), clean_value(" ".join(record))))
        else:
            for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
                rows.append((str(relative), clean_value(line)))
    return rows


def add_symbol(
    groups: dict[str, dict[str, SymbolRecord]],
    group: str,
    symbol: str,
    source: str,
    example: str,
) -> None:
    record = groups[group].setdefault(symbol, SymbolRecord(symbol=symbol))
    record.sources.add(source)
    if len(record.examples) < 3:
        record.examples.add(example[:180])


def collect(reverse_root: Path) -> tuple[dict[str, dict[str, SymbolRecord]], list[tuple[str, str]], dict[str, list[str]]]:
    rows = iter_text_rows(reverse_root)
    groups: dict[str, dict[str, SymbolRecord]] = defaultdict(dict)
    qa_examples: dict[str, list[str]] = defaultdict(list)

    for source, text in rows:
        if not text:
            continue
        for group, pattern in CATEGORY_PATTERNS.items():
            for symbol in sorted(set(pattern.findall(text))):
                add_symbol(groups, group, symbol, source, text)

        lower = text.lower()
        if any(hint in lower for hint in QA_HINTS):
            domain = infer_domain(text)
            if len(qa_examples[domain]) < 20:
                qa_examples[domain].append(text)

    return groups, rows, qa_examples


def infer_domain(text: str) -> str:
    lower = text.lower()
    if "door" in lower or "transition" in lower:
        return "door_transition"
    if "creature" in lower or "classes.2da" in lower or "wingmodel" in lower or "tailmodel" in lower:
        return "creatures"
    if "item" in lower or "cloakmodel" in lower or "inventory" in lower:
        return "items_inventory"
    if "hak" in lower or "tlk" in lower or "2da" in lower:
        return "custom_content"
    if "gitfile" in lower or "area" in lower:
        return "areas_git"
    return "general"


def format_symbol_table(records: dict[str, SymbolRecord], limit: int = 80) -> list[str]:
    lines = ["| Symbol | Sources | Example |", "| --- | --- | --- |"]
    for symbol in sorted(records)[:limit]:
        record = records[symbol]
        sources = ", ".join(sorted(record.sources))
        example = next(iter(sorted(record.examples)), "")
        example = example.replace("|", "\\|")
        lines.append(f"| `{symbol}` | `{sources}` | {example} |")
    if len(records) > limit:
        lines.append(f"| ... | ... | {len(records) - limit} more symbols omitted from this compact index. |")
    return lines


def domain_presence(groups: dict[str, dict[str, SymbolRecord]]) -> dict[str, list[str]]:
    all_symbols = set()
    for records in groups.values():
        all_symbols.update(records)
    return {
        domain: [symbol for symbol in hints if symbol in all_symbols]
        for domain, hints in DOMAIN_HINTS.items()
    }


def render(reverse_root: Path, out: Path) -> str:
    groups, rows, qa_examples = collect(reverse_root)
    presence = domain_presence(groups)
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    lines = [
        "# Local Aurora Symbol Index",
        "",
        "## Purpose",
        "",
        "Provide a compact, regenerable index of local Aurora Toolset reverse-engineering symbols for NWN server gamedev skill-pack maintainers.",
        "",
        "Evidence label: `local-reverse-lead`.",
        "",
        "This is maintainer research material. Do not copy raw decompilation into the installed skill, and do not treat symbol names as official NWN documentation or live Toolset verification.",
        "",
        "## Inputs",
        "",
        f"- Reverse root: `{reverse_root}`",
        "- Parsed files:",
        *[f"  - `{relative}`" for relative in STRING_FILES if (reverse_root / relative).exists()],
        f"- Parsed text rows: `{len(rows)}`",
        f"- Generated at: `{generated_at}`",
        "",
        "## Domain Coverage Leads",
        "",
        "| Domain | Found symbols | Skill-pack implication |",
        "| --- | --- | --- |",
    ]

    implications = {
        "areas": "Separate area creation, area property editing, and placed-object validation.",
        "door_transition": "Separate door editing from area-transition linking and model/build checks.",
        "triggers": "Treat trigger blueprints and trigger instances as a dedicated atom family.",
        "sounds": "Keep sound object placement, sound-set selection, and resource-open flows separate.",
        "placeables": "Separate placeable blueprint edits from placed instances and container inventory.",
        "items_inventory": "Separate item blueprint edits, inventory insertion, and generated loot.",
        "creatures_encounters": "Separate creature blueprints, creature instances, encounter lists, and spawn points.",
        "conversation_script": "Keep dialogue authoring/test/search and script edit/search as distinct flows.",
        "custom_content": "Use Toolset-load checks for 2DA, TLK, HAK, and resource lookup changes.",
        "git_placed_objects": "Treat placed-object work as area-instance/GIT-backed until live tests prove behavior.",
    }
    for domain, found in presence.items():
        found_text = ", ".join(f"`{symbol}`" for symbol in found) or "`none found`"
        lines.append(f"| `{domain}` | {found_text} | {implications[domain]} |")

    lines.extend([
        "",
        "## Toolset Dialog Symbols",
        "",
        *format_symbol_table(groups.get("toolset_dialogs", {})),
        "",
        "## Toolset Frame Symbols",
        "",
        *format_symbol_table(groups.get("toolset_frames", {}), limit=40),
        "",
        "## Template And Instance Symbols",
        "",
        "### Templates",
        "",
        *format_symbol_table(groups.get("templates", {}), limit=60),
        "",
        "### Instances",
        "",
        *format_symbol_table(groups.get("instances", {}), limit=80),
        "",
        "## Module Fields",
        "",
        *format_symbol_table(groups.get("module_fields", {}), limit=120),
        "",
        "## Resource Extensions And Systems",
        "",
        "### Resource Extensions",
        "",
        *format_symbol_table(groups.get("resource_extensions", {}), limit=40),
        "",
        "### Resource Systems",
        "",
        *format_symbol_table(groups.get("resource_systems", {}), limit=60),
        "",
        "## QA Error Leads",
        "",
    ])

    for domain in sorted(qa_examples):
        lines.extend([f"### {domain}", ""])
        for example in qa_examples[domain][:12]:
            lines.append(f"- {example}")
        lines.append("")

    lines.extend([
        "## Candidate Atom Checklist",
        "",
        "- `area.createWithWizard` from `TdlgAreaWizard`.",
        "- `area.editProperties` from `TdlgAreaProperties`.",
        "- `door.editBlueprintOrInstance` from `TdlgDoorEdit` and `TNWDoorInstance`.",
        "- `door.linkAreaTransition` from `TdlgAreaTransition`.",
        "- `trigger.editBlueprintOrInstance` from `TdlgTriggerEdit` and `TNWTriggerInstance`.",
        "- `sound.editPlacedSound` from `TdlgSoundEdit`, `TdlgSoundSetSelect`, and `TNWSoundInstance`.",
        "- `placeable.editBlueprintOrInstance` from `TdlgPlaceableEdit` and `TNWPlaceableInstance`.",
        "- `inventory.insertItem` from `TdlgInventory`, `TfraMainInventory`, and `NWInventoryObjectRef`.",
        "- `item.editBlueprint` and `item.generateLoot` from `TdlgItemEdit` and `TdlgItemGeneratorEdit`.",
        "- `creature.editBlueprintOrInstance` from `TdlgCreatureEdit` and `TNWCreatureInstance`.",
        "- `conversation.editAndTest` from `TdlgConversationEditor` and `TdlgConversationTest`.",
        "- `script.createEditSearch` from `TdlgScriptWizard`, `TdlgScriptEditor`, and `TdlgScriptSearch`.",
        "- `module.configureEventsAndEntry` from `Mod_*` fields.",
        "- `customContent.verify2daHakTlkLoad` from `C2DA`, `CTlkTable`, `TNWHakPak`, and `ResourceInHak`.",
        "",
        "## Still Hypothesis",
        "",
        "- Symbol boundaries are useful taxonomy leads, not exact UI scripts.",
        "- `TGITFile` and `CResGFF` indicate area/placed-object persistence lanes, but exact mutation behavior needs controlled module tests.",
        "- Error strings identify QA checks to attempt, but live Toolset reproduction is still required.",
        "- This index should inform future compact skill references only after maintainer review.",
    ])

    text = "\n".join(lines) + "\n"
    out.write_text(text, encoding="utf-8")
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reverse-root", default=r"C:\Projects\New Folder")
    parser.add_argument("--out", default="docs/nwn-skill-pack/local-aurora-symbol-index.md")
    parser.add_argument("--json-summary", action="store_true")
    args = parser.parse_args()

    reverse_root = Path(args.reverse_root)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    text = render(reverse_root, out)

    if args.json_summary:
        groups, rows, qa_examples = collect(reverse_root)
        print(json.dumps({
            "out": str(out),
            "rows": len(rows),
            "groups": {key: len(value) for key, value in sorted(groups.items())},
            "qa_domains": {key: len(value) for key, value in sorted(qa_examples.items())},
        }, indent=2))
    else:
        print(f"Wrote {out} ({len(text.splitlines())} lines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
