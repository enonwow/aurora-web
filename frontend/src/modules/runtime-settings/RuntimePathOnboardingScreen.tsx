import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  saveRuntimePathOnboarding,
  startRuntimeCacheRebuild,
  validateRuntimePathOnboarding,
  type RuntimeCacheRebuildStartResult,
  type RuntimePathOnboardingInput,
  type RuntimePathReadiness
} from "./runtimePathOnboardingApi";
import { ServerPathListEditor } from "./ServerPathListEditor";
import { ServerPathPicker } from "./ServerPathPicker";

interface RuntimePathOnboardingScreenProps {
  accessToken: string;
  readiness: RuntimePathReadiness;
  onCompleted(result: RuntimeCacheRebuildStartResult): void;
}

export function RuntimePathOnboardingScreen({
  accessToken,
  readiness,
  onCompleted
}: RuntimePathOnboardingScreenProps) {
  const initial = useMemo<RuntimePathOnboardingInput>(
    () =>
      readiness.values ?? {
        nwnUserDir: "",
        nwnInstallDir: "",
        auroraReferenceDir: "",
        hakDirectories: [],
        itemGeneratorSourceDirectories: [],
        moduleDecompiledPath: "",
        modulePackedPath: ""
      },
    [readiness.values]
  );
  const [values, setValues] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState(readiness.issues);
  useEffect(() => {
    setValues(initial);
    setValidationIssues(readiness.issues);
  }, [initial, readiness.issues]);
  const dockerMountUnavailable = validationIssues.some(
    (issue) =>
      issue.code === "MOUNT_NOT_AVAILABLE" ||
      issue.code === "HOST_PATH_REQUIRED" ||
      issue.code === "RESTART_REQUIRED"
  );
  const dockerMode = readiness.environment?.mode === "docker";
  const issueFor = (field: string) =>
    validationIssues.find(
      (issue) => issue.field === field || issue.field.startsWith(`${field}.`)
    )?.message;

  if (!readiness.canConfigure) {
    return (
      <section className="card" aria-labelledby="runtime-paths-title">
        <p className="eyebrow">Server configuration</p>
        <h1 id="runtime-paths-title">Aurora paths need an administrator</h1>
        <p>
          The workspace remains unavailable until an administrator validates the server paths.
        </p>
      </section>
    );
  }

  const update = <K extends keyof RuntimePathOnboardingInput>(
    key: K,
    value: RuntimePathOnboardingInput[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const validation = await validateRuntimePathOnboarding(
        accessToken,
        values
      );
      setValidationIssues(validation.issues);
      if (!validation.ready) {
        setError("Correct the reported host paths before saving.");
        return;
      }
      if (
        !window.confirm(
          "Saving changed paths may rebuild server data and sign out every user. Continue?"
        )
      ) {
        return;
      }
      const next = await saveRuntimePathOnboarding(accessToken, values);
      onCompleted(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Validation failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualRebuild = async () => {
    if (
      !window.confirm(
        "This may rebuild server data and sign out every active user. Continue?"
      )
    ) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      onCompleted(await startRuntimeCacheRebuild(accessToken));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cache rebuild failed to start.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card" aria-labelledby="runtime-paths-title">
      <p className="eyebrow">Server configuration</p>
      <h1 id="runtime-paths-title">Configure Aurora paths</h1>
      <p>
        Enter full paths exactly as they exist on the server host, for example
        <code>C:\Users\...\Neverwinter Nights</code>. Paths are validated by the
        backend before they are saved.
      </p>
      {dockerMode ? (
        <p className="runtime-path-mode-note">
          Docker mode is active. Enter real Windows/Linux host paths here; the backend
          translates them to container mounts internally.
        </p>
      ) : null}
      {validationIssues.length > 0 ? (
        <ul className="error-text" aria-label="runtime path issues">
          {validationIssues.map((issue) => (
            <li key={`${issue.field}:${issue.code}`}>{issue.field}: {issue.message}</li>
          ))}
        </ul>
      ) : null}
      {dockerMountUnavailable ? (
        <aside className="maintenance-instructions" aria-label="Docker mount instructions">
          <h2>Docker mount requires a restart</h2>
          <ol>
            <li>
              Copy the real path entered above to <code>.env</code> using
              <code>NWN_USER_DIR_HOST</code>, <code>NWN_INSTALL_DIR_HOST</code>, or
              <code>AURORA_REFERENCE_DIR_HOST</code>.
            </li>
            <li>Run <code>docker compose up --build</code> again.</li>
            <li>Return here and run validation again.</li>
          </ol>
          <p>The web application cannot create or change Docker bind mounts.</p>
        </aside>
      ) : null}
      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label htmlFor="nwn-user-dir">NWN user directory — real host path</label>
        <ServerPathPicker
          accessToken={accessToken}
          scope="nwn-user"
          selectionKind="directory"
          inputId="nwn-user-dir"
          value={values.nwnUserDir}
          placeholder="C:\Users\your-name\Documents\Neverwinter Nights"
          issue={issueFor("nwnUserDir")}
          onChange={(value) => update("nwnUserDir", value)}
        />
        <label htmlFor="nwn-install-dir">
          NWN installation directory — real host path
        </label>
        <ServerPathPicker
          accessToken={accessToken}
          scope="nwn-install"
          selectionKind="directory"
          inputId="nwn-install-dir"
          value={values.nwnInstallDir}
          placeholder="C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights"
          issue={issueFor("nwnInstallDir")}
          onChange={(value) => update("nwnInstallDir", value)}
        />
        <label htmlFor="module-decompiled-path">
          Decompiled module directory — real host path
        </label>
        <ServerPathPicker
          accessToken={accessToken}
          scope="module-decompiled"
          selectionKind="directory"
          inputId="module-decompiled-path"
          value={values.moduleDecompiledPath}
          fallbackPath={values.nwnUserDir}
          placeholder="C:\Users\your-name\Documents\Neverwinter Nights\LC-Decompiled\temp0"
          issue={issueFor("moduleDecompiledPath")}
          onChange={(value) => update("moduleDecompiledPath", value)}
        />
        <label htmlFor="module-packed-path">
          Packed module file — real host path (optional alternative)
        </label>
        <ServerPathPicker
          accessToken={accessToken}
          scope="module-packed"
          selectionKind="file"
          inputId="module-packed-path"
          value={values.modulePackedPath}
          fallbackPath={values.nwnUserDir}
          placeholder="Choose a .mod file"
          issue={issueFor("modulePackedPath")}
          onChange={(value) => update("modulePackedPath", value)}
        />
        <ServerPathListEditor
          accessToken={accessToken}
          label="HAK directories — real host paths (optional)"
          field="hakDirectories"
          scope="hak-directory"
          values={values.hakDirectories}
          fallbackPath={values.nwnUserDir}
          issues={validationIssues}
          onChange={(nextValues) => update("hakDirectories", nextValues)}
        />
        <label htmlFor="aurora-reference-dir">
          Aurora reference directory — real host path (optional)
        </label>
        <ServerPathPicker
          accessToken={accessToken}
          scope="aurora-reference"
          selectionKind="directory"
          inputId="aurora-reference-dir"
          value={values.auroraReferenceDir}
          issue={issueFor("auroraReferenceDir")}
          onChange={(value) => update("auroraReferenceDir", value)}
        />
        <ServerPathListEditor
          accessToken={accessToken}
          label="Item generator source directories — real host paths (optional)"
          field="itemGeneratorSourceDirectories"
          scope="item-generator"
          values={values.itemGeneratorSourceDirectories}
          fallbackPath={values.auroraReferenceDir || values.nwnUserDir}
          issues={validationIssues}
          onChange={(nextValues) =>
            update("itemGeneratorSourceDirectories", nextValues)
          }
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-btn" type="submit" disabled={isSaving}>
          {isSaving ? "Validating..." : "Save and validate"}
        </button>
        <button
          className="secondary-btn"
          type="button"
          disabled={isSaving}
          onClick={() => void handleManualRebuild()}
        >
          Rebuild runtime cache
        </button>
      </form>
    </section>
  );
}
