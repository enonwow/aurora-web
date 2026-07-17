import { executeInFlight } from "../../src/common/async/in-flight.helpers";

describe("executeInFlight", () => {
  it("deduplicates concurrent operations for the same key", async () => {
    const inFlight = new Map<string, Promise<number>>();
    const operation = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 42;
    });

    const first = executeInFlight(inFlight, "k1", operation);
    const second = executeInFlight(inFlight, "k1", operation);
    const [a, b] = await Promise.all([first, second]);

    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("clears in-flight entry after completion", async () => {
    const inFlight = new Map<string, Promise<number>>();
    await executeInFlight(inFlight, "k2", async () => 7);
    expect(inFlight.has("k2")).toBe(false);

    await executeInFlight(inFlight, "k2", async () => 8);
    expect(inFlight.has("k2")).toBe(false);
  });
});
