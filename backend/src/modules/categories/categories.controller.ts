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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorator/public';
import { Roles } from '../../auth/decorator/roles';
import { Role } from '../../generated/prisma/enums';
import {
  CategoryListQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller({ path: 'tournaments/:tournamentId/categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC)
  create(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Req() req: any,
    @Body() body: CreateCategoryDto,
  ) {
    return this.categories.create(tournamentId, req.user.id, body);
  }

  @Get()
  @Public()
  list(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Query() query: CategoryListQueryDto,
    @Req() req: any,
  ) {
    return this.categories.list(tournamentId, query, req.user?.id);
  }

  @Get(':categoryId')
  @Public()
  get(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: any,
  ) {
    return this.categories.get(tournamentId, categoryId, req.user?.id);
  }

  @Patch(':categoryId')
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC)
  update(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: any,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.categories.update(tournamentId, categoryId, req.user.id, body);
  }

  @Delete(':categoryId')
  @ApiBearerAuth('accessToken')
  @Roles(Role.BTC)
  remove(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: any,
  ) {
    return this.categories.remove(tournamentId, categoryId, req.user.id);
  }
}
