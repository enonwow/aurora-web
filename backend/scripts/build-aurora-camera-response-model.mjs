#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const kind = required(options.kind, "--kind");
const paths = required(options.inputs, "--inputs").split(",").map((value) => resolve(value.trim()));
const samples = paths.map((path) => ({ path, transition: JSON.parse(readFileSync(path, "utf8")) }));
if (samples.length < 3) throw new Error("At least three measured transitions are required.");
const values = samples.map(({ transition }) => {
  const measurement = transition?.visualProof?.cameraMeasurement?.commandMeasurement;
  if (measurement?.status !== "measured" || !Number.isFinite(Number(measurement.ratio ?? measurement.value))) throw new Error("Transition has no measured response.");
  return Number(measurement.ratio ?? measurement.value);
});
const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
const stdDev = Math.sqrt(values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length);
const model = { version: "aurora-camera-response-model/v1", status: "verified", kind, sampleCount: values.length, values, mean, stdDev, coefficientOfVariation: Math.abs(mean) > 0 ? stdDev / Math.abs(mean) : null, samples: samples.map(({ path }) => path), generatedAt: new Date().toISOString() };
const out = resolve(required(options.out, "--out")); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, `${JSON.stringify(model, null, 2)}\n`); console.log(JSON.stringify(model, null, 2));
function parseArgs(argv) { const result = {}; for (let i=0;i<argv.length;i+=2) { const key=argv[i]; const value=argv[i+1]; if (!key?.startsWith("--") || value===undefined) throw new Error("Expected --key value arguments."); result[key.slice(2)]=value; } return result; }
function required(value, name) { const text=String(value??"").trim(); if(!text) throw new Error(`${name} is required.`); return text; }
