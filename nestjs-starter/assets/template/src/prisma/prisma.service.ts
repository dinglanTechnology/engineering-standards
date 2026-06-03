import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"

/**
 * PrismaService
 *
 * - onModuleInit 时连接数据库（显式 connect，失败直接在启动期暴露）
 * - onModuleDestroy 时断开连接（配合 app.enableShutdownHooks() 实现优雅关闭）
 *
 * 日志行为（直接打到 stdout，由容器日志驱动 / 进程管理器统一收集）：
 *   - 开发环境：query / error / warn
 *   - 生产环境：只保留 error / warn
 *
 * 注：用 emit: "stdout" 让 Prisma 自己输出；若要转发到 Winston，需改成
 * emit: "event" 并在 onModuleInit 里用 this.$on(...) 监听，否则日志会静默丢失。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "production"
          ? [
              { emit: "stdout", level: "error" },
              { emit: "stdout", level: "warn" },
            ]
          : [
              { emit: "stdout", level: "query" },
              { emit: "stdout", level: "error" },
              { emit: "stdout", level: "warn" },
            ],
    })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log("Prisma connected")
  }

  async onModuleDestroy() {
    await this.$disconnect()
    this.logger.log("Prisma disconnected")
  }
}
