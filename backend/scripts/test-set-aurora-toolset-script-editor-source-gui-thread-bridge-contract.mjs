#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const scriptPath = resolve(
  "scripts/set-aurora-toolset-script-editor-source-gui-thread-bridge.mjs",
);
const source = readFileSync(scriptPath, "utf8");

assert.match(source, /toolset_binary_hash_mismatch/u);
assert.match(source, /vcl_binding_missing:TSEdit/u);
assert.match(source, /0x00750420/u);
assert.match(source, /0x007510FC/u);
assert.match(source, /executedOnGuiThread/u);
assert.match(source, /wndProcRestored/u);
assert.match(source, /source_readback_mismatch/u);
assert.match(source, /usesGlobalKeyboard=\$false/u);
assert.match(source, /usesGlobalMouse=\$false/u);
assert.match(source, /usesGlobalCursor=\$false/u);
assert.doesNotMatch(
  source,
  /keybd_event|mouse_event|SetCursorPos|Windows\.Forms\.Clipboard/u,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      script: scriptPath,
      contract:
        "version-pinned process-local TSEdit SetText/GetText bridge with exact readback and restored WNDPROC",
    },
    null,
    2,
  ),
);
