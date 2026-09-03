import {
  formatAreaWorkspaceCertificationStatus,
  formatAreaWorkspaceDraftStatus,
  formatAreaWorkspaceMaterializationStatus,
  formatAreaWorkspaceVerificationStatus,
  type AreaWorkspaceStatusSnapshot,
} from "../../areas/application/areaWorkspaceStatus";

interface AreaWorkspaceStatusBarProps {
  snapshot: AreaWorkspaceStatusSnapshot;
  leftOffsetPx?: number;
  rightOffsetPx?: number;
}

export function AreaWorkspaceStatusBar({
  snapshot,
  leftOffsetPx = 14,
  rightOffsetPx = 14,
}: AreaWorkspaceStatusBarProps) {
  return (
    <aside
      className="area-workspace-status-bar"
      role="status"
      aria-label="Area workspace status"
      aria-live="polite"
      style={{ left: `${leftOffsetPx}px`, right: `${rightOffsetPx}px` }}
      data-area-workspace-scene-id={snapshot.sceneId}
      data-area-workspace-draft-state={snapshot.draft.state}
      data-area-workspace-verification-state={snapshot.verification.state}
      data-area-workspace-materialization-state={snapshot.materialization.state}
      data-area-workspace-certification-state={snapshot.certification.state}
    >
      <span data-lane="draft">
        <b>Draft</b>
        <strong>{formatAreaWorkspaceDraftStatus(snapshot.draft)}</strong>
      </span>
      <span data-lane="verification">
        <b>Verification</b>
        <strong>{formatAreaWorkspaceVerificationStatus(snapshot.verification)}</strong>
      </span>
      <span data-lane="materialization">
        <b>Materialization</b>
        <strong>{formatAreaWorkspaceMaterializationStatus(snapshot.materialization)}</strong>
      </span>
      <span data-lane="certification">
        <b>Certification</b>
        <strong>{formatAreaWorkspaceCertificationStatus(snapshot.certification)}</strong>
      </span>
    </aside>
  );
}
