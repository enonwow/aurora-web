/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: [
    "<rootDir>/test/unit/aurora-gff-area-parser.spec.ts",
    "<rootDir>/test/unit/area-update-draft-projector.spec.ts",
    "<rootDir>/test/unit/area-existing-object-deletion-planner.spec.ts",
    "<rootDir>/test/unit/aurora-gff-area-object-pair-writer.spec.ts",
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testEnvironment: "node",
};
