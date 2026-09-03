export function assertRequestedVfxFixture({ requestedFixtureId, renderedFixtureId }) {
  const requested = String(requestedFixtureId ?? "").trim();
  const rendered = String(renderedFixtureId ?? "").trim();
  if (!rendered) {
    throw new Error(`VFX capture runner did not report a fixture id for requested '${requested}'.`);
  }
  if (requested !== rendered) {
    throw new Error(
      `VFX capture fixture mismatch: requested '${requested}', rendered '${rendered}'. ` +
        "The capture is rejected before any proof artifact is written."
    );
  }
}
