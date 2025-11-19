import { Test, TestingModule } from '@nestjs/testing';
import { TictactoeService } from './tictactoe.service';

describe('TictactoeService', () => {
  let service: TictactoeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TictactoeService],
    }).compile();

    service = module.get<TictactoeService>(TictactoeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Game Properties', () => {
    it('should have correct game name', () => {
      expect(service.name).toBe('tictactoe');
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
    });

    it('should start with empty board', () => {
      const data = service.initialGameData(0);
      expect(data[0].board).toEqual({});
      expect(data[1].board).toEqual({});
    });

    it('should assign player types', () => {
      const data = service.initialGameData(0);
      const playerTypes = [data[0].playerType, data[1].playerType];
      expect(playerTypes).toContain('nought');
      expect(playerTypes).toContain('cross');
    });

    it('should have same current player for both data objects', () => {
      const data = service.initialGameData(0);
      expect(data[0].currentPlayer).toBe(data[1].currentPlayer);
    });

    it('should assign ownPlayer to first data object', () => {
      const data = service.initialGameData(5);
      expect(data[0].ownPlayer).toBe(5);
    });
  });

  describe('Game Data Agreement', () => {
    it('should return true when all game data is identical', () => {
      const gameData = { board: {}, currentPlayer: 'nought' };
      expect(service.gameDataAgree([gameData, gameData])).toBe(true);
    });

    it('should return false when game data differs', () => {
      const gameData1 = { board: {}, currentPlayer: 'nought' };
      const gameData2 = { board: {}, currentPlayer: 'cross' };
      expect(service.gameDataAgree([gameData1, gameData2])).toBe(false);
    });

    it('should return true for identical board states', () => {
      const gameData = { board: { 0: 'nought', 4: 'cross' }, currentPlayer: 'nought' };
      expect(service.gameDataAgree([gameData, gameData])).toBe(true);
    });
  });

  describe('Move Validation', () => {
    it('should allow move on empty position', () => {
      const gameData = { board: {}, currentPlayer: 'nought' };
      const move = { player: 'nought', position: 4 };
      expect(service.canPlay(gameData, move)).toBe(true);
    });

    it('should not allow move on occupied position', () => {
      const gameData = { board: { 4: 'nought' }, currentPlayer: 'cross' };
      const move = { player: 'cross', position: 4 };
      expect(service.canPlay(gameData, move)).toBe(false);
    });

    it('should allow move on any empty position (0-8)', () => {
      const gameData = { board: {}, currentPlayer: 'nought' };

      for (let i = 0; i < 9; i++) {
        const move = { player: 'nought', position: i };
        expect(service.canPlay(gameData, move)).toBe(true);
      }
    });

    it('should not allow move on any occupied position', () => {
      const gameData = {
        board: { 0: 'nought', 1: 'cross', 2: 'nought', 3: 'cross', 4: 'nought' },
        currentPlayer: 'cross'
      };

      for (let i = 0; i < 5; i++) {
        const move = { player: 'cross', position: i };
        expect(service.canPlay(gameData, move)).toBe(false);
      }
    });
  });

  describe('Making Moves', () => {
    it('should place player mark on board', () => {
      const gameData = { board: {}, currentPlayer: 'nought' };
      const move = { player: 'nought', position: 4 };
      const result = service.play(gameData, move) as any;

      expect(result.board[4]).toBe('nought');
    });

    it('should preserve existing moves', () => {
      const gameData = { board: { 0: 'nought', 8: 'cross' }, currentPlayer: 'nought' };
      const move = { player: 'nought', position: 4 };
      const result = service.play(gameData, move) as any;

      expect(result.board[0]).toBe('nought');
      expect(result.board[8]).toBe('cross');
      expect(result.board[4]).toBe('nought');
    });

    it('should alternate current player after move', () => {
      const gameData = { board: {}, currentPlayer: 'nought' };
      const move = { player: 'nought', position: 4 };
      const result = service.play(gameData, move);

      expect(result.currentPlayer).toBe('cross');
    });

    it('should alternate from cross to nought', () => {
      const gameData = { board: {}, currentPlayer: 'cross' };
      const move = { player: 'cross', position: 4 };
      const result = service.play(gameData, move);

      expect(result.currentPlayer).toBe('nought');
    });
  });

  describe('Win Detection - Rows', () => {
    it('should detect win in first row', () => {
      const board = { 0: 'nought' as const, 1: 'nought' as const, 2: 'nought' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBe('nought');
    });

    it('should detect win in second row', () => {
      const board = { 3: 'cross' as const, 4: 'cross' as const, 5: 'cross' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBe('cross');
    });

    it('should detect win in third row', () => {
      const board = { 6: 'nought' as const, 7: 'nought' as const, 8: 'nought' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBe('nought');
    });
  });

  describe('Win Detection - Columns', () => {
    it('should detect win in first column', () => {
      const board = { 0: 'cross' as const, 3: 'cross' as const, 6: 'cross' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBe('cross');
    });

    it('should detect win in second column', () => {
      const board = { 1: 'nought' as const, 4: 'nought' as const, 7: 'nought' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBe('nought');
    });

    it('should detect win in third column', () => {
      const board = { 2: 'cross' as const, 5: 'cross' as const, 8: 'cross' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBe('cross');
    });
  });

  describe('Win Detection - Diagonals', () => {
    it('should detect win in main diagonal (top-left to bottom-right)', () => {
      const board = { 0: 'nought' as const, 4: 'nought' as const, 8: 'nought' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBe('nought');
    });

    it('should detect win in anti-diagonal (top-right to bottom-left)', () => {
      const board = { 2: 'cross' as const, 4: 'cross' as const, 6: 'cross' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBe('cross');
    });
  });

  describe('Draw Detection', () => {
    it('should detect draw when board is full with no winner', () => {
      const board = {
        0: 'nought' as const, 1: 'cross' as const, 2: 'nought' as const,
        3: 'cross' as const, 4: 'cross' as const, 5: 'nought' as const,
        6: 'nought' as const, 7: 'nought' as const, 8: 'cross' as const
      };
      const result = service.someoneWon(board as any);
      expect(result).toBe('draw');
    });

    it('should return undefined when game is still in progress', () => {
      const board = { 0: 'nought' as const, 4: 'cross' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty board', () => {
      const board = {};
      const result = service.someoneWon(board as any);
      expect(result).toBeUndefined();
    });
  });

  describe('Game Flow', () => {
    it('should complete a full game with winner', () => {
      let gameData = service.initialGameData(0)[0];

      // Nought plays center
      gameData = service.play(gameData, { player: 'nought', position: 4 });
      expect(gameData.winner).toBeUndefined();

      // Cross plays corner
      gameData = service.play(gameData, { player: 'cross', position: 0 });
      expect(gameData.winner).toBeUndefined();

      // Nought plays top-right
      gameData = service.play(gameData, { player: 'nought', position: 2 });
      expect(gameData.winner).toBeUndefined();

      // Cross plays bottom-right
      gameData = service.play(gameData, { player: 'cross', position: 8 });
      expect(gameData.winner).toBeUndefined();

      // Nought plays top-left (completes diagonal)
      gameData = service.play(gameData, { player: 'nought', position: 6 });
      expect(gameData.winner).toBe('nought');
    });

    it('should complete a full game with draw', () => {
      let gameData = service.initialGameData(0)[0];

      const moves = [
        { player: 'nought', position: 0 },
        { player: 'cross', position: 1 },
        { player: 'nought', position: 2 },
        { player: 'cross', position: 4 },
        { player: 'nought', position: 3 },
        { player: 'cross', position: 5 },
        { player: 'nought', position: 7 },
        { player: 'cross', position: 6 },
        { player: 'nought', position: 8 },
      ];

      moves.forEach((move, index) => {
        gameData = service.play(gameData, move);
        if (index < 8) {
          expect(gameData.winner).toBeUndefined();
        }
      });

      expect(gameData.winner).toBe('draw');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple wins (return first found)', () => {
      // Both diagonals are complete (shouldn't happen in real game)
      const board = {
        0: 'nought' as const, 2: 'cross' as const,
        4: 'nought' as const,
        6: 'cross' as const, 8: 'nought' as const
      };
      const result = service.someoneWon(board as any);
      // Should return one of the winners
      expect(['nought', 'cross']).toContain(result);
    });

    it('should not detect win with incomplete line', () => {
      const board = { 0: 'nought' as const, 1: 'nought' as const, 3: 'cross' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBeUndefined();
    });

    it('should not detect win with mixed line', () => {
      const board = { 0: 'nought' as const, 1: 'cross' as const, 2: 'nought' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBeUndefined();
    });

    it('should handle single move on board', () => {
      const board = { 4: 'nought' as const };
      const result = service.someoneWon(board as any);
      expect(result).toBeUndefined();
    });

    it('should maintain game state immutability', () => {
      const gameData = { board: { 0: 'nought' }, currentPlayer: 'cross' };
      const move = { player: 'cross', position: 4 };
      const result = service.play(gameData, move);

      // Original should be unchanged
      expect(gameData.board).toEqual({ 0: 'nought' });
      expect(gameData.currentPlayer).toBe('cross');

      // New state should have the move
      expect(result.board).toEqual({ 0: 'nought', 4: 'cross' });
    });
  });

  describe('Integration with play method', () => {
    it('should set winner when row is completed', () => {
      let gameData = { board: { 0: 'nought', 1: 'nought' }, currentPlayer: 'nought' };
      const move = { player: 'nought', position: 2 };
      const result = service.play(gameData, move);

      expect(result.winner).toBe('nought');
    });

    it('should set draw when last move fills board without winner', () => {
      let gameData = {
        board: {
          0: 'nought', 1: 'cross', 2: 'nought',
          3: 'cross', 4: 'cross', 5: 'nought',
          6: 'nought', 7: 'nought'
        },
        currentPlayer: 'cross'
      };
      const move = { player: 'cross', position: 8 };
      const result = service.play(gameData, move);

      expect(result.winner).toBe('draw');
    });

    it('should not set winner for incomplete game', () => {
      let gameData = { board: {}, currentPlayer: 'nought' };
      const move = { player: 'nought', position: 4 };
      const result = service.play(gameData, move);

      expect(result.winner).toBeUndefined();
    });
  });

  describe('All Positions', () => {
    it('should handle moves on all board positions', () => {
      for (let pos = 0; pos < 9; pos++) {
        const gameData = { board: {}, currentPlayer: 'nought' };
        const move = { player: 'nought', position: pos };
        const result = service.play(gameData, move) as any;

        expect(result.board[pos]).toBe('nought');
      }
    });
  });
});
