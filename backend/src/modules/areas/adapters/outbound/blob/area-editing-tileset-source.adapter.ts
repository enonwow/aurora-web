import { Injectable } from "@nestjs/common";
import type { AreaCreateTilesetSourcePort } from "../../../application/ports/area-create-transaction.port";
import { AreaEditingApplicationService } from "../../../application/area-editing.application.service";

@Injectable()
export class AreaEditingTilesetSourceAdapter implements AreaCreateTilesetSourcePort {
  constructor(private readonly areaEditing: AreaEditingApplicationService) {}

  async resolve(resRef: string) {
    const definition = await this.areaEditing.getTilesetDefinition(resRef);
    return Object.freeze({
      resRef: definition.tilesetResRef,
      fingerprintSha256: definition.fingerprint,
    });
  }
}
