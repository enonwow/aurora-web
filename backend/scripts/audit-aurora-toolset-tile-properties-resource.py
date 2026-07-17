#!/usr/bin/env python3
"""Read-only audit of the retail TDLGTILEPROPERTIES Delphi DFM resource."""
import argparse
import json
import re
from pathlib import Path

import pefile

RESOURCE_TYPE_RCDATA = 10
RESOURCE_NAME = "TDLGTILEPROPERTIES"
IDENTITY_TOKENS = ("tile_id", "tile_orientation", "orientation", "tileid", "tile id")


def printable_strings(data: bytes) -> list[str]:
    return [match.group().decode("latin1") for match in re.finditer(rb"[ -~]{3,}", data)]


def resource_bytes(exe: Path) -> bytes:
    pe = pefile.PE(str(exe), fast_load=False)
    for resource_type in pe.DIRECTORY_ENTRY_RESOURCE.entries:
        if resource_type.struct.Id != RESOURCE_TYPE_RCDATA:
            continue
        for name in resource_type.directory.entries:
            value = name.name.string.decode(errors="replace") if name.name else str(name.struct.Id)
            if value.upper() != RESOURCE_NAME:
                continue
            data = name.directory.entries[0].data.struct
            return pe.get_data(data.OffsetToData, data.Size)
    raise RuntimeError(f"RCDATA {RESOURCE_NAME} was not found in {exe}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    exe = Path(args.exe).resolve()
    raw = resource_bytes(exe)
    strings = printable_strings(raw)
    lowered = [value.lower() for value in strings]
    identity = sorted({token for token in IDENTITY_TOKENS if any(token in value for value in lowered)})
    controls = [value for value in strings if value.startswith("T") and value[1:2].isupper()]
    report = {
        "version": "aurora-toolset-tile-properties-resource-audit/v1",
        "status": "blocked" if not identity else "unexpected_identity_field_present",
        "blockerCode": "toolset_tile_properties_has_no_tile_identity_fields" if not identity else None,
        "input": {"exe": str(exe), "resourceType": "RCDATA", "resourceName": RESOURCE_NAME, "bytes": len(raw)},
        "formClass": strings[1] if len(strings) > 1 and strings[0] == "TPF0" else None,
        "identityFieldTokensFound": identity,
        "componentClasses": controls,
        "semanticConclusion": (
            "TdlgTileProperties cannot read Tile_ID, Tile_Orientation, or source coordinates; it is lighting/color/animation configuration only."
            if not identity else "Unexpected identity-like token found; manual audit required before changing the fail-closed policy."
        ),
        "safety": {"readOnlyBinaryAudit": True, "launchesToolset": False, "usesGlobalInput": False},
    }
    output = Path(args.out).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "blockerCode": report["blockerCode"], "out": str(output)}))


if __name__ == "__main__":
    main()
