import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { GameRegistryModule } from 'src/gameregistry/gameregistry.module';

@Module({
  imports: [GameRegistryModule],
  providers: [EventsGateway]
})
export class EventsModule {}
