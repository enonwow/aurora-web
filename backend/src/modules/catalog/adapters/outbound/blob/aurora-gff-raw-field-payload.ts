const RAW_GFF_FIELD_DATA_PAYLOAD = Symbol("aurora.rawGffFieldDataPayload");

type RawPayloadCarrier = {
  [RAW_GFF_FIELD_DATA_PAYLOAD]?: Buffer;
};

export function attachRawGffFieldDataPayload<T extends object>(
  field: T,
  payload: Buffer,
): T {
  Object.defineProperty(field, RAW_GFF_FIELD_DATA_PAYLOAD, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Buffer.from(payload),
  });
  return field;
}

export function readRawGffFieldDataPayload(field: object): Buffer | undefined {
  const payload = (field as RawPayloadCarrier)[RAW_GFF_FIELD_DATA_PAYLOAD];
  return Buffer.isBuffer(payload) ? Buffer.from(payload) : undefined;
}
