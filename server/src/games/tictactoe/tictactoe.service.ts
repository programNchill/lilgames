import { Injectable } from '@nestjs/common';
import { Board } from './tictactoe';

type GameId = number;
type PlayerId = number; 

@Injectable()
export class TictactoeService {
    nextGameId = 0;
    games = new Map<GameId, Board>();
    gamesId = new Map<PlayerId, GameId>();

    startGame(playerId: PlayerId): GameId | null {
        if (this.gamesId.has(playerId)) {
            return null;
        }

        const newGameId = this.nextGameId++;
        this.games.set(newGameId, new Board());
        this.gamesId.set(playerId, newGameId);
        return newGameId;
    }

    joinGame(playerId: PlayerId, gameId: GameId): boolean {
        if (!this.games.has(gameId) || this.gamesId.has(playerId)) {
            return false;
        }

        this.gamesId.set(playerId, gameId);
        return true;
    }
}
