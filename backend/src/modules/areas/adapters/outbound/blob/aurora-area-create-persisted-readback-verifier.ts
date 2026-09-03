import { Injectable } from "@nestjs/common";
import type { AreaCreatePersistedReadbackVerifierPort } from "../../../application/ports/area-create-readback-verifier.port";
import { validateAreaCreationResourceSet } from "./aurora-area-creation-resource-set-validator";
import { moduleIfoContainsArea } from "./aurora-gff-module-ifo-area-writer";

@Injectable()
export class AuroraAreaCreatePersistedReadbackVerifier
  implements AreaCreatePersistedReadbackVerifierPort
{
  readonly version = "aurora-area-create-persisted-readback.v1";

  async verify(
    input: Parameters<AreaCreatePersistedReadbackVerifierPort["verify"]>[0],
  ): ReturnType<AreaCreatePersistedReadbackVerifierPort["verify"]> {
    const diagnostics: string[] = [];
    const byExtension = new Map<string, Buffer>();
    for (const resource of input.resources) {
      if (byExtension.has(resource.extension)) {
        diagnostics.push(`AREA_READBACK_RESOURCE_DUPLICATE:${resource.extension}`);
        continue;
      }
      byExtension.set(resource.extension, Buffer.from(resource.bytes));
    }
    const are = byExtension.get("are");
    const git = byExtension.get("git");
    const gic = byExtension.get("gic");
    if (!are || !git || !gic) {
      diagnostics.push("AREA_READBACK_RESOURCE_SET_INCOMPLETE");
    } else {
      const structural = validateAreaCreationResourceSet({ are, git, gic });
      diagnostics.push(
        ...structural.diagnostics
          .filter((diagnostic) => diagnostic.severity === "ERROR")
          .map(
            (diagnostic) =>
              `${diagnostic.code}:${diagnostic.path}:${diagnostic.message}`,
          ),
      );
    }
    if (!moduleIfoContainsArea(input.moduleIfo.bytes, input.areaId)) {
      diagnostics.push("AREA_READBACK_IFO_MEMBERSHIP_MISSING");
    }
    return Object.freeze({
      valid: diagnostics.length === 0,
      diagnostics: Object.freeze(diagnostics),
    });
  }
}
