import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEntrySurfaceAcceptanceFixture } from './entry-surface-acceptance-fixture.mjs';

test('S07 public dry-run accepts a revalidated v2 fixture and rejects forged/foreign gates before native or write ports', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aur-s07-entry-gate-'));
  try {
    const source = createEntrySurfaceAcceptanceFixture(dir);
    const geometry = source.result.geometryProfile;
    const guard = join(dir, 'deny-native-and-writes.cjs');
    writeFileSync(guard, `const deny=()=>{throw Error('FORBIDDEN_NATIVE_OR_WRITE_PORT')};const cp=require('node:child_process');const fs=require('node:fs');for(const n of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])cp[n]=deny;for(const n of ['mkdirSync','writeFileSync','appendFileSync','renameSync','unlinkSync','rmSync'])fs[n]=deny;require('node:module').syncBuiltinESMExports();`);
    const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
    const profile = {
      version: 'aur-s07-runtime-profile/v1', id: 'offline-entry-binding-fixture',
      module: { ...geometry.module, area: geometry.area.resref, entryPoint: geometry.entryPoint.position },
      orderedHakList: geometry.orderedHakList,
      geometryGate: { status: 'verified', artifact: source.geometryProfilePath, sha256: hash(source.geometryProfilePath) },
      fixtures: geometry.fixtures,
      launch: { mode: 'user_owned_test_module_action', processName: 'nwmain' },
    };
    const profilePath = join(dir, 'runtime-profile.json');
    const runner = process.env.AURORA_ENTRY_TEST_S07_RUNNER || fileURLToPath(new URL('../../scripts/aur-s07-runtime-execution.mjs', import.meta.url));
    function run(value, command = 'dry-run') {
      writeFileSync(profilePath, JSON.stringify(value));
      const result = spawnSync(process.execPath, ['--max-old-space-size=1024', '--require', guard, runner, command, '--profile', profilePath, '--outDir', join(dir, 'runtime-output')], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
      assert.doesNotMatch(result.stderr + result.stdout, /FORBIDDEN_NATIVE_OR_WRITE_PORT/);
      return result;
    }
    const accepted = run(profile);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.equal(JSON.parse(accepted.stdout).startsNwn, false);
    const foreign = structuredClone(profile); foreign.module.entryPoint = [20, 20, 0];
    assert.match(run(foreign).stderr, /runtime_geometry_target_mismatch/);
    const fakePath = join(dir, 'forged.json'); writeFileSync(fakePath, JSON.stringify({ status: 'verified', entryPoint: { accessibleSurface: true } }));
    const fake = { ...profile, geometryGate: { status: 'verified', artifact: fakePath, sha256: hash(fakePath) } };
    assert.match(run(fake, 'arm').stderr, /ENTRY_GEOMETRY_VERSION_INVALID/);
    const tampered = structuredClone(geometry); tampered.entryPoint.position = [99, 99, 0];
    writeFileSync(fakePath, JSON.stringify(tampered)); fake.geometryGate.sha256 = hash(fakePath);
    assert.match(run(fake, 'dispatch-test-module').stderr, /ENTRY_(GEOMETRY|SOURCE|REQUEST)|ENOENT/);
  } finally {
    assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + '\\'));
    rmSync(dir, { recursive: true, force: true });
  }
});
