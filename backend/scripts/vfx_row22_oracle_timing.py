from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any


MISSING_TIMELINE_STATUS = "unavailable-capture-frame-timestamps-missing"


def _required_number(value: Any, field: str) -> float:
    if not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be numeric")
    return float(value)


def audit_oracle_timing(
    validated_summary: Mapping[str, Any],
    capture_summary: Mapping[str, Any],
) -> dict[str, Any]:
    lifecycle = validated_summary.get("lifecycle")
    runtime = capture_summary.get("runtime")
    if not isinstance(lifecycle, Mapping) or not isinstance(runtime, Mapping):
        raise ValueError("validated lifecycle and capture runtime are required")

    validated_frame_count = int(
        _required_number(lifecycle.get("frameCount"), "lifecycle.frameCount")
    )
    capture_frame_count = int(
        _required_number(runtime.get("frames"), "runtime.frames")
    )
    if validated_frame_count != capture_frame_count:
        raise ValueError(
            "capture frame count mismatch: "
            f"validated={validated_frame_count}, capture={capture_frame_count}"
        )

    sparse_elapsed_fields = {
        name: _required_number(runtime.get(name), f"runtime.{name}")
        for name in ("firstGameplay", "midElapsed", "bestElapsed")
        if runtime.get(name) is not None
    }
    frame_timestamps = runtime.get("frameTimestamps")
    if not isinstance(frame_timestamps, list) or len(frame_timestamps) != capture_frame_count:
        return {
            "status": MISSING_TIMELINE_STATUS,
            "sourceClass": "primary-retail-capture",
            "captureFrameCount": capture_frame_count,
            "encodedFps": _required_number(lifecycle.get("fps"), "lifecycle.fps"),
            "canMapRuntimeTimeToVideoPts": False,
            "canCompareRuntimeDurations": False,
            "sparseElapsedFields": sparse_elapsed_fields,
            "sparseElapsedFieldsAreFrameTimeline": False,
            "diagnosticCodes": [
                "VFX_RETAIL_CAPTURE_FRAME_TIMESTAMPS_MISSING",
                "VFX_RETAIL_CAPTURE_PTS_NOT_RUNTIME_TIME",
            ],
            "explanation": (
                "The capture wrote acquired frames at a fixed encoded FPS without "
                "persisting one runtime timestamp per frame. Sparse elapsed fields "
                "cannot reconstruct the missing timeline."
            ),
        }

    normalized_timestamps = [
        _required_number(value, f"runtime.frameTimestamps[{index}]")
        for index, value in enumerate(frame_timestamps)
    ]
    if any(
        current <= previous
        for previous, current in zip(normalized_timestamps, normalized_timestamps[1:])
    ):
        raise ValueError("runtime.frameTimestamps must be strictly increasing")

    return {
        "status": "exact-per-frame-capture-timestamps-available",
        "sourceClass": "primary-retail-capture",
        "captureFrameCount": capture_frame_count,
        "encodedFps": _required_number(lifecycle.get("fps"), "lifecycle.fps"),
        "canMapRuntimeTimeToVideoPts": True,
        "canCompareRuntimeDurations": True,
        "sparseElapsedFields": sparse_elapsed_fields,
        "sparseElapsedFieldsAreFrameTimeline": False,
        "frameTimestamps": normalized_timestamps,
        "diagnosticCodes": [],
    }


def build_frame_progression(
    onset_frame_index: int,
    frame_offsets: Iterable[int],
    frame_count: int,
) -> list[dict[str, int | str]]:
    if onset_frame_index < 0 or onset_frame_index >= frame_count:
        raise ValueError("onset frame index is outside the encoded video")

    progression: list[dict[str, int | str]] = []
    for raw_offset in frame_offsets:
        offset = int(raw_offset)
        if offset < 0:
            raise ValueError("frame offsets must be non-negative")
        frame_index = onset_frame_index + offset
        if frame_index >= frame_count:
            raise ValueError(
                f"frame progression exceeds encoded video: frameIndex={frame_index}"
            )
        progression.append(
            {
                "frameOffset": offset,
                "frameIndex": frame_index,
                "label": (
                    "onset"
                    if offset == 0
                    else f"onset + {offset} captured frames"
                ),
            }
        )
    return progression
