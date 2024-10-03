import { Test, TestingModule } from '@nestjs/testing';
import { GameRegistryService } from './gameregistry.service';

describe('GameRegistryService', () => {
  let service: GameRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameRegistryService],
    }).compile();

    service = module.get<GameRegistryService>(GameRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
