import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorator/public';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Games')
@Controller({ path: 'games', version: '1' })
export class GamesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  list() {
    return this.prisma.client.game.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, description: true },
      orderBy: { name: 'asc' },
    });
  }
}
