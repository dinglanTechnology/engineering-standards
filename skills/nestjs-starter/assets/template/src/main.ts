import { ValidationPipe, VersioningType } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { NestFactory, Reflector } from "@nestjs/core"
import { NestExpressApplication } from "@nestjs/platform-express"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import helmet from "helmet"
import { WINSTON_MODULE_NEST_PROVIDER, WINSTON_MODULE_PROVIDER } from "nest-winston"
import { Logger as WinstonLogger } from "winston"
import { AppModule } from "./app.module"
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter"
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter"
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard"
import { ResponseInterceptor } from "./common/interceptors/response.interceptor"

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 先用内置 logger，创建后替换为 winston
    bufferLogs: true,
  })

  // 用 winston 替换 Nest 默认 logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

  const configService = app.get(ConfigService)
  const reflector = app.get(Reflector)
  const winstonLogger = app.get<WinstonLogger>(WINSTON_MODULE_PROVIDER)

  // ---------- 安全中间件 ----------
  // Helmet 设置一系列安全响应头。若接口域名和前端静态资源同域，保留 CSP；
  // 纯 API 服务可关闭 CSP 避免 Swagger 内嵌资源被拦
  app.use(helmet({ contentSecurityPolicy: false }))

  // ---------- CORS ----------
  const corsOrigin = configService.get<string>("CORS_ORIGIN", "*")
  app.enableCors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(",").map(s => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })

  // ---------- 全局前缀与版本化 ----------
  app.setGlobalPrefix("api", {
    // 健康检查和文档不走前缀
    exclude: ["health", "docs"],
  })
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  })

  // ---------- 全局参数校验 ----------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 剔除 DTO 中未声明的字段
      forbidNonWhitelisted: true, // 出现未声明字段直接 400
      transform: true, // 自动转换类型（string -> number 等）
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
    })
  )

  // ---------- 全局异常过滤器 ----------
  // 注意：顺序 = 具体的过滤器在前，通用的在后。
  // NestJS 按数组顺序匹配，第一个命中的过滤器会处理异常。
  // 如果 AllExceptionsFilter（@Catch() 无参）放在前面，会吞掉所有异常，
  // PrismaExceptionFilter 永远不会被触发。
  app.useGlobalFilters(
    new PrismaExceptionFilter(winstonLogger),
    new AllExceptionsFilter(winstonLogger)
  )

  // ---------- 全局响应拦截器 ----------
  app.useGlobalInterceptors(new ResponseInterceptor(reflector))

  // ---------- 全局守卫：默认所有路由需要 JWT，@Public() 可跳过 ----------
  app.useGlobalGuards(new JwtAuthGuard(reflector))

  // ---------- Swagger ----------
  if (configService.get("NODE_ENV") !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("NestJS Starter API")
      .setDescription("团队 NestJS 基础框架 API 文档")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "Authorization",
          in: "header",
        },
        "bearer"
      )
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  }

  // ---------- 优雅关闭 ----------
  app.enableShutdownHooks()

  const port = configService.get<number>("PORT", 8000)
  await app.listen(port)

  const url = await app.getUrl()
  winstonLogger.info(`🚀 Application started on ${url}`, { context: "Bootstrap" })
  winstonLogger.info(`📖 API docs: ${url}/docs`, { context: "Bootstrap" })
}

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error("Failed to start application", err)
  process.exit(1)
})
