import { Inject, Injectable } from '@nestjs/common';
import { TictactoeService } from './tictactoe/tictactoe.service';
import { Connect4Service } from './connect4/connect4.service';

export type GameId = number;
export type PlayerId = number;
export type GameData = any;

export interface GameImpl {
  name: string;
  nbPlayer: number;

  initialGameData(playerId: number): Record<string, unknown>[];
  canPlay(gameData: unknown, move: unknown): boolean;
  play(gameData: Record<string, unknown>, move: Record<string, unknown>): Record<string, unknown>;
  someoneWon(board: unknown): string | 'draw' | undefined;
}

@Injectable()
export class GamesService {
  nextGameId = 0;
  nextPlayerId = 0;
  gameServices = new Map<string, GameImpl>();

  constructor(@Inject('GAMEIMPLS') private specificGameServices: GameImpl[]) {
    for (let specificGameService of this.specificGameServices) {
      this.gameServices.set(specificGameService.name, specificGameService);
    }
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
