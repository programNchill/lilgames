import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { TictactoeService } from './tictactoe/tictactoe.service';
import { Connect4Service } from './connect4/connect4.service';

@Module({
  providers: [GamesService, TictactoeService, Connect4Service,
    {
      provide: 'GAMEIMPLS',
      useFactory: (...args) => [...args],
      inject: [TictactoeService, Connect4Service]
    }
  ],
  controllers: [GamesController],
  exports: [GamesService]
})
export class GamesModule {}
