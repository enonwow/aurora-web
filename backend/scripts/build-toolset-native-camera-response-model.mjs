#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildNativeToolsetCameraResponseModel } from "./lib/toolset-native-camera-response-model.mjs";

const options = parseArgs(process.argv.slice(2));
const inputPaths = required(options.inputs, "--inputs").split(",").map((value) => resolve(value.trim()));
const model = buildNativeToolsetCameraResponseModel({
  command: required(options.command, "--command"),
  transitions: inputPaths.map((path, index) => {
    const document = JSON.parse(readFileSync(path, "utf8"));
    return { id: document?.nativeTransition?.id ?? `${index + 1}:${path}`, ...(document?.nativeTransition ?? document) };
  }),
});
const out = resolve(required(options.out, "--out"));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(model, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, out, model }, null, 2));

function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index]; const value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error("Expected --key value arguments."); result[key.slice(2)] = value; } return result; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
