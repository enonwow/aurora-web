const {
  READ_ONLY_DOCKER_COMMANDS,
  REQUIRED_DEPENDENCY_CONTAINERS,
  buildProofRuntimeDependencyReport,
  classifyDockerBackendLog,
  parseDockerPsJsonLines,
  runProofRuntimeDependencyPreflight,
} = require("../../../scripts/proof-runtime-dependency-preflight.cjs") as {
  READ_ONLY_DOCKER_COMMANDS: Readonly<Record<string, readonly string[]>>;
  REQUIRED_DEPENDENCY_CONTAINERS: readonly string[];
  buildProofRuntimeDependencyReport: (input: Record<string, unknown>) => any;
  classifyDockerBackendLog: (input: Record<string, unknown>) => any;
  parseDockerPsJsonLines: (value: string) => any[];
  runProofRuntimeDependencyPreflight: (input: Record<string, unknown>) => Promise<any>;
};

const observedAt = "2026-08-26T10:20:00.000Z";

function healthyContainerRows() {
  return REQUIRED_DEPENDENCY_CONTAINERS.map((name) => ({
    Names: name,
    State: "running",
    Status: "Up 2 hours (healthy)",
  }));
}

describe("proof runtime dependency preflight", () => {
  it("exposes only bounded read-only Docker observations", () => {
    expect(READ_ONLY_DOCKER_COMMANDS).toEqual({
      info: ["info", "--format", "{{json .ServerVersion}}"],
      containers: ["ps", "--all", "--format", "{{json .}}"],
    });

    const forbiddenLifecycleVerbs = new Set([
      "start",
      "stop",
      "restart",
      "up",
      "down",
      "rm",
      "kill",
    ]);
    expect(
      Object.values(READ_ONLY_DOCKER_COMMANDS)
        .flat()
        .some((argument) => forbiddenLifecycleVerbs.has(argument)),
    ).toBe(false);
  });

  it("executes the two allowlisted observations once when the engine is ready", async () => {
    const calls: string[][] = [];
    const report = await runProofRuntimeDependencyPreflight({
      repositoryRoot: "C:/synthetic-aurora-repository",
      environment: {},
      observedAt,
      runCommand: async (_command: string, args: readonly string[]) => {
        calls.push([...args]);
        if (args[0] === "info") return { ok: true, stdout: '"29.4.3"' };
        return {
          ok: true,
          stdout: healthyContainerRows()
            .map((row) => JSON.stringify(row))
            .join("\n"),
        };
      },
      portProbe: async () => false,
      isProcessAlive: () => false,
      backendLogObservation: {
        status: "clear",
        code: null,
        fresh: false,
        fingerprint: null,
      },
    });

    expect(calls).toEqual([
      [...READ_ONLY_DOCKER_COMMANDS.info],
      [...READ_ONLY_DOCKER_COMMANDS.containers],
    ]);
    expect(report.status).toBe("ready");
  });

  it("stops after the first observation when the engine is unavailable", async () => {
    const calls: string[][] = [];
    const report = await runProofRuntimeDependencyPreflight({
      repositoryRoot: "C:/synthetic-aurora-repository",
      environment: {},
      observedAt,
      runCommand: async (_command: string, args: readonly string[]) => {
        calls.push([...args]);
        return { ok: false, kind: "unavailable", stdout: "", stderr: "" };
      },
      portProbe: async () => false,
      isProcessAlive: () => false,
      backendLogObservation: {
        status: "fatal",
        code: "DOCKER_INFERENCE_ENDPOINT_FATAL",
        fresh: true,
        fingerprint: "f".repeat(64),
      },
    });

    expect(calls).toEqual([[...READ_ONLY_DOCKER_COMMANDS.info]]);
    expect(report).toMatchObject({
      status: "blocked",
      blockerCodes: ["DOCKER_INFERENCE_ENDPOINT_FATAL"],
      action: { retryDockerDesktopStart: false },
    });
  });

  it("parses Docker JSON lines without accepting malformed rows", () => {
    expect(
      parseDockerPsJsonLines(
        [
          JSON.stringify({ Names: "aurora-mysql-dev", State: "running" }),
          "not-json",
          "",
          JSON.stringify({ Names: "aurora-redis-dev", State: "exited" }),
        ].join("\n"),
      ),
    ).toEqual([
      { Names: "aurora-mysql-dev", State: "running" },
      { Names: "aurora-redis-dev", State: "exited" },
    ]);
  });

  it("classifies the fresh dockerInference startup failure by fingerprint", () => {
    const result = classifyDockerBackendLog({
      text: [
        "[10:03:57.100] starting services: initializing Inference manager",
        "remove C:\\Users\\user\\AppData\\Local\\Docker\\run\\dockerInference: The file cannot be accessed by the system",
        "[10:04:29.000] backend cancelled",
      ].join("\n"),
      sourcePath: "C:/Docker/com.docker.backend.exe.log",
      modifiedAt: "2026-08-26T10:19:29.000Z",
      observedAt,
    });

    expect(result).toMatchObject({
      status: "fatal",
      code: "DOCKER_INFERENCE_ENDPOINT_FATAL",
      sourcePath: "C:/Docker/com.docker.backend.exe.log",
      fresh: true,
      fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.stringify(result)).not.toContain("The file cannot be accessed");
  });

  it("returns ready only for a healthy engine, healthy dependencies, free ports, and clear locks", () => {
    const report = buildProofRuntimeDependencyReport({
      observedAt,
      dockerInfo: { ok: true, serverVersion: "29.4.3" },
      dockerPs: { ok: true, rows: healthyContainerRows() },
      backendLog: { status: "clear", code: null, fingerprint: null },
      ports: [
        { port: 3000, open: false },
        { port: 5173, open: false },
      ],
      locks: [
        { id: "backend-service", status: "clear", ownerPid: null },
        { id: "frontend-service", status: "clear", ownerPid: null },
        { id: "proof-capture", status: "clear", ownerPid: null },
      ],
    });

    expect(report).toMatchObject({
      version: "aurora-proof-runtime-dependency-preflight/v1",
      observedAt,
      mode: "snapshot",
      status: "ready",
      blockerCodes: [],
      safety: {
        launchesDockerDesktop: false,
        stopsDockerDesktop: false,
        restartsDockerDesktop: false,
        mutatesContainers: false,
      },
      summary: {
        requiredContainerCount: 3,
        healthyContainerCount: 3,
        busyApplicationPortCount: 0,
        activeRuntimeLockCount: 0,
      },
    });
  });

  it("fails closed on the known fatal engine state without recommending a retry", () => {
    const report = buildProofRuntimeDependencyReport({
      observedAt,
      dockerInfo: { ok: false, kind: "unavailable" },
      dockerPs: { ok: false, kind: "skipped" },
      backendLog: {
        status: "fatal",
        code: "DOCKER_INFERENCE_ENDPOINT_FATAL",
        fresh: true,
        fingerprint: "f".repeat(64),
      },
      ports: [],
      locks: [],
    });

    expect(report).toMatchObject({
      status: "blocked",
      blockerCodes: ["DOCKER_INFERENCE_ENDPOINT_FATAL"],
      action: {
        retryDockerDesktopStart: false,
        next: "external_infrastructure_recovery_required",
      },
    });
  });

  it("reports every concrete dependency, port, and active-lock blocker deterministically", () => {
    const report = buildProofRuntimeDependencyReport({
      observedAt,
      dockerInfo: { ok: true, serverVersion: "29.4.3" },
      dockerPs: {
        ok: true,
        rows: [
          {
            Names: "aurora-mysql-dev",
            State: "running",
            Status: "Up 4 seconds (health: starting)",
          },
          {
            Names: "aurora-redis-dev",
            State: "exited",
            Status: "Exited (1) 2 minutes ago",
          },
        ],
      },
      backendLog: { status: "clear", code: null, fingerprint: null },
      ports: [{ port: 5173, open: true }],
      locks: [
        { id: "proof-capture", status: "active", ownerPid: 4321 },
        { id: "backend-service", status: "stale", ownerPid: 1234 },
      ],
    });

    expect(report.blockerCodes).toEqual([
      "APPLICATION_PORT_IN_USE",
      "DEPENDENCY_CONTAINER_MISSING",
      "DEPENDENCY_CONTAINER_NOT_RUNNING",
      "DEPENDENCY_CONTAINER_UNHEALTHY",
      "RUNTIME_LOCK_ACTIVE",
    ]);
    expect(report.summary).toMatchObject({
      requiredContainerCount: 3,
      healthyContainerCount: 0,
      missingContainerCount: 1,
      busyApplicationPortCount: 1,
      activeRuntimeLockCount: 1,
      staleRuntimeLockCount: 1,
    });
  });
});
