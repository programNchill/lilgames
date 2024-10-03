import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './schema/user';
import { EventsModule } from './events/events.module';
import { GameRegistryModule } from './gameregistry/gameregistry.module';
import { DatabaseService } from './database/database.service';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    EventsModule,
    GameRegistryModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
