# Audit Artifact Policy

## Rule

A substantive audit is not complete until its conclusions are saved in a repo-local file. A chat response alone is not an audit artifact.

The artifact exists so later threads can recover:

- what was inspected and why;
- which Aurora/decompilation evidence was used;
- which implementation paths were covered;
- what is complete, partial, missing, or unproven;
- which risks and regressions were found;
- which commands, tests, captures, and proof files support the result;
- what earlier work omitted and why;
- the ordered remediation plan and acceptance gates.

## Location

Aurora reverse-engineering audits belong under `backend/docs/aurora-reverse/`. Use a descriptive, dated filename when the audit is a point-in-time assessment. Other subsystems should use their established documentation directory, or `docs/audits/` when no better durable location exists.

## Completion gate

Before reporting an audit as complete:

1. Save or update the audit artifact.
2. Separate confirmed evidence from inference and local-only proof.
3. Keep unresolved and untested items explicit.
4. Record exact verification results and artifact paths.
5. Link the audit file in the final response.


If the requested audit cannot be written, report that as a blocker instead of presenting the chat summary as the durable result.
