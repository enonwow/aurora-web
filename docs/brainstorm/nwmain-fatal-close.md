# Exact fatal-dialog cleanup

Scope: Windows crash-dialog cleanup, no unknown Aurora rendering semantic. The
existing public graceful close rejects two visible windows before posting any
message. Drain Life beam-v2 preserved that failure and a real c0000005 report.
This extension does not retry the failed ordinary close or change assets.

The same public `close-nwmain-window-no-global-input.mjs` now exposes read-only
`inspect`, `close-fatal-dry-run`, then `close-fatal`. The latter two require
`--pid`, `--startedAtUtc`, `--report`, `--reportSha256`. Admission requires one
exact responsive NWN process, its root window, one owned fatal #32770 with the
known NWN fatal title, one OK button, and text containing the exact hashed report
path. The report timestamp must follow process creation. Every other modal is
rejected. Tests precede implementation and cover wrong owner/start/report/window
sets and unknown dialogs. User/task close authorization is still required.

Before mutation a fresh complete window/control snapshot and report hash must
equal admission. One WM_CLOSE addresses only the fatal dialog. After a bounded
15-second graceful failure, the existing exact PID+StartTime force policy applies;
zero-process readback is required. No settings, file contents, monitor, z-order,
global input or other application windows change. The durable crash report is
the evidence; this cleanup is never visual proof or a successful effect test.
