import assert from "node:assert/strict";

import { assertRequestedVfxFixture } from "./lib/vfx-fixture-capture-contract.mjs";

assert.doesNotThrow(() =>
  assertRequestedVfxFixture({
    requestedFixtureId: "vfx-broad-row181",
    renderedFixtureId: "vfx-broad-row181"
  })
);

assert.throws(
  () =>
    assertRequestedVfxFixture({
      requestedFixtureId: "vfx-broad-row181",
      renderedFixtureId: "vfx-retail-dm-visualeffect-row-68-duration-0"
    }),
  /requested 'vfx-broad-row181'.*rendered 'vfx-retail-dm-visualeffect-row-68-duration-0'/u
);

assert.throws(
  () =>
    assertRequestedVfxFixture({
      requestedFixtureId: "vfx-broad-row181",
      renderedFixtureId: ""
    }),
  /did not report a fixture id/u
);

console.log(
  JSON.stringify({
    contract: "aurora-vfx-fixture-capture-contract/v1",
    status: "pass"
  })
);
