import fs from "node:fs";
import path from "node:path";
import { validateVfxPresentationProfile } from "./lib/vfx-presentation-profile-contract.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const fixtureRoot = path.resolve(repoRoot, "frontend/public/dev-fixtures");
const profilePaths = fs
  .readdirSync(fixtureRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.resolve(fixtureRoot, entry.name, "presentation-profile.json"))
  .filter((profilePath) => fs.existsSync(profilePath))
  .sort();

if (profilePaths.length === 0) {
  throw new Error("No VFX presentation profiles were found.");
}

const profiles = profilePaths.map((profilePath) => {
  const profile = validateVfxPresentationProfile(
    JSON.parse(fs.readFileSync(profilePath, "utf8"))
  );
  return {
    path: path.relative(repoRoot, profilePath).replaceAll("\\", "/"),
    version: profile.version,
    profileHash: profile.profileHash
  };
});

console.log(
  JSON.stringify(
    {
      version: "aurora-vfx-presentation-profile-validation/v1",
      status: "valid",
      profileCount: profiles.length,
      profiles
    },
    null,
    2
  )
);
