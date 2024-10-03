import { Inject, Injectable } from '@nestjs/common';
import { connect4Game } from './games/connect4';
import { tictactoeGame } from './games/tictactoe';

export type GameId = number;
export type PlayerId = number;
export type GameData = any;

export interface GameImpl {
  name: string;
  nbPlayer: number;

  initialGameData(playerId: number): Record<string, unknown>[];
  canPlay(gameData: unknown, move: unknown): boolean;
  play(gameData: Record<string, unknown>, move: Record<string, unknown>): Record<string, unknown>;
}

const GAMES: GameImpl[] = [connect4Game, tictactoeGame];

@Injectable()
export class GameRegistryService {
  nextGameId = 0;
  nextPlayerId = 0;
  gameServices = new Map<string, GameImpl>();

  constructor() {
    for (let specificGameService of GAMES) {
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
