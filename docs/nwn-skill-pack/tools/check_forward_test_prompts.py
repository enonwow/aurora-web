#!/usr/bin/env python3
"""Check no-answer-leak forward-test prompt packet integrity."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


EXPECTED_PROMPTS = {
    "FT-001": "ft-001-low-level-forest-area.txt",
    "FT-002": "ft-002-custom-spear-2da-hak-tlk.txt",
    "FT-003": "ft-003-nui-crafting-panel.txt",
    "FT-004": "ft-004-persistence-restart-safety.txt",
    "FT-005": "ft-005-release-review.txt",
    "FT-006": "ft-006-economy-progression.txt",
    "FT-007": "ft-007-quest-dialogue-journal.txt",
    "FT-008": "ft-008-feedback-contribution.txt",
    "FT-009": "ft-009-aurora-local-intake-boundary.txt",
    "FT-010": "ft-010-full-feature-server-slice.txt",
}
EXPECTED_REFERENCES = {
    "FT-001": {
        "locations-areas-tilesets.md",
        "creatures-encounters-ai.md",
        "items-equipment-loot.md",
        "testing-runtime-qa.md",
    },
    "FT-002": {
        "items-equipment-loot.md",
        "two-da-hak-tlk-pipeline.md",
        "nwscript-events-systems.md",
        "testing-runtime-qa.md",
    },
    "FT-003": {
        "nui-player-ui.md",
        "economy-crafting-progression.md",
        "nwscript-events-systems.md",
        "testing-runtime-qa.md",
    },
    "FT-004": {
        "persistence-database-nwnx.md",
        "nwscript-events-systems.md",
        "deployment-nwsync-ops.md",
        "testing-runtime-qa.md",
    },
    "FT-005": {
        "common-antipatterns.md",
        "two-da-hak-tlk-pipeline.md",
        "nui-player-ui.md",
        "locations-areas-tilesets.md",
        "testing-runtime-qa.md",
    },
    "FT-006": {
        "economy-crafting-progression.md",
        "items-equipment-loot.md",
        "creatures-encounters-ai.md",
        "testing-runtime-qa.md",
    },
    "FT-007": {
        "quests-dialogues-journal.md",
        "persistence-database-nwnx.md",
        "economy-crafting-progression.md",
        "testing-runtime-qa.md",
    },
    "FT-008": {
        "feedback-and-versioning.md",
        "nui-player-ui.md",
        "testing-runtime-qa.md",
    },
    "FT-009": {
        "source-registry.md",
        "feedback-and-versioning.md",
        "testing-runtime-qa.md",
        "common-antipatterns.md",
    },
    "FT-010": {
        "server-gamedev-capability-map.md",
        "feature-design-output-template.md",
        "locations-areas-tilesets.md",
        "items-equipment-loot.md",
        "creatures-encounters-ai.md",
        "two-da-hak-tlk-pipeline.md",
        "nwscript-events-systems.md",
        "nui-player-ui.md",
        "quests-dialogues-journal.md",
        "economy-crafting-progression.md",
        "persistence-database-nwnx.md",
        "deployment-nwsync-ops.md",
        "testing-runtime-qa.md",
    },
}
PROMPT_PREFIX = (
    "Use $nwn-server-gamedev at "
    "docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to "
)
FORBIDDEN_PROMPT_PATTERNS = [
    r"expected behavior",
    r"expected reference",
    r"success criteria",
    r"scoring rubric",
    r"\bscore (?:it|the answer)\b",
    r"\bpass\b.*\bpartial\b.*\bfail\b",
    r"[a-z0-9-]+\.md",
]
IMPLEMENTABLE_SLICE_FOCUS = (
    "Names a First Implementable Slice with files/assets touched, expected proof, "
    "rollback, and evidence limits."
)


@dataclass
class PromptCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_json(path: Path) -> dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def check_prompt_files(result: PromptCheck, root: Path) -> None:
    prompt_dir = root / "forward-tests" / "prompts"
    if not prompt_dir.is_dir():
        result.error(f"prompt directory is missing: {prompt_dir}")
        return

    actual_files = {path.name for path in prompt_dir.glob("*.txt")}
    expected_files = set(EXPECTED_PROMPTS.values())
    for name in sorted(expected_files - actual_files):
        result.error(f"expected prompt file is missing: {name}")
    for name in sorted(actual_files - expected_files):
        result.error(f"unexpected prompt file exists: {name}")
    if actual_files == expected_files:
        result.ok("prompt file set matches reviewer matrix test ids")

    for test_id, filename in EXPECTED_PROMPTS.items():
        path = prompt_dir / filename
        if not path.exists():
            continue
        text = read_text(path).strip()
        if text.startswith(PROMPT_PREFIX):
            result.ok(f"{test_id} prompt invokes the skill by path")
        else:
            result.error(f"{test_id} prompt does not start with the required skill invocation")
        if len(text.splitlines()) == 1:
            result.ok(f"{test_id} prompt is a single pasteable block")
        else:
            result.error(f"{test_id} prompt should be a single pasteable block")
        if "NWN" in text:
            result.ok(f"{test_id} prompt names NWN context")
        else:
            result.error(f"{test_id} prompt does not name NWN context")

        lowered = text.lower()
        for pattern in FORBIDDEN_PROMPT_PATTERNS:
            if re.search(pattern, lowered):
                result.error(
                    f"{test_id} prompt appears to leak reviewer guidance: {pattern}"
                )


def check_plan(result: PromptCheck, root: Path) -> None:
    plan_path = root / "forward-test-plan.md"
    if not plan_path.exists():
        result.error("forward-test-plan.md is missing")
        return
    text = read_text(plan_path)
    for test_id in EXPECTED_PROMPTS:
        if f"### {test_id}:" in text:
            result.ok(f"forward-test-plan.md lists {test_id}")
        else:
            result.error(f"forward-test-plan.md does not list {test_id}")
    required_tokens = [
        "Do not include the expected answer in the prompt.",
        "Give the agent under test only one prompt file.",
        "Forward-test records are evidence of skill behavior. They are not NWN domain facts by themselves.",
    ]
    for token in required_tokens:
        if token in text:
            result.ok(f"forward-test-plan.md includes guardrail: {token}")
        else:
            result.error(f"forward-test-plan.md is missing guardrail: {token}")


def check_tester_packet(result: PromptCheck, root: Path) -> None:
    packet_path = root / "forward-tests" / "tester-packet.md"
    if not packet_path.exists():
        result.error("forward-tests/tester-packet.md is missing")
        return
    text = read_text(packet_path)
    required_tokens = [
        "without leaking expected answers",
        "Give it exactly one prompt",
        "Do not paste the expected behavior",
        "Do not give it:",
        "expected reference list",
        "A forward-test record proves skill behavior in one session. It does not prove an NWN domain fact.",
        "tools/init_forward_test_capture.py",
        "tools/check_forward_test_return_captures.py --captures <returned-captures-dir>",
        "blank initialized capture sheets must fail this gate",
        "Do not score with reviewer-only material until `check_forward_test_return_captures.py` passes",
        "First Implementable Slice",
        "--first-implementable-slice",
    ]
    for token in required_tokens:
        if token in text:
            result.ok(f"tester packet includes guardrail: {token}")
        else:
            result.error(f"tester packet is missing guardrail: {token}")


def check_reviewer_matrix(result: PromptCheck, root: Path) -> None:
    matrix_path = root / "forward-tests" / "reviewer-matrix.json"
    if not matrix_path.exists():
        result.error("forward-tests/reviewer-matrix.json is missing")
        return

    try:
        matrix = load_json(matrix_path)
    except Exception as exc:
        result.error(f"reviewer matrix is invalid JSON: {exc}")
        return

    if matrix.get("schema_version") == "1":
        result.ok("reviewer matrix schema_version is 1")
    else:
        result.error("reviewer matrix schema_version must be '1'")
    purpose = matrix.get("purpose", "")
    if isinstance(purpose, str) and "Do not give this file to the agent under test." in purpose:
        result.ok("reviewer matrix labels itself as reviewer-only")
    else:
        result.error("reviewer matrix must warn not to give it to the agent under test")

    tests = matrix.get("tests")
    if not isinstance(tests, list):
        result.error("reviewer matrix tests must be a list")
        return

    by_id: dict[str, dict[str, object]] = {}
    for entry in tests:
        if not isinstance(entry, dict):
            result.error("reviewer matrix tests must contain objects")
            continue
        test_id = entry.get("test_id")
        if not isinstance(test_id, str):
            result.error("reviewer matrix entry is missing test_id")
            continue
        if test_id in by_id:
            result.error(f"reviewer matrix has duplicate test_id: {test_id}")
        by_id[test_id] = entry

    expected_ids = set(EXPECTED_PROMPTS)
    actual_ids = set(by_id)
    for test_id in sorted(expected_ids - actual_ids):
        result.error(f"reviewer matrix is missing {test_id}")
    for test_id in sorted(actual_ids - expected_ids):
        result.error(f"reviewer matrix has unexpected test id: {test_id}")
    if actual_ids == expected_ids:
        result.ok("reviewer matrix lists expected prompt-forward tests")

    for test_id in sorted(expected_ids & actual_ids):
        entry = by_id[test_id]
        prompt_file = entry.get("prompt_file")
        expected_prompt = f"forward-tests/prompts/{EXPECTED_PROMPTS[test_id]}"
        if prompt_file == expected_prompt:
            result.ok(f"reviewer matrix {test_id} prompt_file matches")
        else:
            result.error(
                f"reviewer matrix {test_id} prompt_file must be {expected_prompt!r}"
            )

        refs = entry.get("expected_references")
        if not isinstance(refs, list) or not all(isinstance(item, str) for item in refs):
            result.error(f"reviewer matrix {test_id} expected_references must be strings")
        elif set(refs) == EXPECTED_REFERENCES[test_id]:
            result.ok(f"reviewer matrix {test_id} expected references match")
        else:
            result.error(
                f"reviewer matrix {test_id} expected references drifted: {refs!r}"
            )

        focus = entry.get("review_focus")
        if isinstance(focus, list) and all(isinstance(item, str) and item for item in focus):
            result.ok(f"reviewer matrix {test_id} review_focus is present")
            if IMPLEMENTABLE_SLICE_FOCUS in focus:
                result.ok(f"reviewer matrix {test_id} requires a First Implementable Slice")
            else:
                result.error(
                    f"reviewer matrix {test_id} must require a First Implementable Slice "
                    "with files/assets, expected proof, rollback, and evidence limits"
                )
        else:
            result.error(f"reviewer matrix {test_id} review_focus is missing")


def check_record_templates(result: PromptCheck, root: Path) -> None:
    templates_path = root / "forward-tests" / "record-command-templates.md"
    if not templates_path.exists():
        result.error("forward-tests/record-command-templates.md is missing")
        return

    generator_path = root / "tools" / "generate_forward_test_record_templates.py"
    if not generator_path.exists():
        result.error("tools/generate_forward_test_record_templates.py is missing")
        return

    spec = importlib.util.spec_from_file_location("generate_forward_test_record_templates", generator_path)
    if spec is None or spec.loader is None:
        result.error(f"could not import record template generator: {generator_path}")
        return
    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        expected = module.generate(root)
        actual = templates_path.read_text(encoding="utf-8")
    except Exception as exc:
        result.error(f"record template freshness check failed: {exc}")
        return

    if actual == expected:
        result.ok("record command templates match reviewer matrix")
    else:
        result.error("forward-tests/record-command-templates.md is stale")

    required_tokens = [
        "## FT-010: Full Feature Server Slice",
        "docs\\nwn-skill-pack\\.codex-tmp\\forward-test-reviews\\full-slice-ft010\\ft-010-review.md",
    ]
    for token in required_tokens:
        if token in actual:
            result.ok(f"record templates include FT-010 worksheet token: {token}")
        else:
            result.error(f"record templates missing FT-010 worksheet token: {token}")


def check_reviewer_packet(result: PromptCheck, root: Path) -> None:
    packet_path = root / "forward-tests" / "reviewer-packet.md"
    if not packet_path.exists():
        result.error("forward-tests/reviewer-packet.md is missing")
        return

    generator_path = root / "tools" / "generate_forward_test_reviewer_packet.py"
    if not generator_path.exists():
        result.error("tools/generate_forward_test_reviewer_packet.py is missing")
        return

    spec = importlib.util.spec_from_file_location("generate_forward_test_reviewer_packet", generator_path)
    if spec is None or spec.loader is None:
        result.error(f"could not import reviewer packet generator: {generator_path}")
        return
    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        expected = module.generate(root)
        actual = packet_path.read_text(encoding="utf-8")
    except Exception as exc:
        result.error(f"reviewer packet freshness check failed: {exc}")
        return

    if actual == expected:
        result.ok("reviewer packet matches reviewer matrix")
    else:
        result.error("forward-tests/reviewer-packet.md is stale")

    required_reviewer_tokens = [
        "check_forward_test_return_captures.py",
        "--captures <returned-captures-dir>",
        "Do not score before the returned-capture check passes",
        "blank initialized capture sheets must fail this gate",
    ]
    for token in required_reviewer_tokens:
        if token in actual:
            result.ok(f"reviewer packet return-capture gate token exists: {token}")
        else:
            result.error(f"reviewer packet missing return-capture gate token: {token}")


def check_execution_queue(result: PromptCheck, root: Path) -> None:
    queue_path = root / "forward-tests" / "execution-queue.md"
    if not queue_path.exists():
        result.error("forward-tests/execution-queue.md is missing")
        return

    generator_path = root / "tools" / "generate_forward_test_execution_queue.py"
    if not generator_path.exists():
        result.error("tools/generate_forward_test_execution_queue.py is missing")
        return

    spec = importlib.util.spec_from_file_location("generate_forward_test_execution_queue", generator_path)
    if spec is None or spec.loader is None:
        result.error(f"could not import execution queue generator: {generator_path}")
        return
    module = importlib.util.module_from_spec(spec)
    try:
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        expected = module.generate(root)
        actual = queue_path.read_text(encoding="utf-8")
    except Exception as exc:
        result.error(f"execution queue freshness check failed: {exc}")
        return

    if actual == expected:
        result.ok("execution queue matches reviewer matrix and records")
    else:
        result.error("forward-tests/execution-queue.md is stale")

    required_queue_tokens = [
        "check_forward_test_return_captures.py",
        "--captures <returned-captures-dir>",
        "blank initialized capture sheets must fail this gate",
        "Use `forward-tests/reviewer-packet.md` only after the returned-capture check passes.",
    ]
    for token in required_queue_tokens:
        if token in actual:
            result.ok(f"execution queue return-capture gate token exists: {token}")
        else:
            result.error(f"execution queue missing return-capture gate token: {token}")


def run(root: Path) -> PromptCheck:
    result = PromptCheck()
    check_prompt_files(result, root)
    check_plan(result, root)
    check_tester_packet(result, root)
    check_reviewer_matrix(result, root)
    check_reviewer_packet(result, root)
    check_execution_queue(result, root)
    check_record_templates(result, root)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true", help="Emit JSON report.")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Forward-test prompt check failed: {len(result.errors)} error(s)")
        else:
            print("Forward-test prompt check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
