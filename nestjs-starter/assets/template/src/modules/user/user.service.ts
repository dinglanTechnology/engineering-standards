import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "@/prisma/prisma.service"

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询用户详情，默认剔除 password 字段
   */
  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) {
      throw new NotFoundException("用户不存在")
    }
    return user
  }

  /**
   * 分页查询用户列表
   * 使用 skip/take 偏移分页，适合小数据集；大数据集建议改为游标分页
   */
  async findMany(params: { page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
        select: {
          id: true,
          username: true,
          phone: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ])

    return { items, total, page, pageSize }
  }
}
