import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '../../auth/decorator/roles';
import { ResponseMessage } from '../../format-response/success/message-decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminUsersService } from './admin-users.service';

@ApiTags('Admin Users')
@ApiBearerAuth('accessToken')
@Roles(Role.ADMIN)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Tạo người dùng thành công')
  @ApiOperation({ summary: 'Admin tạo tài khoản người dùng mới' })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công' })
  create(@Body() dto: CreateUserDto) {
    return this.adminUsersService.create(dto);
  }

  @Get()
  @ResponseMessage('Lấy danh sách người dùng thành công')
  @ApiOperation({ summary: 'Admin lấy danh sách người dùng' })
  findAll(@Query() query: QueryUserDto) {
    return this.adminUsersService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Lấy thông tin người dùng thành công')
  @ApiOperation({ summary: 'Admin xem chi tiết người dùng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật người dùng thành công')
  @ApiOperation({ summary: 'Admin cập nhật thông tin profile người dùng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.adminUsersService.update(id, dto);
  }

  @Patch(':id/status')
  @ResponseMessage('Cập nhật trạng thái tài khoản thành công')
  @ApiOperation({ summary: 'Admin cập nhật trạng thái tài khoản' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    return this.adminUsersService.updateStatus(id, dto.status, req.user.id);
  }

  @Delete(':id')
  @ResponseMessage('Vô hiệu hóa tài khoản thành công')
  @ApiOperation({ summary: 'Admin vô hiệu hóa tài khoản (không xóa vật lý)' })
  deactivate(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.adminUsersService.deactivate(id, req.user.id);
  }
}
