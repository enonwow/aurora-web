export const AREA_TRANSACTION_POST_BEGIN_FAULT_POINTS = [
  "storage.stage",
  "journal.transition.staged",
  "storage.commitResources",
  "journal.transition.resources_committed",
  "storage.commitModuleIfo",
  "journal.transition.ifo_committed",
  "storage.readBack",
  "journal.recordReadback",
  "journal.finalize",
] as const;

export type AreaTransactionPostBeginFaultPoint =
  (typeof AREA_TRANSACTION_POST_BEGIN_FAULT_POINTS)[number];

type FaultInjectableDependencies = Readonly<{
  storage: Readonly<{
    stage: jest.Mock;
    commitResources: jest.Mock;
    commitModuleIfo: jest.Mock;
    readBack: jest.Mock;
  }>;
  journal: Readonly<{
    begin: jest.Mock;
    transition: jest.Mock;
    recordReadback: jest.Mock;
    finalize: jest.Mock;
  }>;
}>;

export function injectAreaTransactionBeginFault(
  value: unknown,
): Error {
  const dependencies = requireFaultInjectableDependencies(value);
  const error = new Error("injected fault: journal.begin");
  dependencies.journal.begin.mockRejectedValue(error);
  return error;
}

export function injectAreaTransactionPostBeginFault(
  value: unknown,
  point: AreaTransactionPostBeginFaultPoint,
): Error {
  const dependencies = requireFaultInjectableDependencies(value);
  const error = new Error(`injected fault: ${point}`);
  switch (point) {
    case "storage.stage":
      dependencies.storage.stage.mockRejectedValue(error);
      break;
    case "storage.commitResources":
      dependencies.storage.commitResources.mockRejectedValue(error);
      break;
    case "storage.commitModuleIfo":
      dependencies.storage.commitModuleIfo.mockRejectedValue(error);
      break;
    case "storage.readBack":
      dependencies.storage.readBack.mockRejectedValue(error);
      break;
    case "journal.recordReadback":
      dependencies.journal.recordReadback.mockRejectedValue(error);
      break;
    case "journal.finalize":
      dependencies.journal.finalize.mockRejectedValue(error);
      break;
    case "journal.transition.staged":
    case "journal.transition.resources_committed":
    case "journal.transition.ifo_committed": {
      const failedState = point.slice("journal.transition.".length);
      dependencies.journal.transition.mockImplementation(
        async (_transactionId: string, state: string) => {
          if (state === failedState) throw error;
        },
      );
      break;
    }
  }
  return error;
}

function requireFaultInjectableDependencies(value: unknown): FaultInjectableDependencies {
  if (!value || typeof value !== "object") {
    throw new TypeError("Fault matrix dependencies must be an object.");
  }
  const candidate = value as Readonly<{
    storage?: Readonly<Record<string, unknown>>;
    journal?: Readonly<Record<string, unknown>>;
  }>;
  const required = [
    candidate.storage?.stage,
    candidate.storage?.commitResources,
    candidate.storage?.commitModuleIfo,
    candidate.storage?.readBack,
    candidate.journal?.begin,
    candidate.journal?.transition,
    candidate.journal?.recordReadback,
    candidate.journal?.finalize,
  ];
  if (required.some((entry) => !jest.isMockFunction(entry))) {
    throw new TypeError("Fault matrix requires mocked transaction boundaries.");
  }
  return value as FaultInjectableDependencies;
}
