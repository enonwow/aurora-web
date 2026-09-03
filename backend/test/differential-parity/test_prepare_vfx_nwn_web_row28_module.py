from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = (
    REPO_ROOT / "backend" / "scripts" / "prepare-vfx-nwn-web-row28-module.py"
)


def load_module():
    spec = importlib.util.spec_from_file_location(
        "prepare_vfx_nwn_web_row28_module", MODULE_PATH
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load row28 module preparer: {MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PrepareVfxNwnWebRow28ModuleTest(unittest.TestCase):
    def setUp(self) -> None:
        self.module = load_module()

    def test_trigger_is_exact_single_location_meteor_swarm(self) -> None:
        trigger, entry = self.module.build_sources("20260818T190000Z")

        self.assertIn("EffectVisualEffect(VFX_FNF_METEOR_SWARM)", trigger)
        self.assertIn("ApplyEffectAtLocation(DURATION_TYPE_INSTANT", trigger)
        self.assertIn("GetLocation(oTarget)", trigger)
        self.assertNotIn("ApplyEffectToObject", trigger)
        self.assertEqual(trigger.count("AURORA_VFX_PROOF_TRIGGERED"), 2)
        self.assertIn("fixture=vfx-nwn-web-row28 row=28 count=1", trigger)
        self.assertIn('ExecuteScript("vfx28shot", oModule)', entry)

    def test_destination_guard_refuses_overwrite(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "codex_vfx_row28.mod"
            destination.write_bytes(b"owned")

            with self.assertRaisesRegex(RuntimeError, "Refusing to overwrite"):
                self.module.ensure_destination_absent(destination)

    def test_binary_bootstrap_profile_binds_exact_scene(self) -> None:
        profile = self.module.build_binary_bootstrap_profile(
            module_path=Path(r"C:\proof\codex_vfx_row28.mod"),
            module_sha256="a" * 64,
            ordered_haks=[
                {
                    "name": "tlc_vfx_lab_2da",
                    "path": r"C:\proof\tlc_vfx_lab_2da.hak",
                    "sha256": "b" * 64,
                }
            ],
        )

        self.assertEqual(profile["area"], {"resref": "enon_test_effect", "width": 2, "height": 2})
        self.assertEqual(
            profile["entryPoint"],
            {"area": "enon_test_effect", "position": [9.5, 3.799999952316284, 0]},
        )
        self.assertEqual(profile["fixtures"][0]["templateResRef"], "nw_innkeeper")
        self.assertEqual(profile["fixtures"][0]["appearanceType"], 233)
        self.assertEqual(profile["fixtures"][0]["position"], [9.5, 6.8, 0])
        self.assertTrue(profile["noLocalToolsetAdapter"])


if __name__ == "__main__":
    unittest.main()
