import { HttpException, HttpStatus } from "@nestjs/common";
import { of } from "rxjs";
import { AppConfigService } from "../../src/common/config/app-config.service";
import { AppException } from "../../src/common/http/app-exception";
import { HttpErrorFilter } from "../../src/common/http/http-error.filter";
import { RequestContextInterceptor } from "../../src/common/http/request-context.interceptor";
import { setupSwagger } from "../../src/common/openapi/swagger";

describe("HTTP infrastructure", () => {
  it("maps AppException and HttpException payloads in HttpErrorFilter", () => {
    const config = { contractVersion: "1.0.0" } as AppConfigService;
    const filter = new HttpErrorFilter(config);
    const reply = createReply();
    const host = createHost({ requestId: "req-1" }, reply);

    filter.catch(
      new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "Bad input",
        details: [{ path: "field", reason: "required" }],
        retryable: true
      }),
      host as any
    );
    filter.catch(
      new HttpException(
        {
          message: ["one", "two"],
          details: [{ path: "x", reason: "y" }],
          retryable: false
        },
        HttpStatus.BAD_REQUEST
      ),
      host as any
    );
    filter.catch(new HttpException("Forbidden", HttpStatus.FORBIDDEN), host as any);
    filter.catch(new Error("boom"), host as any);

    expect(reply.status).toHaveBeenCalledWith(422);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenLastCalledWith({
      contractVersion: "1.0.0",
      requestId: "req-1",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error.",
        details: [],
        retryable: false
      }
    });
  });

  it("sets request id in RequestContextInterceptor from header or UUID", () => {
    const interceptor = new RequestContextInterceptor();
    const reply = createReply();
    const requestA = {
      headers: {
        "x-request-id": "   req-from-header   "
      }
    };
    const requestB = {
      headers: {}
    };

    const next = {
      handle: jest.fn().mockReturnValue(of("ok"))
    };

    const resultA = interceptor.intercept(createExecutionContext(requestA, reply) as any, next as any);
    const resultB = interceptor.intercept(createExecutionContext(requestB, reply) as any, next as any);

    expect(requestA).toMatchObject({ requestId: "req-from-header" });
    expect(requestB).toMatchObject({ requestId: expect.any(String) });
    expect(reply.header).toHaveBeenCalledWith("x-request-id", "req-from-header");
    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();
  });

  it("registers Swagger only when enabled", () => {
    const createDocument = jest.fn().mockReturnValue({ openapi: "3.1.0" });
    const setup = jest.fn((_path: string, _app: unknown, documentFactory: () => unknown) => {
      documentFactory();
    });
    jest.doMock("@nestjs/swagger", () => {
      class DocumentBuilderMock {
        setTitle() {
          return this;
        }
        setDescription() {
          return this;
        }
        setVersion() {
          return this;
        }
        addBearerAuth() {
          return this;
        }
        build() {
          return { mocked: true };
        }
      }

      return {
        DocumentBuilder: DocumentBuilderMock,
        SwaggerModule: {
          createDocument,
          setup
        }
      };
    });

    jest.isolateModules(() => {
      const { setupSwagger: isolatedSetupSwagger } = require("../../src/common/openapi/swagger");
      const app = {} as any;
      isolatedSetupSwagger(
        app,
        {
          swaggerEnabled: false,
          swaggerPath: "docs",
          swaggerJsonPath: "docs-json",
          contractVersion: "1.0.0"
        } as AppConfigService
      );
      isolatedSetupSwagger(
        app,
        {
          swaggerEnabled: true,
          swaggerPath: "docs",
          swaggerJsonPath: "docs-json",
          contractVersion: "1.0.0"
        } as AppConfigService
      );
    });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(createDocument).toHaveBeenCalledTimes(1);
  });
});

function createReply() {
  const reply = {
    status: jest.fn(),
    send: jest.fn(),
    header: jest.fn()
  };
  reply.status.mockReturnValue(reply);
  reply.header.mockReturnValue(reply);
  return reply;
}

function createHost(request: any, response: any) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response
    })
  };
}

function createExecutionContext(request: any, response: any) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response
    })
  };
}
