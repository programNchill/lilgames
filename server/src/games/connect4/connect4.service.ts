import { Injectable } from '@nestjs/common';
import { GameServiceInterface } from '../game-service.interface';

export type Player = 'red' | 'yellow';
type Column = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Move = {
  player: Player;
  column: Column;
};

// Board is represented as a 2D array: board[row][col]
// Row 0 is the bottom, row 5 is the top
type Board = (Player | null)[][];

type Connect4Data = {
  board: Board;
  currentPlayer: Player;
  playerType?: Player;
  ownPlayer?: number;
  winner?: Player | 'draw';
};

@Injectable()
export class Connect4Service implements GameServiceInterface {
  name = 'connect4';
  nbPlayer = 2;
  private readonly ROWS = 6;
  private readonly COLS = 7;

  gameDataAgree(gameDataUnknown: unknown[]): boolean {
    const same = gameDataUnknown
      .map((d) => JSON.stringify(d))
      .reduce((previous, current) =>
        previous === current ? previous : '',
      );
    return same !== '';
  }

  initialGameData(playerId: number): Record<string, unknown>[] {
    const player1 = Math.floor(Math.random() * 2);
    const player2 = 1 - player1;
    const choices: Player[] = ['red', 'yellow'];

    // Initialize empty board (6 rows x 7 columns)
    const emptyBoard: Board = Array(this.ROWS)
      .fill(null)
      .map(() => Array(this.COLS).fill(null));

    return [
      {
        board: emptyBoard,
        currentPlayer: choices[player1],
        playerType: choices[player1],
        ownPlayer: playerId,
      },
      {
        board: emptyBoard,
        currentPlayer: choices[player1],
        playerType: choices[player2],
      },
    ].sort(() => Math.random() - 0.5);
  }

  canPlay(gameDataUnknown: unknown, moveUnknown: unknown): boolean {
    const { board } = gameDataUnknown as Connect4Data;
    const { column } = moveUnknown as Move;

    // Check if column is valid
    if (column < 0 || column >= this.COLS) {
      return false;
    }

    // Check if column has space (top row must be empty)
    return board[this.ROWS - 1][column] === null;
  }

  play(
    gameDataUnknown: Record<string, unknown>,
    moveUnknown: Record<string, unknown>,
  ): Record<string, unknown> {
    const gameData = gameDataUnknown as Connect4Data;
    const { player, column } = moveUnknown as Move;

    // Deep copy the board
    const board: Board = gameData.board.map((row) => [...row]);

    // Find the lowest empty row in the column
    let targetRow = -1;
    for (let row = 0; row < this.ROWS; row++) {
      if (board[row][column] === null) {
        targetRow = row;
        break;
      }
    }

    // Place the piece
    if (targetRow !== -1) {
      board[targetRow][column] = player;
    }

    // Switch player
    const currentPlayer = gameData.currentPlayer === 'red' ? 'yellow' : 'red';

    return {
      ...gameData,
      board,
      currentPlayer,
      winner: this.someoneWon(board),
    };
  }

  someoneWon(board: Board): Player | 'draw' | undefined {
    // Check horizontal wins
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col <= this.COLS - 4; col++) {
        const player = board[row][col];
        if (
          player &&
          board[row][col + 1] === player &&
          board[row][col + 2] === player &&
          board[row][col + 3] === player
        ) {
          return player;
        }
      }
    }

    // Check vertical wins
    for (let row = 0; row <= this.ROWS - 4; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const player = board[row][col];
        if (
          player &&
          board[row + 1][col] === player &&
          board[row + 2][col] === player &&
          board[row + 3][col] === player
        ) {
          return player;
        }
      }
    }

    // Check diagonal wins (bottom-left to top-right)
    for (let row = 0; row <= this.ROWS - 4; row++) {
      for (let col = 0; col <= this.COLS - 4; col++) {
        const player = board[row][col];
        if (
          player &&
          board[row + 1][col + 1] === player &&
          board[row + 2][col + 2] === player &&
          board[row + 3][col + 3] === player
        ) {
          return player;
        }
      }
    }

    // Check diagonal wins (top-left to bottom-right)
    for (let row = 3; row < this.ROWS; row++) {
      for (let col = 0; col <= this.COLS - 4; col++) {
        const player = board[row][col];
        if (
          player &&
          board[row - 1][col + 1] === player &&
          board[row - 2][col + 2] === player &&
          board[row - 3][col + 3] === player
        ) {
          return player;
        }
      }
    }

    // Check for draw (board is full)
    const isFull = board.every((row) => row.every((cell) => cell !== null));
    return isFull ? 'draw' : undefined;
  }
}
