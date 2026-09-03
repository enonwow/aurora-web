/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  modulePathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  testMatch: [
    "<rootDir>/test/unit/effective-placeables-two-da-descriptor.spec.ts",
    "<rootDir>/test/unit/area-placeable-basic-identity-table.spec.ts",
    "<rootDir>/test/unit/module-snapshot-template-catalog.repository.spec.ts",
    "<rootDir>/test/unit/module-snapshot-area.repository.spec.ts",
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  testEnvironment: "node",
};
