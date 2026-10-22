describe("main bootstrap", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("creates app, applies setup and starts listening", async () => {
    const setupCors = jest.fn();
    const setupSwagger = jest.fn();
    const config = { port: 4321, bindHost: "0.0.0.0" };
    const app = {
      setGlobalPrefix: jest.fn(),
      get: jest.fn().mockReturnValue(config),
      listen: jest.fn().mockResolvedValue(undefined)
    };
    const create = jest.fn().mockResolvedValue(app);
    const fastifyInstance = { addHook: jest.fn() };
    const adapter = { adapter: true, getInstance: jest.fn().mockReturnValue(fastifyInstance) };
    const fastifyAdapterCtor = jest.fn().mockImplementation(() => adapter);
    const registerAreaEventScriptHttpBodyLimit = jest.fn();

    jest.doMock("@nestjs/core", () => ({
      NestFactory: {
        create
      }
    }));
    jest.doMock("@nestjs/platform-fastify", () => ({
      FastifyAdapter: fastifyAdapterCtor
    }));
    jest.doMock("../../src/common/http/cors", () => ({
      setupCors
    }));
    jest.doMock("../../src/common/openapi/swagger", () => ({
      setupSwagger
    }));
    jest.doMock(
      "../../src/modules/areas/adapters/inbound/http/area-event-script-body-limit",
      () => ({ registerAreaEventScriptHttpBodyLimit })
    );

    jest.isolateModules(() => {
      require("../../src/main");
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(create).toHaveBeenCalledTimes(1);
    expect(fastifyAdapterCtor).toHaveBeenCalledWith({
      logger: true
    });
    expect(adapter.getInstance).toHaveBeenCalledTimes(1);
    expect(registerAreaEventScriptHttpBodyLimit).toHaveBeenCalledWith(fastifyInstance);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith("api/v1");
    expect(setupCors).toHaveBeenCalledWith(app, config);
    expect(setupSwagger).toHaveBeenCalledWith(app, config);
    expect(app.listen).toHaveBeenCalledWith(4321, "0.0.0.0");
  });
});
