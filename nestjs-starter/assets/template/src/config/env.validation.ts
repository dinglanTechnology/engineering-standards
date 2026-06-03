import * as Joi from "joi"

/**
 * 环境变量校验 schema
 *
 * 加新变量时的流程：
 *   1. 在 .env.example 里加一行并注释
 *   2. 在这里加校验规则
 *   3. 使用处 configService.get<类型>('VAR_NAME')
 *
 * 失败行为：应用启动时抛错退出，不会进入运行时。
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().port().default(8000),

  // 数据库
  DATABASE_URL: Joi.string().uri({ scheme: ["mysql"] }).required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default("7d"),

  // CORS
  CORS_ORIGIN: Joi.string().default("*"),

  // 日志
  LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").default("debug"),
})
