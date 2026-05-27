# Ghidra Export -> Backend Actions Map (R72, Agent F9)

Data: 2026-05-24  
Status: Draft (bridge mapping do implementacji)

## 1. Zakres

Mapowanie obejmuje typy eksportu Ghidra wynikajace z R71 (`manifest`, `imports`, `functions`, `call-edges`, `globals`, `strings`, `decomp`, `failed-decomp`, `quality-report`) i przypina je do konkretnych akcji backendowych w obszarach:
- `resolver`
- `settings`
- `jobs`
- `security`
- `benchmark`

## 2. Mapping Matrix (typ eksportu -> akcje backendowe + expected value)

| Typ eksportu Ghidra | Resolver action | Settings action | Jobs action | Security action | Benchmark action | Expected value |
|---|---|---|---|---|---|---|
| `manifest` (run metadata + export_types + record_counts) | `resolver.registerRunManifest(runId, binaryFingerprint, exportTypes)` | `settings.validateStandardVersion("r71+")` | `jobs.openImportRun(runId, expectedArtifacts)` | `security.verifyRunProvenance(manifest, checksums)` | `benchmark.recordRunEnvelopeLatency(runId)` | Deterministyczny punkt startowy ingestu; mniej "unknown run state"; szybsze fail-fast przy blednym runie. |
| `toolchain.json` | `resolver.bindToolchainProfile(runId, ghidraVersion, analyzerProfile)` | `settings.upsertToolchainCompatibility(profile)` | `jobs.attachRunContext(runId, toolchain)` | `security.auditToolchainDrift(runId, policyBaseline)` | `benchmark.tagRunWithToolchain(runId)` | Lepsza porownywalnosc wynikow miedzy runami i mniejszy drift interpretacji resolvera. |
| `checksums.sha256` | `resolver.rejectCorruptedArtifact(path, shaExpected, shaActual)` | `settings.enforceChecksumPolicy(required=true)` | `jobs.failImportOnIntegrityMismatch(runId)` | `security.raiseIntegrityIncident(code=GHX005)` | `benchmark.incrementIntegrityFailureRate()` | Odciecie skazonych danych przed parse; redukcja falszywych regresji i noise w pipeline. |
| `imports_all_*.jsonl` / import-export table | `resolver.upsertExternalSymbolIndex(binaryId, dll, symbol)` | `settings.applyImportNormalizationRules()` | `jobs.scheduleDependencyGraphBuild(runId)` | `security.flagRiskyImports(apiSet)` | `benchmark.measureDependencyGraphBuildMs()` | Szybsze mapowanie granic runtime i zaleznosci; wczesne sygnaly ryzyka API. |
| `functions_all_*.jsonl` (function inventory) | `resolver.upsertFunctionCatalog(functionKey, entryVa, flags)` | `settings.applyFunctionNoiseThresholds()` | `jobs.enqueueFunctionShardProcessing(runId, chunkId)` | `security.classifyFunctionSurface(functionFlags)` | `benchmark.trackFunctionCoverage(exported/expected)` | Stabilny indeks funkcji do `resolveMany`; przewidywalny chunking i coverage kontrolowany metrykami. |
| `call_edges_*.jsonl` / `xref/edges.ndjson` | `resolver.upsertXrefAndCallEdges(src, dst, kind)` | `settings.applyEdgeDedupPolicy()` | `jobs.runGraphCompaction(runId)` | `security.detectSuspiciousCallPatterns()` | `benchmark.trackGraphDensityAndBuildTime()` | Lepsza nawigacja semantyczna i priorytetyzacja hot-path; mniej duplikatow grafu. |
| `callgraph/nodes.ndjson` + `callgraph/edges.ndjson` | `resolver.materializeCallGraphSnapshot(runId)` | `settings.bindGraphShardLimits(maxNodes,maxEdges)` | `jobs.publishGraphStageResult(runId)` | `security.enforceNodeReferenceIntegrity()` | `benchmark.captureStageP95(stage="transform.main")` | Powtarzalny snapshot zaleznosci dla analiz zmian; mniej niedeterministycznych wynikow diff. |
| `globals` / data symbols / typed globals | `resolver.upsertGlobalSymbolTable(symbolId, type, address)` | `settings.applyTypeConfidencePolicy(minConfidence)` | `jobs.enqueueGlobalTypeReconciliation(runId)` | `security.scanGlobalsForSecretsAndKeys()` | `benchmark.trackTypeResolutionSuccessRate()` | Lepsza semantyka stanu globalnego i mniej bledow klasyfikacji obiektow runtime. |
| `strings/strings.ndjson` / filtered string corpus | `resolver.upsertStringIndex(stringId, valueHash, refs)` | `settings.applyStringNoiseFilters(minLen, printableRatio)` | `jobs.runStringXrefJoin(runId)` | `security.classifyAndMaskSensitiveStrings()` | `benchmark.trackStringSignalRatio(kept/extracted)` | Wyzszy sygnal analityczny i mniejszy szum; ograniczenie wycieku sekretow/PII do downstream. |
| `decompile/functions.ndjson` + `decompile/files/*.c` | `resolver.attachDecompileBody(functionKey, fileSha, signature)` | `settings.applyDecompilerConfidenceGates()` | `jobs.markDecompileStageCompleted(runId, chunkId)` | `security.runPseudocodeDLPScan()` | `benchmark.trackDecompSuccessAndP95()` | Najwyzsza wartosc poznawcza dla reverse; szybsze mapowanie logiki domenowej do backendu. |
| `failed-decomp` / asm fallback listing | `resolver.attachFallbackDisassembly(functionKey, reason)` | `settings.tuneRetryPolicyForDecompiler(maxAttempts=3)` | `jobs.queueDecompRetryOrFallback(runId)` | `security.auditRepeatedDecompilerFailures()` | `benchmark.trackFallbackRate()` | Utrzymanie coverage mimo bledow dekompilacji; brak "czarnych dziur" w analizie funkcji. |
| `quality-report` (`*.md` / quality summary) | `resolver.consumeQualityFlagsForRanking(functionKey, confidence)` | `settings.updateQualityThresholdProfile(profileId)` | `jobs.gateRunFinalizationOnQuality(report)` | `security.auditSuppressedFindingsAndOverrides()` | `benchmark.emitGateDecision(PASS|WARN|FAIL|REGRESSION)` | Kontrola jakosci runu przed freeze; mniej regresji wpuszczanych do kolejnych etapow. |

## 3. Reguly priorytetu wykonania akcji

1. Kolejnosc obligatoryjna: `manifest -> checksums/toolchain -> inventory/edges/strings -> decompile -> failed-decomp -> quality-report`.
2. `security` ma prawo zatrzymac run na kazdym etapie przy naruszeniu integralnosci lub policy.
3. `benchmark` nigdy nie wywoluje `apply`; zbiera tylko metryki i decyzje gate dla pipeline ingest/decode.

## 4. Definition of Done dla bridge F9

1. Kazdy typ eksportu ma przypieta akcje we wszystkich 5 domenach (`resolver/settings/jobs/security/benchmark`).
2. Kazda akcja daje mierzalny expected value (jakosc, deterministycznosc, bezpieczenstwo lub wydajnosc).
3. Mapping jest kompatybilny z kontraktami R63/R67/R69 i namingiem eksportu R71.
