import { recordAuthBenchmark } from "../authBenchmarks";
import type { AuthBenchmarkPort } from "../ports/authBenchmarkPort";

export function createAuthBenchmarkRecorderPort(): AuthBenchmarkPort {
  return {
    record(sample) {
      recordAuthBenchmark(sample);
    }
  };
}
