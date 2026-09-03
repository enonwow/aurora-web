import { describe, expect, it, vi } from "vitest";

import { createAreaDraftSaveQueue } from "../../../../src/modules/areas/application/areaDraftSaveQueue";

describe("areaDraftSaveQueue", () => {
  it("runs saves for the same Area in submission order", async () => {
    const queue = createAreaDraftSaveQueue();
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let releaseSecond!: () => void;
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const events: string[] = [];

    const first = queue.enqueue("area_a", async () => {
      events.push("first:start");
      await firstGate;
      events.push("first:end");
      return 1;
    });
    const secondTask = vi.fn(async () => {
      events.push("second:start");
      await secondGate;
      return 2;
    });
    const second = queue.enqueue("area_a", secondTask);

    expect(queue.hasPending("area_a")).toBe(true);
    await vi.waitFor(() => expect(events).toEqual(["first:start"]));
    expect(secondTask).not.toHaveBeenCalled();

    releaseFirst();
    await expect(first).resolves.toBe(1);
    await vi.waitFor(() => expect(secondTask).toHaveBeenCalledOnce());
    expect(queue.hasPending("area_a")).toBe(true);
    releaseSecond();
    await expect(second).resolves.toBe(2);
    expect(events).toEqual(["first:start", "first:end", "second:start"]);
    await vi.waitFor(() => expect(queue.hasPending("area_a")).toBe(false));
  });

  it("does not let a failed save block the next queued revision", async () => {
    const queue = createAreaDraftSaveQueue();
    const first = queue.enqueue("area_a", async () => {
      throw new Error("network failure");
    });
    const second = queue.enqueue("area_a", async () => "recovered");

    await expect(first).rejects.toThrow("network failure");
    await expect(second).resolves.toBe("recovered");
    await vi.waitFor(() => expect(queue.hasPending("area_a")).toBe(false));
  });

  it("does not serialize independent Areas behind one another", async () => {
    const queue = createAreaDraftSaveQueue();
    let releaseAreaA!: () => void;
    const areaAGate = new Promise<void>((resolve) => {
      releaseAreaA = resolve;
    });

    const areaA = queue.enqueue("area_a", async () => {
      await areaAGate;
      return "a";
    });
    const areaB = queue.enqueue("area_b", async () => "b");

    await expect(areaB).resolves.toBe("b");
    await vi.waitFor(() => expect(queue.hasPending("area_b")).toBe(false));
    expect(queue.hasPending("area_a")).toBe(true);
    releaseAreaA();
    await expect(areaA).resolves.toBe("a");
    await vi.waitFor(() => expect(queue.hasPending("area_a")).toBe(false));
  });
});
