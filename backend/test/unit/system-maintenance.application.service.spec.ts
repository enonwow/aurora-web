import { MemorySystemMaintenanceRepository } from "../../src/modules/system-maintenance/adapters/outbound/memory/memory-system-maintenance.repository";
import { SystemMaintenanceApplicationService } from "../../src/modules/system-maintenance/application/system-maintenance.application.service";

describe("SystemMaintenanceApplicationService", () => {
  it("grants one preflight lease for concurrent requests sharing an idempotency key", async () => {
    const repository = new MemorySystemMaintenanceRepository();
    const firstService = new SystemMaintenanceApplicationService(repository);
    const secondService = new SystemMaintenanceApplicationService(repository);
    await Promise.all([firstService.onModuleInit(), secondService.onModuleInit()]);

    const [first, second] = await Promise.all([
      firstService.beginPreflight("admin.user", "same-request"),
      secondService.beginPreflight("admin.user", "same-request")
    ]);

    expect([first.acquired, second.acquired].sort()).toEqual([false, true]);
    expect(first.record.operationId).toBe(second.record.operationId);
    expect(first.record.fencingToken).toBe(1);
    expect(second.record.fencingToken).toBe(1);
  });

  it("increments the fencing token on every persisted transition", async () => {
    const repository = new MemorySystemMaintenanceRepository();
    const service = new SystemMaintenanceApplicationService(repository);
    await service.onModuleInit();

    const lease = await service.beginPreflight("admin.user", "fencing");
    const rebuilding = await service.enterRebuilding({
      operationId: lease.record.operationId!,
      candidateRuntimeFingerprint: "candidate-fingerprint",
      stagingGeneration: "g-next",
      candidateSettings: { revision: 2 },
      previousSettings: { revision: 1 },
      participants: [{ name: "module-snapshot", status: "pending" }]
    });
    const publishing = await service.enterPublishing(lease.record.operationId!);

    expect(lease.record.fencingToken).toBe(1);
    expect(rebuilding.fencingToken).toBe(2);
    expect(publishing.fencingToken).toBe(3);
    expect(publishing.auditTrail?.map((event) => event.state)).toEqual([
      "preflight",
      "rebuilding",
      "publishing"
    ]);
    expect(publishing.auditTrail?.[0]).toMatchObject({
      triggeredBy: "admin.user",
      operationId: lease.record.operationId
    });
  });

  it("blocks every login while rebuilding and permits only admin recovery after failure", async () => {
    const repository = new MemorySystemMaintenanceRepository();
    const service = new SystemMaintenanceApplicationService(repository);
    await service.onModuleInit();
    const lease = await service.beginPreflight("admin.user");
    await service.enterRebuilding({
      operationId: lease.record.operationId!,
      candidateRuntimeFingerprint: "candidate-fingerprint",
      stagingGeneration: "g-next",
      candidateSettings: { revision: 2 },
      previousSettings: { revision: 1 },
      participants: []
    });

    await expect(service.assertCanAuthenticate("admin")).rejects.toMatchObject({
      code: "MAINTENANCE_REBUILDING",
      status: 503
    });
    await expect(service.assertCanAuthenticate("viewer")).rejects.toMatchObject({
      code: "MAINTENANCE_REBUILDING",
      status: 503
    });

    await service.fail(
      lease.record.operationId,
      "CACHE_GENERATION_INTEGRITY_FAILED",
      "Staging generation is incomplete."
    );
    await expect(service.assertCanAuthenticate("admin")).resolves.toBeUndefined();
    await expect(service.assertCanAuthenticate("viewer")).rejects.toMatchObject({
      code: "MAINTENANCE_REBUILD_FAILED",
      status: 503
    });

    await service.completeRollback(lease.record.operationId!);
    await expect(service.assertCanAuthenticate("viewer")).resolves.toBeUndefined();
  });

  it("turns an interrupted active operation into an explicit failed recovery state", async () => {
    const repository = new MemorySystemMaintenanceRepository();
    const leader = new SystemMaintenanceApplicationService(repository);
    await leader.onModuleInit();
    const lease = await leader.beginPreflight("admin.user");
    await leader.enterRebuilding({
      operationId: lease.record.operationId!,
      candidateRuntimeFingerprint: "candidate-fingerprint",
      stagingGeneration: "g-next",
      candidateSettings: { revision: 2 },
      previousSettings: { revision: 1 },
      participants: []
    });

    const restarted = new SystemMaintenanceApplicationService(repository);
    await restarted.onModuleInit();

    await expect(restarted.getState()).resolves.toMatchObject({
      state: "failed",
      errorCode: "REBUILD_INTERRUPTED",
      operationId: lease.record.operationId
    });
  });
});
