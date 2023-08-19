import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { EventsModule } from './events/events.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db/lilgames.sqlite',
      entities: [User],
      synchronize: true,
      logging: true,
    }),
    AuthModule,
    UsersModule,
    EventsModule,
    GamesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
