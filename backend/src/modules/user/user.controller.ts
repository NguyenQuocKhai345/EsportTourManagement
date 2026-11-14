import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { QueryUserDto } from './query-user.dto';
import { Roles } from '../../auth/decorator/roles';
import { Role } from '../../generated/prisma/enums';
import { ResponseMessage } from '../../format-response/success/message-decorator';

@ApiTags('Admin Users')
@ApiBearerAuth('accessToken')
@Roles(Role.ADMIN)
@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Tạo người dùng thành công')
  @ApiOperation({ summary: 'Admin tạo tài khoản người dùng mới' })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Lấy danh sách người dùng thành công')
  @ApiOperation({ summary: 'Admin lấy danh sách người dùng (phân trang, tìm kiếm, lọc)' })
  findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Lấy thông tin người dùng thành công')
  @ApiOperation({ summary: 'Admin lấy thông tin chi tiết một người dùng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cập nhật người dùng thành công')
  @ApiOperation({ summary: 'Admin cập nhật thông tin người dùng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Xóa người dùng thành công')
  @ApiOperation({ summary: 'Admin xóa tài khoản người dùng' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.userService.remove(id, req.user.id);
  }
}
