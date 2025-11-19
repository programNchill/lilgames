import { Injectable, Logger } from '@nestjs/common';
import { deepStrictEqual } from 'assert';
import { GameServiceInterface } from '../game-service.interface';

export type Player = 'nought' | 'cross';
type Position = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type Move = {
  player: Player;
  position: Position;
};

type Board = { [Key in Position]?: Player };

type TictactoeData = {
  board: Board;
  currentPlayer: Player;
  ownPlayer?: number;
  winner?: Player | 'draw';
};

@Injectable()
export class TictactoeService implements GameServiceInterface {
  name = 'tictactoe';
  nbPlayer = 2;

  // Bitboard win patterns for O(1) win checking
  private readonly WIN_PATTERNS = [
    0b000000111, // Row 1 (positions 0,1,2)
    0b000111000, // Row 2 (positions 3,4,5)
    0b111000000, // Row 3 (positions 6,7,8)
    0b001001001, // Col 1 (positions 0,3,6)
    0b010010010, // Col 2 (positions 1,4,7)
    0b100100100, // Col 3 (positions 2,5,8)
    0b100010001, // Diagonal (positions 0,4,8)
    0b001010100, // Anti-diagonal (positions 2,4,6)
  ];

  gameDataAgree(gameDataUnknown: unknown[]): boolean {
    const same = gameDataUnknown
      .map((d) => JSON.stringify(d))
      .reduce((previous, current) =>
        // no no no
        previous === current ? previous : '',
      );
    return same !== '';
  }

  initialGameData(playerId: number): Record<string, unknown>[] {
    const player1 = Math.floor(Math.random() * 2);
    const player2 = 1 - player1;
    const choices: Player[] = ['nought', 'cross'];

    return [
      { board: {}, currentPlayer: choices[player1], playerType:choices[player1], ownPlayer: playerId },
      { board: {}, currentPlayer: choices[player1], playerType:choices[player2],},
    ].sort(() => Math.random() - 0.5);
  }

  canPlay(gameDataUnknown: unknown, moveUnknown: unknown): boolean {
    let { board } = gameDataUnknown as TictactoeData;
    let { position } = moveUnknown as Move;
    return board[position] === undefined;
  }

  play(gameDataUnknown: Record<string, unknown>, moveUnknown: Record<string, unknown>): Record<string, unknown> {
    let gameData = gameDataUnknown as TictactoeData;
    let { player, position } = moveUnknown as Move;

    const board = { ...gameData.board, [position]: player };
    const currentPlayer = gameData.currentPlayer == 'nought' ? 'cross' : 'nought';
    return { ...gameData, board, currentPlayer, winner: this.someoneWon(board) };
  }

  someoneWon(board: Board): Player | 'draw' | undefined {
    // Convert board to bitboards for O(1) win checking
    let noughtBits = 0;
    let crossBits = 0;
    let filledCount = 0;

    for (let pos = 0; pos < 9; pos++) {
      const player = board[pos as Position];
      if (player === 'nought') {
        noughtBits |= (1 << pos);
        filledCount++;
      } else if (player === 'cross') {
        crossBits |= (1 << pos);
        filledCount++;
      }
    }

    // Check for wins using bitwise operations (much faster than array checks)
    for (const pattern of this.WIN_PATTERNS) {
      if ((noughtBits & pattern) === pattern) return 'nought';
      if ((crossBits & pattern) === pattern) return 'cross';
    }

    // Check for draw (all 9 positions filled)
    return filledCount === 9 ? 'draw' : undefined;
  }
}
