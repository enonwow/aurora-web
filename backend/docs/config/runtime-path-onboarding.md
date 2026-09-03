# Runtime path onboarding

Aurora Web accepts full, real Windows/Linux paths from the administrator in the
frontend. The existing runtime-settings record stores those values in
`paths.hostPaths` and separately keeps the resolved paths used by the backend
process. It does not create Docker bind mounts, edit `.env`, or restart
containers.

## Docker host configuration

Before starting Docker Compose, copy the repository `.env.example` to `.env` and set:

- `NWN_USER_DIR_HOST` — NWN user directory on the Docker host;
- `NWN_INSTALL_DIR_HOST` — NWN installation directory on the Docker host;
- `AURORA_REFERENCE_DIR_HOST` — optional Aurora reference root.

Compose exposes these paths to the backend with stable names:

| Host variable | Backend path |
| --- | --- |
| `NWN_USER_DIR_HOST` | `/host/nwn-user` |
| `NWN_INSTALL_DIR_HOST` | `/host/nwn-game` |
| `AURORA_REFERENCE_DIR_HOST` | `/host/aurora-reference` |

After changing `.env`, recreate the containers with `docker compose up --build` and then validate paths in the application. The web form cannot make a newly configured host path appear inside an already running container.

Compose also passes the three host-path values to the backend as metadata.
Therefore the frontend can display and accept real paths such as
`C:\Users\...\Neverwinter Nights`, while the backend translates them internally
to `/host/nwn-user`, `/host/nwn-game`, or `/host/aurora-reference`. Internal
`/host/...` aliases are not valid frontend input.

## API and permissions

- `GET /api/v1/settings/runtime/readiness` is available to every authenticated role. It returns readiness and issue codes, but exposes candidate paths only to a principal with `admin.config.write`.
- `GET /api/v1/settings/runtime/path-browser` is an admin-only server path
  browser used by the onboarding form. Its `scope` limits the selectable roots
  and whether the result is a directory or a packed `.mod` file.
- `POST /api/v1/settings/runtime/onboarding/validate` validates a candidate configuration without saving it.
- `PUT /api/v1/settings/runtime/onboarding` waliduje kandydackie sciezki i uruchamia bezpieczny preflight. Wymaga `confirmGlobalLogout=true` oraz `Idempotency-Key`. Ustawienia staja sie aktywne od razu tylko dla `NO_CHANGES`; w pozostalych przypadkach dopiero po publikacji zwalidowanej generacji. Operacje zapisu wymagaja roli `admin` i `admin.config.write`.

The onboarding endpoint persists the real host paths and updates the existing
effective runtime fields (`vanillaDataPath`, `tlkBasePath`,
`hakDirectoryPath`, module paths) with their translated backend-visible values.

## Path picker and list UX

Every single path field accepts manual input and provides a `Browse` action.
This is a server-side picker rather than a browser-native file input: a normal
web file input selects files from the administrator's client machine and cannot
return a trustworthy absolute path on the server.

The picker returns only names and paths. It never returns file contents, skips
hidden entries and symbolic links, limits the result to 500 entries, resolves
the requested path with `realpath`, and rejects navigation outside the selected
root. In Docker mode its roots are restricted to the Compose mounts that are
already visible to the backend. The API translates those internal locations
back to real host paths before returning them to the frontend.

Packed module selection shows directories and `.mod` files. HAK and item
generator source directories use table editors with columns for host path,
validation status, and actions. Each table always has one trailing empty row;
entering or selecting a value turns it into a normal row and creates the next
empty row automatically.

If a desired Docker host path is not mounted, the administrator must enter it
manually, update the corresponding `.env` variable, recreate Compose, and
validate again. The picker does not expand the application's Docker privileges.

## Validation result codes

| Code | Meaning | Operator action |
| --- | --- | --- |
| `MOUNT_NOT_AVAILABLE` | A selected `/host/...` root is not mounted into the backend container. | Set the matching `.env` variable and recreate Compose. |
| `HOST_PATH_REQUIRED` | An internal `/host/...` alias was submitted by the frontend. | Enter the full real Windows/Linux host path. |
| `RESTART_REQUIRED` | The real path is outside the directory currently supplied by the corresponding Compose variable. | Update `.env`, recreate Compose, and validate again. |
| `RUNTIME_PATH_UPDATE_REQUIRED` | Compose exposes the real directory, but stored effective paths still use an older mapping. | Use `Save and validate` to publish the current mapping. |
| `PATH_NOT_FOUND` | The mount/root is present, but the selected path does not exist. | Correct the real host path entered in the form. |
| `PATH_NOT_DIRECTORY` / `PATH_NOT_FILE` | The path exists but has the wrong type. | Select the required directory or file. |
| `MODULE_SOURCE_REQUIRED` | Neither a decompiled module directory nor a packed module file was provided. | Configure at least one module source. |

## Fallback compatibility

Existing runtime-settings JSON files remain valid. If the new root/list fields are absent, Aurora Web derives the onboarding display values from legacy `vanillaDataPath` and `hakDirectoryPath`. The item-generator ENV setting and the historical local source list remain fallbacks; saved `itemGeneratorSourceDirectories` take precedence.

## Cold rebuild after a path change

The implemented global rebuild contract, maintenance behavior, deterministic fingerprints,
cache generations, rollback, and acceptance criteria are documented in
[runtime-cache-cold-rebuild.md](./runtime-cache-cold-rebuild.md).
