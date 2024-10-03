import { assert } from 'console';

export type Player = 'first' | 'second';
type PositionX = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type PositionY = 0 | 1 | 2 | 3 | 4 | 5;
type Move = {
  player: Player;
  position: PositionX;
};

type Board = { [Key in PositionX]?: { [Key in PositionY]: Player } };

type Connect4Data = {
  board: Board;
  currentPlayer: Player;
  ownPlayer?: number;
  winner?: Player | 'draw';
};

const someoneWon = (board: Board): Player | 'draw' | undefined => {
  const directions: [number, number][] = [
    [0, 1],  // Horizontal (right)
    [1, 0],  // Vertical (down)
    [1, 1],  // Diagonal (down-right)
    [1, -1]  // Diagonal (up-right)
  ];

  // Helper function to check if a sequence of four is a winning sequence
  function isWinningSequence(x: PositionX, y: PositionY, player: Player): boolean {
    for (const [dx, dy] of directions) {
      let count = 1;

      // Check forward direction (positive dx/dy)
      for (let i = 1; i < 4; i++) {
        const newX = x + dx * i as PositionX;
        const newY = y + dy * i as PositionY;

        if (newX < 0 || newX > 6 || newY < 0 || newY > 5 || board[newX]?.[newY] !== player) break;
        count++;
      }

      // Check backward direction (negative dx/dy)
      for (let i = 1; i < 4; i++) {
        const newX = x - dx * i as PositionX;
        const newY = y - dy * i as PositionY;

        if (newX < 0 || newX > 6 || newY < 0 || newY > 5 || board[newX]?.[newY] !== player) break;
        count++;
      }

      if (count >= 4) return true;
    }
    return false;
  }

  // Iterate over all positions on the board
  for (let x: PositionX = 0; x <= 6; x++) {
    for (let y: PositionY = 0; y <= 5; y++) {
      const player = board[x as PositionX]?.[y as PositionY];
      if (player && isWinningSequence(x as PositionX, y as PositionY, player)) {
        return player; // We found a winning sequence for this player
      }
    }
  }

  // Check if the board is completely filled (i.e., a draw)
  const isDraw = Object.keys(board).length === 7 && Object.values(board).every(column => Object.keys(column).length === 6);
  return isDraw ? 'draw' : undefined;
}

export const connect4Game = {
  name: 'connect4',
  nbPlayer: 2,

  initialGameData(playerId: number): Record<string, unknown>[] {
    const player1 = Math.floor(Math.random() * 2);
    const player2 = 1 - player1;
    const choices: Player[] = ['first', 'second'];

    return [
      { board: {}, currentPlayer: choices[player1], playerType: choices[player1], ownPlayer: playerId },
      { board: {}, currentPlayer: choices[player1], playerType: choices[player2] },
    ].sort(() => Math.random() - 0.5);
  },

  canPlay(gameDataUnknown: unknown, moveUnknown: unknown): boolean {
    let { board } = gameDataUnknown as Connect4Data;
    let {
      position: x,
    } = moveUnknown as Move;
    return this.getAvailableYPosition(x, board) !== null;
  },

  getAvailableYPosition(x: PositionX, board: Board): PositionY | null {
    // Loop from the bottom (Y = 5) to the top (Y = 0) to find the first empty space
    for (let y: PositionY = 5; y >= 0; y--) {
      // If the board at position (x, y) is undefined, it means the spot is empty
      if (!board[x] || !board[x]![y as PositionY]) {
        return y as PositionY; // Return the first empty Y position
      }
    }
    return null;
  },

  play(gameDataUnknown: Record<string, unknown>, moveUnknown: Record<string, unknown>): Record<string, unknown> {
    let gameData = gameDataUnknown as Connect4Data;
    let {
      player,
      position: x,
    } = moveUnknown as Move;

    const y = this.getAvailableYPosition(x, gameData.board);
    assert(y !== null);

    const board = { ...gameData.board, [x]: { [y as PositionY]: player, ...gameData.board[x] } };
    const currentPlayer = gameData.currentPlayer == 'first' ? 'second' : 'first';
    return { ...gameData, board, currentPlayer, winner: someoneWon(board) };
  },
}
