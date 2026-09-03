#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { assembleAuroraToolsetProofPacket } from "./lib/aurora-toolset-proof-packet.mjs";

const options = parseArgs(process.argv.slice(2));
const output = resolve(requiredText(options.out, "--out"));
const observation = mergeCameraCalibration(
  readJson(options.observation, "--observation"),
  options.cameraCalibration ? readJson(options.cameraCalibration, "--cameraCalibration") : null,
);
const packet = assembleAuroraToolsetProofPacket({
  session: readJson(options.session, "--session"),
  observation,
  targetReport: readJson(options.targetReport, "--targetReport"),
  tileReadback: options.tileReadback ? readJson(options.tileReadback, "--tileReadback") : null,
  monitorEvidence: options.monitorEvidence ? readJson(options.monitorEvidence, "--monitorEvidence") : null,
  absoluteCoreResult: options.absoluteCoreResult ? readJson(options.absoluteCoreResult, "--absoluteCoreResult") : null,
  eyeEvidence: {
    beforeA: options.eyeBeforeA ? readJson(options.eyeBeforeA, "--eyeBeforeA") : null,
    beforeB: options.eyeBeforeB ? readJson(options.eyeBeforeB, "--eyeBeforeB") : null,
    after: options.eyeAfter ? readJson(options.eyeAfter, "--eyeAfter") : null,
    baseline: options.eyeBaseline ? readJson(options.eyeBaseline, "--eyeBaseline") : null,
    effect: options.eyeEffect ? readJson(options.eyeEffect, "--eyeEffect") : null,
  },
});
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: packet.status, blockerCodes: packet.blockerCodes, out: output }, null, 2));

function mergeCameraCalibration(observation, calibration) {
  if (calibration?.status !== "estimated" || !Number.isFinite(Number(calibration?.yawDegrees))) return observation;
  return {
    ...observation,
    cameraPose: {
      ...(observation?.cameraPose ?? {}),
      status: observation?.cameraPose?.status === "estimated" ? "estimated" : observation?.cameraPose?.status ?? "blocked",
      yawDegrees: Number(calibration.yawDegrees),
      yawEvidence: calibration.yawEvidence ?? null,
    },
  };
}

function readJson(value, name) { const path = resolve(requiredText(value, name)); if (!existsSync(path)) throw new Error(`${name} does not exist: ${path}`); return JSON.parse(readFileSync(path, "utf8")); }
function requiredText(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 1) { const key = argv[i]; const value = argv[i + 1]; if (!key.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Invalid argument near ${key}.`); result[key.slice(2)] = value; i += 1; } return result; }
