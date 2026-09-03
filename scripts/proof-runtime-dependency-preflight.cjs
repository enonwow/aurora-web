#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { defaultIsProcessAlive } = require("./process-lock.cjs");

const VERSION = "aurora-proof-runtime-dependency-preflight/v1";
const DEFAULT_COMMAND_TIMEOUT_MS = 4_000;
const DEFAULT_LOG_FRESHNESS_MS = 15 * 60 * 1_000;
const DEFAULT_LOG_TAIL_BYTES = 512 * 1_024;
const APPLICATION_PORTS = Object.freeze([3000, 5173]);
const REQUIRED_DEPENDENCY_CONTAINERS = Object.freeze([
  "aurora-mysql-dev",
  "aurora-redis-dev",
  "aurora-seaweedfs-dev",
]);
const READ_ONLY_DOCKER_COMMANDS = Object.freeze({
  info: Object.freeze(["info", "--format", "{{json .ServerVersion}}"]),
  containers: Object.freeze(["ps", "--all", "--format", "{{json .}}"]),
});

function parseDockerPsJsonLines(value) {
  return String(value ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line);
        return parsed && typeof parsed === "object" ? [parsed] : [];
      } catch {
        return [];
      }
    });
}

function normalizeIso(value) {
  const time = Date.parse(String(value ?? ""));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function classifyDockerBackendLog({
  text = "",
  sourcePath = null,
  modifiedAt = null,
  observedAt = new Date().toISOString(),
  freshnessWindowMs = DEFAULT_LOG_FRESHNESS_MS,
} = {}) {
  const normalizedText = String(text);
  const hasInferenceEndpoint = /dockerInference/iu.test(normalizedText);
  const hasInferenceInitialization = /initializing Inference manager/iu.test(
    normalizedText,
  );
  const hasRemovalFailure =
    /(?:remove|replace)[^\r\n]*dockerInference/iu.test(normalizedText) ||
    /dockerInference[^\r\n]*(?:cannot be accessed|access is denied|error 1920)/iu.test(
      normalizedText,
    );
  const fatal =
    hasInferenceEndpoint && (hasInferenceInitialization || hasRemovalFailure);
  const normalizedModifiedAt = normalizeIso(modifiedAt);
  const normalizedObservedAt = normalizeIso(observedAt);
  const modifiedTime = Date.parse(normalizedModifiedAt ?? "");
  const observedTime = Date.parse(normalizedObservedAt ?? "");
  const ageMs =
    Number.isFinite(modifiedTime) && Number.isFinite(observedTime)
      ? observedTime - modifiedTime
      : null;
  const fresh =
    ageMs !== null && ageMs >= -60_000 && ageMs <= freshnessWindowMs;

  if (!fatal) {
    return {
      status: normalizedText.length > 0 ? "clear" : "unavailable",
      code: null,
      sourcePath,
      modifiedAt: normalizedModifiedAt,
      fresh: false,
      fingerprint: null,
    };
  }

  return {
    status: fresh ? "fatal" : "historical_fatal",
    code: "DOCKER_INFERENCE_ENDPOINT_FATAL",
    sourcePath,
    modifiedAt: normalizedModifiedAt,
    fresh,
    fingerprint: crypto
      .createHash("sha256")
      .update(normalizedText, "utf8")
      .digest("hex"),
  };
}

function splitContainerNames(row) {
  return String(row?.Names ?? row?.Name ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function buildContainerChecks(dockerPs) {
  const rows = dockerPs?.ok === true && Array.isArray(dockerPs.rows)
    ? dockerPs.rows
    : [];
  const rowByName = new Map();
  for (const row of rows) {
    for (const name of splitContainerNames(row)) rowByName.set(name, row);
  }

  return REQUIRED_DEPENDENCY_CONTAINERS.map((name) => {
    const row = rowByName.get(name);
    const state = String(row?.State ?? "").toLowerCase();
    const statusText = String(row?.Status ?? "");
    const present = Boolean(row);
    const running =
      present && (state === "running" || /^up\b/iu.test(statusText));
    const healthy = running && /\(healthy\)/iu.test(statusText);
    return {
      name,
      present,
      running,
      healthy,
      state: present ? state || null : null,
      status: present ? statusText || null : null,
    };
  });
}

function buildProofRuntimeDependencyReport({
  observedAt = new Date().toISOString(),
  dockerInfo = { ok: false, kind: "unavailable" },
  dockerPs = { ok: false, kind: "skipped" },
  backendLog = {
    status: "unavailable",
    code: null,
    fresh: false,
    fingerprint: null,
  },
  ports = [],
  locks = [],
} = {}) {
  const containerChecks = buildContainerChecks(dockerPs);
  const normalizedPorts = [...ports]
    .map((port) => ({ port: Number(port.port), open: port.open === true }))
    .sort((left, right) => left.port - right.port);
  const normalizedLocks = [...locks]
    .map((lock) => ({
      id: String(lock.id),
      status: ["clear", "active", "stale"].includes(lock.status)
        ? lock.status
        : "stale",
      ownerPid: Number.isInteger(lock.ownerPid) ? lock.ownerPid : null,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const blockerCodes = new Set();

  if (dockerInfo.ok !== true) {
    if (backendLog?.status === "fatal" && backendLog?.fresh === true) {
      blockerCodes.add("DOCKER_INFERENCE_ENDPOINT_FATAL");
    } else if (dockerInfo.kind === "timeout") {
      blockerCodes.add("DOCKER_ENGINE_TIMEOUT");
    } else {
      blockerCodes.add("DOCKER_ENGINE_UNAVAILABLE");
    }
  } else if (dockerPs.ok !== true) {
    blockerCodes.add("DOCKER_CONTAINER_SNAPSHOT_FAILED");
  } else {
    if (containerChecks.some((container) => !container.present)) {
      blockerCodes.add("DEPENDENCY_CONTAINER_MISSING");
    }
    if (
      containerChecks.some(
        (container) => container.present && !container.running,
      )
    ) {
      blockerCodes.add("DEPENDENCY_CONTAINER_NOT_RUNNING");
    }
    if (
      containerChecks.some(
        (container) => container.present && container.running && !container.healthy,
      )
    ) {
      blockerCodes.add("DEPENDENCY_CONTAINER_UNHEALTHY");
    }
  }

  if (normalizedPorts.some((port) => port.open)) {
    blockerCodes.add("APPLICATION_PORT_IN_USE");
  }
  if (normalizedLocks.some((lock) => lock.status === "active")) {
    blockerCodes.add("RUNTIME_LOCK_ACTIVE");
  }

  const sortedBlockerCodes = [...blockerCodes].sort();
  const status = sortedBlockerCodes.length === 0 ? "ready" : "blocked";
  const next = (() => {
    if (status === "ready") return "start_managed_application_pair";
    if (
      sortedBlockerCodes.includes("DOCKER_INFERENCE_ENDPOINT_FATAL") ||
      sortedBlockerCodes.includes("DOCKER_ENGINE_UNAVAILABLE") ||
      sortedBlockerCodes.includes("DOCKER_ENGINE_TIMEOUT")
    ) {
      return "external_infrastructure_recovery_required";
    }
    if (
      sortedBlockerCodes.some((code) => code.startsWith("DEPENDENCY_CONTAINER_")) ||
      sortedBlockerCodes.includes("DOCKER_CONTAINER_SNAPSHOT_FAILED")
    ) {
      return "repair_exact_dependency_containers_without_restarting_desktop";
    }
    return "reuse_or_stop_exact_owning_managed_process";
  })();

  return {
    version: VERSION,
    observedAt: normalizeIso(observedAt) ?? String(observedAt),
    mode: "snapshot",
    status,
    blockerCodes: sortedBlockerCodes,
    action: {
      retryDockerDesktopStart: false,
      next,
    },
    safety: {
      launchesDockerDesktop: false,
      stopsDockerDesktop: false,
      restartsDockerDesktop: false,
      mutatesContainers: false,
      mutatesRuntimeLocks: false,
      readOnlyDockerCommands: READ_ONLY_DOCKER_COMMANDS,
    },
    docker: {
      engine: {
        status: dockerInfo.ok === true ? "ready" : "blocked",
        serverVersion: dockerInfo.ok === true ? dockerInfo.serverVersion ?? null : null,
        failureKind: dockerInfo.ok === true ? null : dockerInfo.kind ?? "unavailable",
      },
      backendLog,
      containers: containerChecks,
    },
    applicationPorts: normalizedPorts,
    runtimeLocks: normalizedLocks,
    summary: {
      requiredContainerCount: containerChecks.length,
      healthyContainerCount: containerChecks.filter((container) => container.healthy)
        .length,
      missingContainerCount: containerChecks.filter((container) => !container.present)
        .length,
      busyApplicationPortCount: normalizedPorts.filter((port) => port.open).length,
      activeRuntimeLockCount: normalizedLocks.filter(
        (lock) => lock.status === "active",
      ).length,
      staleRuntimeLockCount: normalizedLocks.filter(
        (lock) => lock.status === "stale",
      ).length,
    },
  };
}

function runBoundedCommand(command, args, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: timeoutMs,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ ok: true, stdout, stderr });
          return;
        }
        resolve({
          ok: false,
          kind: error.killed === true ? "timeout" : "unavailable",
          exitCode: Number.isInteger(error.code) ? error.code : null,
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? ""),
        });
      },
    );
  });
}

function isTcpPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let completed = false;
    const finish = (open) => {
      if (completed) return;
      completed = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function inspectLock(lockPath, id, isProcessAlive = defaultIsProcessAlive) {
  if (!fs.existsSync(lockPath)) return { id, status: "clear", ownerPid: null };
  try {
    const value = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const ownerPid = Number(value.pid);
    if (Number.isInteger(ownerPid) && ownerPid > 0 && isProcessAlive(ownerPid)) {
      return { id, status: "active", ownerPid };
    }
    return {
      id,
      status: "stale",
      ownerPid: Number.isInteger(ownerPid) && ownerPid > 0 ? ownerPid : null,
    };
  } catch {
    return { id, status: "stale", ownerPid: null };
  }
}

function readTail(filePath, maxBytes = DEFAULT_LOG_TAIL_BYTES) {
  const descriptor = fs.openSync(filePath, "r");
  try {
    const size = fs.fstatSync(descriptor).size;
    const length = Math.min(size, maxBytes);
    const buffer = Buffer.alloc(length);
    fs.readSync(descriptor, buffer, 0, length, Math.max(0, size - length));
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(descriptor);
  }
}

function inspectNewestDockerBackendLog({
  environment = process.env,
  observedAt,
  freshnessWindowMs = DEFAULT_LOG_FRESHNESS_MS,
} = {}) {
  const localAppData = environment.LOCALAPPDATA;
  if (!localAppData) {
    return classifyDockerBackendLog({ observedAt });
  }
  const hostLogDirectory = path.join(localAppData, "Docker", "log", "host");
  try {
    const candidates = fs
      .readdirSync(hostLogDirectory)
      .filter((name) => name.startsWith("com.docker.backend.exe.log"))
      .map((name) => {
        const sourcePath = path.join(hostLogDirectory, name);
        return { sourcePath, stats: fs.statSync(sourcePath) };
      })
      .filter((entry) => entry.stats.isFile())
      .sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
    const newest = candidates[0];
    if (!newest) return classifyDockerBackendLog({ observedAt });
    return classifyDockerBackendLog({
      text: readTail(newest.sourcePath),
      sourcePath: newest.sourcePath,
      modifiedAt: newest.stats.mtime.toISOString(),
      observedAt,
      freshnessWindowMs,
    });
  } catch {
    return classifyDockerBackendLog({ observedAt });
  }
}

async function runProofRuntimeDependencyPreflight({
  repositoryRoot = path.resolve(__dirname, ".."),
  environment = process.env,
  observedAt = new Date().toISOString(),
  commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
  runCommand = runBoundedCommand,
  portProbe = isTcpPortOpen,
  isProcessAlive = defaultIsProcessAlive,
  backendLogObservation = null,
} = {}) {
  const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";
  const infoObservation = await runCommand(
    dockerCommand,
    READ_ONLY_DOCKER_COMMANDS.info,
    commandTimeoutMs,
  );
  let dockerInfo;
  let dockerPs;
  if (infoObservation.ok === true) {
    let serverVersion = null;
    try {
      serverVersion = JSON.parse(infoObservation.stdout.trim());
    } catch {
      serverVersion = infoObservation.stdout.trim() || null;
    }
    dockerInfo = { ok: true, serverVersion };
    const psObservation = await runCommand(
      dockerCommand,
      READ_ONLY_DOCKER_COMMANDS.containers,
      commandTimeoutMs,
    );
    dockerPs = psObservation.ok === true
      ? { ok: true, rows: parseDockerPsJsonLines(psObservation.stdout) }
      : { ok: false, kind: psObservation.kind ?? "unavailable" };
  } else {
    dockerInfo = {
      ok: false,
      kind: infoObservation.kind ?? "unavailable",
    };
    dockerPs = { ok: false, kind: "skipped" };
  }

  const ports = await Promise.all(
    APPLICATION_PORTS.map(async (port) => ({ port, open: await portProbe(port) })),
  );
  const lockRoot = path.join(repositoryRoot, ".codex-runtime");
  const locks = [
    inspectLock(
      path.join(lockRoot, "service-locks", "backend.lock.json"),
      "backend-service",
      isProcessAlive,
    ),
    inspectLock(
      path.join(lockRoot, "service-locks", "frontend.lock.json"),
      "frontend-service",
      isProcessAlive,
    ),
    inspectLock(
      path.join(lockRoot, "proof-capture.lock.json"),
      "proof-capture",
      isProcessAlive,
    ),
  ];

  return buildProofRuntimeDependencyReport({
    observedAt,
    dockerInfo,
    dockerPs,
    backendLog:
      backendLogObservation ??
      inspectNewestDockerBackendLog({ environment, observedAt }),
    ports,
    locks,
  });
}

module.exports = {
  APPLICATION_PORTS,
  READ_ONLY_DOCKER_COMMANDS,
  REQUIRED_DEPENDENCY_CONTAINERS,
  buildProofRuntimeDependencyReport,
  classifyDockerBackendLog,
  inspectLock,
  inspectNewestDockerBackendLog,
  isTcpPortOpen,
  parseDockerPsJsonLines,
  runBoundedCommand,
  runProofRuntimeDependencyPreflight,
};

if (require.main === module) {
  runProofRuntimeDependencyPreflight()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exitCode = report.status === "ready" ? 0 : 2;
    })
    .catch((error) => {
      process.stderr.write(`${error?.stack ?? error}\n`);
      process.exitCode = 1;
    });
}
