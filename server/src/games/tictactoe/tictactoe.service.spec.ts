import { Test, TestingModule } from '@nestjs/testing';
import { TictactoeService } from './tictactoe.service';

describe('TictactoeService', () => {
  let service: TictactoeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TictactoeService],
    }).compile();

    service = module.get<TictactoeService>(TictactoeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
