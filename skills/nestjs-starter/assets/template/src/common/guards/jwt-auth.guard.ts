import { ExecutionContext, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { AuthGuard } from "@nestjs/passport"
import { IS_PUBLIC_KEY } from "../decorators/public.decorator"

/**
 * 全局 JWT 守卫
 *
 * 在 main.ts 中通过 app.useGlobalGuards() 注册，默认所有路由都需要 JWT。
 * 使用 @Public() 装饰器可跳过此守卫。
 *
 * 为什么默认全局、而不是按需 @UseGuards()：
 *   默认私有 + 显式公开 比 默认公开 + 忘了加守卫 安全得多。
 *   忘加 @Public() 至多是登录接口 401，不会有权限漏洞。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true
    return super.canActivate(context)
  }
}
