import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { RuntimeSettingsApplicationService } from "../src/modules/runtime-settings/application/runtime-settings.application.service";

interface CliArgs {
  forceFull: boolean;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "warn", "error"]
  });

  try {
    const runtimeSettings = app.get(RuntimeSettingsApplicationService);
    const result = await runtimeSettings.syncModuleBlobCache("script.module-cache-sync", {
      forceFull: args.forceFull
    });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

function parseArgs(argv: string[]): CliArgs {
  const flags = new Set(argv);
  return {
    forceFull: flags.has("--force-full")
  };
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
