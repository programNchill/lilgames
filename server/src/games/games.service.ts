import { Injectable } from '@nestjs/common';
import { TictactoeService } from './tictactoe/tictactoe.service';
import { Connect4Service } from './connect4/connect4.service';
import { ChessService } from './chess/chess.service';
import { GameServiceInterface } from './game-service.interface';

export type GameId = number;
export type PlayerId = number;
export type GameData = any;

@Injectable()
export class GamesService {
  nextGameId = 0;
  nextPlayerId = 0;
  gameServices = new Map<string, GameServiceInterface>();

  constructor(
    private tictactoeService: TictactoeService,
    private connect4Service: Connect4Service,
    private chessService: ChessService,
  ) {
    this.gameServices.set(tictactoeService.name, tictactoeService);
    this.gameServices.set(connect4Service.name, connect4Service);
    this.gameServices.set(chessService.name, chessService);
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
