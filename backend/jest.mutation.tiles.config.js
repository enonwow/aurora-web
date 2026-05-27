/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/test/unit/tiles.application.service.spec.ts",
    "<rootDir>/test/unit/tiles.schemas.spec.ts",
    "<rootDir>/test/unit/memory-tile-processing-cache.repository.spec.ts",
    "<rootDir>/test/unit/layered-tile-processing-cache.repository.spec.ts"
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  }
};
