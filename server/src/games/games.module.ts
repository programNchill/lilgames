import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { TictactoeService } from './tictactoe/tictactoe.service';

@Module({
  providers: [GamesService, TictactoeService],
  controllers: [GamesController],
  exports: [GamesService]
})
export class GamesModule {}
