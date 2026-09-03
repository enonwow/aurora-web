/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: [
    "<rootDir>/test/integration/area-event-script-publication-atomic.integration.spec.ts",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: { isolatedModules: true },
      diagnostics: false,
    }],
  },
  testEnvironment: "node",
};
