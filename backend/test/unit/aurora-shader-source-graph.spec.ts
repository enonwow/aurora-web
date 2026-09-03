import {
  buildAuroraShaderProgramSourceBundle,
  extractAuroraShaderIncludeRefs
} from "../../src/modules/vfx/domain/aurora-shader-source-graph";

describe("Aurora shader source graph", () => {
  it("extracts normalized quoted and angle-bracket include resrefs", () => {
    expect(
      extractAuroraShaderIncludeRefs(
        '#include "inc_standard"\n#include <INC_LIGHTING.shd>\n#include "inc_standard"'
      )
    ).toEqual(["inc_lighting", "inc_standard"]);
  });

  it("walks reachable includes, tolerates cycles, and reports exact missing refs", () => {
    const bundle = buildAuroraShaderProgramSourceBundle({
      stageRoots: {
        vertex: "fx_vs",
        fragment: "fx_fs"
      },
      sources: [
        {
          resref: "fx_vs",
          source: '#include "inc_standard"\nvoid main() {}',
          includeRefs: []
        },
        {
          resref: "fx_fs",
          source: '#include "inc_missing"\nvoid main() {}',
          includeRefs: []
        },
        {
          resref: "inc_standard",
          source: '#include "fx_vs"',
          includeRefs: []
        },
        {
          resref: "unreachable",
          source: "void unused() {}",
          includeRefs: []
        }
      ]
    });

    expect(bundle.status).toBe("incomplete");
    expect(bundle.unresolvedRefs).toEqual(["inc_missing"]);
    expect(bundle.sources.map((source) => source.resref)).toEqual([
      "fx_fs",
      "fx_vs",
      "inc_standard"
    ]);
  });
});
