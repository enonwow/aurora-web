const AURORA_CONVERSATION_RESREF_PATTERN = /^[A-Za-z0-9_]{1,16}$/;

export type PlaceableInterruptable = 0 | 1;

export function isAuroraConversationResRef(value: unknown): value is string {
  return value === "" || (
    typeof value === "string" && AURORA_CONVERSATION_RESREF_PATTERN.test(value)
  );
}

export function isPlaceableInterruptable(value: unknown): value is PlaceableInterruptable {
  return value === 0 || value === 1;
}

export function readPlaceableConversation(
  metadata: Readonly<Record<string, unknown>> | undefined
): string | undefined {
  const value = metadata?.conversation;
  return isAuroraConversationResRef(value) ? value : undefined;
}

export function readPlaceableInterruptable(
  metadata: Readonly<Record<string, unknown>> | undefined
): PlaceableInterruptable | undefined {
  const value = metadata?.interruptable;
  return isPlaceableInterruptable(value) ? value : undefined;
}

export function projectPlaceableInterruptable(noInterrupt: boolean): PlaceableInterruptable {
  return noInterrupt ? 0 : 1;
}

export function projectPlaceableNoInterrupt(interruptable: PlaceableInterruptable): boolean {
  return interruptable === 0;
}
