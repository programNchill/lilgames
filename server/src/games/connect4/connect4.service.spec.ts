import { Test, TestingModule } from '@nestjs/testing';
import { Connect4Service } from './connect4.service';

describe('TictactoeService', () => {
  let service: Connect4Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Connect4Service],
    }).compile();

    service = module.get<Connect4Service>(Connect4Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
