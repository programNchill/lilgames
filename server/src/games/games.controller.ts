import { Controller, Get } from '@nestjs/common';
import { Board, Player } from './tictactoe/tictactoe';

@Controller('games')
export class GamesController {
  board = new Board<Player>();

  @Get('test')
  getTest(): string {
    const X = "cross";
    const O = 'nought';
    const E = 'empty';

    this.board.setState([
        O, X, O,
        O, O, X,
        X, O, X 
    ]);

    return this.board.someoneWon();
  }
}
