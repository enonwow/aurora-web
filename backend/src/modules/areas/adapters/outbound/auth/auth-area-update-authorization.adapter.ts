import { Injectable } from "@nestjs/common";
import { AuthApplicationService } from "../../../../auth/application/auth.application.service";
import type { AreaUpdateAuthorizationPort } from "../../../application/ports/area-update-validation.port";

@Injectable()
export class AuthAreaUpdateAuthorizationAdapter
  implements AreaUpdateAuthorizationPort
{
  constructor(private readonly auth: AuthApplicationService) {}

  async authorize(input: Readonly<{
    actorId: string;
    moduleId: string;
    permission: "area.materialize.update";
  }>): Promise<boolean> {
    return (
      input.moduleId.length > 0 &&
      (await this.auth.actorHasPermission(input.actorId, input.permission))
    );
  }
}
