import { parseLoginRequest } from "../../src/modules/auth/adapters/inbound/http/auth.schemas";
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

  it("exposes login request DTO shape", () => {
    const dto = new LoginRequestDto();
    dto.username = "builder.user";
    dto.password = "builder123";

    expect(dto).toEqual({
      username: "builder.user",
      password: "builder123"
    });
  });

  it("exports all user roles", () => {
    expect(ALL_ROLES).toEqual(["viewer", "builder", "dm", "admin"]);
  });
});
