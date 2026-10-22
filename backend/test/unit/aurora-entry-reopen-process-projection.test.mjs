import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('existing producer projection preserves legacy DateTime and renders full UTC from a simulated object without a process probe', () => {
  const source = readFileSync(new URL('../../scripts/aurora-toolset-binary-module-native-geometry.mjs', import.meta.url), 'utf8');
  const match = source.match(/function toolsetProcesses\(\) \{ const raw = execFileSync\("powershell\.exe", \["-NoProfile", "-Command", ("(?:[^"\\]|\\.)*")\]/u);
  assert.ok(match, 'Locate the actual existing producer command without executing the runner');
  const command = JSON.parse(match[1]);
  const prefix = '@(Get-Process nwtoolset -ErrorAction SilentlyContinue | ';
  assert.ok(command.startsWith(prefix));
  const projection = '@($simulated | ' + command.slice(prefix.length);
  const timestamp = '2026-09-06T12:00:02.1234567Z';
  const script = `$ErrorActionPreference = 'Stop'
$simulated = [pscustomobject]@{
  Id = 314
  StartTime = [datetime]::ParseExact('${timestamp}', 'o', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind)
  MainWindowTitle = 'TEST SIMULATION ONLY'
  Responding = $true
}
${projection}`;
  assert.doesNotMatch(script, /Get-Process|Start-Process|nwtoolset|nwmain|user32/iu);
  // PowerShell performs only an in-memory projection of the literal object.
  const result = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true, timeout: 10000 }));
  assert.equal(result.Id, 314); assert.equal(result.Responding, true);
  assert.equal(result.StartTimeUtc, timestamp);
  assert.equal(result.StartTime, `/Date(${Date.parse(timestamp)})/`);
  assert.equal(result.MainWindowTitle, 'TEST SIMULATION ONLY');
});
