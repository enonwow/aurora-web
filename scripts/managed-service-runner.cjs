const net = require("node:net");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const { acquireProcessLock } = require("./process-lock.cjs");
const {
  buildResourceLimitedEnvironment,
} = require("./node-resource-limits.cjs");

function parseValidPort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

function resolveServicePort(args, environment, defaultPort) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--port") {
      const port = parseValidPort(args[index + 1]);
      if (port === null) throw new Error(`Invalid service port: ${args[index + 1]}`);
      return port;
    }
    if (value.startsWith("--port=")) {
      const port = parseValidPort(value.slice("--port=".length));
      if (port === null) throw new Error(`Invalid service port: ${value}`);
      return port;
    }
  }

  const environmentPort = parseValidPort(environment?.PORT);
  if (environmentPort !== null) return environmentPort;
  const fallback = parseValidPort(defaultPort);
  if (fallback === null) throw new Error(`Invalid service port: ${defaultPort}`);
  return fallback;
}

function isTcpPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (open) => {
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

function resolveServiceFamily(serviceName) {
  if (serviceName.startsWith("backend-")) return "backend";
  if (serviceName.startsWith("frontend-")) return "frontend";
  throw new Error(
    `Managed service name must begin with backend- or frontend-: ${serviceName}`,
  );
}

function buildServiceLockPath(repositoryRoot, serviceName) {
  return path.join(
    repositoryRoot,
    ".codex-runtime",
    "service-locks",
    `${resolveServiceFamily(serviceName)}.lock.json`,
  );
}

async function runCli({
  args = process.argv.slice(2),
  environment = process.env,
  workingDirectory = process.cwd(),
} = {}) {
  const [serviceName, defaultPortValue, modulePath, ...childArgs] = args;
  if (!/^[a-z0-9-]+$/u.test(serviceName ?? "") || !modulePath) {
    throw new Error(
      "Usage: managed-service-runner <service-name> <default-port> <node-module> [args...]",
    );
  }

  const family = resolveServiceFamily(serviceName);
  const port = resolveServicePort(childArgs, environment, Number(defaultPortValue));
  const repositoryRoot = path.resolve(__dirname, "..");
  const lock = acquireProcessLock({
    lockPath: buildServiceLockPath(repositoryRoot, serviceName),
    describeBusy: (ownerPid) =>
      `A ${family} service is already supervised by PID ${ownerPid}. ` +
      `Refusing ${serviceName} on port ${port}.`,
  });
  const releaseLockOnExit = () => lock.release();
  process.once("exit", releaseLockOnExit);

  let child;
  let guard;
  try {
    if (await isTcpPortOpen(port)) {
      console.error(
        `${serviceName} was not started: port ${port} is already in use. ` +
          "Reuse the healthy existing service or stop its owning supervisor first.",
      );
      return 2;
    }

    const lifecycleUrl = pathToFileURL(
      path.join(
        repositoryRoot,
        "backend",
        "scripts",
        "capture-process-lifecycle.mjs",
      ),
    ).href;
    const { installCaptureProcessGuard } = await import(lifecycleUrl);
    const resolvedModulePath = path.resolve(workingDirectory, modulePath);
    child = spawn(process.execPath, [resolvedModulePath, ...childArgs], {
      cwd: workingDirectory,
      env: buildResourceLimitedEnvironment(environment),
      stdio: "inherit",
      windowsHide: true,
    });
    guard = installCaptureProcessGuard(child, {
      label: `${serviceName}-${port}`,
    });

    return await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (signal) {
          reject(new Error(`${serviceName} exited after signal ${signal}.`));
          return;
        }
        resolve(code ?? 1);
      });
    });
  } finally {
    if (child?.exitCode === null && guard) await guard.terminate();
    else guard?.dispose();
    process.off("exit", releaseLockOnExit);
    lock.release();
  }
}

module.exports = {
  buildResourceLimitedEnvironment,
  buildServiceLockPath,
  isTcpPortOpen,
  resolveServiceFamily,
  resolveServicePort,
  runCli,
};

if (require.main === module) {
  runCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error?.stack ?? error);
      process.exitCode = error?.code === "PROCESS_LOCK_BUSY" ? 2 : 1;
    });
}
