import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Observable, map } from "rxjs"

/**
 * 统一响应格式
 *
 * 成功:
 *   { code: 200, message: "success", data: <业务数据>, timestamp: "..." }
 *
 * 失败（异常过滤器里已经封装）:
 *   { code: 4xx/5xx, message: "...", data: null, timestamp: "...", path: "..." }
 *
 * 如果某个接口需要返回原始数据（如文件下载、SSE 流），在方法上加 @SkipResponseTransform()
 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

export const SKIP_RESPONSE_TRANSFORM_KEY = "skip_response_transform"
export const SkipResponseTransform = () => SetMetadata(SKIP_RESPONSE_TRANSFORM_KEY, true)

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (skip) {
      return next.handle()
    }

    return next.handle().pipe(
      map(data => ({
        code: HttpStatus.OK,
        message: "success",
        data,
        timestamp: new Date().toISOString(),
      }))
    )
  }
}
