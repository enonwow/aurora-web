import type { ItemApiPaletteTreeNode } from "../contracts";

export interface ItemPaletteFilterOption {
  nodeId: string;
  label: string;
  depth: number;
  kind: ItemApiPaletteTreeNode["kind"];
  leafCount: number;
  resRefs: string[];
}

export function collectItemPaletteFilterOptions(
  roots: readonly ItemApiPaletteTreeNode[]
): ItemPaletteFilterOption[] {
  const collectNode = (node: ItemApiPaletteTreeNode): {
    resRefs: string[];
    options: ItemPaletteFilterOption[];
  } => {
    const childResults = node.children.map(collectNode);
    const resRefs = Array.from(
      new Set([
        ...(node.resRef ? [node.resRef.trim().toLowerCase()] : []),
        ...childResults.flatMap((result) => result.resRefs)
      ])
    ).filter((value) => value.length > 0);
    const childOptions = childResults.flatMap((result) => result.options);
    if (resRefs.length < 1) {
      return { resRefs, options: childOptions };
    }
    return {
      resRefs,
      options: [
        {
          nodeId: node.nodeId,
          label: node.label,
          depth: node.depth,
          kind: node.kind,
          leafCount: node.leafCount,
          resRefs
        },
        ...childOptions
      ]
    };
  };

  return roots.flatMap((root) => collectNode(root).options);
}

export function formatItemPaletteFilterLabel(option: ItemPaletteFilterOption): string {
  const prefix = option.depth > 0 ? `${"  ".repeat(option.depth)}- ` : "";
  const suffix = option.kind === "leaf" ? option.resRefs[0] : `${option.leafCount} items`;
  return `${prefix}${option.label} / ${suffix}`;
}
