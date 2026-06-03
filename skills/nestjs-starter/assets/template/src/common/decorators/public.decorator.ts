import { SetMetadata } from "@nestjs/common"

/**
 * 标记路由为公开，全局 JwtAuthGuard 会跳过校验
 *
 * 使用场景：登录、注册、健康检查、公开查询等
 *
 * @example
 * @Public()
 * @Post('login')
 * login(@Body() dto: LoginDto) { ... }
 */
export const IS_PUBLIC_KEY = "isPublic"
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
