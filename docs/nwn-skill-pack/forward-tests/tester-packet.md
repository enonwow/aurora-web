# NWN Skill Forward-Test Packet

## Purpose

Use this packet to test whether `nwn-server-gamedev` helps a fresh Codex session solve realistic NWN server-gamedev tasks without leaking expected answers.

The prompt files are for the agent under test. This packet and the scoring rubric are for the tester or maintainer only.

## Tester Workflow

1. Open a fresh Codex thread or another clean model session.
2. Give it exactly one prompt from `forward-tests/prompts/`.
3. Do not paste the expected behavior from `forward-test-plan.md`.
4. Fill a returned capture sheet with the raw answer and session facts using `forward-tests/answer-capture-template.md`.
   Optional helper: initialize the sheet with `tools/init_forward_test_capture.py`.
5. Run `tools/check_forward_test_return_captures.py --captures <returned-captures-dir>` before opening reviewer-only materials; blank initialized capture sheets must fail this gate.
6. Only after the returned-capture check passes, score it as `pass`, `partial`, or `fail`.
7. Create a forward-test record with `tools/forward_test_record.py`.
8. Validate the record and regenerate `forward-tests/aggregate.md`.
9. If the answer reveals reusable NWN knowledge, create a separate feedback record with `tools/nwn_skill_feedback.py`.

## What The Agent Under Test Should Receive

Only paste one file from:

```text
docs/nwn-skill-pack/forward-tests/prompts/
```

Maintainers should validate this prompt packet before handoff:

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_prompts.py docs\nwn-skill-pack
```

Initialize a blank capture sheet without reviewer-only data:

```powershell
python docs\nwn-skill-pack\tools\init_forward_test_capture.py docs\nwn-skill-pack --test-id FT-003
```

Use `forward-tests/reviewer-matrix.json` and `forward-tests/record-command-templates.md` only after the agent answers. They contain expected references and record scaffolds, so they are reviewer-only.

Use `forward-tests/answer-capture-template.md` before opening reviewer-only material. If the tester saw reviewer-only material before capture, mark the run as contaminated and do not count it as independent prompt-forward-test evidence.

Validate filled returned captures before scoring:

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_return_captures.py docs\nwn-skill-pack --captures <returned-captures-dir>
```

Do not score with reviewer-only material until `check_forward_test_return_captures.py` passes on filled returned capture sheets.

Do not give it:

- this tester packet,
- `forward-tests/reviewer-matrix.json`,
- `forward-tests/record-command-templates.md`,
- `forward-test-plan.md`,
- `forward-test-results.md`,
- prior test results,
- your suspected failure mode,
- the expected reference list.

## Scoring Rubric

Use `pass` when the answer:

- routes to the relevant domain references or names them,
- produces a concrete design, plan, table, checklist, script outline, release review, or feedback record,
- labels evidence status,
- separates NWN facts from project-specific assumptions,
- asks for missing project facts instead of inventing them,
- includes runtime QA or an exact blocker,
- names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits,
- avoids claiming implementation or release readiness without evidence.

Use `partial` when the answer is useful but misses one important part, such as a reference lane, evidence label, rollback path, runtime test, or contribution step.

Use `fail` when the answer:

- claims a module feature exists without a module/runtime artifact,
- treats compile/static checks as runtime proof,
- treats NWNX-only behavior as vanilla NWN,
- promotes unverified model/forum/user claims as general truth,
- skips rollback or packaging impact for custom-content or release tasks.

## Record Command Shape

Record schema:

```text
docs/nwn-skill-pack/forward-tests/schema/forward-test-record.schema.json
```

For plugin install or local marketplace checks, use:

```text
docs/nwn-skill-pack/forward-tests/install-smoke-checklist.md
```

Do not score an install smoke as NWN domain correctness. It only proves that the package can be registered and the skill can be seen or invoked in a new Codex context.

Example:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-003 `
  --title "NUI crafting panel fresh-thread test" `
  --result partial `
  --tester "maintainer" `
  --context "fresh Codex thread, no expected-answer leakage" `
  --prompt-or-command "@docs/nwn-skill-pack/forward-tests/prompts/ft-003-nui-crafting-panel.txt" `
  --expected-reference nui-player-ui.md `
  --expected-reference economy-crafting-progression.md `
  --expected-reference nwscript-events-systems.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference nui-player-ui.md `
  --evidence-label design-only `
  --evidence "Included event flow and bind lifecycle." `
  --issue "Did not include relog test." `
  --missing-evidence "No runtime screenshot or server log." `
  --first-implementable-slice `
  --improvement-needed `
  --improvement-summary "Tighten NUI reference to require close/reopen/relog tests."
```

Then run:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records\<record>.json
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
```

## Promotion Boundary

A forward-test record proves skill behavior in one session. It does not prove an NWN domain fact. Promote reusable NWN knowledge only through a reviewed `nwn_skill_feedback.py` record.
