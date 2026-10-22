# Aurora reverse documentation

Use the [repository documentation map](../../../docs/README.md) for ownership
and cross-project rules. This directory owns detailed Aurora/native findings,
domain contracts, proof standards and evidence lineage.

## Read by purpose

| Purpose | Entry point |
| --- | --- |
| Area implementation context | [Areas context](areas-context-pack.md) and [Area program audit](area-program-completion-audit-2026-08-21.md) |
| VFX context and knowledge gaps | [VFX context](vfx-context-pack.md) and [Aurora-first readiness](vfx-aurora-first-implementation-readiness-r90.md) |
| Native operation | [Operating standard](aurora-toolset-operating-standard.md) |
| Build and owned session closure | [Module rebuild standard](aurora-toolset-rebuild-standard.md) |
| Proof acceptance | [Capture safety contract](proof-capture-safety-contract-2026-07-10.md) |
| Stage completion | [Usage roadmap](aurora-toolset-usage-standards-roadmap-2026-07-14.md) and its validators |
| Runtime execution | [AUR-S07 standard](aur-s07-runtime-execution-standard.md), including the separate [per-window observation method](aur-s07-runtime-execution-standard.md#discriminated-per-window-observation) |
| Audit deliverables | [Audit artifact policy](audit-artifact-policy.md) |
| Diagnostic events | [Observability taxonomy](observability-event-taxonomy-spec-r63.md) |

## Evidence boundaries

`evidence/`, `artifacts/`, proof profiles, function manifests and external
paths cited by audits can be data dependencies even when ignored by Git.
Retain required original observations and active inputs. Review historical
materializations individually: an identical staged input or restored database
can be retired after its canonical bytes and replay recipe are verified.
`Proof` and `frozen` labels do not grant indefinite retention to every copy.
See [retention guidance](../../../docs/maintenance.md) and the
[2026-10-02 retirement record](../../../docs/audits/disk-cleanup-2026-09-29/retirement-2026-10-02.md).

Context packs and dated reports are navigation and historical evidence. The
applicable versioned contract and the bound artifacts determine a claim;
neither this index nor successful file cleanup upgrades a proof status.
