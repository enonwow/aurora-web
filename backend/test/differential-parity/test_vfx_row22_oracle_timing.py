from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = REPO_ROOT / "backend" / "scripts" / "vfx_row22_oracle_timing.py"


def load_module():
    spec = importlib.util.spec_from_file_location("vfx_row22_oracle_timing", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load timing audit module: {MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VfxRow22OracleTimingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.module = load_module()
        self.validated = {
            "lifecycle": {
                "fps": 12.0,
                "frameCount": 134,
                "onsetFrameIndex": 76,
                "onsetVideoSeconds": 76 / 12,
                "visibleFrameCount": 7,
                "visibleSpanSeconds": 7 / 12,
            }
        }
        self.capture = {
            "runtime": {
                "frames": 134,
                "firstGameplay": 12.034807099960744,
                "midElapsed": 19.582326199975796,
                "bestElapsed": 22.806312699976843,
            }
        }

    def test_missing_per_frame_timestamps_disable_runtime_time_comparison(self) -> None:
        audit = self.module.audit_oracle_timing(self.validated, self.capture)

        self.assertEqual(
            audit["status"],
            "unavailable-capture-frame-timestamps-missing",
        )
        self.assertFalse(audit["canMapRuntimeTimeToVideoPts"])
        self.assertFalse(audit["canCompareRuntimeDurations"])
        self.assertEqual(audit["sourceClass"], "primary-retail-capture")
        self.assertIn(
            "VFX_RETAIL_CAPTURE_FRAME_TIMESTAMPS_MISSING",
            audit["diagnosticCodes"],
        )
        self.assertIn(
            "VFX_RETAIL_CAPTURE_PTS_NOT_RUNTIME_TIME",
            audit["diagnosticCodes"],
        )

    def test_sparse_capture_elapsed_fields_do_not_become_timing_anchors(self) -> None:
        audit = self.module.audit_oracle_timing(self.validated, self.capture)

        self.assertEqual(
            audit["sparseElapsedFields"],
            {
                "firstGameplay": 12.034807099960744,
                "midElapsed": 19.582326199975796,
                "bestElapsed": 22.806312699976843,
            },
        )
        self.assertFalse(audit["sparseElapsedFieldsAreFrameTimeline"])
        self.assertNotIn("runtimeSecondsPerEncodedSecond", audit)

    def test_frame_count_mismatch_fails_closed(self) -> None:
        self.capture["runtime"]["frames"] = 133

        with self.assertRaisesRegex(ValueError, "frame count mismatch"):
            self.module.audit_oracle_timing(self.validated, self.capture)

    def test_frame_progression_uses_indices_without_time_labels(self) -> None:
        progression = self.module.build_frame_progression(
            onset_frame_index=76,
            frame_offsets=(0, 3, 9),
            frame_count=134,
        )

        self.assertEqual(
            progression,
            [
                {"frameOffset": 0, "frameIndex": 76, "label": "onset"},
                {
                    "frameOffset": 3,
                    "frameIndex": 79,
                    "label": "onset + 3 captured frames",
                },
                {
                    "frameOffset": 9,
                    "frameIndex": 85,
                    "label": "onset + 9 captured frames",
                },
            ],
        )


if __name__ == "__main__":
    unittest.main()
