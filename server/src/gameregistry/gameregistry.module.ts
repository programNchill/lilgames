import { Module } from '@nestjs/common';
import { GameRegistryService } from './gameregistry.service';
import { GameRegistryController } from './gameregistry.controller';

@Module({
  providers: [GameRegistryService],
  controllers: [GameRegistryController],
  exports: [GameRegistryService]
})
export class GameRegistryModule {}
