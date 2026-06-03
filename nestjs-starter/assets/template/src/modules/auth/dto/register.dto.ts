import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString, Length, Matches } from "class-validator"

export class RegisterDto {
  @ApiProperty({ example: "zhangsan", description: "用户名 2-32 位" })
  @IsString()
  @IsNotEmpty()
  @Length(2, 32)
  username!: string

  @ApiProperty({ example: "13800138000", description: "手机号" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone!: string

  @ApiProperty({ example: "P@ssw0rd", description: "密码 8-64 位，含字母和数字" })
  @IsString()
  @IsNotEmpty()
  @Length(8, 64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "密码必须同时包含字母和数字",
  })
  password!: string
}
