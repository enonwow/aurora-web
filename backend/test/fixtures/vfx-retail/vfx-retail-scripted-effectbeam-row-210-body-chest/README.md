# VFX Retail Fixture Template

This directory is a template only. It is not retail evidence.

Copy it to `backend/test/fixtures/vfx-retail/<fixtureId>/`, replace every
`TODO`, `null`, and `missing` placeholder with captured retail evidence, then
update `backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json` with
relative paths and SHA-256 hashes.

Do not mark a fixture `passed` or set `behaviorClaim: "canonical"` until the
parity gate accepts the fixture with real retail build, source, parser,
resolver, runtime, render, capture, and comparison artifacts.
