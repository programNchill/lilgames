/**
 * Interface that all game services must implement
 * Ensures consistent API across different game types
 */
export interface GameServiceInterface {
  /**
   * Unique identifier for the game type
   */
  name: string;

  /**
   * Number of players required for this game
   */
  nbPlayer: number;

  /**
   * Check if all players' game states agree (anti-cheat)
   */
  gameDataAgree(gameData: unknown[]): boolean;

  /**
   * Generate initial game data for each player
   */
  initialGameData(playerId: number): Record<string, unknown>[];

  /**
   * Validate if a move is legal in the current game state
   */
  canPlay(gameData: unknown, move: unknown): boolean;

  /**
   * Execute a move and return the new game state
   */
  play(
    gameData: Record<string, unknown>,
    move: Record<string, unknown>,
  ): Record<string, unknown>;
}
