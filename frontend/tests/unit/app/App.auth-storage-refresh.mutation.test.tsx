import { act, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import App, { AUTH_SESSION_STORAGE_KEY } from "../../../src/App";
import type { IAuthFacade } from "../../../src/modules/auth/contracts";

it("refreshes only a changed valid auth session from the exact local-storage event", async () => {
  window.localStorage.clear();
  const previousState = {
    session: {
      accessToken: "mutation_token_before_restart",
      issuedAt: "2026-05-27T10:00:00.000Z",
      expiresAt: "2099-05-27T20:00:00.000Z",
      user: {
        id: "u_builder_001",
        username: "builder.user",
        displayName: "Builder User",
        role: "builder" as const
      }
    },
    authorization: {
      role: "builder" as const,
      permissions: ["scene.read", "scene.edit"]
    }
  };
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(previousState));
  const authorize = vi.fn(async () => previousState.authorization);
  const authFacade: IAuthFacade = {
    authenticate: vi.fn(),
    authorize,
    signOut: vi.fn()
  };
  window.history.replaceState({}, "", "/app?mode=areas_mode");
  render(<App authFacade={authFacade} />);

  const originalAuthenticatedShellControl = await screen.findByRole("button", {
    name: /sign out/i
  });
  await waitFor(() => expect(authorize).toHaveBeenCalledTimes(1));
  const refreshedState = {
    ...previousState,
    session: {
      ...previousState.session,
      accessToken: "mutation_token_after_restart",
      issuedAt: "2026-05-27T10:05:00.000Z"
    }
  };
  const oldValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  const newValue = JSON.stringify(refreshedState);
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, newValue);

  dispatchAuthStorageEvent("unrelated.storage.key", oldValue, newValue, window.localStorage);
  dispatchAuthStorageEvent(
    AUTH_SESSION_STORAGE_KEY,
    oldValue,
    newValue,
    window.sessionStorage
  );
  await flushEffects();
  expect(authorize).toHaveBeenCalledTimes(1);

  dispatchAuthStorageEvent(
    AUTH_SESSION_STORAGE_KEY,
    oldValue,
    newValue,
    null
  );
  await waitFor(() => {
    expect(authorize).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "mutation_token_after_restart" })
    );
  });
  expect(authorize).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: /sign out/i })).toBe(
    originalAuthenticatedShellControl
  );

  const secondRefreshedState = {
    ...refreshedState,
    session: {
      ...refreshedState.session,
      accessToken: "mutation_token_after_restart_2",
      issuedAt: "2026-05-27T10:06:00.000Z"
    }
  };
  const secondValue = JSON.stringify(secondRefreshedState);
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, secondValue);
  dispatchAuthStorageEvent(
    AUTH_SESSION_STORAGE_KEY,
    newValue,
    secondValue,
    window.localStorage
  );
  await waitFor(() => {
    expect(authorize).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "mutation_token_after_restart_2" })
    );
  });
  expect(authorize).toHaveBeenCalledTimes(3);

  dispatchAuthStorageEvent(
    AUTH_SESSION_STORAGE_KEY,
    secondValue,
    secondValue,
    window.localStorage
  );
  await flushEffects();
  expect(authorize).toHaveBeenCalledTimes(3);

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, "{malformed");
  dispatchAuthStorageEvent(
    AUTH_SESSION_STORAGE_KEY,
    secondValue,
    "{malformed",
    window.localStorage
  );
  await flushEffects();
  expect(authorize).toHaveBeenCalledTimes(3);
  expect(screen.getByRole("button", { name: /sign out/i })).toBe(
    originalAuthenticatedShellControl
  );
});

function dispatchAuthStorageEvent(
  key: string,
  oldValue: string | null,
  newValue: string | null,
  storageArea: Storage | null
) {
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key,
        oldValue,
        newValue,
        storageArea,
        url: window.location.href
      })
    );
  });
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}
