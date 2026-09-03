import { Injectable } from "@nestjs/common";
import { AuthApplicationService } from "../../../../auth/application/auth.application.service";
import type { AreaDeleteAuthorizationPort } from "../../../application/ports/area-delete.port";

@Injectable()
export class AuthAreaDeleteAuthorizationAdapter implements AreaDeleteAuthorizationPort {
  constructor(private readonly auth: AuthApplicationService) {}

  async authorize(input: Readonly<{
    actorId: string;
    moduleId: string;
    permission: "area.materialize.delete";
  }>): Promise<boolean> {
    return input.moduleId.length > 0 &&
      this.auth.actorHasPermission(input.actorId, input.permission);
  }
}
