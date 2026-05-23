import type { AuthBenchmarkSample } from "../authBenchmarks";

export interface AuthBenchmarkPort {
  record(sample: AuthBenchmarkSample): void;
}
