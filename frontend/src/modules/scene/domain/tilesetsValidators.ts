import type {
  TilesetDimensions,
  TilesetDomainModel,
  TilesetGroupDescriptor
} from "./tilesets";

export type TilesetValidationCode =
  | "dimensions_not_integer"
  | "dimensions_negative"
  | "tile_count_mismatch"
  | "group_id_empty"
  | "group_id_duplicate"
  | "group_members_empty"
  | "group_member_index_not_integer"
  | "group_member_index_out_of_bounds"
  | "group_member_index_duplicate"
  | "group_member_index_order";

export interface TilesetValidationIssue {
  code: TilesetValidationCode;
  message: string;
  path: string;
}

export interface TilesetValidationResult {
  isValid: boolean;
  issues: readonly TilesetValidationIssue[];
}

function createIssue(
  code: TilesetValidationCode,
  message: string,
  path: string
): TilesetValidationIssue {
  return { code, message, path };
}

export function validateTilesetDimensions(
  dimensions: TilesetDimensions
): TilesetValidationIssue[] {
  const issues: TilesetValidationIssue[] = [];
  const fields: Array<keyof TilesetDimensions> = ["width", "height", "tileCount"];

  fields.forEach((fieldName) => {
    const value = dimensions[fieldName];
    if (!Number.isInteger(value)) {
      issues.push(
        createIssue(
          "dimensions_not_integer",
          `${fieldName} must be an integer.`,
          `dimensions.${fieldName}`
        )
      );
      return;
    }
    if (value < 0) {
      issues.push(
        createIssue(
          "dimensions_negative",
          `${fieldName} must be >= 0.`,
          `dimensions.${fieldName}`
        )
      );
    }
  });

  if (
    Number.isInteger(dimensions.width) &&
    Number.isInteger(dimensions.height) &&
    Number.isInteger(dimensions.tileCount) &&
    dimensions.width >= 0 &&
    dimensions.height >= 0 &&
    dimensions.tileCount >= 0
  ) {
    const expectedTileCount = dimensions.width * dimensions.height;
    if (dimensions.tileCount !== expectedTileCount) {
      issues.push(
        createIssue(
          "tile_count_mismatch",
          `tileCount must equal width*height (${expectedTileCount}).`,
          "dimensions.tileCount"
        )
      );
    }
  }

  return issues;
}

export function validateTilesetGroups(
  groups: readonly TilesetGroupDescriptor[],
  tileCount: number
): TilesetValidationIssue[] {
  const issues: TilesetValidationIssue[] = [];
  const seenGroupIds = new Set<string>();

  groups.forEach((group, groupIndex) => {
    const groupPath = `groups[${groupIndex}]`;
    const trimmedId = group.id.trim();
    if (trimmedId.length === 0) {
      issues.push(
        createIssue("group_id_empty", "group id must not be empty.", `${groupPath}.id`)
      );
    } else if (seenGroupIds.has(trimmedId)) {
      issues.push(
        createIssue(
          "group_id_duplicate",
          `group id "${trimmedId}" is duplicated.`,
          `${groupPath}.id`
        )
      );
    } else {
      seenGroupIds.add(trimmedId);
    }

    if (group.members.length === 0) {
      issues.push(
        createIssue(
          "group_members_empty",
          "group must include at least one member.",
          `${groupPath}.members`
        )
      );
      return;
    }

    const seenMemberIndexes = new Set<number>();
    let previousIndex = Number.NEGATIVE_INFINITY;

    group.members.forEach((member, memberIndex) => {
      const memberPath = `${groupPath}.members[${memberIndex}].tileIndex`;
      const tileIndex = member.tileIndex;

      if (!Number.isInteger(tileIndex)) {
        issues.push(
          createIssue(
            "group_member_index_not_integer",
            "group member tileIndex must be an integer.",
            memberPath
          )
        );
        return;
      }

      if (tileIndex < 0 || tileIndex >= tileCount) {
        issues.push(
          createIssue(
            "group_member_index_out_of_bounds",
            `group member tileIndex must be in range 0..${Math.max(tileCount - 1, 0)}.`,
            memberPath
          )
        );
      }

      if (seenMemberIndexes.has(tileIndex)) {
        issues.push(
          createIssue(
            "group_member_index_duplicate",
            `group member tileIndex ${tileIndex} is duplicated within the same group.`,
            memberPath
          )
        );
      } else {
        seenMemberIndexes.add(tileIndex);
      }

      if (tileIndex < previousIndex) {
        issues.push(
          createIssue(
            "group_member_index_order",
            "group members must use deterministic non-decreasing tileIndex order.",
            memberPath
          )
        );
      }
      previousIndex = tileIndex;
    });
  });

  return issues;
}

export function validateTilesetDomainModel(
  model: TilesetDomainModel
): TilesetValidationResult {
  const issues = [
    ...validateTilesetDimensions(model.dimensions),
    ...validateTilesetGroups(model.groups, model.dimensions.tileCount)
  ];
  return {
    isValid: issues.length === 0,
    issues
  };
}

