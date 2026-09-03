export type AreaWorkspaceDraftState =
  | "dirty"
  | "saving"
  | "saved"
  | "conflict"
  | "recovery"
  | "failed";

export interface AreaWorkspaceDraftStatusEvent {
  readonly schemaVersion: "area-workspace-status.v1";
  readonly lane: "draft";
  readonly state: AreaWorkspaceDraftState;
  readonly sceneId: string;
  readonly sceneUpdatedAtUnixMs: number;
  readonly commandRevision: number;
  readonly occurredAtUnixMs: number;
  readonly browserRecoveryAvailable: boolean;
  readonly destination?: "browser" | "remote";
  readonly draftId?: string;
  readonly revision?: number;
  readonly code?: string;
  readonly expectedRevision?: number;
  readonly actualRevision?: number;
}

export type AreaWorkspaceVerificationState =
  | "not_run"
  | "checking"
  | "verified"
  | "failed";

export interface AreaWorkspaceVerificationStatusEvent {
  readonly schemaVersion: "area-workspace-status.v1";
  readonly lane: "verification";
  readonly state: AreaWorkspaceVerificationState;
  readonly sceneId: string;
  readonly occurredAtUnixMs: number;
  readonly code?: string;
}

export type AreaWorkspaceMaterializationState =
  | "not_requested"
  | "validating"
  | "ready"
  | "blocked"
  | "materializing"
  | "verified"
  | "conflict"
  | "recovery"
  | "failed";

export interface AreaWorkspaceMaterializationStatusEvent {
  readonly schemaVersion: "area-workspace-status.v1";
  readonly lane: "materialization";
  readonly state: AreaWorkspaceMaterializationState;
  readonly sceneId: string;
  readonly occurredAtUnixMs: number;
  readonly action?: "create" | "update" | "delete" | "rename";
  readonly code?: string;
}

export type AreaWorkspaceCertificationState =
  | "unavailable"
  | "loading"
  | "ready"
  | "blocked";

export interface AreaWorkspaceCertificationStatusEvent {
  readonly schemaVersion: "area-workspace-status.v1";
  readonly lane: "certification";
  readonly state: AreaWorkspaceCertificationState;
  readonly sceneId: string;
  readonly occurredAtUnixMs: number;
  readonly tilesetResRef?: string;
  readonly code?: string;
}

export type AreaWorkspaceStatusEvent =
  | AreaWorkspaceDraftStatusEvent
  | AreaWorkspaceVerificationStatusEvent
  | AreaWorkspaceMaterializationStatusEvent
  | AreaWorkspaceCertificationStatusEvent;

export interface AreaWorkspaceStatusSnapshot {
  readonly schemaVersion: "area-workspace-status-snapshot.v1";
  readonly sceneId: string;
  readonly draft: AreaWorkspaceDraftStatusEvent;
  readonly verification: AreaWorkspaceVerificationStatusEvent;
  readonly materialization: AreaWorkspaceMaterializationStatusEvent;
  readonly certification: AreaWorkspaceCertificationStatusEvent;
}

export function createAreaWorkspaceStatusSnapshot(
  sceneId: string,
  occurredAtUnixMs = Date.now(),
  sceneUpdatedAtUnixMs = 0,
): AreaWorkspaceStatusSnapshot {
  return {
    schemaVersion: "area-workspace-status-snapshot.v1",
    sceneId,
    draft: {
      schemaVersion: "area-workspace-status.v1",
      lane: "draft",
      state: "dirty",
      sceneId,
      sceneUpdatedAtUnixMs,
      commandRevision: 0,
      occurredAtUnixMs,
      browserRecoveryAvailable: false,
    },
    verification: {
      schemaVersion: "area-workspace-status.v1",
      lane: "verification",
      state: "not_run",
      sceneId,
      occurredAtUnixMs,
    },
    materialization: {
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "not_requested",
      sceneId,
      occurredAtUnixMs,
    },
    certification: {
      schemaVersion: "area-workspace-status.v1",
      lane: "certification",
      state: "unavailable",
      sceneId,
      occurredAtUnixMs,
      code: "NO_ACTIVE_TILESET",
    },
  };
}

export function reduceAreaWorkspaceStatus(
  snapshot: AreaWorkspaceStatusSnapshot,
  event: AreaWorkspaceStatusEvent,
): AreaWorkspaceStatusSnapshot {
  if (event.sceneId !== snapshot.sceneId) return snapshot;

  if (event.lane === "draft") {
    return event.sceneUpdatedAtUnixMs < snapshot.draft.sceneUpdatedAtUnixMs ||
      event.commandRevision < snapshot.draft.commandRevision
      ? snapshot
      : { ...snapshot, draft: event };
  }

  const current = snapshot[event.lane];
  return event.occurredAtUnixMs < current.occurredAtUnixMs
    ? snapshot
    : { ...snapshot, [event.lane]: event };
}

export function formatAreaWorkspaceDraftStatus(
  status: AreaWorkspaceDraftStatusEvent,
): string {
  if (status.state === "dirty") return "Unsaved changes";
  if (status.state === "saving") {
    return status.browserRecoveryAvailable
      ? "Saving remote draft; browser recovery copy ready"
      : "Saving remote draft";
  }
  if (status.state === "saved") {
    return status.destination === "remote" && status.revision !== undefined
      ? `Remote draft saved at revision ${status.revision}`
      : "Browser draft saved";
  }
  if (status.state === "conflict") {
    return status.actualRevision !== undefined
      ? `Remote draft conflict at revision ${status.actualRevision}; browser recovery copy ready`
      : "Remote draft conflict; browser recovery copy ready";
  }
  if (status.state === "recovery") {
    return "Remote save failed; browser recovery copy ready";
  }
  return "Draft save failed";
}

export function formatAreaWorkspaceVerificationStatus(
  status: AreaWorkspaceVerificationStatusEvent,
): string {
  if (status.state === "not_run") return "Not run";
  if (status.state === "checking") return "Checking current Area";
  if (status.state === "verified") return "Current Area verified";
  return status.code ? `Failed (${status.code})` : "Failed";
}

export function formatAreaWorkspaceMaterializationStatus(
  status: AreaWorkspaceMaterializationStatusEvent,
): string {
  const action = status.action ? ` ${status.action}` : "";
  if (status.state === "not_requested") return "Not requested";
  if (status.state === "validating") return `Validating${action}`;
  if (status.state === "ready") return `Ready for${action || " materialization"}`;
  if (status.state === "blocked") return status.code ? `Blocked (${status.code})` : "Blocked";
  if (status.state === "materializing") return `Running${action}`;
  if (status.state === "verified") return `${status.action ?? "Area"} committed and read back`;
  if (status.state === "conflict") return status.code ? `Conflict (${status.code})` : "Conflict";
  if (status.state === "recovery") return "Failed; draft recovery remains available";
  return status.code ? `Failed (${status.code})` : "Failed";
}

export function formatAreaWorkspaceCertificationStatus(
  status: AreaWorkspaceCertificationStatusEvent,
): string {
  const tileset = status.tilesetResRef ? ` for ${status.tilesetResRef}` : "";
  if (status.state === "loading") return `Loading certification${tileset}`;
  if (status.state === "ready") return `Certification index ready${tileset}`;
  if (status.state === "blocked") {
    return status.code ? `Blocked (${status.code})${tileset}` : `Blocked${tileset}`;
  }
  return status.code ? `Unavailable (${status.code})${tileset}` : `Unavailable${tileset}`;
}
