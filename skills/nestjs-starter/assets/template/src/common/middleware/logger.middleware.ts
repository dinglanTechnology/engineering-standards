import { Inject, Injectable, NestMiddleware } from "@nestjs/common"
import { NextFunction, Request, Response } from "express"
import { WINSTON_MODULE_PROVIDER } from "nest-winston"
import { Logger } from "winston"

/**
 * 不记录 HTTP 日志的路径白名单
 * 健康检查和文档类请求频率高、价值低，记了会刷屏
 */
const SKIP_LOG_PATHS = ["/health", "/favicon.ico", "/docs", "/metrics"]

/**
 * HTTP 访问日志中间件
 *
 * 记录每个请求的：method / url / status / duration / ip / userAgent
 * - 5xx 记 error
 * - 4xx 记 warn
 * - 2xx/3xx 记 info
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 过滤掉白名单路径
    if (SKIP_LOG_PATHS.some(p => req.originalUrl.startsWith(p))) {
      return next()
    }

    const { method, originalUrl, ip } = req
    const userAgent = req.get("user-agent") ?? ""
    const start = Date.now()

    res.on("finish", () => {
      const duration = Date.now() - start
      const { statusCode } = res

      const logData = {
        context: "HTTP",
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent,
      }

      const line = `${method} ${originalUrl} ${statusCode} ${duration}ms`

      if (statusCode >= 500) {
        this.logger.error(line, logData)
      } else if (statusCode >= 400) {
        this.logger.warn(line, logData)
      } else {
        this.logger.info(line, logData)
      }
    })

    next()
  }
}
