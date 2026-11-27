import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorator/public';
import { Roles } from '../../auth/decorator/roles';
import { Role } from '../../generated/prisma/enums';
import { ResponseMessage } from '../../format-response/success/message-decorator';
import {
  CreateRuleDocumentDto,
  RuleDocumentListQueryDto,
  UpdateRuleDocumentDto,
} from './dto/rule-document.dto';
import { RulesService } from './rules.service';

@ApiTags('Rules')
@Controller({ version: '1' })
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post('tournaments/:tournamentId/rules')
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC, Role.ADMIN)
  @ResponseMessage('Tạo tài liệu thể lệ thành công')
  @ApiOperation({ summary: 'BTC/Admin tạo tài liệu thể lệ chung hoặc riêng cho category' })
  @ApiResponse({ status: 201, description: 'Tạo tài liệu thể lệ thành công' })
  create(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Req() req: any,
    @Body() body: CreateRuleDocumentDto,
  ) {
    return this.rulesService.create(tournamentId, req.user.id, req.user.role, body);
  }

  @Get('tournaments/:tournamentId/rules')
  @Public()
  @ResponseMessage('Lấy danh sách tài liệu thể lệ thành công')
  @ApiOperation({ summary: 'Xem danh sách tài liệu thể lệ của giải đấu' })
  list(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Query() query: RuleDocumentListQueryDto,
    @Req() req: any,
  ) {
    return this.rulesService.list(tournamentId, query, req.user?.id);
  }

  @Get('tournaments/:tournamentId/categories/:categoryId/rules')
  @Public()
  @ResponseMessage('Lấy danh sách tài liệu thể lệ của hạng mục thành công')
  @ApiOperation({ summary: 'Xem danh sách tài liệu thể lệ áp dụng riêng cho hạng mục' })
  listCategoryRules(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: RuleDocumentListQueryDto,
    @Req() req: any,
  ) {
    return this.rulesService.list(
      tournamentId,
      { ...query, categoryId },
      req.user?.id,
    );
  }

  @Get('rules/:id')
  @Public()
  @ResponseMessage('Lấy thông tin tài liệu thể lệ thành công')
  @ApiOperation({ summary: 'Xem chi tiết tài liệu thể lệ' })
  getById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.rulesService.getById(id, req.user?.id);
  }

  @Patch('rules/:id')
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC, Role.ADMIN)
  @ResponseMessage('Cập nhật tài liệu thể lệ thành công')
  @ApiOperation({ summary: 'BTC/Admin cập nhật tài liệu thể lệ' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: UpdateRuleDocumentDto,
  ) {
    return this.rulesService.update(id, req.user.id, req.user.role, body);
  }

  @Delete('rules/:id')
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC, Role.ADMIN)
  @ResponseMessage('Xóa tài liệu thể lệ thành công')
  @ApiOperation({ summary: 'BTC/Admin xóa tài liệu thể lệ' })
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.rulesService.delete(id, req.user.id, req.user.role);
  }
}
