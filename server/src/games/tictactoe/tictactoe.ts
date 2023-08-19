import { Logger } from '@nestjs/common';

export type Player = 'nought' | 'cross';

type PlayTarget = {
  tag: 'sector' | 'everywhere';
  sector?: number;
};

type Move = {
  sector: number;
  board: number;
};

// type UltiBoard = Set<Move>;
// const createUltiBoard = () => new Set<Move>();

type BoardInner<T> = T | 'empty';

export class Board<T> {
  private board = new Array<BoardInner<T>>(9).fill('empty');

  setState(board: Array<BoardInner<T>>) {
    this.board = board;
  }

  someoneWon(): T | "draw" | "no" {
    const [a, b, c, d, e, f, g, h, i] = this.board;
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
    const same = (line: BoardInner<T>[]) =>
      line.reduce((previous, current) => (previous == current ? previous : 'empty'));
    const results = [...rows.map(same), ...cols.map(same), ...diags.map(same)];
    for (let result of results) {
      if (result != 'empty') {
        return result;
      }
    }

    if (!this.board.includes('empty')) {
      return "draw";
    } else {
      return "no";
    }
  }
}

// class Tictactoe {
//     board = createUltiBoard();

// }
