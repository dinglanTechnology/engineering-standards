import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import * as argon2 from "argon2"
import { PrismaService } from "@/prisma/prisma.service"
import { JwtPayload } from "./strategies/jwt.strategy"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * 注册
   * - 哈希密码后入库（argon2id 默认参数）
   * - 唯一约束冲突交给 PrismaExceptionFilter 处理（返回 409）
   *   这里仍然保留一次 findUnique 预检，是为了给前端更友好的错误信息
   */
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
    if (exists) {
      throw new ConflictException("该手机号已注册")
    }

    const passwordHash = await argon2.hash(dto.password)

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        phone: dto.phone,
        password: passwordHash,
      },
      // 返回前端必须剔除 password 字段
      select: { id: true, username: true, phone: true, createdAt: true },
    })

    const token = await this.signToken({
      sub: user.id,
      phone: user.phone,
      username: user.username,
    })

    return { user, accessToken: token }
  }

  /**
   * 登录
   * - 错误信息刻意模糊（"手机号或密码错误"），不暴露账号是否存在
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
    const isValid = user ? await argon2.verify(user.password, dto.password) : false

    if (!user || !isValid) {
      throw new UnauthorizedException("手机号或密码错误")
    }

    const token = await this.signToken({
      sub: user.id,
      phone: user.phone,
      username: user.username,
    })

    return {
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      accessToken: token,
    }
  }

  private async signToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload)
  }
}
