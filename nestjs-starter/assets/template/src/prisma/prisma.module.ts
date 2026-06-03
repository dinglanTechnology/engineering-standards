import { Global, Module } from "@nestjs/common"
import { PrismaService } from "./prisma.service"

/**
 * 全局 Prisma 模块
 *
 * 标记 @Global() 后，任何业务模块都可以直接注入 PrismaService，
 * 不需要在自己的 module 里 imports: [PrismaModule]。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
