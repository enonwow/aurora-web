import { useState } from "react";
import type {
  RuntimeCacheRebuildDetails,
  SystemMaintenanceStatus
} from "./systemMaintenanceApi";

interface SystemMaintenanceScreenProps {
  status: SystemMaintenanceStatus;
  details?: RuntimeCacheRebuildDetails | null;
  onRetryStatus(): void;
  accessToken?: string;
  onRetryRebuild?(): Promise<void>;
  onRollback?(): Promise<void>;
  onAdminSignIn?(): void;
}

export function SystemMaintenanceScreen({
  status,
  details,
  onRetryStatus,
  accessToken,
  onRetryRebuild,
  onRollback,
  onAdminSignIn
}: SystemMaintenanceScreenProps) {
  const failed = status.state === "failed";
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (
    action: (() => Promise<void>) | undefined,
    confirmation: string
  ) => {
    if (!action || !window.confirm(confirmation)) {
      return;
    }
    setIsWorking(true);
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "The maintenance recovery request failed."
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <section className="card" aria-live="polite" aria-labelledby="maintenance-title">
      <p className="eyebrow">Server maintenance</p>
      <h1 id="maintenance-title">
        {failed ? "Cache rebuild needs administrator recovery" : "Aurora data is rebuilding"}
      </h1>
      <p>{status.message}</p>
      <p>
        Phase: <strong>{status.phase}</strong>
      </p>
      {failed ? (
        <p>An administrator can sign in to retry the operation or restore the prior generation.</p>
      ) : (
        <p>Login will become available automatically after the new cache generation is validated.</p>
      )}
      {failed && details?.error ? (
        <div className="maintenance-details">
          <p>
            Error: <strong>{details.error.code}</strong>
          </p>
          <p>{details.error.message}</p>
        </div>
      ) : null}
      {failed && details?.participants.length ? (
        <ul className="maintenance-participants" aria-label="rebuild participants">
          {details.participants.map((participant) => (
            <li key={participant.name}>
              {participant.name}: <strong>{participant.status}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      {failed && details?.auditTrail.length ? (
        <details className="maintenance-details">
          <summary>Recent rebuild transitions</summary>
          <ol>
            {details.auditTrail.slice(-5).map((event) => (
              <li key={`${event.at}:${event.state}:${event.phase}`}>
                {event.at}: {event.state} / {event.phase}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {actionError ? <p className="error-text">{actionError}</p> : null}
      <button className="primary-btn" type="button" onClick={onRetryStatus} disabled={isWorking}>
        Check status
      </button>
      {failed && !accessToken && onAdminSignIn ? (
        <button className="primary-btn" type="button" onClick={onAdminSignIn}>
          Administrator sign in
        </button>
      ) : null}
      {failed && accessToken && onRetryRebuild && onRollback ? (
        <>
          <button
            className="primary-btn"
            type="button"
            disabled={isWorking}
            onClick={() =>
              void runAction(
                onRetryRebuild,
                "Retrying will sign out every active user again. Continue?"
              )
            }
          >
            {isWorking ? "Working..." : "Retry rebuild"}
          </button>
          <button
            className="secondary-btn"
            type="button"
            disabled={isWorking}
            onClick={() =>
              void runAction(
                onRollback,
                "Restore the previously validated paths and cache generation?"
              )
            }
          >
            Restore previous generation
          </button>
        </>
      ) : null}
    </section>
  );
}
