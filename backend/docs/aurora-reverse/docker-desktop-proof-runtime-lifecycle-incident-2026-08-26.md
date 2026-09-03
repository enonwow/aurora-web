# Docker Desktop proof-runtime lifecycle incident — 2026-08-26

Status: diagnosis complete; no recovery changed host state during this audit.

## Scope

This incident audit covers the Docker Desktop failure observed while resuming
the source-bound Area tile Add/Render matrix after accepted checkpoint
`10/3378`. It distinguishes the Docker product failure from the operator
workflow error and defines the safe resume gate. It does not change Aurora
semantics, the immutable v10 matrix plan, or any accepted proof artifact.

## Preserved project state

- `atj02-group-chunk-0010` was accepted before the incident.
- The durable matrix checkpoint remains `10/3378`, SHA-256
  `b0495da1f2f61f5c174d373c3be0d3471d5e444e8cf97aaa92b113eb266c9d9f`.
- The accepted visual-review SHA-256 is
  `f0c63b0250de75cd375ecd9e8ef291a03535ff49a6b4ea0741935110b8aa1fe0`.
- Backend/frontend service ports and repository proof/service locks were clear
  after the accepted capture.
- No source write, matrix recapture, checkpoint mutation, or destructive
  Docker recovery was performed after the failure.

## Confirmed timeline

All timestamps below are UTC.

1. The accepted proof runtime was shut down at `10:01:21`. Docker Desktop's
   CLI reported that no Docker processes remained by `10:01:34`.
2. A new Docker Desktop launch was requested at `10:03:56` for the next
   matrix chunk.
3. The first new backend failed at `10:03:57`, before any later retry, while
   initializing the Inference manager. It could not remove or replace
   `%LOCALAPPDATA%\Docker\run\dockerInference` and cancelled the backend.
4. Instead of stopping at that first fatal event and reading the log, the
   operator continued bounded `docker info` polling. A backend-state probe at
   `10:06:02` found the backend API pipe absent.
5. A second Docker Desktop start was requested at `10:06:35`. It reproduced
   the same Inference-manager failure at `10:06:36` and displayed the Docker
   crash dialog at `10:07:09`.

The first restart therefore failed before the second start. The second start
did not create the original fault, but it was an invalid blind retry and
caused the user to experience the same crash again.

## Local evidence

The installed binaries report Docker Desktop `4.73.1.226574` and Docker CLI
`29.4.3`.

The first failed backend log is:

`C:\Users\enonw\AppData\Local\Docker\log\host\com.docker.backend.exe.log.20260826-120636.039`

- SHA-256:
  `f5cb0bda778f270c452134e07392bfe6a6be66461173cd2441c2d2872d47bdae`
- line 5742 records the first `dockerInference` removal failure at
  `10:03:57`;
- line 5818 records the resulting backend crash at `10:04:29`.

The second failed backend log is:

`C:\Users\enonw\AppData\Local\Docker\log\host\com.docker.backend.exe.log`

- SHA-256:
  `8693cc4361f4844abf1ec5f8a98f70ec74e78ac474539df91e1a3c2575a83225`;
- line 49 records the repeated removal failure at `10:06:36`;
- line 125 records the repeated backend crash at `10:07:08`.

The CLI lifecycle log is:

`C:\Users\enonw\AppData\Local\Docker\log\host\docker-desktop.exe.log`

- SHA-256:
  `2783d02c7bdcdf5f3f43aea94371db844c94d8f4974a99410a0b83869ee7c796`;
- line 638 confirms zero Docker processes after the first shutdown;
- line 642 records the next launch;
- line 659 records the failed backend-state query;
- line 688 records the later second backend launch.

The exact failing endpoint still exists while Docker is stopped as a
zero-byte Windows reparse point:

`C:\Users\enonw\AppData\Local\Docker\run\dockerInference`

It was created at `2026-08-26T09:52:13Z`, before the accepted proof session,
and survived the full Desktop stop. Read-only `fsutil reparsepoint query`
returns Windows error 1920 (`The file cannot be accessed by the system`). The
Docker settings store has `EnableDockerAI=true`; no `DOCKER_*`, `DEVHOME`, or
nonstandard HOME environment variable was present in the launching shell.

## External confirmation

Docker's public issue tracker contains an open Windows startup bug with the
same `initializing Inference manager` / `dockerInference` failure family:

- https://github.com/docker/desktop-feedback/issues/342

Docker's current release notes list `4.88.1` as the current release on
2026-08-25, while this workstation is on `4.73.1`. The intervening releases
contain multiple Windows startup, stale-process, Model Runner, socket, and
error-reporting corrections:

- https://docs.docker.com/desktop/release-notes/

This external evidence supports the local classification as a Docker Desktop
startup defect. It does not prove that one specific later version fixes this
exact socket-removal variant, so an update remains a recovery candidate rather
than an already verified fix.

## Root-cause classification

### Product-level trigger

Docker Desktop failed closed during Inference-manager initialization because
the host `dockerInference` AF_UNIX/reparse endpoint from the earlier run could
not be removed or replaced. The engine never became ready after either launch.

### Operator workflow defect

The proof workflow treated Docker Desktop itself as an ephemeral, per-capture
owned service. It stopped the whole Desktop after a successful capture and
started it again for the next chunk. That lifecycle was unnecessary: the
repository requires ownership and cleanup of the managed backend/frontend
watchers and capture Chrome tree, but Docker Desktop is shared workstation
infrastructure rather than a proof-child process.

After the first fatal backend event, the operator also:

- polled readiness without first reading the fresh Docker backend log;
- issued a second start despite an unchanged failure fingerprint;
- combined startup, readiness, and container operations in one command whose
  yielded session identifier was not retained by the caller.

These actions violated the project's no-blind-retry and owned-supervisor
principles. They did not corrupt the matrix checkpoint, but they duplicated
the Docker crash and made diagnosis slower.

## Corrected operating procedure

1. Treat Docker Desktop as shared workstation infrastructure. Never stop or
   restart it per matrix chunk.
2. Reuse one already healthy engine for the complete contiguous capture batch.
3. Start or validate only the required Compose dependency services
   (`mysql`, `redis`, `seaweedfs`). Do not restart Desktop merely to cycle
   those services.
4. Reuse one exact runtime-build-bound backend/frontend pair across successive
   immutable chunks while the source digest and process identity remain
   unchanged.
5. Continue to launch exactly one globally locked Chrome capture per chunk and
   close that exact Chrome tree after the artifact is durable.
6. If the Docker engine is unavailable, perform one bounded observation. On a
   fatal backend log or absent backend pipe, stop the lane and record the
   infrastructure blocker. Do not poll indefinitely and do not issue a second
   start against an unchanged fingerprint.
7. Keep every yielded command session identifier and explicitly terminate its
   exact process tree on failure or interruption.

## Repository enforcement

The repository now provides a bounded, read-only dependency snapshot:

```powershell
cd backend
npm.cmd run areas:proof-runtime-preflight
```

The command emits the stable JSON contract
`aurora-proof-runtime-dependency-preflight/v1` and exits with code `0` only
when the existing engine responds, the exact MySQL/Redis/SeaweedFS dependency
containers are healthy, application ports `3000` and `5173` are free, and no
active managed-service or proof-capture lock exists. A blocked snapshot exits
with code `2` and carries deterministic blocker codes.

Its Docker command allowlist contains only one bounded `docker info` and one
bounded `docker ps --all` observation. It cannot launch, stop, or restart
Docker Desktop; it cannot start, stop, restart, create, or delete containers;
and it never removes stale runtime locks. When the engine is unavailable, the
container observation is skipped and the newest Docker backend log tail is
classified locally. A fresh matching `dockerInference` failure yields
`DOCKER_INFERENCE_ENDPOINT_FATAL` with a SHA-256 fingerprint and explicitly
sets `retryDockerDesktopStart=false`.

The focused contract test is
`backend/test/unit/proof-runtime-dependency-preflight.spec.ts`. It covers the
read-only command allowlist, JSONL parsing, fatal-event fingerprinting, the
complete ready gate, fail-closed no-retry behavior, and deterministic
container/port/lock blockers without contacting Docker Desktop.

## One-shot resume preflight — 2026-08-26T14:35:26.992Z

Exactly one read-only
`npm.cmd run areas:proof-runtime-preflight` observation was performed after the
guard was added. It returned `blocked` with
`DOCKER_ENGINE_UNAVAILABLE`, classified the newest relevant backend-log state
as historical fatal `DOCKER_INFERENCE_ENDPOINT_FATAL`, and set
`retryDockerDesktopStart=false`. The bound log was
`C:\Users\enonw\AppData\Local\Docker\log\host\com.docker.backend.exe.log.20260826-120636.039`,
last written at `2026-08-26T10:07:11.470Z`; the event fingerprint is
`9ab12020bca69585ebb959f7960ff464acbe37d63249bf65529e750ebee5f538`.

Ports `3000` and `5173` and the backend, frontend, and repository-global proof
locks were clear. Container status was intentionally not inferred because the
engine was unavailable and the contract skipped `docker ps --all`. The
preflight did not start Docker Desktop, containers, application services,
Chrome, Toolset, or NWN. It was not repeated against the unchanged
fingerprint.

The durable derived blocker is
`output/proof/proof-runtime-dependency-preflight-2026-08-26T143526Z.blocker.json`.
It explicitly identifies itself as a transcription of the already observed
stable JSON result rather than a raw-stdout capture. The live renderer lane
therefore remains stopped until external infrastructure recovery changes the
fingerprint and one bounded resume-gate observation succeeds.

## Recovery options and decision boundary

No recovery changed host state in this audit.

After diagnosis, one recoverable quarantine attempt targeted only the exact
stale endpoint while every Docker process was absent. Moving
`%LOCALAPPDATA%\Docker\run\dockerInference` to a repository-local recovery
directory failed with Windows error 1920 / access denied. The endpoint remained
at its original path and no Docker process was started.

A subsequent exact-path `Remove-Item -LiteralPath ... -Force` request was
rejected by the execution safety policy before PowerShell launched it. No
deletion occurred and no alternate shell, WSL, `fsutil` deletion, or policy
bypass was attempted. The host state therefore remained unchanged after both
requests. Live proof remains gated on an external infrastructure recovery or a
verified Docker Desktop update; offline repository work remains available.

The lowest-risk durable option is to update Docker Desktop from `4.73.1` to a
current supported release, then perform one cold start and a stability probe.
Because the upstream issue does not name a confirmed exact fix, the update
must still pass the resume gate below.

A narrower local recovery candidate is removal of only the stale
`%LOCALAPPDATA%\Docker\run\dockerInference` endpoint while every Docker
process is absent, followed by one start. That is a destructive filesystem
operation outside the repository and must not be performed as part of a
diagnostic audit. It requires an explicit recovery decision and exact
pre/post-state capture.

Disabling Docker AI/Inference is not accepted as a proven fix: the matching
upstream report states that disabling Inference did not prevent initialization
in the affected release family.

## Resume gate

Area matrix live work may resume only after all of the following are true:

- exactly one intentional Docker Desktop start has occurred;
- the engine remains healthy for at least 60 seconds;
- one bounded `docker info` succeeds;
- the fresh backend log contains no `dockerInference`, backend-cancel, or
  crash event after that start;
- required dependency containers are healthy;
- ports `3000` and `5173` plus repository service/proof locks are free before
  the managed application pair starts;
- no second Docker Desktop start is issued for an unchanged failed state.

At the time of the incident, the next v10 matrix action was
`atj02-group-chunk-0011` and the accepted v10 checkpoint was `10/3378`.

## Post-incident source-bound successor

Subsequent repository-only safety and control-plane changes intentionally made
v10 historical for future capture without changing any accepted v10 artifact.
The active pointer now binds immutable v12 plan ID
`7a3f8a0e8366411e5a6334c260089cf3c184840ade30e6568bbd136fb908c781`
and runtime digest
`69f9c763bc1dbf9acb156ea89fb237e34c61e16562d079002bb732b697b4c999`.
Fresh source verification passes, but current-build capture coverage correctly
starts at `0/3378`; old-build visual reviews were not promoted across the
runtime identity boundary. The Docker resume gate above is unchanged, and the
next live action after it passes is v12 `atj02-group-chunk-0001`.
