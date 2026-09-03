# Existing placeable `OnUsed` offline verification — 2026-08-17

This evidence packet closes the automated offline verification pass for the
bounded existing-instance `OnUsed` mutation. The machine-readable source of
truth is `offline-verification-summary.json`.

The focused backend gate passes 563/563 tests, the focused frontend gate passes
33/33 tests, Area Update integration passes 20/20 tests, both production builds
pass, and both focused mutation reports kill 100% of active mutants.

The full repository regression is not green. The failures are retained in the
summary rather than hidden or rewritten as part of this slice. They concern
other dirty-worktree contracts and fixtures, including derived-model cache
paths, expanded Area family counts, runtime bootstrap wiring, coordinate and
renderer behavior, and workspace/application-shell expectations.

This is not live certification. The prior accepted Toolset/NWN packet proves
the native field identity and runtime effect, but a fresh Aurora Web generated
candidate still needs exact Toolset Save/Build/reopen and NWN proof.
