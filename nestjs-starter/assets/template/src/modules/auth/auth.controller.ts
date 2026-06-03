import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Public } from "@/common/decorators/public.decorator"
import { AuthService } from "./auth.service"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "注册" })
  @HttpCode(HttpStatus.OK)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @Post("login")
  @ApiOperation({ summary: "登录" })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }
}
