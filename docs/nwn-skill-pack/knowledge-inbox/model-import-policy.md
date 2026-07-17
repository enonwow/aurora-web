# Model Import Policy

## Purpose

Define how to ingest NWN server gamedev knowledge proposed by other AI models, including Claude, Opus, Codex sessions, or any other model, without treating model output as verified NWN knowledge.

Model output can be useful as a lead. It is not trusted guidance until a maintainer verifies it against documentation, source code, Toolset behavior, server/client runtime behavior, logs, or a controlled test module.

## Accepted Source Types

Use these feedback record source types for model-originated material:

- `claude-opus-import`: output copied or summarized from Claude or Opus.
- `model-suggestion`: output from any other AI model or unknown model.
- `codex-session`: output from a Codex session that is being preserved as a suggestion.

Use the weakest honest status:

- `unverified` for ordinary model output.
- `project-specific` only if the model output describes a real named project observation supplied by a human, and the project-specific boundary is preserved.
- `docs-verified` only after a maintainer checks the claim against an accepted source lane.
- `runtime-verified` only after a maintainer checks behavior in Toolset, client, server runtime, logs, or a controlled test module.

Do not use model agreement as verification. Multiple models repeating the same claim is still `unverified` unless supported by documentation or runtime evidence.

## Privacy And Copyright Guardrails

Before importing model output, remove:

- credentials,
- tokens,
- IP addresses,
- account names,
- private player data,
- private module files or names unless explicitly approved,
- private server logs unless redacted,
- private Discord/forum transcripts unless the source permits sharing.

Do not import full private transcripts when a concise summary and evidence pointer are enough. Keep one focused claim per feedback record.

## Import Shape

Every imported model claim should include:

- model/source name when known,
- prompt or task summary,
- short output summary,
- exact NWN domain,
- proposed target reference file,
- what would verify or falsify the claim,
- known missing evidence,
- privacy scrub note.

## Command Shape

Create an incoming record:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py new `
  --out docs\nwn-skill-pack\knowledge-inbox\incoming `
  --domain nwscript `
  --title "Claude suggested DelayCommand cleanup caveat for dynamic spawns" `
  --summary "Model output suggested a delayed cleanup pattern for spawned encounters; this is a hypothesis until checked against NWScript docs and runtime logs." `
  --source-type claude-opus-import `
  --status unverified `
  --nwn-version "NWN:EE <version or unknown>" `
  --server-context "Imported from external model answer; no runtime proof yet." `
  --evidence "Prompt summary and redacted model output summary. No docs/runtime evidence yet." `
  --runtime-steps "Compile and run a controlled spawn/despawn test if the claim is promoted." `
  --failure-mode "Delayed command may run in the wrong context or after object destruction." `
  --proposed-file "references/nwscript-events-systems.md" `
  --proposed-summary "Add a guarded note only if docs or runtime evidence confirms the cleanup caveat." `
  --notes "Model agreement is not verification; keep unverified until checked."
```

Validate:

```powershell
python docs\nwn-skill-pack\tools\nwn_skill_feedback.py validate docs\nwn-skill-pack\knowledge-inbox\incoming
```

Regenerate triage:

```powershell
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
```

## Maintainer Review Rules

Reject or hold when:

- the claim has no source beyond model text,
- the target reference file is unclear,
- the claim affects runtime behavior but has no test path,
- the material contains private or unredacted data,
- the model output is broad essay text that cannot become one focused lesson.

Promote only when:

- the reusable lesson is concise,
- evidence label is preserved,
- source lane or runtime proof is recorded,
- both authoring and plugin-packaged skill references are updated,
- release readiness, package inventory, and release gates are regenerated.

## Verified Boundary

Verified locally:

- `nwn_skill_feedback.py` supports `claude-opus-import`, `model-suggestion`, and `codex-session` source types.
- `feedback-record.schema.json` is checked against the feedback CLI contract.
- `check_model_import_policy.py` checks this policy against the local feedback CLI vocabulary.

Still hypothesis until reviewed:

- Any imported model claim about NWN, NWScript, NUI, 2DA, HAK, TLK, Toolset behavior, server runtime, or player-facing design.
- Any claim that a model-suggested pattern improves the skill before prompt forward tests or runtime evidence exists.
