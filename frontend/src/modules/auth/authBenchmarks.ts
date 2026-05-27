export interface AuthBenchmarkSample {
  operation: "authenticate" | "authorize";
  durationMs: number;
  success: boolean;
  timestamp: string;
}

let samples: AuthBenchmarkSample[] = [];

export function recordAuthBenchmark(sample: AuthBenchmarkSample) {
  samples = [sample, ...samples];
}

export function getAuthBenchmarks(): AuthBenchmarkSample[] {
  return [...samples];
}

export function clearAuthBenchmarks() {
  samples = [];
}
