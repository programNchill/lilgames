export type Player = 'nought' | 'cross';

type Move = {
  player: Player;
  position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
};

type BoardInner = Player | 'empty';

export class Board {
  private board = new Array<BoardInner>(9).fill('empty');

  setState(board: BoardInner[]) {
    this.board = board;
  }

  play({player, position}: Move): boolean {
    if (this.board[position] != "empty"){
        return false;
    }

    this.board[position] = player;
    return true;
  }

  someoneWon(): Player | 'draw' | 'no' {
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
    const same = (line: BoardInner[]) =>
      line.reduce((previous, current) => (previous == current ? previous : 'empty'));
    const results = [...rows.map(same), ...cols.map(same), ...diags.map(same)];
    for (let result of results) {
      if (result != 'empty') {
        return result;
      }
    }

    return !this.board.includes('empty') ? 'draw' : 'no';
  }
}
