# Common Antipatterns

Source Status: docs-informed from the domain references and `testing-runtime-qa.md`; project-specific severity still depends on the target server.

## General Antipatterns

- Treating design text as implemented content.
- Adding placeholders and calling them launch-ready.
- Calling `docs-verified` facts `runtime-tested`.
- Treating one happy-path local test as release proof.
- Hiding exact blockers behind "needs more polish" or "probably works".
- Shipping without rollback notes or a way to identify which version is live.
- Promoting Claude, Opus, Codex, forum, or memory claims into official references without source labels.
- Turning one server's house rules into general NWN guidance without `project-specific`.

## NWN Content Antipatterns

- Designing locations without transition, walkability, camera/readability, spawn, and return-path tests.
- Treating a Toolset area screenshot as proof that the route works in the client.
- Balancing encounters from Challenge Rating alone.
- Adding creatures without faction, perception, OnSpawn, OnDeath, reward, reset, and load tests.
- Designing loot without full-inventory, stack, identified/unidentified value, vendor, and duplicate-safety tests.
- Creating shop inventory without finite/infinite stock policy, max buy price policy, and transaction tests.
- Designing economy from rewards only, without mapping faucets, sinks, repeatables, exploits, and telemetry.
- Designing crafting from recipes only, without failed craft, cost removal, component loss, output ownership, and full-inventory tests.

## Script And Data Antipatterns

- Editing 2DA without row ownership or rollback.
- Writing NWScript without event context.
- Assuming `OBJECT_SELF` is the player, speaker, item, or target without checking the exact event.
- Storing object references and later comparing only to `OBJECT_INVALID` instead of proving the object is still valid when needed.
- Using delayed commands on objects that may be destroyed or transition away without a recovery path.
- Calling direct craft or reward helpers without re-checking prerequisites at action time.
- Treating script compilation as proof that event accessors, caller context, or object ownership are correct.
- Editing TLK/StringRefs without row ranges, localization impact, and clean-client delivery checks.
- Changing HAK order or contents without checking override precedence and module-vs-HAK resource ownership.

## NUI And UI Antipatterns

- Building NUI without refresh and lifecycle testing.
- Giving widgets no stable `NuiId` and then expecting events.
- Reusing window ids without understanding close/reopen behavior.
- Mutating watched binds recursively.
- Verifying UI only as one player, with no close/reopen/disconnect or duplicate-window path.

## Persistence And Ops Antipatterns

- Using locals, campaign DB, built-in SQLite, and NWNX SQL interchangeably.
- Designing persistence without relog, restart, crash/rollback, migration, and stale-object tests.
- Assuming NWNX functions exist on a vanilla server.
- Forgetting that NWNX plugin loading and log levels depend on startup environment variables.
- Publishing NWSync or HAK/TLK changes without clean-client verification.
- Pruning or replacing NWSync content before current and rollback manifests are known.
- Leaving debug spam active in live logs without a test flag or live telemetry policy.

## Knowledge-Pack Antipatterns

- Copying model-generated claims into reference docs without evidence.
- Letting feedback records bypass review and directly overwrite official references.
- Mixing `community-example`, `strong-community`, `primary`, and `local-runtime` sources without labels.
- Adding large reference dumps to `SKILL.md` instead of routing them through concise `references/` files.
- Creating skill docs that explain the project history instead of giving future agents executable workflows.
- Using heartbeat scripts for systems that should be event-driven.

## Review Prompt

When reviewing a NWN feature, ask:

1. What would a player, DM, builder, or operator actually observe in game?
2. Which exact artifact proves that observation?
3. What path still lacks proof: compile, runtime, multiplayer, persistence, packaging, rollback, or live monitoring?
4. What label should the claim carry right now: `design-only`, `static-checked`, `compiled`, `instrumented`, `runtime-tested`, `regression-tested`, `live-verified`, `docs-verified`, `project-specific`, or `unverified`?
