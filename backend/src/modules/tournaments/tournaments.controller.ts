import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorator/roles';
import { Public } from '../../auth/decorator/public';
import { Role } from '../../generated/prisma/enums';
import {
  CreateTournamentDto,
  TournamentListQueryDto,
  UpdateTournamentDto,
} from './dto/tournament.dto';
import { TournamentsService } from './tournaments.service';

@ApiTags('Tournaments')
@Controller({ path: 'tournaments', version: '1' })
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  @Post()
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC)
  create(@Req() req: any, @Body() body: CreateTournamentDto) {
    return this.tournaments.create(req.user.id, body);
  }

  @Get()
  @Public()
  list(@Query() query: TournamentListQueryDto, @Req() req: any) {
    return this.tournaments.list(query, req.user?.id);
  }

  @Get(':id')
  @Public()
  get(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.tournaments.getById(id, req.user?.id);
  }

  @Patch(':id')
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: UpdateTournamentDto,
  ) {
    return this.tournaments.update(id, req.user.id, body);
  }

  @Delete(':id')
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.tournaments.remove(id, req.user.id);
  }
}
