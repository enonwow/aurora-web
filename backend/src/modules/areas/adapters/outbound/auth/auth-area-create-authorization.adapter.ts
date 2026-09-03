import { Injectable } from "@nestjs/common";
import { AuthApplicationService } from "../../../../auth/application/auth.application.service";
import type { AreaCreateAuthorizationPort } from "../../../application/ports/area-create-transaction.port";

@Injectable()
export class AuthAreaCreateAuthorizationAdapter implements AreaCreateAuthorizationPort {
  constructor(private readonly auth: AuthApplicationService) {}

  async authorize(input: {
    readonly actorId: string;
    readonly moduleId: string;
    readonly permission: "area.create";
  }): Promise<boolean> {
    return (
      input.moduleId.length > 0 &&
      (await this.auth.actorHasPermission(input.actorId, input.permission))
    );
  }
}
