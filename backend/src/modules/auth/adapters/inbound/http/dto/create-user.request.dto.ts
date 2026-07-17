import { ApiProperty } from "@nestjs/swagger";
import { ALL_ROLES } from "../../../../domain/auth.types";

export class CreateUserRequestDto {
  @ApiProperty({ example: "qa.viewer" })
  username!: string;

  @ApiProperty({ example: "StrongPass123" })
  password!: string;

  @ApiProperty({ example: "QA Viewer" })
  displayName!: string;

  @ApiProperty({ enum: ALL_ROLES, example: "viewer" })
  role!: (typeof ALL_ROLES)[number];
}
