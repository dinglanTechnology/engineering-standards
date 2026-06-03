import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common"
import { Request, Response } from "express"
import { WINSTON_MODULE_PROVIDER } from "nest-winston"
import { Logger as WinstonLogger } from "winston"

/**
 * 兜底异常过滤器
 *
 * 处理顺序（在 main.ts useGlobalFilters 中）：
 *   1. PrismaExceptionFilter  —— 更具体，先匹配 Prisma 异常
 *   2. AllExceptionsFilter    —— 通用，兜底
 *
 * 这个过滤器处理：
 *   - HttpException 及其子类（抛自 ValidationPipe、Guard 等）
 *   - 任何未捕获的其他异常（转为 500）
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = "服务器内部错误"

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      message =
        typeof res === "string"
          ? res
          : ((res as { message?: string | string[] }).message ?? exception.message)
    }

    const errorResponse = {
      code: status,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
    }

    // 5xx 记录完整堆栈，4xx 只记录 warn
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} - ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        {
          context: "ExceptionFilter",
          stack: exception instanceof Error ? exception.stack : undefined,
        }
      )
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} ${status} - ${
          Array.isArray(message) ? message.join(", ") : message
        }`,
        { context: "ExceptionFilter" }
      )
    }

    response.status(status).json(errorResponse)
  }
}
