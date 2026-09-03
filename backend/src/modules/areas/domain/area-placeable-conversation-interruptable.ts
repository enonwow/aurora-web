export interface ExistingAreaPlaceableConversationMutation {
  readonly expectedResRef: string;
  readonly resRef: string;
}

export type AreaPlaceableInterruptableValue = 0 | 1;

export interface ExistingAreaPlaceableInterruptableMutation {
  readonly expectedValue: AreaPlaceableInterruptableValue;
  readonly value: AreaPlaceableInterruptableValue;
}

export function isAreaPlaceableConversation(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{0,16}$/u.test(value);
}

export function isAreaPlaceableInterruptableValue(
  value: unknown,
): value is AreaPlaceableInterruptableValue {
  return value === 0 || value === 1;
}
