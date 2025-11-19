import { Test, TestingModule } from '@nestjs/testing';
import { ChessService, Move, ChessData, Piece } from './chess.service';

describe('ChessService', () => {
  let service: ChessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChessService],
    }).compile();

    service = module.get<ChessService>(ChessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Game Properties', () => {
    it('should have correct game name', () => {
      expect(service.name).toBe('chess');
    });

    it('should require 2 players', () => {
      expect(service.nbPlayer).toBe(2);
    });
  });

  describe('Initial Game Data', () => {
    it('should create initial game data with correct structure', () => {
      const data = service.initialGameData(0);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty('board');
      expect(data[0]).toHaveProperty('currentPlayer');
      expect(data[0]).toHaveProperty('playerType');
      expect(data[0]).toHaveProperty('halfMoveClock');
      expect(data[0]).toHaveProperty('moveHistory');
    });

    it('should start with white to move', () => {
      const data = service.initialGameData(0);
      expect(data[0].currentPlayer).toBe('white');
      expect(data[1].currentPlayer).toBe('white');
    });

    it('should assign different colors to players', () => {
      const data = service.initialGameData(0) as unknown as ChessData[];
      const colors = [data[0].playerType, data[1].playerType];
      expect(colors).toContain('white');
      expect(colors).toContain('black');
    });

    it('should create 8x8 board', () => {
      const data = service.initialGameData(0) as unknown as ChessData[];
      expect(data[0].board).toHaveLength(8);
      data[0].board.forEach((row) => {
        expect(row).toHaveLength(8);
      });
    });

    it('should place pieces in starting positions', () => {
      const data = service.initialGameData(0) as unknown as ChessData[];
      const board = data[0].board;

      // Check white pawns
      for (let col = 0; col < 8; col++) {
        expect(board[6][col]).toEqual({ type: 'pawn', player: 'white' });
      }

      // Check black pawns
      for (let col = 0; col < 8; col++) {
        expect(board[1][col]).toEqual({ type: 'pawn', player: 'black' });
      }

      // Check white back rank
      expect(board[7][0]).toEqual({ type: 'rook', player: 'white' });
      expect(board[7][1]).toEqual({ type: 'knight', player: 'white' });
      expect(board[7][2]).toEqual({ type: 'bishop', player: 'white' });
      expect(board[7][3]).toEqual({ type: 'queen', player: 'white' });
      expect(board[7][4]).toEqual({ type: 'king', player: 'white' });

      // Check black back rank
      expect(board[0][0]).toEqual({ type: 'rook', player: 'black' });
      expect(board[0][4]).toEqual({ type: 'king', player: 'black' });
    });

    it('should have empty squares in the middle', () => {
      const data = service.initialGameData(0) as unknown as ChessData[];
      const board = data[0].board;

      for (let row = 2; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          expect(board[row][col]).toBeNull();
        }
      }
    });
  });

  describe('Game Data Agreement', () => {
    it('should return true when all game data is identical', () => {
      const gameData = { board: [], currentPlayer: 'white' };
      expect(service.gameDataAgree([gameData, gameData])).toBe(true);
    });

    it('should return false when game data differs', () => {
      const gameData1 = { board: [], currentPlayer: 'white' };
      const gameData2 = { board: [], currentPlayer: 'black' };
      expect(service.gameDataAgree([gameData1, gameData2])).toBe(false);
    });
  });

  describe('Pawn Movements', () => {
    it('should allow pawn to move one square forward', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'white', from: 'e2', to: 'e3' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should allow pawn to move two squares from starting position', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'white', from: 'e2', to: 'e4' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should not allow pawn to move two squares after first move', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;
      const move1: Move = { player: 'white', from: 'e2', to: 'e3' };
      gameData = service.play(gameData as any, move1 as any) as unknown as ChessData;

      const move2: Move = { player: 'black', from: 'd7', to: 'd6' };
      gameData = service.play(gameData as any, move2 as any) as unknown as ChessData;

      const invalidMove: Move = { player: 'white', from: 'e3', to: 'e5' };
      expect(service.canPlay(gameData, invalidMove)).toBe(false);
    });

    it('should not allow pawn to move forward if blocked', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Manually place a piece in front of pawn
      data.board[5][4] = { type: 'knight', player: 'black' };

      const move: Move = { player: 'white', from: 'e2', to: 'e3' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should allow pawn to capture diagonally', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Move white pawn up
      data.board[4][4] = { type: 'pawn', player: 'white' };
      data.board[6][4] = null;
      // Place black piece for capture
      data.board[3][5] = { type: 'pawn', player: 'black' };

      const move: Move = { player: 'white', from: 'e4', to: 'f5' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should not allow pawn to capture forward', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[5][4] = { type: 'pawn', player: 'black' };

      const move: Move = { player: 'white', from: 'e2', to: 'e3' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should handle pawn promotion to queen', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Place white pawn on 7th rank
      data.board[1][4] = { type: 'pawn', player: 'white' };
      data.board[0][4] = null; // Remove black king temporarily

      const move: Move = { player: 'white', from: 'e7', to: 'e8', promotion: 'queen' };
      const newData = service.play(data as any, move as any) as unknown as ChessData;

      expect(newData.board[0][4]).toEqual(
        expect.objectContaining({ type: 'queen', player: 'white' }),
      );
    });
  });

  describe('Rook Movements', () => {
    it('should allow rook to move horizontally', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Clear path and move rook to open position
      data.board[4][0] = { type: 'rook', player: 'white' };
      data.board[4][1] = null;
      data.board[4][2] = null;

      const move: Move = { player: 'white', from: 'a4', to: 'c4' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should allow rook to move vertically', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Clear path
      data.board[4][0] = { type: 'rook', player: 'white' };
      data.board[5][0] = null;

      const move: Move = { player: 'white', from: 'a4', to: 'a6' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should not allow rook to move diagonally', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][0] = { type: 'rook', player: 'white' };

      const move: Move = { player: 'white', from: 'a4', to: 'b5' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should not allow rook to jump over pieces', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][0] = { type: 'rook', player: 'white' };
      data.board[4][1] = { type: 'pawn', player: 'white' };

      const move: Move = { player: 'white', from: 'a4', to: 'c4' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });
  });

  describe('Knight Movements', () => {
    it('should allow knight to move in L-shape', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'white', from: 'b1', to: 'c3' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should allow knight to jump over pieces', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Knight can jump over pawns
      const move: Move = { player: 'white', from: 'g1', to: 'f3' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should not allow knight to move in non-L-shape', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][4] = { type: 'knight', player: 'white' };

      const move: Move = { player: 'white', from: 'e4', to: 'e6' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });
  });

  describe('Bishop Movements', () => {
    it('should allow bishop to move diagonally', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Clear path
      data.board[5][3] = null;
      data.board[4][2] = null;

      const move: Move = { player: 'white', from: 'c1', to: 'e3' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should not allow bishop to move horizontally', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][2] = { type: 'bishop', player: 'white' };

      const move: Move = { player: 'white', from: 'c4', to: 'e4' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should not allow bishop to jump over pieces', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][2] = { type: 'bishop', player: 'white' };
      data.board[5][3] = { type: 'pawn', player: 'white' };

      const move: Move = { player: 'white', from: 'c4', to: 'f7' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });
  });

  describe('Queen Movements', () => {
    it('should allow queen to move horizontally like rook', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][3] = { type: 'queen', player: 'white' };

      const move: Move = { player: 'white', from: 'd4', to: 'g4' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should allow queen to move diagonally like bishop', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][3] = { type: 'queen', player: 'white' };

      const move: Move = { player: 'white', from: 'd4', to: 'g7' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });
  });

  describe('King Movements', () => {
    it('should allow king to move one square in any direction', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][4] = { type: 'king', player: 'white' };
      data.board[7][4] = null;

      const move: Move = { player: 'white', from: 'e4', to: 'e5' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should not allow king to move more than one square', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][4] = { type: 'king', player: 'white' };
      data.board[7][4] = null;

      const move: Move = { player: 'white', from: 'e4', to: 'e6' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should not allow king to move into check', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][4] = { type: 'king', player: 'white' };
      data.board[7][4] = null;
      // Black rook attacking e5
      data.board[3][4] = { type: 'rook', player: 'black' };

      const move: Move = { player: 'white', from: 'e4', to: 'e5' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });
  });

  describe('Castling', () => {
    it('should allow kingside castling when conditions are met', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Clear path between king and rook
      data.board[7][5] = null;
      data.board[7][6] = null;

      const move: Move = { player: 'white', from: 'e1', to: 'g1' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should allow queenside castling when conditions are met', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Clear path between king and rook
      data.board[7][1] = null;
      data.board[7][2] = null;
      data.board[7][3] = null;

      const move: Move = { player: 'white', from: 'e1', to: 'c1' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should move rook when castling', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[7][5] = null;
      data.board[7][6] = null;

      const move: Move = { player: 'white', from: 'e1', to: 'g1' };
      const newData = service.play(data as any, move as any) as unknown as ChessData;

      // King should be on g1
      expect(newData.board[7][6]).toEqual(
        expect.objectContaining({ type: 'king', player: 'white' }),
      );
      // Rook should be on f1
      expect(newData.board[7][5]).toEqual(
        expect.objectContaining({ type: 'rook', player: 'white' }),
      );
      // Old positions should be empty
      expect(newData.board[7][4]).toBeNull();
      expect(newData.board[7][7]).toBeNull();
    });

    it('should not allow castling through check', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[7][5] = null;
      data.board[7][6] = null;
      // Black rook attacking f1
      data.board[0][5] = { type: 'rook', player: 'black' };

      const move: Move = { player: 'white', from: 'e1', to: 'g1' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });
  });

  describe('En Passant', () => {
    it('should allow en passant capture', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;

      // Move white pawn to 5th rank
      gameData.board[3][4] = { type: 'pawn', player: 'white' };
      gameData.board[6][4] = null;
      gameData.currentPlayer = 'black';

      // Black pawn moves two squares to adjacent file
      const blackMove: Move = { player: 'black', from: 'd7', to: 'd5' };
      gameData = service.play(gameData as any, blackMove as any) as unknown as ChessData;

      // White captures en passant
      const enPassantMove: Move = { player: 'white', from: 'e5', to: 'd6' };
      expect(service.canPlay(gameData, enPassantMove as any)).toBe(true);
    });

    it('should remove captured pawn in en passant', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;

      // Setup: white pawn on e5
      gameData.board[3][4] = { type: 'pawn', player: 'white', hasMoved: true };
      gameData.board[6][4] = null;
      gameData.currentPlayer = 'black';

      // Black pawn moves two squares
      const blackMove: Move = { player: 'black', from: 'd7', to: 'd5' };
      gameData = service.play(gameData as any, blackMove as any) as unknown as ChessData;

      // White captures en passant
      const enPassantMove: Move = { player: 'white', from: 'e5', to: 'd6' };
      gameData = service.play(gameData as any, enPassantMove as any) as unknown as ChessData;

      // Captured pawn should be removed
      expect(gameData.board[3][3]).toBeNull();
      // Capturing pawn should be on d6
      expect(gameData.board[2][3]).toEqual(
        expect.objectContaining({ type: 'pawn', player: 'white' }),
      );
    });
  });

  describe('Check Detection', () => {
    it('should not allow moves that leave king in check', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Place white king in front of black rook with white pawn blocking
      data.board[4][4] = { type: 'king', player: 'white' };
      data.board[7][4] = null;
      data.board[3][4] = { type: 'pawn', player: 'white' };
      data.board[0][4] = { type: 'rook', player: 'black' };

      // Try to move the blocking pawn
      const move: Move = { player: 'white', from: 'e5', to: 'e6' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });
  });

  describe('Turn Management', () => {
    it('should not allow player to move on opponent turn', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'black', from: 'd7', to: 'd5' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should alternate turns after each move', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;
      expect(gameData.currentPlayer).toBe('white');

      const whiteMove: Move = { player: 'white', from: 'e2', to: 'e4' };
      gameData = service.play(gameData as any, whiteMove as any) as unknown as ChessData;
      expect(gameData.currentPlayer).toBe('black');

      const blackMove: Move = { player: 'black', from: 'e7', to: 'e5' };
      gameData = service.play(gameData as any, blackMove as any) as unknown as ChessData;
      expect(gameData.currentPlayer).toBe('white');
    });
  });

  describe('Capture Mechanics', () => {
    it('should allow capturing opponent pieces', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][4] = { type: 'pawn', player: 'white' };
      data.board[3][5] = { type: 'pawn', player: 'black' };

      const move: Move = { player: 'white', from: 'e4', to: 'f5' };
      expect(service.canPlay(data, move as any)).toBe(true);
    });

    it('should not allow capturing own pieces', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'white', from: 'e2', to: 'e1' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should replace captured piece with capturing piece', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.board[4][4] = { type: 'pawn', player: 'white' };
      data.board[3][5] = { type: 'pawn', player: 'black' };

      const move: Move = { player: 'white', from: 'e4', to: 'f5' };
      const newData = service.play(data as any, move as any) as unknown as ChessData;

      expect(newData.board[3][5]).toEqual(
        expect.objectContaining({ type: 'pawn', player: 'white' }),
      );
      expect(newData.board[4][4]).toBeNull();
    });
  });

  describe('Game State Tracking', () => {
    it('should track last move', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'white', from: 'e2', to: 'e4' };
      gameData = service.play(gameData as any, move as any) as unknown as ChessData;

      expect(gameData.lastMove).toEqual(move);
    });

    it('should track move history', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;

      const move1: Move = { player: 'white', from: 'e2', to: 'e4' };
      gameData = service.play(gameData as any, move1 as any) as unknown as ChessData;

      const move2: Move = { player: 'black', from: 'e7', to: 'e5' };
      gameData = service.play(gameData as any, move2 as any) as unknown as ChessData;

      expect(gameData.moveHistory).toHaveLength(2);
      expect(gameData.moveHistory![0]).toEqual(move1);
      expect(gameData.moveHistory![1]).toEqual(move2);
    });

    it('should track half-move clock', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;
      expect(gameData.halfMoveClock).toBe(0);

      // Non-pawn, non-capture move
      gameData.board[4][1] = { type: 'knight', player: 'white' };
      const move: Move = { player: 'white', from: 'b4', to: 'c6' };
      gameData = service.play(gameData as any, move as any) as unknown as ChessData;

      expect(gameData.halfMoveClock).toBe(1);
    });

    it('should reset half-move clock on pawn move', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;
      gameData.halfMoveClock = 5;

      const move: Move = { player: 'white', from: 'e2', to: 'e4' };
      gameData = service.play(gameData as any, move as any) as unknown as ChessData;

      expect(gameData.halfMoveClock).toBe(0);
    });

    it('should reset half-move clock on capture', () => {
      let gameData = service.initialGameData(0)[0] as unknown as ChessData;
      gameData.halfMoveClock = 5;
      gameData.board[4][4] = { type: 'knight', player: 'white' };
      gameData.board[3][5] = { type: 'pawn', player: 'black' };

      const move: Move = { player: 'white', from: 'e4', to: 'f5' };
      gameData = service.play(gameData as any, move as any) as unknown as ChessData;

      expect(gameData.halfMoveClock).toBe(0);
    });
  });

  describe('Game Over Conditions', () => {
    it('should detect stalemate', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      // Setup stalemate position: white king on a8, black king on c7, black queen on b6
      // Clear board
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          data.board[row][col] = null;
        }
      }

      data.board[0][0] = { type: 'king', player: 'white', hasMoved: true };
      data.board[1][2] = { type: 'king', player: 'black', hasMoved: true };
      data.currentPlayer = 'black';

      // Black queen move creates stalemate
      const move: Move = { player: 'black', from: 'c7', to: 'b6' };
      data.board[1][2] = null;
      data.board[2][1] = { type: 'queen', player: 'black' };

      const newData = service.play(data as any, move as any) as unknown as ChessData;
      expect(newData.winner).toBe('draw');
    });

    it('should detect 50-move rule draw', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      data.halfMoveClock = 99; // One move before draw

      // Non-pawn, non-capture move
      data.board[4][1] = { type: 'knight', player: 'white' };
      const move: Move = { player: 'white', from: 'b4', to: 'c6' };
      const newData = service.play(data as any, move as any) as unknown as ChessData;

      expect(newData.winner).toBe('draw');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid algebraic notation', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'white', from: 'z9', to: 'a1' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should handle moves from empty squares', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'white', from: 'e4', to: 'e5' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });

    it('should handle moves of opponent pieces', () => {
      const data = service.initialGameData(0)[0] as unknown as ChessData;
      const move: Move = { player: 'white', from: 'e7', to: 'e5' };
      expect(service.canPlay(data, move as any)).toBe(false);
    });
  });
});
