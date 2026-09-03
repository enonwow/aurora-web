# Stale Build Module Session: Targeted Close Contract

Status: `central close route / explicit owner authorization required`

This contract applies only to the known, stalled Toolset state with exactly one
responsive `nwtoolset.exe`, one `TfrmFrame`, and one visible
`TdlgVerifyModule` titled `Build Module`. It is not a recovery, retry, modal
confirmation, or generic process-kill mechanism.

## Authorization

The owner must explicitly authorize closing the exact PID. The authorization
text supplied to the command must contain both a close instruction and that
PID; a blocker, timeout, or stale status is never authorization.

## Public entrypoint

```powershell
node backend/scripts/close-aurora-toolset-stale-build-session.mjs `
  --expectedPid <exact-pid> `
  --userAuthorizedClose true `
  --closeAuthorization '<verbatim owner authorization that names this PID>'
```

Before posting anything, the route reads the current windows and rejects the
command unless the exact PID is the sole responding Toolset process and its
visible modal identity is `TdlgVerifyModule / Build Module`. It delegates to
the verified close atom with `--expectedPid`; the atom posts `WM_CLOSE` only to
the validated Toolset frame and waits for process disappearance. It never uses
global input, `Stop-Process`, forced termination, `Yes`/`Tak`, `Cancel`, or a
save/build confirmation.

`close_pending` is a durable failed close result, not permission to retry or
force-kill. Preserve its returned window/process evidence and obtain a new
owner decision for any further action.
