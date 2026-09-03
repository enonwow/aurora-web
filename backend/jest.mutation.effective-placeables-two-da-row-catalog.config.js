/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testMatch: [
    "<rootDir>/test/unit/effective-placeables-two-da-row-catalog.spec.ts",
    "<rootDir>/test/unit/catalog.schemas.spec.ts",
    "<rootDir>/test/unit/module-snapshot-template-catalog.repository.spec.ts",
    "<rootDir>/test/unit/catalog.application.service.spec.ts",
    "<rootDir>/test/unit/http-controllers.spec.ts",
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testEnvironment: "node",
};
