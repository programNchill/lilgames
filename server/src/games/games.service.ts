import { Injectable } from '@nestjs/common';
import { TictactoeService } from './tictactoe/tictactoe.service';

export type GameId = number;
export type PlayerId = number;
export type GameData = any;

@Injectable()
export class GamesService {
  nextGameId = 0;
  nextPlayerId = 0;
  gameServices = new Map<string, TictactoeService>();

  constructor(private tictactoeService: TictactoeService) {
    this.gameServices.set(tictactoeService.name, tictactoeService);
  }

  gameIsFull(gameName: string, nbPlayers: number): boolean {
    return this.gameServices.get(gameName)!.nbPlayer <= nbPlayers;
  }

  gameNameExists(name: string): boolean {
    return this.gameServices.has(name);
  }

  join(gameId?: string): { gameId: GameId; playerId: PlayerId } | undefined {
    if (gameId) {
      const parsedGameId = parseInt(gameId);
      return parsedGameId >= this.nextGameId ? undefined : { gameId: parsedGameId, playerId: this.nextPlayerId++ };
    }

    return { gameId: this.nextGameId++, playerId: this.nextPlayerId++ };
  }
}
