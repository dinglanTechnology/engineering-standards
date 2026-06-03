import { Injectable, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { PrismaService } from "@/prisma/prisma.service"

export interface JwtPayload {
  sub: number // 用户 ID（标准 JWT claim）
  phone: string
  username: string
}

/**
 * JWT 策略
 *
 * validate 的返回值会被挂到 request.user 上，
 * 随后可用 @CurrentUser() 装饰器取出。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const secret = configService.get<string>("JWT_SECRET")
    if (!secret) {
      throw new Error("JWT_SECRET is not configured")
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  async validate(payload: JwtPayload) {
    // 每次请求都确认用户仍然存在，用户被删除后旧 token 立刻失效
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, username: true },
    })
    if (!user) {
      throw new UnauthorizedException("用户不存在或已被删除")
    }
    return {
      userId: user.id,
      phone: user.phone,
      username: user.username,
    }
  }
}
