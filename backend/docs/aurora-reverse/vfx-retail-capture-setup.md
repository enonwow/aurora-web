# VFX Retail Capture Setup

Status: repo-side setup for `VFX-P12-A`. This is not retail evidence and does
not unblock `VFX-P12` by itself.

Use this document when creating real NWN retail capture packs under:

```text
backend/test/fixtures/vfx-retail/<fixtureId>/
```

The `_template` directory is a scaffold only. It contains explicit `TODO`,
`null`, and `missing` placeholders so the repository can prepare capture work
without pretending a retail run happened.

## Choose Retail Build And Profile

1. Use an installed, runnable retail NWN client. Do not use frontend preview,
   GLB conversion output, Three.js smoke tests, or generated screenshots.
2. Pick one build/profile before recording any fixture:
   - client name, for example `NWN:EE retail`;
   - build id and version from the client/about/build metadata;
   - platform and renderer environment;
   - build/profile id used for capture;
   - module/profile used for capture;
   - ordered HAK list and per-HAK SHA-256 hashes;
   - runtime-settings revision and SHA-256 hash.
3. Record the selected build/profile in each fixture pack's
   `retail-build.json`.
4. If the build/profile changes, start a new capture pack or clearly record the
   changed profile. Do not mix artifacts from different builds in one fixture.

## Create Fixture Directory

The fixture directory name must match the manifest `fixtureId` exactly:

```text
backend/test/fixtures/vfx-retail/<fixtureId>/
```

Use lowercase letters, numbers, dots, underscores, and hyphens. Do not use path
segments, spaces, or `_template` as a fixture id.

Helper command from `backend`:

```powershell
npx ts-node --transpile-only scripts/create-vfx-retail-fixture-pack.ts <fixtureId>
```

The helper copies `backend/test/fixtures/vfx-retail/_template/`, refuses to
overwrite an existing fixture directory, stamps the JSON `fixtureId`, and does
not modify `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json`.

Manual equivalent:

```powershell
Copy-Item -Recurse test/fixtures/vfx-retail/_template test/fixtures/vfx-retail/<fixtureId>
```

After manual copy, replace the top-level `fixtureId` in every JSON file with the
real fixture id.

## Required Files

Each fixture pack must contain:

```text
retail-build.json
source-table.snapshot.json
effect-context.json
parser-snapshot.json
resolver-trace.json
runtime-tick-dump.json
render-contract-snapshot.json
capture.json
comparison.json
```

Screenshots or videos can be added next to those JSON files, for example
`frame-0001.png` or `capture.mp4`, but media alone is never parity evidence.

## Final `retail-build.json` Format

`retail-build.json` must include at least:

- `client.name`, `client.buildId`, and `client.version`.
- `platform.os`, `platform.architecture`, renderer/GPU/driver details when
  available.
- `buildProfile.profileId`, `buildProfile.profileName`, retail branch/profile,
  language, low-violence, and low-quality settings.
- `moduleProfile.moduleName`, `moduleProfile.modulePath`,
  `moduleProfile.moduleHashSha256`, module/profile id, area tag, and camera
  setup id.
- `hakProfile.profileId`, ordered `hakProfile.hakList[]`, each HAK hash, and
  `hakProfile.hakListHashSha256`.
- `runtimeSettings.revision`, `runtimeSettings.hashSha256`, path, and selected
  `sources.vfx` profile.
- `captureEnvironment.machineName`, operator, timezone, capture start/end time,
  and capture tooling.
- `operatorNotes`.

Keep unknown values as `null` or `TODO` until they are known. A fixture with
unknown retail-build fields must stay blocked.

## Compute SHA-256

Use hashes for the exact committed artifact files.

PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 test/fixtures/vfx-retail/<fixtureId>/parser-snapshot.json
```

For all JSON artifacts in one fixture:

```powershell
Get-ChildItem test/fixtures/vfx-retail/<fixtureId> -File |
  Where-Object { $_.Extension -in ".json", ".png", ".mp4" } |
  ForEach-Object {
    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName
    "$($hash.Hash)  $($_.Name)"
  }
```

Record hashes in uppercase or lowercase consistently. The manifest only becomes
useful when hashes describe the exact files committed to the repo.

## Fill The Manifest

Update `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` after
capturing artifacts:

- `retailBuild.buildId`, `retailBuild.buildProfile`, `retailBuild.client`,
  `retailBuild.captureMachine`, and `retailBuild.evidenceRef`.
- `source.tableName`, `source.profile`, `source.tableHash`, `source.rowId`,
  `source.label`, and `source.sourceAuthority`.
- `effectContext.*`, including raw DM command or NWScript invocation.
- `parserSnapshot.path`, `parserSnapshot.hash`, and `parserSnapshot.capturedAt`.
- `resolverTrace.path`, `resolverTrace.hash`, and `resolverTrace.capturedAt`.
- `runtimeTickDump.path`, `runtimeTickDump.hash`, and
  `runtimeTickDump.capturedAt`.
- `renderContractSnapshot.path`, `renderContractSnapshot.hash`, and
  `renderContractSnapshot.capturedAt`.
- `captureReference.screenshotPath`, `captureReference.videoPath`, or
  `captureReference.captureReference`.
- `comparison.path`, `comparison.hash`, `comparison.result`, and
  `comparison.comparedAt`.
- `status`: keep `missing` until capture exists, `captured` until comparison is
  done, `compared` while inconclusive, `passed` only after real evidence and a
  passing comparison, `failed` for evidenced failures, and `unknown` for required
  families with unresolved exact row/model/profile.
- `behaviorClaim`: keep `diagnostic` or `preview_only` unless the gate returns
  canonical allowed for that exact fixture.

Use backend-relative paths such as:

```text
test/fixtures/vfx-retail/<fixtureId>/parser-snapshot.json
```

## Run The Gate

From `backend`:

```powershell
npx ts-node --transpile-only scripts/validate-vfx-retail-parity.ts
npm run test:unit -- --runTestsByPath test/unit/aurora-vfx-retail-parity-gate.spec.ts test/unit/aurora-vfx-retail-capture-setup.spec.ts
npm run build
```

The validation script exits non-zero while fixtures are blocked. That is
expected until all required retail artifacts and comparison JSON files exist.

## Fixture Family Checklist

Keep these ten fixture families represented in the manifest and backed by
capture packs:

- [ ] `dm_visualeffect <row> <duration>`
- [ ] Scripted `EffectVisualEffect`
- [ ] Scripted `EffectBeam`
- [ ] Explosion plus detonate
- [ ] Fountain plus atlas playback
- [ ] Chunk particles
- [ ] P2P gravity/reference node
- [ ] Linked chain
- [ ] Punch-Through versus mode `2`/Lighten
- [ ] PLT visual with known layer colors

For each family, confirm the selected retail row/model/profile before capture,
then preserve the source table hash, effect context, parser snapshot, resolver
trace, runtime tick dump, render contract snapshot, retail capture metadata, and
comparison JSON.

## Not Parity Evidence

Do not use any of these to mark a fixture `passed` or a behavior `canonical`:

- screenshot/video without parser snapshot, resolver trace, runtime tick dump,
  render contract snapshot, retail build/profile, and comparison JSON;
- GLB `emitter_proxy` output;
- glTF `extras`;
- placeable VFX preview payloads;
- frontend smoke tests;
- Three.js material settings, `SpriteMaterial`, or adapter behavior;
- selected-source 2DA rows without retail execution/capture;
- generated/fake screenshots, videos, capture JSON, or comparison JSON.

`VFX-P12` remains `Blocked` until the manifest contains real retail capture
packs and the gate allows canonical for every required fixture.
