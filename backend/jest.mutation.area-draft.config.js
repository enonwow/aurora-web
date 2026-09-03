/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: ["<rootDir>/test/unit/area-draft.application.service.spec.ts"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  testEnvironment: "node"
};
