import { ApiProperty } from "@nestjs/swagger";

export class LoginRequestDto {
  @ApiProperty({ example: "builder.user" })
  username!: string;

  @ApiProperty({ example: "builder123" })
  password!: string;
}

