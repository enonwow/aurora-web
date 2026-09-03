const PHASES = new Set(["initial", "after-grace", "after-force"]);

export function evaluateExactNwmainCloseSnapshot({
  phase,
  processes,
  expectedPid,
  expectedStartedAtUtc,
  allowForceFallback = false,
}) {
  if (!PHASES.has(phase)) throw new Error(`nwmain_close_phase_invalid:${phase}`);
  if (!Number.isInteger(expectedPid) || expectedPid <= 0) throw new Error("nwmain_expected_pid_invalid");
  const expectedStart = timestamp(expectedStartedAtUtc, "nwmain_expected_start_invalid");
  if (!Array.isArray(processes)) throw new Error("nwmain_process_snapshot_invalid");

  if (processes.length === 0) {
    if (phase === "initial") throw new Error("expected_one_nwmain:0");
    return { action: "complete", forceFallbackUsed: phase === "after-force" };
  }
  if (processes.length !== 1) throw new Error(`expected_one_nwmain:${processes.length}`);

  const process = processes[0];
  if (process?.pid !== expectedPid) {
    throw new Error(`nwmain_pid_mismatch:expected=${expectedPid};actual=${process?.pid}`);
  }
  const actualStart = timestamp(process?.startedAtUtc, "nwmain_process_start_invalid");
  if (actualStart !== expectedStart) {
    throw new Error(`nwmain_start_mismatch:expected=${expectedStartedAtUtc};actual=${process?.startedAtUtc}`);
  }
  if (phase === "after-force") throw new Error("nwmain_force_termination_identity_invalid");
  if (phase === "after-grace") return { action: "force-terminate-exact-pid", forceFallbackUsed: true };
  if (process.responding === false) {
    if (!allowForceFallback) throw new Error("nwmain_not_responding");
    return { action: "force-terminate-exact-pid", forceFallbackUsed: true };
  }
  return { action: "attempt-graceful-close", forceFallbackUsed: false };
}

function timestamp(value, error) {
  const text = String(value ?? "").trim();
  const milliseconds = Date.parse(text);
  if (!text || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(text) || !Number.isFinite(milliseconds)) {
    throw new Error(error);
  }
  return milliseconds;
}
