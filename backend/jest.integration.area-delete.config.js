/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: ["<rootDir>/test/integration/area-delete-atomic-publication.spec.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
};
