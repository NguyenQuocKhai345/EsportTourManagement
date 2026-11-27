import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorator/roles';
import { Role } from '../../generated/prisma/enums';
import { ResponseMessage } from '../../format-response/success/message-decorator';
import {
  RegistrationListQueryDto,
  ReviewRegistrationDto,
  SubmitRegistrationDto,
} from './dto/registration.dto';
import { RegistrationsService } from './registrations.service';

@ApiTags('Registrations')
@ApiBearerAuth('accessToken')
@Controller({ version: '1' })
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('teams/:teamId/registration')
  @Roles(Role.PLAYER, Role.BTC, Role.ADMIN)
  @ResponseMessage('Nộp hồ sơ đăng ký tham gia giải đấu thành công')
  @ApiOperation({ summary: 'Captain nộp đơn đăng ký giải đấu cho đội của mình (BE010)' })
  @ApiResponse({ status: 201, description: 'Nộp hồ sơ đăng ký thành công' })
  submit(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Req() req: any,
    @Body() body: SubmitRegistrationDto,
  ) {
    return this.registrationsService.submit(teamId, req.user.id, body);
  }

  @Post('teams/:teamId/registration/withdraw')
  @Roles(Role.PLAYER, Role.BTC, Role.ADMIN)
  @ResponseMessage('Rút đơn đăng ký tham gia giải đấu thành công')
  @ApiOperation({ summary: 'Captain rút đơn đăng ký khi hồ sơ còn đang chờ duyệt' })
  withdraw(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Req() req: any,
  ) {
    return this.registrationsService.withdraw(teamId, req.user.id);
  }

  @Get('tournaments/:tournamentId/registrations')
  @Roles(Role.BTC, Role.ADMIN)
  @ResponseMessage('Lấy danh sách hồ sơ đăng ký thành công')
  @ApiOperation({ summary: 'BTC/Admin xem danh sách hồ sơ đăng ký của giải đấu (BE011)' })
  list(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Query() query: RegistrationListQueryDto,
    @Req() req: any,
  ) {
    return this.registrationsService.list(
      tournamentId,
      query,
      req.user.id,
      req.user.role,
    );
  }

  @Get('registrations/:id')
  @ResponseMessage('Lấy thông tin chi tiết hồ sơ đăng ký thành công')
  @ApiOperation({ summary: 'Xem chi tiết hồ sơ đăng ký (BTC, Admin hoặc Captain của đội)' })
  getById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.registrationsService.getById(id, req.user.id, req.user.role);
  }

  @Post('registrations/:id/approve')
  @Roles(Role.BTC, Role.ADMIN)
  @ResponseMessage('Phê duyệt hồ sơ đăng ký thành công')
  @ApiOperation({ summary: 'BTC/Admin phê duyệt hồ sơ đăng ký với kiểm soát quota maxTeams (BE011)' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: ReviewRegistrationDto,
  ) {
    return this.registrationsService.approve(
      id,
      req.user.id,
      req.user.role,
      body,
    );
  }

  @Post('registrations/:id/reject')
  @Roles(Role.BTC, Role.ADMIN)
  @ResponseMessage('Từ chối hồ sơ đăng ký thành công')
  @ApiOperation({ summary: 'BTC/Admin từ chối hồ sơ đăng ký của đội (BE011)' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: ReviewRegistrationDto,
  ) {
    return this.registrationsService.reject(
      id,
      req.user.id,
      req.user.role,
      body,
    );
  }
}
