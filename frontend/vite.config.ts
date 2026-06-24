import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Connect } from "vite";

const SPA_ROUTES = new Set(["/app", "/login"]);
const DEV_BACKEND_PROXY_PREFIX = "/_aurora";
const BACKEND_PROXY_TARGET =
  process.env.BACKEND_PROXY_TARGET ?? "http://localhost:3000";

function rewriteSpaRouteUrl(url: string | undefined): string | undefined {
  if (!url) {
    return url;
  }
  const [pathWithQuery, hash = ""] = url.split("#", 2);
  const [pathname, query = ""] = (pathWithQuery ?? "").split("?", 2);
  if (!SPA_ROUTES.has(pathname)) {
    return url;
  }
  const rewritten = `/${query ? `?${query}` : ""}`;
  return hash ? `${rewritten}#${hash}` : rewritten;
}

function spaRouteFallbackMiddleware(): Connect.NextHandleFunction {
  return (req, _res, next) => {
    if (req.method === "GET") {
      req.url = rewriteSpaRouteUrl(req.url);
    }
    next();
  };
}

export default defineConfig({
  plugins: [
    {
      name: "aurora-spa-route-fallback",
      configureServer(server) {
        server.middlewares.use(spaRouteFallbackMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(spaRouteFallbackMiddleware());
      }
    },
    react()
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      [DEV_BACKEND_PROXY_PREFIX]: {
        target: BACKEND_PROXY_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_aurora/, "/api")
      },
      "/api": {
        target: BACKEND_PROXY_TARGET,
        changeOrigin: true
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 5173
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    exclude: [...configDefaults.exclude, "**/.stryker-tmp/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "dist/**",
        "vite.config.ts",
        "tests/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/modules/layout/components/WorkspaceCanvasViewport.tsx",
        "src/modules/**/contracts.ts",
        "src/**/*.d.ts"
      ]
    }
  }
});
