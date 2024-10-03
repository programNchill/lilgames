import { Test, TestingModule } from '@nestjs/testing';
import { GameRegistryController } from './gameregistry.controller';

describe('GamesController', () => {
  let controller: GameRegistryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameRegistryController],
    }).compile();

    controller = module.get<GameRegistryController>(GameRegistryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
