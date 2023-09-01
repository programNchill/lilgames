import { BadRequestException, Controller, Get, Logger, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GamesService, GameId, PlayerId } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private gameService: GamesService) {}

  // @UseGuards(JwtAuthGuard)
  @Get(':gameName/:gameId?')
  playGame(
    @Param('gameName') gameName: string,
    @Param('gameId') gameId?: string,
  ): { gameId: GameId; playerId: PlayerId } {
    if (!this.gameService.gameNameExists(gameName)) {
      throw new BadRequestException(`${gameName} is not a supported game`);
    }

    const joinData = this.gameService.join(gameId);
    if (!joinData) {
      throw new BadRequestException(`Couldn't join game with game id: ${gameId}`);
    }
    
    return joinData;
  }
}
