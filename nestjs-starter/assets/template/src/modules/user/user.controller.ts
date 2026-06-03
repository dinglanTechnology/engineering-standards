import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import {
  CurrentUser,
  CurrentUserPayload,
} from "@/common/decorators/current-user.decorator"
import { UserService } from "./user.service"

@ApiTags("user")
@ApiBearerAuth("bearer")
@Controller({ path: "user", version: "1" })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @ApiOperation({ summary: "获取当前登录用户信息" })
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.userService.findById(user.userId)
  }

  @Get()
  @ApiOperation({ summary: "用户列表（分页）" })
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.userService.findMany({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }

  @Get(":id")
  @ApiOperation({ summary: "获取指定用户信息" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.userService.findById(id)
  }
}
