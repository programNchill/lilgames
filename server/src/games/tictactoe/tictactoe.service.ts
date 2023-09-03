import { Injectable, Logger } from '@nestjs/common';
import { deepStrictEqual } from 'assert';

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
export class TictactoeService {
  name = 'tictactoe';
  nbPlayer = 2;

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
    const reconstructedBoard = ([0, 1, 2, 3, 4, 5, 6, 7, 8] as Position[]).map((value) => value in board ? board[value] : undefined);
    const [a, b, c, d, e, f, g, h, i] = reconstructedBoard;
    const rows = [
      [a, b, c],
      [d, e, f],
      [g, h, i],
    ];
    const cols = [
      [a, d, g],
      [b, e, h],
      [c, f, i],
    ];
    const diags = [
      [a, e, i],
      [c, e, g],
    ];
    const same = (line: (Player | undefined)[]) =>
      line.reduce((previous, current) => (previous == current ? previous : undefined));
    const results = [...rows.map(same), ...cols.map(same), ...diags.map(same)];
    for (let result of results) {
      if (result !== undefined) {
        return result;
      }
    }

    return reconstructedBoard.includes(undefined) ? undefined : 'draw';
  }
}
