export function executeInFlight<T>(
  inFlight: Map<string, Promise<T>>,
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }

  const pending = operation().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, pending);
  return pending;
}
