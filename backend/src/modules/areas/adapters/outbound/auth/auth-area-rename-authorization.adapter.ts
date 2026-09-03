import { Injectable } from "@nestjs/common";
import { AuthApplicationService } from "../../../../auth/application/auth.application.service";
import type { AreaRenameAuthorizationPort } from "../../../application/ports/area-rename-transaction.port";

@Injectable()
export class AuthAreaRenameAuthorizationAdapter implements AreaRenameAuthorizationPort {
  constructor(private readonly auth: AuthApplicationService) {}

  async authorize(input: Readonly<{
    actorId: string;
    moduleId: string;
    permission: "area.materialize.rename";
  }>): Promise<boolean> {
    return input.moduleId.length > 0 &&
      this.auth.actorHasPermission(input.actorId, input.permission);
  }
}
