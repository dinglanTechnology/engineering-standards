import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { WinstonModule } from "nest-winston"
import { LoggerMiddleware } from "./common/middleware/logger.middleware"
import { winstonAsyncConfig } from "./config/winston.config"
import { envValidationSchema } from "./config/env.validation"
import { PrismaModule } from "./prisma/prisma.module"
import { AuthModule } from "./modules/auth/auth.module"
import { HealthModule } from "./modules/health/health.module"
import { UserModule } from "./modules/user/user.module"

@Module({
  imports: [
    // 全局环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, ".env"],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // 把所有错误一次性报出来
      },
    }),

    // Winston 日志（全局可注入）
    WinstonModule.forRootAsync(winstonAsyncConfig),

    // 全局 Prisma
    PrismaModule,

    // 业务模块
    AuthModule,
    UserModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // HTTP 访问日志中间件，对所有路由生效
    // 注：健康检查路径在 LoggerMiddleware 内部会被过滤掉，避免日志刷屏
    consumer.apply(LoggerMiddleware).forRoutes("*")
  }
}
