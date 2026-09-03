/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: [
    "<rootDir>/test/unit/area-delete-candidate-compiler.spec.ts",
    "<rootDir>/test/unit/area-delete-transaction-coordinator.spec.ts",
    "<rootDir>/test/unit/area-delete-recovery.coordinator.spec.ts",
    "<rootDir>/test/unit/memory-area-delete-control-store.spec.ts",
    "<rootDir>/test/unit/atomic-area-delete-transaction-storage.adapter.spec.ts"
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  testEnvironment: "node"
};
