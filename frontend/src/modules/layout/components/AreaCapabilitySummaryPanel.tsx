import { useEffect, useState } from "react";
import type { AreaCapabilityFacade } from "../../areas/application/areaCapabilityFacade";
import type { AreaCapabilityCatalog } from "../../areas/domain/areaCapabilityCatalog";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";

interface AreaCapabilitySummaryPanelProps {
  accessToken: string | null;
  facade: AreaCapabilityFacade;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
}

type LoadState =
  | Readonly<{ status: "unauthenticated" }>
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; catalog: AreaCapabilityCatalog }>
  | Readonly<{ status: "error"; message: string }>;

export function AreaCapabilitySummaryPanel({
  accessToken,
  facade,
  trackTelemetryEvent,
}: AreaCapabilitySummaryPanelProps) {
  const [retryRevision, setRetryRevision] = useState(0);
  const [state, setState] = useState<LoadState>(
    accessToken ? { status: "loading" } : { status: "unauthenticated" },
  );

  useEffect(() => {
    if (!accessToken) {
      setState({ status: "unauthenticated" });
      return;
    }
    let current = true;
    setState({ status: "loading" });
    void facade.load(accessToken).then((result) => {
      if (!current) return;
      if (result.ok) {
        setState({ status: "ready", catalog: result.value });
        trackTelemetryEvent("ui.workspace.areas.capability_catalog_loaded", {
          catalogRevision: result.value.catalogRevision,
          total: result.value.summary.total,
          available: result.value.summary.release.available,
          blocked: result.value.summary.release.blocked,
          hidden: result.value.summary.release.hidden,
        });
        return;
      }
      setState({ status: "error", message: result.error.message });
      trackTelemetryEvent("ui.workspace.areas.capability_catalog_failed", {
        code: result.error.code,
        retryable: result.error.retryable,
      });
    });
    return () => {
      current = false;
    };
  }, [accessToken, facade, retryRevision, trackTelemetryEvent]);

  return (
    <section className="area-capability-summary" aria-label="Area capability status">
      <div className="area-capability-summary__heading">
        <strong>Capability coverage</strong>
      </div>
      {state.status === "unauthenticated" ? (
        <p>Capability catalog requires an authenticated session.</p>
      ) : state.status === "loading" ? (
        <p>Loading capability catalog…</p>
      ) : state.status === "error" ? (
        <>
          <p role="alert">{state.message}</p>
          <small>Capability availability is blocked until the catalog loads.</small>
          <button
            type="button"
            aria-label="Retry capability catalog"
            onClick={() => setRetryRevision((current) => current + 1)}
          >
            Retry
          </button>
        </>
      ) : (
        <CapabilitySummary catalog={state.catalog} />
      )}
    </section>
  );
}

function CapabilitySummary({ catalog }: { catalog: AreaCapabilityCatalog }) {
  const { implementation, release } = catalog.summary;
  return (
    <>
      <p>{release.available} available · {release.blocked} blocked · {release.hidden} hidden</p>
      <p>
        {implementation.implemented} implemented · {implementation.partial} partial ·{" "}
        {implementation.preserve_only} preserve-only · {implementation.not_started} not started
      </p>
      <small>Catalog {catalog.catalogRevision} · {catalog.summary.total} capabilities</small>
    </>
  );
}
