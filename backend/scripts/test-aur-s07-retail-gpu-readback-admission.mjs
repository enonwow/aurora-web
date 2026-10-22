#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assessRetailGpuReadbackAdmission,
  buildRetailGpuReadbackContextDiscoveryPlan,
  classifyRenderDocOpenGlContext,
  validateRetailGpuReadbackBootstrapProfile,
  validateRetailGpuReadbackLiveBinding,
  validateRetailGpuReadbackProfile,
} from "./lib/aur-s07-retail-gpu-readback-admission.mjs";

const directory = mkdtempSync(join(tmpdir(), "aur-s07-gpu-admission-"));

try {
  const files = Object.fromEntries(
    ["renderdoccmd.exe", "nwmain.exe", "module.mod", "ordered.hak", "effect.mdl"].map((name) => {
      const path = join(directory, name);
      const bytes = Buffer.from(`fixture:${name}`);
      writeFileSync(path, bytes);
      return [name, { path, sha256: createHash("sha256").update(bytes).digest("hex") }];
    }),
  );

  const validProfile = () => ({
    version: "aur-s07-retail-gpu-readback-profile/v1",
    id: "fnf-two-instance-retail-gpu-readback-v1",
    captureTool: {
      kind: "renderdoc",
      executablePath: files["renderdoccmd.exe"].path,
      executableSha256: files["renderdoccmd.exe"].sha256,
      version: "1.42",
      architecture: "x64",
    },
    target: {
      processName: "nwmain.exe",
      executablePath: files["nwmain.exe"].path,
      executableSha256: files["nwmain.exe"].sha256,
      fileVersion: "89.8193.37-17",
    },
    module: {
      path: files["module.mod"].path,
      sha256: files["module.mod"].sha256,
      area: "vfx_gpu_probe",
    },
    orderedHakList: [
      { order: 0, name: "ordered.hak", path: files["ordered.hak"].path, sha256: files["ordered.hak"].sha256 },
    ],
    resources: [
      { resref: "tlc_smiwhid", type: "mdl", path: files["effect.mdl"].path, sha256: files["effect.mdl"].sha256 },
    ],
    display: {
      logicalTarget: "screen2",
      expectedDevice: "\\\\.\\DISPLAY1",
      primary: false,
    },
    fixture: {
      localPhase: 0.375,
      instances: [
        { id: "A", position: [10, 20, 0], yawDegrees: 0, scale: 1 },
        { id: "B", position: [14, 23, 0], yawDegrees: 90, scale: 2 },
      ],
    },
    requiredObservation: {
      vertexInputs: ["vPos", "vColor", "vTcIn"],
      uniforms: ["m_mv", "m_view_inv", "m_texture"],
      pipeline: ["program", "material"],
      cpuCorrelation: ["emitterCenter", "particleCenter", "explicitAbsence"],
    },
    ownership: {
      owner: "AUR-S07 central retail GPU readback route",
      admissionLeasePath: join(directory, "gpu-capture.lock"),
      cancellationReceiptPath: join(directory, "cancel.json"),
      recoveryReceiptPath: join(directory, "recovery.json"),
    },
    resume: {
      manifestPath: join(directory, "resume-manifest.json"),
      capturePath: join(directory, "capture.rdc"),
      readbackPath: join(directory, "draw-readback.json"),
    },
  });

  const validLiveBinding = () => ({
    version: "aur-s07-retail-gpu-readback-live-binding/v1",
    runtimeIdentity: {
      pid: 4100,
      startedAtUtc: "2026-09-13T08:00:00.000Z",
      hwnd: 55001,
    },
    graphicsContext: {
      status: "observed",
      api: "OpenGL",
      version: "4.6",
      profile: "core",
      evidenceLines: ["OpenGL 4.6 Core Profile"],
    },
  });

  const admitted = assessRetailGpuReadbackAdmission(validProfile());
  assert.equal(admitted.status, "offline-admitted");
  assert.deepEqual(admitted.blockers, []);
  assert.equal(admitted.safety.launchesProcess, false);
  assert.equal(admitted.safety.attachesToProcess, false);
  assert.equal(admitted.safety.capturesFrame, false);

  {
    const profile = validProfile();
    profile.captureTool.executablePath = join(directory, "missing-renderdoccmd.exe");
    const result = assessRetailGpuReadbackAdmission(profile);
    assert.equal(result.status, "blocked");
    assert(result.blockers.includes("renderdoc_executable_missing"));
  }

  {
    const profile = validProfile();
    profile.target.executableSha256 = "0".repeat(64);
    const result = assessRetailGpuReadbackAdmission(profile);
    assert.equal(result.status, "blocked");
    assert(result.blockers.includes("target_executable_hash_mismatch"));
  }

  for (const mutate of [
    (profile) => { profile.display.primary = true; },
    (profile) => { profile.fixture.instances[1].position = [...profile.fixture.instances[0].position]; },
    (profile) => { profile.fixture.instances[1].yawDegrees = profile.fixture.instances[0].yawDegrees; },
    (profile) => { profile.fixture.instances[1].scale = 1; },
    (profile) => { profile.requiredObservation.uniforms = ["m_mv", "m_texture"]; },
  ]) {
    const profile = validProfile();
    mutate(profile);
    assert.throws(() => validateRetailGpuReadbackBootstrapProfile(profile), /retail_gpu_readback_profile_/);
  }

  assert.doesNotThrow(() => validateRetailGpuReadbackProfile(validProfile()));
  assert.doesNotThrow(() => validateRetailGpuReadbackLiveBinding(validLiveBinding()));

  {
    const binding = validLiveBinding();
    delete binding.runtimeIdentity.startedAtUtc;
    assert.throws(() => validateRetailGpuReadbackLiveBinding(binding), /retail_gpu_readback_live_binding_/);
  }

  {
    const binding = validLiveBinding();
    binding.graphicsContext.profile = "compatibility";
    assert.doesNotThrow(() => validateRetailGpuReadbackLiveBinding(binding));
  }

  assert.deepEqual(
    classifyRenderDocOpenGlContext("API: OpenGL 4.6 Core Profile Context\n"),
    {
      status: "observed",
      api: "OpenGL",
      version: "4.6",
      profile: "core",
      evidenceLines: ["API: OpenGL 4.6 Core Profile Context"],
    },
  );
  assert.equal(classifyRenderDocOpenGlContext("OpenGL 4.5 Compatibility Profile").profile, "compatibility");
  assert.equal(classifyRenderDocOpenGlContext("OpenGL version 4.6").profile, "unknown");
  assert.deepEqual(classifyRenderDocOpenGlContext("renderer: NVIDIA"), {
    status: "not-observed",
    api: "OpenGL",
    version: null,
    profile: "unknown",
    evidenceLines: [],
  });

  {
    const plan = buildRetailGpuReadbackContextDiscoveryPlan(validProfile(), validLiveBinding().runtimeIdentity);
    assert.deepEqual(plan.command.slice(1, 3), ["inject", "--PID=4100"]);
    assert(plan.command.includes(`--capture-file=${validProfile().resume.capturePath}`));
    assert.equal(plan.contextExpectation.profile, "unknown");
    assert.equal(plan.safety.executesCommand, false);
  }

  {
    const profilePath = join(directory, "profile.json");
    const outPath = join(directory, "admission.json");
    writeFileSync(profilePath, `${JSON.stringify(validProfile(), null, 2)}\n`);
    const command = spawnSync(process.execPath, [
      join(import.meta.dirname, "aur-s07-retail-gpu-readback.mjs"),
      "doctor",
      "--profile",
      profilePath,
      "--out",
      outPath,
    ], { encoding: "utf8", windowsHide: true });
    assert.equal(command.status, 0, command.stderr);
    const stdout = JSON.parse(command.stdout);
    const manifest = JSON.parse(readFileSync(outPath, "utf8"));
    assert.equal(stdout.status, "offline-admitted");
    assert.equal(manifest.profileSha256, createHash("sha256").update(readFileSync(profilePath)).digest("hex"));
    assert.equal(manifest.nextAction, "live-tool-and-context-qualification-required");
  }

  {
    const profilePath = join(directory, "plan-profile.json");
    const runtimePath = join(directory, "runtime-identity.json");
    const outPath = join(directory, "context-discovery-plan.json");
    writeFileSync(profilePath, `${JSON.stringify(validProfile(), null, 2)}\n`);
    writeFileSync(runtimePath, `${JSON.stringify(validLiveBinding().runtimeIdentity, null, 2)}\n`);
    const command = spawnSync(process.execPath, [
      join(import.meta.dirname, "aur-s07-retail-gpu-readback.mjs"),
      "plan-context-discovery",
      "--profile",
      profilePath,
      "--runtime-identity",
      runtimePath,
      "--out",
      outPath,
    ], { encoding: "utf8", windowsHide: true });
    assert.equal(command.status, 0, command.stderr);
    const stdout = JSON.parse(command.stdout);
    const plan = JSON.parse(readFileSync(outPath, "utf8"));
    assert.equal(stdout.command, "plan-context-discovery");
    assert.equal(plan.executablePlan.contextExpectation.profile, "unknown");
    assert.equal(plan.executablePlan.exactTarget.pid, 4100);
    assert.equal(plan.safety.executed, false);
  }

  process.stdout.write(`${JSON.stringify({ ok: true, tests: 19 })}\n`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
