# Aurora Web: Codex guidance

## Canonical project rules

- Before every non-trivial investigation, design decision, implementation, or
  long reasoning pass, read and apply the canonical project rules at
  `C:\Projects\ai-documentations\aurora-web\rules\README.md`.
- Run its mandatory pre-flight gates: rules-first, Aurora-first,
  no-guessing, contract-first when a feature crosses the backend/frontend
  boundary, test-first, diagnosability-first, and external-GPL-source review.
- Aurora-first means that every task must first classify whether it depends on
  an unknown Aurora semantic. If it does, reverse/decompile research and a
  documented audit are required before implementation. Do not run a full
  decompilation audit for a task that does not touch Aurora behavior.
- xoreos is a GPL-3.0 secondary format/naming reference only. Before using it,
  read `C:\Projects\ai-documentations\aurora-web\rules\xoreos-gpl-secondary-reference-policy.md`.
  Do not copy, port, translate, structurally mirror, link, bundle, or use
  xoreos code as Aurora runtime authority.
- Task-specific Markdown references are listed in the canonical rules'
  `Mandatory Pre-flight Reference Map`; read the referenced document whenever
  the task activates that rule.

## Required skill use

- For every operation involving `nwtoolset.exe`, NWN, Toolset windows, module
  or Area opening, use `$aurora-toolset-operate`.
- For Toolset content creation or mutation, additionally use
  `$aurora-toolset-author`.
- For proof, screenshots/video, runtime verification, audits, or completion
  claims, additionally use `$aurora-toolset-prove`.
- Before implementing, inspect the skills available in the current session and
  use every skill that clearly matches the task. Read its `SKILL.md` before
  acting and follow its workflow.
- For browser-driven changes, runtime debugging, or visual proof, prefer the
  applicable browser, Playwright, screenshot, or proof-related skill instead
  of an improvised substitute. Record the resulting artifact or blocker.
- If no available skill fits, proceed with the smallest reliable native
  workflow and state that limitation in the proof or handoff.

## Runtime proof and tile rendering

- For iterative local UI debugging, use `$playwright-interactive` when its persistent-browser prerequisites are available. Keep one browser session across renderer changes so a proof can be inspected before and after each mutation.
- Treat `$playwright-interactive` as a debugging aid, never as proof on its own. Accepted proof must still satisfy `backend/docs/aurora-reverse/proof-capture-safety-contract-2026-07-10.md`: fresh requested state, fully settled contracts, zero unexpected failed or bridge tiles, and a saved exact capture artifact.
- If the persistent browser capability is unavailable, use the guarded CDP harness. Do not substitute an arbitrary desktop screenshot for a runtime canvas proof.

## Scope discipline

- Keep CUD and tileset-rendering changes separate from unrelated dirty worktree changes.
- Do not report an Area as `complete` merely because model contracts loaded; visual coverage and freshness gates must also pass.

## Resource-safe test execution

- Mutation tests are strictly optional and opt-in. Do not run Stryker,
  `test:mutation` scripts, `npx stryker`, `npm exec stryker`, or direct Stryker
  binaries unless the user explicitly requests mutation testing in the current
  task.
- Requests to implement, test, verify, finish, or prepare work for merge do not
  implicitly authorize mutation testing. Use the required unit, regression,
  integration, and task-specific tests instead.
- When mutation testing is explicitly requested, run one targeted mutation job
  at a time with concurrency `1`; do not run broad mutation suites in parallel.
- Repository mutation scripts require `AURORA_MUTATION_TESTS=1` and a global
  mutation lock. Do not bypass that wrapper with direct Stryker invocation.
- Every agent that starts a long-running test runner, watcher, or development
  server owns its complete process tree and must stop it when the task, command,
  proof, or interruption ends. Reuse an existing healthy server instead of
  starting a duplicate.
- Use one agent by default. Spawn at most two concurrent agents only when the
  user explicitly requests delegation or parallel agent work.
- Use at most two Jest/Vitest workers. Repository test scripts cap the Node heap
  at 1 GB; do not bypass them with bare `jest`, `vitest`, `npx`, or `npm exec`.
  Prefer focused one-shot tests during iteration and run the full required
  unit/regression gates once at handoff.
- Do not use `test:watch`, `start:dev`, or a Vite development server for bounded
  checks. When a runtime server is required, keep it attached to a supervisor;
  detached or unreferenced child processes are prohibited.
- Repository frontend `dev` and backend `start:dev` scripts use the managed
  service runner. Do not bypass it: it permits at most one backend family and
  one frontend family for the entire repository regardless of alias or port,
  caps each managed Node child heap at 1 GB, and terminates the owned process
  tree with its parent.
- Only one browser proof capture may run for the entire repository. Every Node
  capture script that launches Chrome must use the global proof-capture lock;
  parallel capture lanes and direct Chrome launch bypasses are prohibited.
