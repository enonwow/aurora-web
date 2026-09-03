/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  maxWorkers: 1,
  testMatch: [
    "<rootDir>/test/unit/area-update-validation-command.contract.spec.ts",
    "<rootDir>/test/unit/area-update-draft-projector.spec.ts",
    "<rootDir>/test/unit/aurora-area-update-candidate-validator.spec.ts",
    "<rootDir>/test/unit/area-update-validation.application.service.spec.ts"
  ],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  testEnvironment: "node"
};
