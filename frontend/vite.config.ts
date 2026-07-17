import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { Connect, Plugin } from "vite";

const SPA_ROUTES = new Set(["/app", "/login"]);
const DEV_BACKEND_PROXY_PREFIX = "/_aurora";
const BACKEND_PROXY_TARGET =
  process.env.BACKEND_PROXY_TARGET ?? "http://127.0.0.1:3000";
const backendProxyAgent = new http.Agent({
  keepAlive: false,
  maxSockets: Number.POSITIVE_INFINITY
});
const DEV_SERVER_HMR =
  process.env.AURORA_VITE_HMR === "false" ? false : undefined;
const DEV_SERVER_WATCH_IGNORED = [
  "**/public/aurora-evidence/**",
  "**/public/**/chrome-profile/**",
  "**/public/**/chrome-cdp-profile*/**"
];

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

function publicDirCopyWithoutBrowserProfiles(): Plugin {
  let publicDir = "";
  let outDir = "";
  return {
    name: "aurora-public-dir-copy-without-browser-profiles",
    apply: "build",
    configResolved(config) {
      publicDir = typeof config.publicDir === "string" ? config.publicDir : "";
      outDir = path.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      if (!publicDir || !fs.existsSync(publicDir)) {
        return;
      }
      copyPublicEntry(publicDir, outDir);
    }
  };
}

function copyPublicEntry(sourcePath: string, targetPath: string): void {
  const sourceStat = fs.statSync(sourcePath);
  if (sourceStat.isDirectory()) {
    if (shouldSkipPublicDirectory(sourcePath)) {
      return;
    }
    fs.mkdirSync(targetPath, { recursive: true });
    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      copyPublicEntry(path.join(sourcePath, entry.name), path.join(targetPath, entry.name));
    }
    return;
  }
  if (sourceStat.isFile()) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function shouldSkipPublicDirectory(directoryPath: string): boolean {
  const basename = path.basename(directoryPath).toLowerCase();
  return basename === "chrome-profile" || basename.startsWith("chrome-cdp-profile");
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
    react(),
    publicDirCopyWithoutBrowserProfiles()
  ],
  build: {
    copyPublicDir: false
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    ...(DEV_SERVER_HMR !== undefined ? { hmr: DEV_SERVER_HMR } : {}),
    watch: {
      ignored: DEV_SERVER_WATCH_IGNORED
    },
    proxy: {
      [DEV_BACKEND_PROXY_PREFIX]: {
        target: BACKEND_PROXY_TARGET,
        changeOrigin: true,
        agent: backendProxyAgent,
        rewrite: (path) => path.replace(/^\/_aurora/, "/api")
      },
      "/api": {
        target: BACKEND_PROXY_TARGET,
        changeOrigin: true,
        agent: backendProxyAgent
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
