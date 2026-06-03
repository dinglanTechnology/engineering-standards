import { ConfigService } from "@nestjs/config"
import {
  utilities,
  WinstonModuleAsyncOptions,
  WinstonModuleOptions,
} from "nest-winston"
import * as winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"

/**
 * Winston 日志配置
 *
 * 文件输出:
 *   - logs/error-YYYY-MM-DD.log   仅 error
 *   - logs/warn-YYYY-MM-DD.log    warn 及以上（含 error）
 *   - 单文件最大 10MB，自动压缩，保留 14 天
 *
 * 控制台输出:
 *   - 开发环境：NestJS 风格彩色可读
 *   - 生产环境：JSON 单行，便于 ELK/Loki 采集
 */
export const winstonAsyncConfig: WinstonModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService): WinstonModuleOptions => {
    const isProd = configService.get("NODE_ENV") === "production"
    const consoleLevel = configService.get<string>("LOG_LEVEL", isProd ? "info" : "debug")

    const transports: WinstonModuleOptions["transports"] = [
      // error 日志：仅 error 级别
      new DailyRotateFile({
        level: "error",
        dirname: "logs",
        filename: "error-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "10m",
        maxFiles: "14d",
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      // warn 日志：warn + error
      new DailyRotateFile({
        level: "warn",
        dirname: "logs",
        filename: "warn-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "10m",
        maxFiles: "14d",
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      // 控制台
      new winston.transports.Console({
        level: consoleLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          isProd
            ? winston.format.json()
            : utilities.format.nestLike("App", { prettyPrint: true, colors: true })
        ),
      }),
    ]

    return { transports }
  },
}
