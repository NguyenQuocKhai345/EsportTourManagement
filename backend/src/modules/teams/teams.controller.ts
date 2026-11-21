import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorator/public';
import { Roles } from '../../auth/decorator/roles';
import { Role } from '../../generated/prisma/enums';
import {
  AddTeamMemberDto,
  ChangeTeamCaptainDto,
  CreateTeamDto,
  TeamListQueryDto,
  UpdateTeamDto,
} from './dto/team.dto';
import { TeamsService } from './teams.service';

@ApiTags('Teams')
@Controller({ path: 'categories/:categoryId/teams', version: '1' })
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @ApiBearerAuth('accessToken')
  @Roles(Role.PLAYER)
  create(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: any,
    @Body() body: CreateTeamDto,
  ) {
    return this.teams.create(categoryId, req.user, body);
  }

  @Get()
  @Public()
  list(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: TeamListQueryDto,
    @Req() req: any,
  ) {
    return this.teams.list(categoryId, query, req.user?.id);
  }
}

@ApiTags('Teams')
@Controller({ path: 'teams', version: '1' })
export class TeamDetailsController {
  constructor(private readonly teams: TeamsService) {}

  @Get(':id')
  @Public()
  get(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.teams.getById(id, req.user?.id);
  }

  @Patch(':id')
  @ApiBearerAuth('accessToken')
  @Roles(Role.PLAYER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: UpdateTeamDto,
  ) {
    return this.teams.update(id, req.user, body);
  }

  @Post(':id/members')
  @ApiBearerAuth('accessToken')
  @Roles(Role.PLAYER)
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: AddTeamMemberDto,
  ) {
    return this.teams.addMember(id, req.user, body);
  }

  @Delete(':id/members/:phone')
  @ApiBearerAuth('accessToken')
  @Roles(Role.PLAYER)
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('phone') phone: string,
    @Req() req: any,
  ) {
    return this.teams.removeMember(id, req.user, phone);
  }

  @Patch(':id/captain')
  @ApiBearerAuth('accessToken')
  @Roles(Role.PLAYER)
  changeCaptain(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: ChangeTeamCaptainDto,
  ) {
    return this.teams.changeCaptain(id, req.user, body);
  }
}
