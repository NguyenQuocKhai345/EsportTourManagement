import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorator/roles';
import { Public } from '../../auth/decorator/public';
import { Role } from '../../generated/prisma/enums';
import { CreateGameDto, UpdateGameDto } from './dto/game.dto';
import { GamesService } from './games.service';

@ApiTags('Games')
@Controller({ path: 'games', version: '1' })
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  @Public()
  list() {
    return this.games.list();
  }

  @Get('manage')
  @ApiBearerAuth('accessToken')
  @Roles(Role.ADMIN)
  listForManagement(@Query('includeInactive') includeInactive?: string) {
    return this.games.list(includeInactive === 'true');
  }

  @Get('manage/:id')
  @ApiBearerAuth('accessToken')
  @Roles(Role.ADMIN)
  getForManagement(@Param('id', ParseIntPipe) id: number) {
    return this.games.getById(id, true);
  }

  @Get(':id')
  @Public()
  getById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.games.getById(id, req.user?.role === Role.ADMIN);
  }

  @Post()
  @ApiBearerAuth('accessToken')
  @Roles(Role.ADMIN)
  create(@Body() body: CreateGameDto) {
    return this.games.create(body);
  }

  @Patch(':id')
  @ApiBearerAuth('accessToken')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateGameDto) {
    return this.games.update(id, body);
  }
}
