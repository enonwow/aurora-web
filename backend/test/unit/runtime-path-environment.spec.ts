import {
  getRuntimePathEnvironment,
  translateHostPathToRuntime,
  translateRuntimePathToHost
} from "../../src/modules/runtime-settings/application/runtime-path-environment";

const dockerEnv: NodeJS.ProcessEnv = {
  AURORA_RUNTIME_PATH_MODE: "docker",
  NWN_USER_DIR_HOST: "C:\\Users\\alice\\Documents\\Neverwinter Nights",
  NWN_INSTALL_DIR_HOST:
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights",
  AURORA_REFERENCE_DIR_HOST: "D:\\Aurora Reference"
};

describe("runtime path environment", () => {
  it("keeps real paths unchanged when the backend runs directly on the host", () => {
    expect(
      translateHostPathToRuntime(
        "C:\\Users\\alice\\Documents\\Neverwinter Nights",
        "NWN_USER_DIR_HOST",
        { env: { AURORA_RUNTIME_PATH_MODE: "host" } }
      )
    ).toEqual({
      ok: true,
      runtimePath: "C:\\Users\\alice\\Documents\\Neverwinter Nights"
    });
  });

  it("translates real Windows host paths to stable Docker mount paths", () => {
    expect(
      translateHostPathToRuntime(
        "C:\\Users\\alice\\Documents\\Neverwinter Nights\\LC-Decompiled\\temp0",
        "NWN_USER_DIR_HOST",
        { env: dockerEnv }
      )
    ).toEqual({
      ok: true,
      runtimePath: "/host/nwn-user/LC-Decompiled/temp0"
    });
  });

  it("rejects internal Docker aliases submitted by the frontend", () => {
    const result = translateHostPathToRuntime(
      "/host/nwn-user",
      "NWN_USER_DIR_HOST",
      { env: dockerEnv, restrictToPreferredMount: true }
    );

    expect(result).toMatchObject({
      ok: false,
      issue: {
        code: "HOST_PATH_REQUIRED",
        envVariable: "NWN_USER_DIR_HOST"
      }
    });
  });

  it("requires an env update and Compose recreation for an unmounted host path", () => {
    const result = translateHostPathToRuntime(
      "E:\\Different NWN",
      "NWN_USER_DIR_HOST",
      { env: dockerEnv, restrictToPreferredMount: true }
    );

    expect(result).toMatchObject({
      ok: false,
      issue: {
        code: "RESTART_REQUIRED",
        envVariable: "NWN_USER_DIR_HOST",
        hostPath: dockerEnv.NWN_USER_DIR_HOST
      }
    });
  });

  it("returns real host paths for both stable and legacy stored runtime aliases", () => {
    expect(
      translateRuntimePathToHost(
        "/host/nwn-user/LC-Decompiled/temp0",
        dockerEnv
      )
    ).toBe(
      "C:\\Users\\alice\\Documents\\Neverwinter Nights\\LC-Decompiled\\temp0"
    );
    expect(
      translateRuntimePathToHost(
        "/host/nwn-docs/hak",
        dockerEnv
      )
    ).toBe("C:\\Users\\alice\\Documents\\Neverwinter Nights\\hak");
  });

  it("reports the host paths supplied to Docker Compose", () => {
    expect(getRuntimePathEnvironment(dockerEnv)).toMatchObject({
      mode: "docker",
      mounts: expect.arrayContaining([
        {
          envVariable: "NWN_USER_DIR_HOST",
          hostPath: dockerEnv.NWN_USER_DIR_HOST,
          runtimePath: "/host/nwn-user",
          configured: true
        }
      ])
    });
  });
});
