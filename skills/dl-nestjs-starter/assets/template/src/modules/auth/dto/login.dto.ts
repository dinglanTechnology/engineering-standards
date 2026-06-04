import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString, Matches } from "class-validator"

export class LoginDto {
  @ApiProperty({ example: "13800138000", description: "手机号" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone!: string

  @ApiProperty({ example: "P@ssw0rd", description: "密码" })
  @IsString()
  @IsNotEmpty()
  password!: string
}
