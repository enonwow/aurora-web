/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: [
    "<rootDir>/test/unit/area-encounter-construction.spec.ts",
    "<rootDir>/test/unit/area-update-draft-projector.spec.ts",
    "<rootDir>/test/unit/area-update-candidate-compiler.spec.ts",
    "<rootDir>/test/integration/area-update-atomic-publication.spec.ts",
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testEnvironment: "node",
};
