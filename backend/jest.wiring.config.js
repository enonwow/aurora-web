/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: ["<rootDir>/test/unit/module-wiring.spec.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      { tsconfig: "<rootDir>/tsconfig.jest-isolated.json", diagnostics: false },
    ],
  },
  testEnvironment: "node",
};
