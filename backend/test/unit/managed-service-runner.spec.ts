const {
  buildResourceLimitedEnvironment,
  buildServiceLockPath,
  resolveServiceFamily,
  resolveServicePort,
} = require("../../../scripts/managed-service-runner.cjs") as {
  buildResourceLimitedEnvironment: (
    environment: NodeJS.ProcessEnv,
    heapLimitMb?: number,
  ) => NodeJS.ProcessEnv;
  buildServiceLockPath: (repositoryRoot: string, serviceName: string) => string;
  resolveServiceFamily: (serviceName: string) => "backend" | "frontend";
  resolveServicePort: (
    args: readonly string[],
    environment: NodeJS.ProcessEnv,
    defaultPort: number,
  ) => number;
};

describe("managed service runner", () => {
  it("uses the command-line port before the environment and default", () => {
    expect(
      resolveServicePort(["--host", "127.0.0.1", "--port", "5175"], {
        PORT: "3101",
      }, 5173),
    ).toBe(5175);
    expect(resolveServicePort(["--port=5176"], {}, 5173)).toBe(5176);
  });

  it("falls back to a valid PORT and then the service default", () => {
    expect(resolveServicePort([], { PORT: "3101" }, 3000)).toBe(3101);
    expect(resolveServicePort([], { PORT: "invalid" }, 3000)).toBe(3000);
  });

  it("rejects invalid explicit ports instead of creating an ambiguous lock", () => {
    expect(() => resolveServicePort(["--port", "0"], {}, 5173)).toThrow(
      /invalid service port/i,
    );
    expect(() => resolveServicePort(["--port=70000"], {}, 5173)).toThrow(
      /invalid service port/i,
    );
  });

  it("shares one repository lock across every backend or frontend alias", () => {
    expect(resolveServiceFamily("backend-nest")).toBe("backend");
    expect(resolveServiceFamily("backend-proof-row28")).toBe("backend");
    expect(resolveServiceFamily("frontend-vite")).toBe("frontend");
    expect(resolveServiceFamily("frontend-proof")).toBe("frontend");
    expect(() => resolveServiceFamily("worker-proof")).toThrow(
      /backend- or frontend-/i,
    );

    expect(buildServiceLockPath("C:/repo", "backend-nest")).toBe(
      buildServiceLockPath("C:/repo", "backend-proof-row28"),
    );
    expect(buildServiceLockPath("C:/repo", "frontend-vite")).toBe(
      buildServiceLockPath("C:/repo", "frontend-proof"),
    );
  });

  it("caps managed Node heaps while preserving unrelated Node options", () => {
    expect(
      buildResourceLimitedEnvironment({
        NODE_OPTIONS: "--trace-warnings --max-old-space-size=4096",
      }).NODE_OPTIONS,
    ).toBe("--trace-warnings --max-old-space-size=1024");
    expect(buildResourceLimitedEnvironment({}).NODE_OPTIONS).toBe(
      "--max-old-space-size=1024",
    );
  });
});
