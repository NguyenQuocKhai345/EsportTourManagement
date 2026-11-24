import { Module } from '@nestjs/common';
import { TeamDetailsController, TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  controllers: [TeamsController, TeamDetailsController],
  providers: [TeamsService],
})
export class TeamsModule {}
