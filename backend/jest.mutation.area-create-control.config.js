/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: [
    "<rootDir>/test/unit/area-create-command.contract.spec.ts",
    "<rootDir>/test/unit/area-create-recovery.coordinator.spec.ts",
    "<rootDir>/test/unit/memory-area-create-control-store.spec.ts"
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  testEnvironment: "node"
};
