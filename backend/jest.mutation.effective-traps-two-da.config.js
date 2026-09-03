/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testMatch: ["<rootDir>/test/unit/effective-traps-two-da.spec.ts"],
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
};
