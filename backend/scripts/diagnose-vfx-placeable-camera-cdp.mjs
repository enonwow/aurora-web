import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = Number(process.env.VFX_CAMERA_AUDIT_PORT ?? 9893);
const out = path.resolve(
  import.meta.dirname,
  "../docs/aurora-reverse/evidence/vfx-placeable-object-attachment-row50/web/profile-v2/camera-audit"
);
const profile = path.join(out, ".chrome-profile");
const route =
  "http://127.0.0.1:5197/dev/nwn-vfx-comparison" +
  "?fixture=vfx-broad-row50-placeable&capture=static-timeline&diagnostics=0";
const candidates = [
  { name: "x0-baseline", p: [0, 3.64587616, -5.49972596], l: [0, 1.01486231, -1.55686137] },
  { name: "x1", p: [1, 3.64587616, -5.49972596], l: [0, 1.01486231, -1.55686137] },
  { name: "x2", p: [2, 3.64587616, -5.49972596], l: [0, 1.01486231, -1.55686137] },
  { name: "x3", p: [3, 3.64587616, -5.49972596], l: [0, 1.01486231, -1.55686137] },
  { name: "x4", p: [4, 3.64587616, -5.49972596], l: [0, 1.01486231, -1.55686137] },
  { name: "x3-look05", p: [3, 3.64587616, -5.49972596], l: [0.5, 1.01486231, -1.55686137] },
  { name: "x3-high", p: [3, 4.6, -5.49972596], l: [0, 1.1, -1.55686137] },
  { name: "x4-high", p: [4, 4.6, -5.49972596], l: [0, 1.1, -1.55686137] }
  ,{ name: "x1-look-minus04", p: [1, 3.64587616, -5.49972596], l: [-0.4, 1.01486231, -1.55686137] }
  ,{ name: "x1-look-minus06", p: [1, 3.64587616, -5.49972596], l: [-0.6, 1.01486231, -1.55686137] }
  ,{ name: "x125-look-minus04", p: [1.25, 3.64587616, -5.49972596], l: [-0.4, 1.01486231, -1.55686137] }
  ,{ name: "x15-look-minus04", p: [1.5, 3.64587616, -5.49972596], l: [-0.4, 1.01486231, -1.55686137] }
  ,{ name: "x125-look-minus06", p: [1.25, 3.64587616, -5.49972596], l: [-0.6, 1.01486231, -1.55686137] }
  ,{ name: "x15-look-minus08", p: [1.5, 3.64587616, -5.49972596], l: [-0.8, 1.01486231, -1.55686137] }
  ,{ name: "x175-look-minus10", p: [1.75, 3.64587616, -5.49972596], l: [-1, 1.01486231, -1.55686137] }
];

fs.mkdirSync(out, { recursive: true });
fs.rmSync(profile, { recursive: true, force: true });
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--disable-extensions",
    `--remote-debugging-port=${port}`,
    "--window-size=880,750",
    `--user-data-dir=${profile}`,
    route
  ],
  { windowsHide: true }
);

let socket;
try {
  const tab = await waitForTab();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(JSON.stringify(message.error)));
    else handler.resolve(message.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 880,
    height: 750,
    deviceScaleFactor: 1,
    mobile: false
  });
  await waitForRunner(send);

  for (const candidate of candidates) {
    const response = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const dev = window.__AURORA_VFX_DEV_SCENE__;
        if (!dev?.camera) return false;
        dev.camera.position.set(...${JSON.stringify(candidate.p)});
        dev.camera.lookAt(...${JSON.stringify(candidate.l)});
        dev.camera.updateMatrixWorld(true);
        window.__AURORA_VFX_PROOF_RENDER_AT__(3);
        return true;
      })()`
    });
    if (response.result.value !== true) {
      throw new Error(`Could not apply candidate ${candidate.name}.`);
    }
    await sleep(100);
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    fs.writeFileSync(
      path.join(out, `${candidate.name}.png`),
      Buffer.from(screenshot.data, "base64")
    );
  }
  console.log(
    JSON.stringify(
      {
        status: "complete",
        route,
        candidates: candidates.map((candidate) => ({
          ...candidate,
          path: path.join(out, `${candidate.name}.png`)
        }))
      },
      null,
      2
    )
  );
} finally {
  socket?.close();
  chrome.kill("SIGTERM");
  await sleep(1000);
  if (chrome.exitCode === null) chrome.kill("SIGKILL");
  fs.rmSync(profile, { recursive: true, force: true });
}

async function waitForTab() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const tab = tabs.find(
        (entry) => entry.type === "page" && entry.url.startsWith(route)
      );
      if (tab) return tab;
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error("Camera-audit Chrome tab did not appear.");
}

async function waitForRunner(send) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const response = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const runner = document.querySelector('[data-testid="nwn-vfx-comparison-runner"]');
        return runner ? {
          state: runner.dataset.renderState,
          message: runner.dataset.message,
          hook: typeof window.__AURORA_VFX_PROOF_RENDER_AT__ === 'function'
        } : null;
      })()`
    });
    if (response.result.value?.state === "ready" && response.result.value?.hook) {
      return;
    }
    await sleep(100);
  }
  throw new Error("Camera-audit runner did not become ready.");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
