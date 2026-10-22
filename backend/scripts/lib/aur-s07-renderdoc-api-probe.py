import json
import os
import sys
import traceback
from datetime import datetime, timezone


output_path = os.environ.get("AURORA_RENDERDOC_PROBE_OUT")
timeline_path = os.environ.get("AURORA_RENDERDOC_PROBE_TIMELINE")
error_path = os.environ.get("AURORA_RENDERDOC_PROBE_ERROR")
stage = "script_entered"


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def mark(name):
    if not timeline_path:
        return
    with open(timeline_path, "a", encoding="utf-8") as timeline:
        timeline.write(json.dumps({"atUtc": utc_now(), "stage": name}, sort_keys=True))
        timeline.write("\n")
        timeline.flush()
        os.fsync(timeline.fileno())


try:
    mark(stage)
    stage = "environment_validation"
    if not output_path:
        raise RuntimeError("AURORA_RENDERDOC_PROBE_OUT is required")
    if not timeline_path:
        raise RuntimeError("AURORA_RENDERDOC_PROBE_TIMELINE is required")
    if not error_path:
        raise RuntimeError("AURORA_RENDERDOC_PROBE_ERROR is required")
    mark("environment_validated")

    stage = "renderdoc_global_query"
    mark(stage)
    rd = globals().get("renderdoc")
    if rd is None:
        raise RuntimeError("embedded renderdoc module is unavailable")
    mark("renderdoc_global_available")

    stage = "api_query"
    mark(stage)
    interesting_names = [
        "CaptureOptions",
        "CreateTargetControl",
        "GraphicsAPI",
        "InjectIntoProcess",
        "OpenCaptureFile",
        "ResultCode",
        "ShaderStage",
    ]
    result = {
        "version": "aur-s07-renderdoc-api-probe/v2",
        "module": str(rd),
        "available": {name: hasattr(rd, name) for name in interesting_names},
        "graphicsApis": [name for name in dir(rd.GraphicsAPI) if not name.startswith("_")]
        if hasattr(rd, "GraphicsAPI") else [],
    }
    mark("api_query_complete")

    stage = "result_write"
    mark(stage)
    with open(output_path, "x", encoding="utf-8") as output:
        json.dump(result, output, indent=2, sort_keys=True)
        output.write("\n")
        output.flush()
        os.fsync(output.fileno())
    mark("result_write_complete")
except BaseException as error:
    mark("exception")
    if error_path:
        receipt = {
            "version": "aur-s07-renderdoc-api-probe-error/v1",
            "atUtc": utc_now(),
            "stage": stage,
            "errorType": type(error).__name__,
            "errorMessage": str(error),
            "traceback": traceback.format_exc(),
        }
        with open(error_path, "x", encoding="utf-8") as output:
            json.dump(receipt, output, indent=2, sort_keys=True)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
    raise

sys.exit(0)
