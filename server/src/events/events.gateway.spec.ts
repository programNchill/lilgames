import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { GamesService } from '../games/games.service';
import { TictactoeService } from '../games/tictactoe/tictactoe.service';
import { Connect4Service } from '../games/connect4/connect4.service';
import { ChessService } from '../games/chess/chess.service';

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsGateway, GamesService, TictactoeService, Connect4Service, ChessService],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
