import {
  parseCreateUserRequest,
  parseLoginRequest
} from "../../src/modules/auth/adapters/inbound/http/auth.schemas";
import { CreateUserRequestDto } from "../../src/modules/auth/adapters/inbound/http/dto/create-user.request.dto";
import { LoginRequestDto } from "../../src/modules/auth/adapters/inbound/http/dto/login.request.dto";
import { ALL_ROLES } from "../../src/modules/auth/domain/auth.types";

describe("Auth contracts", () => {
  it("parses login payload and rejects invalid input", () => {
    expect(parseLoginRequest({ username: "builder", password: "secret" })).toEqual({
      username: "builder",
      password: "secret"
    });

    expect(() => parseLoginRequest({ username: "", password: "" })).toThrow(
      "Login payload validation failed."
    );
  });

  it("parses create user payload and rejects invalid input", () => {
    expect(
      parseCreateUserRequest({
        username: "qa.viewer",
        password: "StrongPass123",
        displayName: "QA Viewer",
        role: "viewer"
      })
    ).toEqual({
      username: "qa.viewer",
      password: "StrongPass123",
      displayName: "QA Viewer",
      role: "viewer"
    });

    expect(() =>
      parseCreateUserRequest({
        username: "ab",
        password: "weak",
        displayName: "",
        role: "unknown"
      })
    ).toThrow("Create user payload validation failed.");
  });

  it("exposes login request DTO shape", () => {
    const dto = new LoginRequestDto();
    dto.username = "builder.user";
    dto.password = "builder123";

    expect(dto).toEqual({
      username: "builder.user",
      password: "builder123"
    });
  });

  it("exposes create user request DTO shape", () => {
    const dto = new CreateUserRequestDto();
    dto.username = "qa.viewer";
    dto.password = "StrongPass123";
    dto.displayName = "QA Viewer";
    dto.role = "viewer";

    expect(dto).toEqual({
      username: "qa.viewer",
      password: "StrongPass123",
      displayName: "QA Viewer",
      role: "viewer"
    });
  });

  it("exports all user roles", () => {
    expect(ALL_ROLES).toEqual(["viewer", "builder", "dm", "admin"]);
  });
});
