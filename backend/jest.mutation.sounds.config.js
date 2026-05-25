/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/test/unit/sounds.application.service.spec.ts",
    "<rootDir>/test/unit/sounds.schemas.spec.ts",
    "<rootDir>/test/unit/memory-sound-processing-cache.repository.spec.ts",
    "<rootDir>/test/unit/layered-sound-processing-cache.repository.spec.ts"
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  }
};
