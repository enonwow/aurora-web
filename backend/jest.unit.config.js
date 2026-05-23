/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testMatch: ["<rootDir>/test/unit/**/*.spec.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  testEnvironment: "node"
};
