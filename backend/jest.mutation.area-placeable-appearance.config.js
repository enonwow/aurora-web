/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testMatch: [
    "<rootDir>/test/unit/area-placeable-appearance.spec.ts",
    "<rootDir>/test/unit/aurora-gff-area-parser.spec.ts",
    "<rootDir>/test/unit/area-update-draft-projector.spec.ts",
    "<rootDir>/test/unit/area-existing-object-deletion-planner.spec.ts",
    "<rootDir>/test/unit/aurora-gff-area-object-pair-writer.spec.ts",
    "<rootDir>/test/unit/area-update-candidate-compiler.spec.ts",
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testEnvironment: "node",
};
