/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: [
    "<rootDir>/test/unit/aurora-gff-area-parser.spec.ts",
    "<rootDir>/test/unit/aurora-gff-area-parser.internals.spec.ts",
    "<rootDir>/test/unit/module-snapshot-area.repository.spec.ts",
    "<rootDir>/test/unit/module-snapshot-area.repository.internals.spec.ts",
    "<rootDir>/test/unit/areas.application.service.spec.ts"
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  testEnvironment: "node"
};
