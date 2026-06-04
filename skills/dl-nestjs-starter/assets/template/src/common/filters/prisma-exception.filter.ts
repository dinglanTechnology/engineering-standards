import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Inject } from "@nestjs/common"
import { Prisma } from "@prisma/client"
import { Request, Response } from "express"
import { WINSTON_MODULE_PROVIDER } from "nest-winston"
import { Logger as WinstonLogger } from "winston"

/**
 * Prisma 已知错误码映射
 * 完整错误码列表：https://www.prisma.io/docs/orm/reference/error-reference
 */
const ERROR_CODE_MAP: Record<string, { status: number; message: string }> = {
  P2000: { status: HttpStatus.BAD_REQUEST, message: "字段值超出允许范围" },
  P2001: { status: HttpStatus.NOT_FOUND, message: "目标记录不存在" },
  P2002: { status: HttpStatus.CONFLICT, message: "唯一约束冲突，数据已存在" },
  P2003: { status: HttpStatus.BAD_REQUEST, message: "外键约束失败" },
  P2005: { status: HttpStatus.BAD_REQUEST, message: "字段值无效" },
  P2011: { status: HttpStatus.BAD_REQUEST, message: "不能为空" },
  P2012: { status: HttpStatus.BAD_REQUEST, message: "缺少必需字段" },
  P2014: { status: HttpStatus.CONFLICT, message: "关联关系冲突" },
  P2015: { status: HttpStatus.NOT_FOUND, message: "关联记录未找到" },
  P2024: { status: HttpStatus.REQUEST_TIMEOUT, message: "数据库连接超时" },
  P2025: { status: HttpStatus.NOT_FOUND, message: "目标记录不存在" },
}

/**
 * Prisma 异常过滤器
 *
 * 必须在 main.ts 中注册在 AllExceptionsFilter 之前，否则不会被触发
 * （详见 main.ts 中的注释）。
 *
 * 捕获 PrismaClientKnownRequestError，把 Prisma 错误码映射为合理的 HTTP 状态。
 * 对于唯一键冲突（P2002），尝试读取 meta.target 告诉用户哪个字段冲突了。
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger) {}

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const errorConfig = ERROR_CODE_MAP[exception.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "数据库操作异常",
    }

    // P2002 唯一键冲突，追加冲突的字段名
    let message = errorConfig.message
    if (exception.code === "P2002" && exception.meta?.target) {
      const target = Array.isArray(exception.meta.target)
        ? exception.meta.target.join(", ")
        : String(exception.meta.target)
      message = `${errorConfig.message}: ${target}`
    }

    this.logger.error(`Prisma error [${exception.code}]: ${exception.message}`, {
      context: "PrismaExceptionFilter",
      code: exception.code,
      meta: exception.meta,
      path: request.url,
    })

    response.status(errorConfig.status).json({
      code: errorConfig.status,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
