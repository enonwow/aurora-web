import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { AreaCreateCandidateValidatorPort } from "../../../application/ports/area-create-transaction.port";
import type { AreaCreateCommand } from "../../../domain/area-create-command.types";
import type {
  AreaCreateCandidateValidationIssue,
  AreaCreateCompiledCandidate,
  AreaCreateResourceExtension,
} from "../../../domain/area-create-transaction.types";
import { validateAreaCreationResourceSet } from "./aurora-area-creation-resource-set-validator";
import { moduleIfoContainsArea } from "./aurora-gff-module-ifo-area-writer";

const EXPECTED_TYPES: Readonly<Record<AreaCreateResourceExtension, number>> =
  Object.freeze({ are: 2012, git: 2023, gic: 2046 });

@Injectable()
export class AuroraAreaCreateCandidateValidator
  implements AreaCreateCandidateValidatorPort
{
  readonly version = "aurora-area-create-candidate-validator.v1";

  async validate(command: AreaCreateCommand, candidate: AreaCreateCompiledCandidate) {
    const issues: AreaCreateCandidateValidationIssue[] = [];
    if (candidate.areaId !== command.area.resRef) {
      issues.push(issue("AREA_ID_MISMATCH", "Candidate Area ID does not match the command ResRef."));
    }
    const resources = new Map(candidate.resources.map((resource) => [resource.extension, resource]));
    if (resources.size !== 3 || candidate.resources.length !== 3) {
      issues.push(issue("RESOURCE_SET_INVALID", "Candidate must contain exactly one ARE, GIT, and GIC."));
    }
    for (const extension of ["are", "git", "gic"] as const) {
      const resource = resources.get(extension);
      const expectedFileName = `${command.area.resRef}.${extension}`;
      if (
        !resource ||
        resource.fileName !== expectedFileName ||
        resource.key !== expectedFileName ||
        resource.resourceType !== EXPECTED_TYPES[extension] ||
        resource.size !== resource.bytes.length ||
        resource.sha256 !== sha256Hex(resource.bytes)
      ) {
        issues.push(issue("RESOURCE_DESCRIPTOR_INVALID", `Candidate ${extension.toUpperCase()} descriptor is invalid.`));
      }
    }
    const are = resources.get("are");
    const git = resources.get("git");
    const gic = resources.get("gic");
    if (are && git && gic) {
      const structural = validateAreaCreationResourceSet({
        are: are.bytes,
        git: git.bytes,
        gic: gic.bytes,
      });
      issues.push(
        ...structural.diagnostics.map((diagnostic) =>
          issue(diagnostic.code, `${diagnostic.path}: ${diagnostic.message}`),
        ),
      );
    }
    if (
      candidate.moduleIfo.resourceType !== 2014 ||
      candidate.moduleIfo.fileName.toLowerCase() !== "module.ifo" ||
      candidate.moduleIfo.key !== candidate.moduleIfo.fileName ||
      candidate.moduleIfo.baselineSha256 !== sha256Hex(candidate.moduleIfo.baselineBytes) ||
      candidate.moduleIfo.candidateSha256 !== sha256Hex(candidate.moduleIfo.candidateBytes) ||
      moduleIfoContainsArea(candidate.moduleIfo.baselineBytes, command.area.resRef) ||
      !moduleIfoContainsArea(candidate.moduleIfo.candidateBytes, command.area.resRef)
    ) {
      issues.push(issue("MODULE_IFO_INVALID", "Candidate module.ifo patch is not an exact add-only Area registration."));
    }
    return issues.length === 0
      ? Object.freeze({ valid: true as const, issues: Object.freeze([]) as readonly [] })
      : Object.freeze({ valid: false as const, issues: Object.freeze(issues) });
  }
}

function issue(code: string, message: string): AreaCreateCandidateValidationIssue {
  return Object.freeze({ code, message });
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
