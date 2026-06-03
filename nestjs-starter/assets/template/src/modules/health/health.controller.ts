import {
  Controller,
  Get,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { Public } from "@/common/decorators/public.decorator"
import { SkipResponseTransform } from "@/common/interceptors/response.interceptor"
import { PrismaService } from "@/prisma/prisma.service"

/**
 * 健康检查
 *
 * - 路径为 /health（不带 /api 前缀，也不带版本号）
 *   · setGlobalPrefix 的 exclude 去掉了 /api 前缀
 *   · version: VERSION_NEUTRAL 去掉了版本号——否则 enableVersioning 的
 *     defaultVersion: "1" 会把它挂到 /v1/health，导致 Dockerfile 的
 *     HEALTHCHECK（探测 /health）和探针失效
 * - @Public() 跳过 JWT 校验
 * - @SkipResponseTransform() 保留原始响应结构，k8s/docker 探针通常只看 status code
 */
@ApiTags("health")
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipResponseTransform()
  @Get()
  @ApiOperation({ summary: "健康检查" })
  async check() {
    try {
      // 简单连通性探测：Prisma 执行一个最轻量的查询
      await this.prisma.$queryRaw`SELECT 1`
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        db: "up",
      }
    } catch (err) {
      throw new ServiceUnavailableException({
        status: "error",
        timestamp: new Date().toISOString(),
        db: "down",
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
