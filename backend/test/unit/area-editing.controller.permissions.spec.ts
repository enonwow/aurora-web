import { Reflector } from "@nestjs/core";
import { AreaEditingController } from "../../src/modules/areas/adapters/inbound/http/area-editing.controller";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import type { Permission } from "../../src/modules/auth/domain/auth.policy";

describe("AreaEditingController permission metadata", () => {
  it("requires scene.edit for persistNewArea instead of inheriting scene.read", () => {
    const reflector = new Reflector();
    const handler = AreaEditingController.prototype.persistNewArea;

    expect(reflector.get<Permission[]>(PERMISSIONS_KEY, AreaEditingController)).toEqual([
      "scene.read"
    ]);
    expect(reflector.get<Permission[]>(PERMISSIONS_KEY, handler)).toEqual([
      "scene.edit"
    ]);
    expect(
      reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
        handler,
        AreaEditingController
      ])
    ).toEqual(["scene.edit"]);
  });
});
