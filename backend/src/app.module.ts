import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtGuard } from './auth/jwt/jwt.guard';
import { RolesGuard } from './auth/jwt/roles.guard';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { GamesModule } from './modules/games/games.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { RulesModule } from './modules/rules/rules.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    AdminUsersModule,
    TournamentsModule,
    CategoriesModule,
    GamesModule,
    TeamsModule,
    RulesModule,
    RegistrationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
