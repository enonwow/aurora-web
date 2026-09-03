/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RUNTIME_BUILD_COMMIT?: string;
  readonly VITE_RUNTIME_BUILD_IMAGE_DIGEST?: string;
  readonly VITE_RUNTIME_BUILD_BUILT_AT?: string;
}
