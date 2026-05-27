import {
  createLayoutFacadeBundle,
  type LayoutFacadeBundle
} from "../application/layoutFacadeBundle";
import { createBrowserLayoutPreferencesPort } from "../adapters/browserLayoutPreferencesPort";

interface BrowserLayoutFacadeBundleOptions {
  storage?: Storage | null;
  rootElement?: HTMLElement | null;
}

export function createBrowserLayoutFacadeBundle(
  options: BrowserLayoutFacadeBundleOptions = {}
): LayoutFacadeBundle {
  const storage =
    options.storage ?? (typeof window === "undefined" ? null : window.localStorage);
  const rootElement =
    options.rootElement ??
    (typeof document === "undefined" ? null : document.documentElement);

  return createLayoutFacadeBundle({
    preferencesPort: createBrowserLayoutPreferencesPort({
      storage,
      rootElement
    })
  });
}
