import type { SupportedGffField } from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";

export function cloneSupportedGffFields(
  fields: readonly SupportedGffField[],
): SupportedGffField[] {
  return fields.map(cloneSupportedGffField);
}

export function cloneSupportedGffField(field: SupportedGffField): SupportedGffField {
  if (field.type === "void") return { ...field, value: Buffer.from(field.value) };
  if (field.type === "struct") {
    return {
      ...field,
      value: {
        typeId: field.value.typeId,
        fields: cloneSupportedGffFields(field.value.fields),
      },
    };
  }
  if (field.type === "list") {
    return {
      ...field,
      value: field.value.map((entry) => ({
        typeId: entry.typeId,
        fields: cloneSupportedGffFields(entry.fields),
      })),
    };
  }
  if (field.type === "cexolocstring") {
    return {
      ...field,
      value: {
        ...field.value,
        ...(field.value.entries
          ? { entries: field.value.entries.map((entry) => ({ ...entry })) }
          : {}),
      },
    };
  }
  return { ...field };
}
