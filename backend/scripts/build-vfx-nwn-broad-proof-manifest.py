from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS = REPO_ROOT / "backend" / "docs" / "aurora-reverse"
BROAD_ROOT = DOCS / "evidence" / "vfx-nwn-broad-proof-2026-07-16"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def artifact(path: Path) -> dict:
    return {"path": str(path), "sha256": sha256(path), "sizeBytes": path.stat().st_size}


def broad_fixture(slug: str, source: str, label: str, lifecycle: str) -> dict:
    root = BROAD_ROOT / slug
    recapture_validation = root / "nwn-recapture-2" / "validated-summary.json"
    validation_path = recapture_validation if recapture_validation.exists() else root / "nwn" / "validated-summary.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8"))
    return {
        "fixtureId": slug,
        "source": source,
        "label": label,
        "lifecycle": lifecycle,
        "capturePolicy": "new-single-trigger-run",
        "oracleStatus": validation["status"],
        "sourceManifest": artifact(root / "source-manifest.json"),
        "validation": artifact(validation_path),
        "video": artifact(Path(validation["video"]["path"])),
        "runId": validation["runId"],
        "checks": validation["checks"],
        "lifecycleObservation": validation["lifecycle"],
    }


def reused_fixture(slug: str, source: str, label: str, root_name: str) -> dict:
    root = DOCS / "evidence" / root_name
    validation_path = root / "nwn" / "validated-summary.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8"))
    return {
        "fixtureId": slug,
        "source": source,
        "label": label,
        "lifecycle": "fire-and-forget",
        "capturePolicy": "reused-saved-single-trigger-mp4-no-rerun",
        "oracleStatus": validation["status"],
        "sourceManifest": artifact(root / "fixture-manifest.json"),
        "validation": artifact(validation_path),
        "video": artifact(Path(validation["video"]["path"])),
        "runId": validation["runId"],
        "checks": validation["checks"],
        "lifecycleObservation": validation["lifecycle"],
    }


def placeable_fixture() -> dict:
    root = DOCS / "artifacts" / "source-mdl-emitter-oracle"
    video_path = root / "retail-source-mdl-emitter-plc-t04-ovens-removed.mp4"
    metadata_path = root / "retail-source-mdl-emitter-plc-t04-ovens-removed-video.json"
    return {
        "fixtureId": "plc_t04",
        "source": "placeables.2da/resref plc_t04",
        "label": "plc_t04",
        "lifecycle": "placeable",
        "capturePolicy": "reused-admitted-retail-reference-no-rerun",
        "oracleStatus": "valid-retail-placeable-oracle",
        "validation": artifact(metadata_path),
        "video": artifact(video_path),
        "checks": {
            "fullStaticModelAndEmittersVisible": True,
            "sourceLightCount": 0,
            "savedReferenceReused": True,
        },
    }


def main() -> None:
    fixtures = [
        reused_fixture("row68", "visualeffects.2da#68", "VFX_IMP_HEALING_M", "vfx-nwn-web-row68"),
        broad_fixture("row44", "visualeffects.2da#44", "VFX_IMP_ACID_S", "fire-and-forget"),
        broad_fixture("row50", "visualeffects.2da#50", "VFX_IMP_DEATH", "fire-and-forget"),
        reused_fixture("row22", "visualeffects.2da#22", "VFX_FNF_FIREBALL", "vfx-nwn-web-row22"),
        broad_fixture("row210", "visualeffects.2da#210", "VFX_BEAM_FIRE", "duration-20.0s"),
        broad_fixture("row216", "visualeffects.2da#216", "VFX_BEAM_FIRE_LASH", "duration-20.0s"),
        broad_fixture("row181", "visualeffects.2da#181", "VFX_IMP_MIRV", "fire-and-forget-projectile"),
        broad_fixture("row1", "visualeffects.2da#1", "VFX_DUR_DARKNESS", "duration-20.0s"),
        broad_fixture("aoe0", "vfx_persistent.2da#0", "VFX_PER_FOGACID", "duration-20.0s-native-aoe"),
        placeable_fixture(),
    ]
    valid_count = sum(item["oracleStatus"].startswith("valid") for item in fixtures)
    invalid = [item["fixtureId"] for item in fixtures if not item["oracleStatus"].startswith("valid")]
    manifest = {
        "version": "aurora-vfx-nwn-broad-proof-manifest/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "matrix": artifact(DOCS / "vfx-broad-proof-matrix-2026-07-16.md"),
        "proofStandard": artifact(DOCS / "vfx-proof-standard-2026-07-13.md"),
        "summary": {
            "selectedFixtureCount": len(fixtures),
            "validNwnOracleCount": valid_count,
            "invalidNwnOracleCount": len(invalid),
            "invalidFixtureIds": invalid,
            "newCaptureCount": 7,
            "reusedReferenceCount": 3,
            "automaticRetryUsed": False,
        },
        "fixtures": fixtures,
    }
    output_path = BROAD_ROOT / "nwn-proof-manifest.json"
    output_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"path": str(output_path), **manifest["summary"]}, indent=2))


if __name__ == "__main__":
    main()
