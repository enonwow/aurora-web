/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testMatch: [
    "<rootDir>/test/unit/aurora-gff-area-parser.spec.ts",
    "<rootDir>/test/unit/module-snapshot-area.repository.spec.ts",
    "<rootDir>/test/unit/area-processing.builders.spec.ts",
    "<rootDir>/test/unit/area-placeable-localized-strings.spec.ts",
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testEnvironment: "node",
};
