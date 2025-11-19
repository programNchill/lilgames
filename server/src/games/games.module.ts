import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { TictactoeService } from './tictactoe/tictactoe.service';
import { Connect4Service } from './connect4/connect4.service';
import { ChessService } from './chess/chess.service';

@Module({
  providers: [GamesService, TictactoeService, Connect4Service, ChessService],
  controllers: [GamesController],
  exports: [GamesService]
})
export class GamesModule {}
