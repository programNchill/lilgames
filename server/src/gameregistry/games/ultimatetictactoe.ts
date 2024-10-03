type Player = 'nought' | 'cross';
type SmallBoard = { [position: number]: Player | undefined };
type MainBoard = { [index: number]: Player | undefined };
type UltimatetictactoeData = {
  smallBoards: { [index: number]: SmallBoard }; // 9 small boards
  mainBoard: MainBoard; // 3x3 main board
  currentPlayer: Player; // Who's turn it is
  lastMove?: number; // The last position where a player played (to determine the next small board)
  winner?: Player | 'draw'; // Winner or 'draw'
};

const someoneWonSmallBoard = (board: SmallBoard): Player | undefined => {
  // Possible winning combinations in a small board
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const combo of winningCombinations) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return undefined;
};

const someoneWonMainBoard = (board: MainBoard): Player | 'draw' | undefined => {
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const combo of winningCombinations) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return the winner
    }
  }

  // Check if all small boards are full, then it's a draw
  const isDraw = Object.keys(board).length === 9 && Object.values(board).every((val) => val !== undefined);
  return isDraw ? 'draw' : undefined;
};

export const ultimatetictactoeGame = {
  name: 'ultimatetictactoe',
  nbPlayer: 2,

  initialGameData(playerId: number): Record<string, unknown>[] {
    const player1 = Math.floor(Math.random() * 2);
    const player2 = 1 - player1;
    const choices: Player[] = ['nought', 'cross'];

    // Create 9 empty small boards
    const smallBoards: { [index: number]: SmallBoard } = {};
    for (let i = 0; i < 9; i++) {
      smallBoards[i] = {};
    }

    // Main board starts empty
    const mainBoard: MainBoard = {};

    return [
      {
        smallBoards,
        mainBoard,
        currentPlayer: choices[player1],
        playerType: choices[player1],
        ownPlayer: playerId,
      },
      {
        smallBoards,
        mainBoard,
        currentPlayer: choices[player1],
        playerType: choices[player2],
      },
    ].sort(() => Math.random() - 0.5);
  },

  canPlay(gameDataUnknown: unknown, moveUnknown: unknown): boolean {
    const gameData = gameDataUnknown as UltimatetictactoeData;
    const { smallBoards, lastMove } = gameData;
    const { position: smallBoardIndex, cell } = moveUnknown as { position: number; cell: number };

    // If the last move has been played, the next move must be on the corresponding small board
    if (lastMove !== undefined && smallBoardIndex !== lastMove) {
      return false;
    }

    // Check if the small board is not won and the cell is available
    const smallBoard = smallBoards[smallBoardIndex];
    return smallBoard && smallBoard[cell] === undefined;
  },

  play(gameDataUnknown: Record<string, unknown>, moveUnknown: Record<string, unknown>): Record<string, unknown> {
    const gameData = gameDataUnknown as UltimatetictactoeData;
    const { smallBoards, mainBoard, currentPlayer, lastMove } = gameData;
    const { position: smallBoardIndex, cell } = moveUnknown as { position: number; cell: number };

    // Place the current player's mark on the selected cell of the small board
    const updatedSmallBoard = { ...smallBoards[smallBoardIndex], [cell]: currentPlayer };
    smallBoards[smallBoardIndex] = updatedSmallBoard;

    // Check if the player has won the small board
    if (someoneWonSmallBoard(updatedSmallBoard)) {
      mainBoard[smallBoardIndex] = currentPlayer;
    }

    // Check if the player has won the entire game
    const winner = someoneWonMainBoard(mainBoard);

    // Switch the player for the next turn
    const nextPlayer = currentPlayer === 'nought' ? 'cross' : 'nought';

    return {
      ...gameData,
      smallBoards,
      mainBoard,
      currentPlayer: nextPlayer,
      lastMove: cell, // The next player must play in the board corresponding to the current move
      winner,
    };
  },
};
