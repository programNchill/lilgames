import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { TictactoeService } from './tictactoe/tictactoe.service';
import { Connect4Service } from './connect4/connect4.service';
import { ChessService } from './chess/chess.service';

describe('GamesService', () => {
  let service: GamesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamesService, TictactoeService, Connect4Service, ChessService],
    }).compile();

    service = module.get<GamesService>(GamesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
