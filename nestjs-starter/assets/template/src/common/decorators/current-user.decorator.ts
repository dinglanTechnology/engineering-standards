import { createParamDecorator, ExecutionContext } from "@nestjs/common"

/**
 * JWT payload 的结构（和 JwtStrategy.validate 返回值保持一致）
 */
export interface CurrentUserPayload {
  userId: number
  phone: string
  username: string
}

/**
 * 从请求中取当前登录用户（由 JwtStrategy.validate 写入 request.user）
 *
 * @example
 * @Get('me')
 * getProfile(@CurrentUser() user: CurrentUserPayload) {
 *   return user
 * }
 *
 * // 取单个字段
 * @Get('my-id')
 * getMyId(@CurrentUser('userId') userId: number) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>()
    const user = request.user
    if (!user) return undefined
    return field ? user[field] : user
  }
)
