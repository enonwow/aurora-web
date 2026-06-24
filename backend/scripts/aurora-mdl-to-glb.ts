import { convertAuroraMdlFileToGlb } from "../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";

interface CliArgs {
  input: string;
  output: string;
  resref?: string;
  extension?: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await convertAuroraMdlFileToGlb(args.input, args.output);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      converter: "aurora-mdl-to-glb",
      input: args.input,
      output: args.output,
      resref: args.resref,
      extension: args.extension,
      modelName: result.modelName,
      meshCount: result.meshCount,
      textureReferences: result.textureReferences,
      vertexCount: result.vertexCount,
      triangleCount: result.triangleCount,
      bytes: result.bytes.length,
      warnings: result.warnings
    })
  );
}

function parseArgs(argv: string[]): CliArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      values.set(key, "true");
      continue;
    }
    values.set(key, value);
    index += 1;
  }

  const input = values.get("input");
  const output = values.get("output");
  if (!input || !output) {
    throw new Error("Usage: aurora-mdl-to-glb --input <model.mdl> --output <model.glb>");
  }

  return {
    input,
    output,
    resref: values.get("resref"),
    extension: values.get("extension")
  };
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
