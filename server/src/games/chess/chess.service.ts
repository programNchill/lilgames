import { Injectable } from '@nestjs/common';
import { GameServiceInterface } from '../game-service.interface';

export type Player = 'white' | 'black';
export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';

export interface Piece {
  type: PieceType;
  player: Player;
  hasMoved?: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  player: Player;
  from: string; // e.g., "e2"
  to: string; // e.g., "e4"
  promotion?: PieceType; // For pawn promotion
}

export interface ChessData {
  board: (Piece | null)[][];
  currentPlayer: Player;
  playerType?: Player;
  ownPlayer?: number;
  winner?: Player | 'draw';
  lastMove?: Move;
  halfMoveClock?: number; // For 50-move rule
  moveHistory?: Move[];
}

@Injectable()
export class ChessService implements GameServiceInterface {
  name = 'chess';
  nbPlayer = 2;

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
    const choices: Player[] = ['white', 'black'];

    const initialBoard = this.createInitialBoard();

    return [
      {
        board: initialBoard,
        currentPlayer: 'white',
        playerType: choices[player1],
        ownPlayer: playerId,
        halfMoveClock: 0,
        moveHistory: [],
      },
      {
        board: initialBoard,
        currentPlayer: 'white',
        playerType: choices[player2],
        halfMoveClock: 0,
        moveHistory: [],
      },
    ].sort(() => Math.random() - 0.5);
  }

  canPlay(gameDataUnknown: unknown, moveUnknown: unknown): boolean {
    const gameData = gameDataUnknown as ChessData;
    const move = moveUnknown as Move;

    // Check if it's the correct player's turn
    if (move.player !== gameData.currentPlayer) {
      return false;
    }

    const fromPos = this.algebraicToPosition(move.from);
    const toPos = this.algebraicToPosition(move.to);

    if (!fromPos || !toPos) {
      return false;
    }

    const piece = gameData.board[fromPos.row][fromPos.col];
    if (!piece || piece.player !== move.player) {
      return false;
    }

    return this.isLegalMove(gameData, move, fromPos, toPos);
  }

  play(
    gameDataUnknown: Record<string, unknown>,
    moveUnknown: Record<string, unknown>,
  ): Record<string, unknown> {
    const gameData = gameDataUnknown as unknown as ChessData;
    const move = moveUnknown as unknown as Move;

    const newBoard = this.applyMove(gameData, move);
    const nextPlayer = gameData.currentPlayer === 'white' ? 'black' : 'white';

    const fromPos = this.algebraicToPosition(move.from);
    const toPos = this.algebraicToPosition(move.to);
    const piece = fromPos ? gameData.board[fromPos.row][fromPos.col] : null;
    const capturedPiece = toPos ? gameData.board[toPos.row][toPos.col] : null;

    // Update half-move clock for 50-move rule
    const halfMoveClock =
      (piece && piece.type === 'pawn') || capturedPiece
        ? 0
        : (gameData.halfMoveClock || 0) + 1;

    const moveHistory = [...(gameData.moveHistory || []), move];

    const newGameData: ChessData = {
      ...gameData,
      board: newBoard,
      currentPlayer: nextPlayer,
      lastMove: move,
      halfMoveClock,
      moveHistory,
    };

    // Check game status
    const winner = this.getGameStatus(newGameData, nextPlayer);
    if (winner) {
      newGameData.winner = winner;
    }

    return newGameData as unknown as Record<string, unknown>;
  }

  private createInitialBoard(): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));

    // Place pawns
    for (let col = 0; col < 8; col++) {
      board[1][col] = { type: 'pawn', player: 'black' };
      board[6][col] = { type: 'pawn', player: 'white' };
    }

    // Place other pieces
    const backRank: PieceType[] = [
      'rook',
      'knight',
      'bishop',
      'queen',
      'king',
      'bishop',
      'knight',
      'rook',
    ];

    for (let col = 0; col < 8; col++) {
      board[0][col] = { type: backRank[col], player: 'black' };
      board[7][col] = { type: backRank[col], player: 'white' };
    }

    return board;
  }

  private algebraicToPosition(algebraic: string): Position | null {
    if (algebraic.length !== 2) return null;

    const col = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(algebraic[1]);

    if (col < 0 || col > 7 || row < 0 || row > 7) return null;

    return { row, col };
  }

  private positionToAlgebraic(pos: Position): string {
    return String.fromCharCode('a'.charCodeAt(0) + pos.col) + (8 - pos.row);
  }

  private isLegalMove(
    gameData: ChessData,
    move: Move,
    from: Position,
    to: Position,
  ): boolean {
    const piece = gameData.board[from.row][from.col];
    if (!piece) return false;

    const targetPiece = gameData.board[to.row][to.col];

    // Can't capture own piece
    if (targetPiece && targetPiece.player === piece.player) {
      return false;
    }

    // Check piece-specific movement rules
    if (!this.isValidPieceMove(gameData, piece, from, to)) {
      return false;
    }

    // Check if move puts own king in check
    const tempBoard = this.simulateMove(gameData.board, from, to);
    if (this.isInCheck(tempBoard, piece.player)) {
      return false;
    }

    return true;
  }

  private isValidPieceMove(
    gameData: ChessData,
    piece: Piece,
    from: Position,
    to: Position,
  ): boolean {
    switch (piece.type) {
      case 'pawn':
        return this.isValidPawnMove(gameData, piece, from, to);
      case 'rook':
        return this.isValidRookMove(gameData.board, from, to);
      case 'knight':
        return this.isValidKnightMove(from, to);
      case 'bishop':
        return this.isValidBishopMove(gameData.board, from, to);
      case 'queen':
        return this.isValidQueenMove(gameData.board, from, to);
      case 'king':
        return this.isValidKingMove(gameData, piece, from, to);
      default:
        return false;
    }
  }

  private isValidPawnMove(
    gameData: ChessData,
    piece: Piece,
    from: Position,
    to: Position,
  ): boolean {
    const direction = piece.player === 'white' ? -1 : 1;
    const startRow = piece.player === 'white' ? 6 : 1;
    const rowDiff = to.row - from.row;
    const colDiff = Math.abs(to.col - from.col);

    // Move forward one square
    if (colDiff === 0 && rowDiff === direction) {
      return gameData.board[to.row][to.col] === null;
    }

    // Move forward two squares from starting position
    if (
      colDiff === 0 &&
      rowDiff === 2 * direction &&
      from.row === startRow
    ) {
      const middleRow = from.row + direction;
      return (
        gameData.board[middleRow][from.col] === null &&
        gameData.board[to.row][to.col] === null
      );
    }

    // Capture diagonally
    if (colDiff === 1 && rowDiff === direction) {
      const targetPiece = gameData.board[to.row][to.col];
      if (targetPiece && targetPiece.player !== piece.player) {
        return true;
      }

      // En passant
      if (gameData.lastMove) {
        const lastFrom = this.algebraicToPosition(gameData.lastMove.from);
        const lastTo = this.algebraicToPosition(gameData.lastMove.to);
        if (!lastFrom || !lastTo) return false;

        const lastPiece = gameData.board[lastTo.row][lastTo.col];

        if (
          lastPiece &&
          lastPiece.type === 'pawn' &&
          Math.abs(lastTo.row - lastFrom.row) === 2 &&
          lastTo.row === from.row &&
          lastTo.col === to.col
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private isValidRookMove(
    board: (Piece | null)[][],
    from: Position,
    to: Position,
  ): boolean {
    // Must move in straight line
    if (from.row !== to.row && from.col !== to.col) {
      return false;
    }

    return this.isPathClear(board, from, to);
  }

  private isValidKnightMove(from: Position, to: Position): boolean {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  private isValidBishopMove(
    board: (Piece | null)[][],
    from: Position,
    to: Position,
  ): boolean {
    // Must move diagonally
    if (Math.abs(to.row - from.row) !== Math.abs(to.col - from.col)) {
      return false;
    }

    return this.isPathClear(board, from, to);
  }

  private isValidQueenMove(
    board: (Piece | null)[][],
    from: Position,
    to: Position,
  ): boolean {
    // Queen moves like rook or bishop
    return (
      this.isValidRookMove(board, from, to) ||
      this.isValidBishopMove(board, from, to)
    );
  }

  private isValidKingMove(
    gameData: ChessData,
    piece: Piece,
    from: Position,
    to: Position,
  ): boolean {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    // Normal king move (one square in any direction)
    if (rowDiff <= 1 && colDiff <= 1) {
      return true;
    }

    // Castling
    if (rowDiff === 0 && colDiff === 2 && !piece.hasMoved) {
      return this.canCastle(gameData, piece, from, to);
    }

    return false;
  }

  private canCastle(
    gameData: ChessData,
    king: Piece,
    from: Position,
    to: Position,
  ): boolean {
    // King must not be in check
    if (this.isInCheck(gameData.board, king.player)) {
      return false;
    }

    const isKingside = to.col > from.col;
    const rookCol = isKingside ? 7 : 0;
    const rook = gameData.board[from.row][rookCol];

    // Rook must exist and not have moved
    if (!rook || rook.type !== 'rook' || rook.hasMoved) {
      return false;
    }

    // Path must be clear
    const startCol = Math.min(from.col, rookCol);
    const endCol = Math.max(from.col, rookCol);
    for (let col = startCol + 1; col < endCol; col++) {
      if (gameData.board[from.row][col] !== null) {
        return false;
      }
    }

    // King must not pass through check
    const direction = isKingside ? 1 : -1;
    for (let i = 1; i <= 2; i++) {
      const tempBoard = this.simulateMove(gameData.board, from, {
        row: from.row,
        col: from.col + i * direction,
      });
      if (this.isInCheck(tempBoard, king.player)) {
        return false;
      }
    }

    return true;
  }

  private isPathClear(
    board: (Piece | null)[][],
    from: Position,
    to: Position,
  ): boolean {
    const rowStep = to.row === from.row ? 0 : (to.row - from.row) / Math.abs(to.row - from.row);
    const colStep = to.col === from.col ? 0 : (to.col - from.col) / Math.abs(to.col - from.col);

    let currentRow = from.row + rowStep;
    let currentCol = from.col + colStep;

    while (currentRow !== to.row || currentCol !== to.col) {
      if (board[currentRow][currentCol] !== null) {
        return false;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  }

  private simulateMove(
    board: (Piece | null)[][],
    from: Position,
    to: Position,
  ): (Piece | null)[][] {
    const newBoard = board.map((row) => [...row]);
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;
    return newBoard;
  }

  private applyMove(gameData: ChessData, move: Move): (Piece | null)[][] {
    const newBoard = gameData.board.map((row) => [...row]);
    const from = this.algebraicToPosition(move.from);
    const to = this.algebraicToPosition(move.to);

    if (!from || !to) {
      return newBoard; // Invalid move, return unchanged board
    }

    const piece = newBoard[from.row][from.col];
    if (!piece) {
      return newBoard; // No piece to move
    }

    // Handle en passant capture
    if (
      piece.type === 'pawn' &&
      Math.abs(to.col - from.col) === 1 &&
      newBoard[to.row][to.col] === null
    ) {
      const captureRow = piece.player === 'white' ? to.row + 1 : to.row - 1;
      newBoard[captureRow][to.col] = null;
    }

    // Handle castling - move rook
    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
      const isKingside = to.col > from.col;
      const rookFromCol = isKingside ? 7 : 0;
      const rookToCol = isKingside ? to.col - 1 : to.col + 1;

      newBoard[to.row][rookToCol] = newBoard[from.row][rookFromCol];
      newBoard[to.row][rookToCol]!.hasMoved = true;
      newBoard[from.row][rookFromCol] = null;
    }

    // Move piece
    newBoard[to.row][to.col] = { ...piece, hasMoved: true };
    newBoard[from.row][from.col] = null;

    // Handle pawn promotion
    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
      newBoard[to.row][to.col]!.type = move.promotion || 'queen';
    }

    return newBoard;
  }

  private findKing(board: (Piece | null)[][], player: Player): Position | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'king' && piece.player === player) {
          return { row, col };
        }
      }
    }
    return null;
  }

  private isInCheck(board: (Piece | null)[][], player: Player): boolean {
    const kingPos = this.findKing(board, player);
    if (!kingPos) return false;

    const opponent: Player = player === 'white' ? 'black' : 'white';

    // Check if any opponent piece can attack the king
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.player === opponent) {
          const from = { row, col };

          // For pawns, only check diagonal attacks
          if (piece.type === 'pawn') {
            const direction = piece.player === 'white' ? -1 : 1;
            const attackRow = row + direction;
            if (
              attackRow === kingPos.row &&
              Math.abs(col - kingPos.col) === 1
            ) {
              return true;
            }
          } else {
            // Create a minimal game data for validation
            const tempGameData: ChessData = {
              board,
              currentPlayer: opponent,
            };

            // Check basic piece movement (without recursion on check detection)
            if (this.canAttack(tempGameData, piece, from, kingPos)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private canAttack(
    gameData: ChessData,
    piece: Piece,
    from: Position,
    to: Position,
  ): boolean {
    switch (piece.type) {
      case 'rook':
        return this.isValidRookMove(gameData.board, from, to);
      case 'knight':
        return this.isValidKnightMove(from, to);
      case 'bishop':
        return this.isValidBishopMove(gameData.board, from, to);
      case 'queen':
        return this.isValidQueenMove(gameData.board, from, to);
      case 'king':
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        return rowDiff <= 1 && colDiff <= 1;
      default:
        return false;
    }
  }

  private hasLegalMoves(gameData: ChessData, player: Player): boolean {
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = gameData.board[fromRow][fromCol];
        if (piece && piece.player === player) {
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              const from = { row: fromRow, col: fromCol };
              const to = { row: toRow, col: toCol };

              if (this.isValidPieceMove(gameData, piece, from, to)) {
                const tempBoard = this.simulateMove(gameData.board, from, to);
                if (!this.isInCheck(tempBoard, player)) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
    return false;
  }

  private getGameStatus(
    gameData: ChessData,
    currentPlayer: Player,
  ): Player | 'draw' | undefined {
    const inCheck = this.isInCheck(gameData.board, currentPlayer);
    const hasLegalMoves = this.hasLegalMoves(gameData, currentPlayer);

    // Checkmate
    if (inCheck && !hasLegalMoves) {
      return currentPlayer === 'white' ? 'black' : 'white';
    }

    // Stalemate
    if (!inCheck && !hasLegalMoves) {
      return 'draw';
    }

    // 50-move rule
    if (gameData.halfMoveClock && gameData.halfMoveClock >= 100) {
      return 'draw';
    }

    // Insufficient material
    if (this.isInsufficientMaterial(gameData.board)) {
      return 'draw';
    }

    return undefined;
  }

  private isInsufficientMaterial(board: (Piece | null)[][]): boolean {
    const pieces: Piece[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          pieces.push(piece);
        }
      }
    }

    // King vs King
    if (pieces.length === 2) {
      return true;
    }

    // King and Bishop vs King or King and Knight vs King
    if (pieces.length === 3) {
      const nonKingPiece = pieces.find((p) => p.type !== 'king');
      return nonKingPiece ? (nonKingPiece.type === 'bishop' || nonKingPiece.type === 'knight') : false;
    }

    // King and Bishop vs King and Bishop (same color squares)
    if (pieces.length === 4) {
      const bishops = pieces.filter((p) => p.type === 'bishop');
      if (bishops.length === 2) {
        // This is a simplified check - ideally would verify same color squares
        return true;
      }
    }

    return false;
  }
}
