const { existsSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const { acquireProcessLock } = require("./process-lock.cjs");
const {
  buildResourceLimitedEnvironment,
} = require("./node-resource-limits.cjs");

const OPT_IN_VARIABLE = "AURORA_MUTATION_TESTS";

function isMutationOptIn(environment) {
  return environment?.[OPT_IN_VARIABLE] === "1";
}

function buildStrykerCliArgs(args) {
  const filtered = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--concurrency") {
      index += 1;
      continue;
    }
    if (value.startsWith("--concurrency=")) {
      continue;
    }
    filtered.push(value);
  }
  return ["run", ...filtered, "--concurrency", "1"];
}

function acquireMutationLock({
  lockPath,
  pid = process.pid,
  isProcessAlive,
}) {
  return acquireProcessLock({
    lockPath,
    pid,
    ...(isProcessAlive ? { isProcessAlive } : {}),
    describeBusy: (ownerPid) =>
      `A mutation test is already running under PID ${ownerPid}. ` +
      "Only one repository mutation job is allowed.",
  });
}

async function runCli({
  args = process.argv.slice(2),
  environment = process.env,
  workingDirectory = process.cwd(),
} = {}) {
  if (!isMutationOptIn(environment)) {
    console.error(
      `Mutation testing is optional and blocked by default. ` +
        `Set ${OPT_IN_VARIABLE}=1 only after the user explicitly requests it.`,
    );
    return 2;
  }

  const repositoryRoot = path.resolve(__dirname, "..");
  const strykerBin = path.join(
    workingDirectory,
    "node_modules",
    "@stryker-mutator",
    "core",
    "bin",
    "stryker.js",
  );
  if (!existsSync(strykerBin)) {
    throw new Error(`Local Stryker executable not found: ${strykerBin}`);
  }

  const lock = acquireMutationLock({
    lockPath: path.join(
      repositoryRoot,
      ".codex-runtime",
      "mutation-test.lock.json",
    ),
  });
  const releaseLockOnExit = () => lock.release();
  process.once("exit", releaseLockOnExit);

  let guard;
  let child;
  try {
    const lifecycleUrl = pathToFileURL(
      path.join(
        repositoryRoot,
        "backend",
        "scripts",
        "capture-process-lifecycle.mjs",
      ),
    ).href;
    const { installCaptureProcessGuard } = await import(lifecycleUrl);

    child = spawn(process.execPath, [strykerBin, ...buildStrykerCliArgs(args)], {
      cwd: workingDirectory,
      env: buildResourceLimitedEnvironment(environment),
      stdio: "inherit",
      windowsHide: true,
    });
    guard = installCaptureProcessGuard(child, {
      label: "optional-mutation-test",
    });

    return await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (signal) {
          reject(new Error(`Stryker exited after signal ${signal}.`));
          return;
        }
        resolve(code ?? 1);
      });
    });
  } finally {
    if (child?.exitCode === null && guard) {
      await guard.terminate();
    } else {
      guard?.dispose();
    }
    process.off("exit", releaseLockOnExit);
    lock.release();
  }
}

module.exports = {
  OPT_IN_VARIABLE,
  acquireMutationLock,
  buildStrykerCliArgs,
  isMutationOptIn,
  runCli,
};

if (require.main === module) {
  runCli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error?.stack ?? error);
      process.exitCode = 1;
    });
}
