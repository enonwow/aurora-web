#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(import.meta.dirname, "build-area-source-proof-pack.mjs"),
  "utf8"
);

assert.match(
  source,
  /extractModuleIfoHakList/u,
  "packed source packs must expose the module.ifo HAK parser"
);
assert.match(
  source,
  /const moduleIfoHakListAuthoritative = Boolean\(ifoBytes\)/u,
  "source packs must distinguish a missing module.ifo from an authoritative empty HAK list"
);
assert.match(
  source,
  /const moduleIfoHakList = ifoBytes \? extractModuleIfoHakList\(ifoBytes\) : \[\]/u,
  "packed and loose source packs must parse the same already-read module.ifo bytes"
);
assert.match(
  source,
  /moduleIfoHakListAuthoritative\s*\?\s*moduleIfoHakList\s*:\s*priority\.length > 0/u,
  "an authoritative empty module HAK list must bypass configured HAK profiles and fall through to vanilla"
);
assert.match(
  source,
  /module-ifo-hak-list-then-vanilla/u,
  "proof output must diagnose the exact module-IFO-to-vanilla source resolution policy"
);
assert.match(
  source,
  /prefix:\s*"\/host\/nwn-user"/u,
  "runtime HAK paths must map the configured /host/nwn-user mount to the NWN user directory"
);

process.stdout.write(
  `${JSON.stringify({
    contract: "aurora-area-source-proof-pack-packed-hak-resolution/v1",
    status: "pass"
  })}\n`
);
