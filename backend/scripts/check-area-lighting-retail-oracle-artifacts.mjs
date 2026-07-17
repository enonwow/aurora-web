#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRootDefault = resolve(scriptDir, "..", "..");

const REPORT_VERSION = "aurora-area-lighting-retail-oracle-artifacts/v1";
const DEFAULT_OUTPUT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-oracle-artifact-gate.json";
const DEFAULT_SEARCH_ROOTS = [
  "backend/docs/aurora-reverse/artifacts",
  "docs/aurora-reverse/artifacts",
];

const ORACLE_BLOCKERS = [
  {
    key: "retail-shadow-volume-projection-parity",
    label: "Retail shadow-volume projection parity",
    cases: [
      {
        caseId: "shadowvol-campfire-pixel-geometry-opacity",
        requiredArtifacts: [
          "retail-or-toolset-shadowvol-campfire.png",
          "aurora-web-shadowvol-campfire.png",
          "shadowvol-campfire-pixel-compare.json",
        ],
        currentEvidence: [
          "retail-shadowvol-projection-proof.json",
          "retail-shadowsize-shadow-mdl-proof.json",
          "area-lighting-retail-runtime-oracle-pack-proof.json",
          "oracle-module-fixture-no-input-proof.json",
          "area-lighting-local-oracle-inputs-manifest.json",
          "area-lighting-pixel-diff-artifacts.json",
          "retail-or-toolset-shadowvol-campfire.png",
          "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.png",
          "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.frame.json",
          "aurora-web-shadowvol-campfire.png",
          "shadowvol-campfire-pixel-compare.json",
          "shadowvol-campfire-retail-web-diff-normalized.png",
        ],
        acceptanceGate:
          "Projected footprint, receiver alignment, and opacity must match a retail/toolset campfire capture within an explicit tolerance.",
      },
      {
        caseId: "shadowvol-retail-gl-state-order",
        requiredArtifacts: [
          "retail-shadowvol-state-trace.json",
          "aurora-web-shadowvol-state-trace.json",
          "shadowvol-state-order-compare.json",
        ],
        currentEvidence: [
          "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped",
          "retail-shadowvol-state-trace.json",
          "aurora-web-shadowvol-state-trace.json",
          "shadowvol-state-order-compare.json",
          "retail-shadowvol-projection-proof.json",
          "source-backed-shadowvol-local-material-state-captured-retail-op-sequence-pixel-parity-blocked",
        ],
        acceptanceGate:
          "Retail and Aurora Web must agree on pass order, face mapping, stencil ops, receiver stencil/depth/color state, and opacity source.",
      },
    ],
  },
  {
    key: "retail-cross-lane-active-light-ordering",
    label: "Retail cross-lane active light ordering",
    cases: [
      {
        caseId: "cross-lane-all-required-lanes-retail-precedence",
        requiredArtifacts: [
          "retail-cross-lane-all-lanes-before-budget.png",
          "retail-cross-lane-all-lanes-after-budget.png",
          "retail-cross-lane-active-slots.json",
          "aurora-web-cross-lane-all-lanes.frame.json",
          "cross-lane-precedence-compare.json",
        ],
        currentEvidence: [
          "area-lighting-retail-runtime-oracle-pack-proof.json",
          "cross-lane-active-slot-blocker-proof.json",
          "cross-lane-retail-maxlight-roi-diagnostics.json",
          "cross-lane-retail-maxlight-roi-diagnostics-no-progfx.json",
          "cross-lane-retail-maxlight-roi-diagnostics-no-placeable.json",
          "cross-lane-retail-maxlight-roi-diagnostics-no-mdl.json",
          "cross-lane-retail-maxlight-roi-diagnostics-no-tile-main.json",
          "cross-lane-retail-maxlight-roi-diagnostics-no-tile-source.json",
          "retail-cross-lane-max-light-variant-observation.json",
          "retail-cross-lane-no-item-max-light-variant-observation.json",
          "retail-cross-lane-no-progfx-max-light-variant-observation.json",
          "retail-cross-lane-no-placeable-max-light-variant-observation.json",
          "retail-cross-lane-no-mdl-max-light-variant-observation.json",
          "retail-cross-lane-no-tile-main-max-light-variant-observation.json",
          "retail-cross-lane-no-tile-source-max-light-variant-observation.json",
          "retail-cross-lane-openpad-smoke.png",
          "retail-ref-tile-main-light.png",
          "retail-ref-tile-source-light.png",
          "retail-ref-placeable-lightcolor.png",
          "retail-ref-mdl-source-light.png",
          "retail-ref-item-property-light.png",
          "retail-ref-progfx-type4-light.png",
          "retail-cross-lane-default-maxlights-roi-heatmap.png",
          "retail-cross-lane-maxlights-1-roi-heatmap.png",
          "retail-cross-lane-maxlights-2-roi-heatmap.png",
          "retail-cross-lane-maxlights-3-roi-heatmap.png",
          "retail-cross-lane-maxlights-4-roi-heatmap.png",
          "retail-cross-lane-maxlights-5-roi-heatmap.png",
          "retail-cross-lane-maxlights-6-roi-heatmap.png",
          "retail-cross-lane-maxlights-8-roi-heatmap.png",
          "retail-cross-lane-maxlights-32-roi-heatmap.png",
          "retail-cross-lane-maxlights-1-vs-2-before-roi-heatmap.png",
          "retail-cross-lane-maxlights-1-vs-2-after-roi-heatmap.png",
          "retail-cross-lane-maxlights-2-vs-3-before-roi-heatmap.png",
          "retail-cross-lane-maxlights-2-vs-3-after-roi-heatmap.png",
          "retail-cross-lane-maxlights-3-vs-4-before-roi-heatmap.png",
          "retail-cross-lane-maxlights-3-vs-4-after-roi-heatmap.png",
          "retail-cross-lane-maxlights-4-vs-5-before-roi-heatmap.png",
          "retail-cross-lane-maxlights-4-vs-5-after-roi-heatmap.png",
          "retail-cross-lane-maxlights-5-vs-6-before-roi-heatmap.png",
          "retail-cross-lane-maxlights-5-vs-6-after-roi-heatmap.png",
          "retail-cross-lane-maxlights-6-vs-8-before-roi-heatmap.png",
          "retail-cross-lane-maxlights-6-vs-8-after-roi-heatmap.png",
          "retail-cross-lane-maxlights-8-vs-32-before-roi-heatmap.png",
          "retail-cross-lane-maxlights-8-vs-32-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-1-before-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-1-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-1-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-2-before-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-2-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-2-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-3-before-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-3-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-3-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-4-before-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-4-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-4-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-5-before-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-5-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-5-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-6-before-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-6-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-6-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-8-before-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-8-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-8-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-32-before-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-32-after-roi-heatmap.png",
          "retail-cross-lane-no-item-ablation-maxlights-32-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-1-before-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-1-after-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-1-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-2-before-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-2-after-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-2-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-3-before-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-3-after-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-3-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-4-before-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-4-after-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-4-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-5-before-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-5-after-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-5-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-6-before-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-6-after-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-6-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-8-before-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-8-after-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-8-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-32-before-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-32-after-roi-heatmap.png",
          "retail-cross-lane-no-progfx-ablation-maxlights-32-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-1-before-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-1-after-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-1-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-2-before-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-2-after-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-2-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-3-before-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-3-after-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-3-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-4-before-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-4-after-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-4-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-5-before-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-5-after-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-5-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-6-before-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-6-after-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-6-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-8-before-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-8-after-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-8-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-32-before-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-32-after-roi-heatmap.png",
          "retail-cross-lane-no-placeable-ablation-maxlights-32-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-1-before-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-1-after-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-1-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-2-before-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-2-after-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-2-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-3-before-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-3-after-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-3-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-4-before-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-4-after-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-4-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-5-before-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-5-after-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-5-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-6-before-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-6-after-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-6-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-8-before-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-8-after-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-8-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-32-before-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-32-after-roi-heatmap.png",
          "retail-cross-lane-no-mdl-ablation-maxlights-32-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-1-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-1-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-1-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-2-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-2-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-2-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-3-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-3-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-3-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-4-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-4-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-4-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-5-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-5-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-5-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-6-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-6-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-6-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-8-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-8-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-8-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-32-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-32-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-main-ablation-maxlights-32-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-1-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-1-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-1-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-2-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-2-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-2-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-3-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-3-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-3-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-4-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-4-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-4-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-5-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-5-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-5-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-6-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-6-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-6-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-8-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-8-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-8-own-budget-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-32-before-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-32-after-roi-heatmap.png",
          "retail-cross-lane-no-tile-source-ablation-maxlights-32-own-budget-roi-heatmap.png",
          "cross-lane-all-light-lanes-runtime-probe-2026-07-07.png",
          "cross-lane-all-light-lanes-runtime-probe-2026-07-07.frame.json",
          "aurora-web-cross-lane-all-lanes.frame.json",
          "retail-cross-lane-active-slots.json",
          "cross-lane-precedence-compare.json",
        ],
        acceptanceGate:
          "Accepted and dropped tile/placeable/MDL/item/ProgFX lanes must match retail under a constrained light budget.",
      },
      {
        caseId: "lightmanager-vtable-receiver-dispatch",
        requiredArtifacts: [
          "lightmanager-vtable-receiver-xrefs.json",
          "lightmanager-lane-owner-callgraph.json",
        ],
        currentEvidence: [
          "frameRebuildOrderingEvidence proofStatus=source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked",
          "directProximityUploadEvidence proofStatus=source-backed-lightmanager-direct-proximity-upload-order",
          "absoluteVtableClusterEvidence proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite",
          "indirectVtableSlotCallEvidence proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked",
          "audit-retail-item-light-tables-2026-07-05.json",
          "audit-lightstate-default-retail-binary-2026-07-05.json",
          "cross-lane-active-slot-blocker-proof.json",
          "cross-lane-retail-maxlight-roi-diagnostics.json",
          "retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked",
          "retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked",
          "retail-table-backed-progfx-type4-table-owner-phase-family-runtime-scheduler-blocked",
        ],
        acceptanceGate:
          "Disassembly evidence must tie lane owners to a common LightManager insertion or merge path, not only helper/query calls.",
      },
    ],
  },
  {
    key: "progfx-type4-priority-proximity-vision-scheduler",
    label: "ProgFX Type 4 priority/proximity/vision scheduler",
    cases: [
      {
        caseId: "progfx-type4-priority-tie-and-zero-policy",
        requiredArtifacts: [
          "retail-progfx-priority-policy-before.png",
          "retail-progfx-priority-policy-after.png",
          "retail-progfx-priority-policy.json",
        ],
        currentEvidence: [
          "area-lighting-retail-runtime-oracle-pack-proof.json",
          "progfx-type4-runtime-oracle-blocker-proof.json",
          "retail-progfx-priority-policy-before.png",
          "retail-progfx-priority-policy-after.png",
          "retail-progfx-priority-policy.json",
          "audit-retail-progfx-type4-table-2026-07-03.json",
          "docs-backed-progfx-type4-param4-priority-lower-value-wins",
        ],
        acceptanceGate:
          "Retail oracle must report the winning Type 4 owner for each priority/tie case and priority 0 behavior.",
      },
      {
        caseId: "progfx-type4-proximity-threshold",
        requiredArtifacts: [
          "retail-progfx-proximity-distance-sweep.json",
          "retail-progfx-proximity-distance-sweep-contact-sheet.png",
        ],
        currentEvidence: [
          "area-lighting-retail-runtime-oracle-pack-proof.json",
          "progfx-type4-runtime-oracle-blocker-proof.json",
          "retail-progfx-proximity-distance-sweep.json",
          "retail-progfx-proximity-distance-sweep-contact-sheet.png",
          "retail-progfx-proximity-distance-sweep-contact-sheet-near.png",
          "retail-progfx-proximity-distance-sweep-contact-sheet-mid.png",
          "retail-progfx-proximity-distance-sweep-contact-sheet-far.png",
          "audit-retail-progfx-type4-table-2026-07-03.json",
          "progfxType4RequestProximitySuppressionCount=1",
          "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light",
        ],
        acceptanceGate:
          "Retail sweep must identify suppression threshold, participating source lane, and restore behavior.",
      },
      {
        caseId: "progfx-type4-attach-to-scene-restore",
        requiredArtifacts: [
          "retail-progfx-attach-scene-before.png",
          "retail-progfx-attach-scene-active.png",
          "retail-progfx-attach-scene-after-remove.png",
          "retail-progfx-attach-scene-restore.json",
        ],
        currentEvidence: [
          "area-lighting-retail-runtime-oracle-pack-proof.json",
          "progfx-type4-runtime-oracle-blocker-proof.json",
          "retail-progfx-attach-scene-before.png",
          "retail-progfx-attach-scene-active.png",
          "retail-progfx-attach-scene-after-remove.png",
          "retail-progfx-attach-scene-restore.json",
          "audit-retail-progfx-type4-table-2026-07-03.json",
          "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights",
        ],
        acceptanceGate:
          "Retail oracle must show which scene lights are removed while active and when they return after effect removal.",
      },
      {
        caseId: "progfx-type4-blind-vision-pixels",
        requiredArtifacts: [
          "retail-progfx-blindvision-before.png",
          "retail-progfx-blindvision-active.png",
          "retail-progfx-blindvision-pixel-compare.json",
        ],
        currentEvidence: [
          "area-lighting-retail-runtime-oracle-pack-proof.json",
          "progfx-type4-runtime-oracle-blocker-proof.json",
          "retail-progfx-blindvision-before.png",
          "retail-progfx-blindvision-active.png",
          "retail-progfx-blindvision-before-active-diff.png",
          "retail-progfx-blindvision-pixel-compare.json",
          "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png",
          "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json",
        ],
        acceptanceGate:
          "Retail oracle must prove the vision mutation, affected viewport pixels, and owner phase for the same visualeffects.2da row.",
      },
    ],
  },
];

function parseArgs(argv) {
  const options = {
    repoRoot: repoRootDefault,
    output: DEFAULT_OUTPUT,
    searchRoots: [],
    allowBlocked: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolveRequiredValue(arg, argv[index]);
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.output = requireValue(arg, argv[index]);
    } else if (arg === "--searchRoot") {
      index += 1;
      options.searchRoots.push(requireValue(arg, argv[index]));
    } else if (arg === "--allow-blocked") {
      options.allowBlocked = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.searchRoots.length === 0) {
    options.searchRoots = DEFAULT_SEARCH_ROOTS;
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function resolveRequiredValue(flag, value) {
  return resolve(requireValue(flag, value));
}

function printHelp() {
  console.log(`Usage: node scripts/check-area-lighting-retail-oracle-artifacts.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to the current aurora-web root.
  --searchRoot <path>    Artifact root to scan. Can be passed more than once.
  --out <path>           JSON report path. Defaults to ${DEFAULT_OUTPUT}
  --allow-blocked        Exit 0 even when required oracle artifacts are missing.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function collectArtifactIndex(searchRoots, repoRoot) {
  const byName = new Map();
  const resolvedSearchRoots = [];

  for (const root of searchRoots) {
    const absoluteRoot = toAbsolute(repoRoot, root);
    resolvedSearchRoots.push({
      input: root,
      path: absoluteRoot,
      exists: existsSync(absoluteRoot),
    });
    if (!existsSync(absoluteRoot)) {
      continue;
    }
    for (const artifact of walkFiles(absoluteRoot, repoRoot)) {
      const existing = byName.get(artifact.name) ?? [];
      existing.push(artifact);
      byName.set(artifact.name, existing);
    }
  }

  for (const matches of byName.values()) {
    matches.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  }

  return { byName, resolvedSearchRoots };
}

function walkFiles(root, repoRoot) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    for (const entry of entries) {
      const absolutePath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile()) {
        let stats;
        try {
          stats = statSync(absolutePath);
        } catch (error) {
          if (error?.code === "ENOENT") {
            continue;
          }
          throw error;
        }
        files.push({
          name: entry.name,
          path: absolutePath,
          relativePath: toRepoRelative(repoRoot, absolutePath),
          bytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    }
  }
  return files;
}

function isFileEvidenceName(name) {
  return /\.(?:json|png|jpg|jpeg|webp|mp4|frame\.json)$/iu.test(name);
}

function readJsonText(path) {
  const buffer = readFileSync(path);
  const text =
    buffer[0] === 0xff && buffer[1] === 0xfe
      ? buffer.toString("utf16le")
      : buffer.includes(0)
        ? buffer.toString("utf16le")
        : buffer.toString("utf8");
  return text.replace(/^\uFEFF/u, "");
}

function classifyRequiredArtifact(name) {
  if (name.startsWith("retail-or-toolset-") || name.startsWith("retail-")) {
    return "retail-or-toolset-oracle";
  }
  if (name.startsWith("aurora-web-")) {
    return "aurora-web-local-oracle";
  }
  if (name.endsWith("-compare.json") || name.includes("compare")) {
    return "comparison-result";
  }
  if (extname(name).toLowerCase() === ".json") {
    return "structured-oracle";
  }
  return "oracle-artifact";
}

function inspectJsonArtifact(artifact) {
  if (!artifact || !artifact.name.endsWith(".json")) {
    return null;
  }
  try {
    const parsed = JSON.parse(readJsonText(artifact.path));
    const status = String(parsed.status ?? parsed.result ?? parsed.verdict ?? "").toLowerCase();
    const explicitPass =
      parsed.passed === true ||
      parsed.matches === true ||
      parsed.match === true ||
      parsed.parityPassed === true ||
      ["passed", "pass", "ok", "ready"].includes(status);
    const explicitFail =
      parsed.passed === false ||
      parsed.matches === false ||
      parsed.match === false ||
      parsed.parityPassed === false ||
      ["failed", "fail", "blocked", "mismatch"].includes(status) ||
      status.startsWith("blocked-") ||
      status.startsWith("failed-");

    return {
      readable: true,
      explicitPass,
      explicitFail,
      status: explicitPass ? "explicit-pass" : explicitFail ? "explicit-fail" : "present-no-explicit-verdict",
    };
  } catch (error) {
    return {
      readable: false,
      explicitPass: false,
      explicitFail: true,
      status: "invalid-json",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function isRequiredVerdictJsonArtifact(name) {
  return (
    name.endsWith("-compare.json") ||
    name === "retail-progfx-priority-policy.json" ||
    name === "retail-progfx-proximity-distance-sweep.json" ||
    name === "retail-progfx-attach-scene-restore.json" ||
    name === "lightmanager-vtable-receiver-xrefs.json" ||
    name === "lightmanager-lane-owner-callgraph.json"
  );
}

function resolveArtifact(name, byName, role) {
  if (!isFileEvidenceName(name)) {
    return {
      name,
      role,
      status: "evidence-token",
      kind: "non-file-evidence-token",
    };
  }

  const matches = byName.get(name) ?? [];
  if (matches.length === 0) {
    return {
      name,
      role,
      status: "missing",
      kind: role === "required" ? classifyRequiredArtifact(name) : "local-proof-file",
    };
  }

  const selected = matches[0];
  const record = {
    name,
    role,
    status: "present",
    kind: role === "required" ? classifyRequiredArtifact(name) : "local-proof-file",
    path: selected.relativePath,
    bytes: selected.bytes,
    modifiedAt: selected.modifiedAt,
  };

  const jsonInspection = inspectJsonArtifact(selected);
  if (jsonInspection) {
    record.json = jsonInspection;
  }
  if (matches.length > 1) {
    record.alternates = matches.slice(1).map((match) => ({
      path: match.relativePath,
      bytes: match.bytes,
      modifiedAt: match.modifiedAt,
    }));
  }

  return record;
}

function resolveCase(caseSpec, byName) {
  const requiredArtifacts = caseSpec.requiredArtifacts.map((name) =>
    resolveArtifact(name, byName, "required")
  );
  const currentEvidence = caseSpec.currentEvidence.map((name) =>
    resolveArtifact(name, byName, "current")
  );
  const missingRequiredArtifacts = requiredArtifacts
    .filter((artifact) => artifact.status === "missing")
    .map((artifact) => artifact.name);
  const jsonRequiredArtifacts = requiredArtifacts.filter((artifact) =>
    isRequiredVerdictJsonArtifact(artifact.name)
  );
  const invalidJsonArtifacts = jsonRequiredArtifacts
    .filter((artifact) => artifact.json?.readable === false)
    .map((artifact) => artifact.name);
  const failedJsonArtifacts = jsonRequiredArtifacts
    .filter((artifact) => artifact.json?.explicitFail === true)
    .map((artifact) => artifact.name);
  const requiredJsonWithoutExplicitVerdict = jsonRequiredArtifacts
    .filter(
      (artifact) =>
        artifact.status === "present" &&
        artifact.json?.explicitPass !== true &&
        artifact.json?.explicitFail !== true
    )
    .map((artifact) => artifact.name);

  let promotionStatus = "blocked-missing-required-artifacts";
  if (missingRequiredArtifacts.length === 0) {
    if (invalidJsonArtifacts.length > 0 || failedJsonArtifacts.length > 0) {
      promotionStatus = "blocked-explicit-or-invalid-json-verdict";
    } else if (requiredJsonWithoutExplicitVerdict.length > 0) {
      promotionStatus = "present-needs-explicit-pass-verdict";
    } else {
      promotionStatus = "oracle-pass";
    }
  }

  return {
    caseId: caseSpec.caseId,
    acceptanceGate: caseSpec.acceptanceGate,
    promotionStatus,
    requiredArtifacts,
    currentEvidence,
    missingRequiredArtifacts,
    requiredJsonWithoutExplicitVerdict,
    invalidJsonArtifacts,
    failedJsonArtifacts,
  };
}

function buildReport(options) {
  const repoRoot = resolve(options.repoRoot);
  const { byName, resolvedSearchRoots } = collectArtifactIndex(options.searchRoots, repoRoot);
  const blockers = ORACLE_BLOCKERS.map((blocker) => {
    const cases = blocker.cases.map((caseSpec) => resolveCase(caseSpec, byName));
    return {
      key: blocker.key,
      label: blocker.label,
      status: cases.every((oracleCase) => oracleCase.promotionStatus === "oracle-pass")
        ? "oracle-pass"
        : "blocked",
      cases,
    };
  });

  const allCases = blockers.flatMap((blocker) => blocker.cases);
  const allRequired = allCases.flatMap((oracleCase) => oracleCase.requiredArtifacts);
  const allCurrent = allCases.flatMap((oracleCase) => oracleCase.currentEvidence);
  const missingRequired = allRequired.filter((artifact) => artifact.status === "missing");
  const failedRequiredJsonArtifacts = allRequired.filter(
    (artifact) => artifact.status === "present" && artifact.json?.explicitFail === true,
  );
  const requiredJsonWithoutExplicitVerdict = allRequired.filter(
    (artifact) =>
      isRequiredVerdictJsonArtifact(artifact.name) &&
      artifact.status === "present" &&
      artifact.json?.explicitPass !== true &&
      artifact.json?.explicitFail !== true,
  );
  const missingCurrentFiles = allCurrent.filter((artifact) => artifact.status === "missing");
  const tokenEvidence = allCurrent.filter((artifact) => artifact.status === "evidence-token");
  const reportStatus = blockers.every((blocker) => blocker.status === "oracle-pass")
    ? "oracle-pass"
    : "blocked";

  return {
    version: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    status: reportStatus,
    repoRoot,
    searchRoots: resolvedSearchRoots.map((root) => ({
      input: root.input,
      path: root.path,
      exists: root.exists,
    })),
    outputPath: toRepoRelative(repoRoot, toAbsolute(repoRoot, options.output)),
    summary: {
      blockers: blockers.length,
      oracleCases: allCases.length,
      oracleCasesPassed: allCases.filter((oracleCase) => oracleCase.promotionStatus === "oracle-pass").length,
      oracleCasesBlocked: allCases.filter((oracleCase) => oracleCase.promotionStatus !== "oracle-pass").length,
      requiredArtifacts: allRequired.length,
      presentRequiredArtifacts: allRequired.filter((artifact) => artifact.status === "present").length,
      missingRequiredArtifacts: missingRequired.length,
      failedRequiredJsonArtifacts: failedRequiredJsonArtifacts.length,
      requiredJsonWithoutExplicitVerdict: requiredJsonWithoutExplicitVerdict.length,
      currentEvidenceEntries: allCurrent.length,
      currentEvidenceFilesPresent: allCurrent.filter((artifact) => artifact.status === "present").length,
      currentEvidenceFilesMissing: missingCurrentFiles.length,
      currentEvidenceTokens: tokenEvidence.length,
    },
    missingRequiredArtifacts: missingRequired.map((artifact) => artifact.name),
    failedRequiredJsonArtifacts: failedRequiredJsonArtifacts.map((artifact) => artifact.name),
    requiredJsonWithoutExplicitVerdict: requiredJsonWithoutExplicitVerdict.map((artifact) => artifact.name),
    missingCurrentEvidenceFiles: missingCurrentFiles.map((artifact) => artifact.name),
    blockers,
  };
}

function writeReport(outputPath, report) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

try {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  const outputPath = toAbsolute(report.repoRoot, options.output);
  writeReport(outputPath, report);
  console.log(
    JSON.stringify(
      {
        status: report.status,
        gate: "area-lighting-retail-oracle-artifacts",
        outputPath: report.outputPath,
        summary: report.summary,
        missingRequiredArtifacts: report.missingRequiredArtifacts,
      },
      null,
      2,
    ),
  );
  if (report.status !== "oracle-pass" && !options.allowBlocked) {
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
