import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { GameServiceInterface } from 'src/games/game-service.interface';
import { ClientMessage, MoveMessage, ServerMessage, VerifyGameDataMessage } from './message.types';

interface Player {
  playerId: number;
  socket: Socket;
}

interface PendingMove {
  move: Record<string, unknown>;
  playerId: number;
}

/**
 * Manages a single game room with multiple players
 * Handles player lifecycle, state synchronization, and move processing
 */
export class GameRoom {
  private players: Player[] = [];
  private pendingVerifications = new Map<number, Record<string, unknown>>();
  private pendingMove: PendingMove | null = null;
  private isGameStarted = false;
  private isGameOver = false;
  private currentGameState: Record<string, unknown> | null = null;

  constructor(
    public readonly roomId: string,
    private readonly gameService: GameServiceInterface,
    private readonly maxPlayers: number,
  ) {}

  /**
   * Add a player to the room
   * Returns true if player was added, false if room is full
   */
  addPlayer(playerId: number, socket: Socket): boolean {
    if (this.players.length >= this.maxPlayers) {
      return false;
    }

    const player: Player = { playerId, socket };
    this.players.push(player);

    // Set up message handlers for this player
    this.setupPlayerHandlers(player);

    Logger.log(`Player ${playerId} joined room ${this.roomId}. Players: ${this.players.length}/${this.maxPlayers}`);

    // Start game if room is full
    if (this.isFull()) {
      this.startGame();
    }

    return true;
  }

  /**
   * Remove a player from the room
   * Returns true if room should be destroyed
   */
  removePlayer(playerId: number): boolean {
    const playerIndex = this.players.findIndex((p) => p.playerId === playerId);

    if (playerIndex === -1) {
      return false;
    }

    const player = this.players[playerIndex];
    this.cleanupPlayerHandlers(player);
    this.players.splice(playerIndex, 1);

    Logger.log(`Player ${playerId} left room ${this.roomId}. Players remaining: ${this.players.length}`);

    // If any player leaves, notify others and mark room for cleanup
    if (this.players.length > 0) {
      this.broadcast({ type: 'disconnect' });
    }

    return this.players.length === 0;
  }

  /**
   * Check if room is full
   */
  isFull(): boolean {
    return this.players.length >= this.maxPlayers;
  }

  /**
   * Get number of players in room
   */
  getPlayerCount(): number {
    return this.players.length;
  }

  /**
   * Start the game when room is full
   */
  private startGame(): void {
    if (this.isGameStarted) {
      return;
    }

    this.isGameStarted = true;
    Logger.log(`Starting game in room ${this.roomId}`);

    // Send initial game data to each player
    const initialDataSets = this.gameService.initialGameData(this.players[0].playerId);

    this.players.forEach((player, index) => {
      if (index < initialDataSets.length) {
        const initialData = initialDataSets[index];
        this.currentGameState = initialData;
        this.sendToPlayer(player, { initialGameData: initialData });
      }
    });
  }

  /**
   * Set up message handlers for a player
   */
  private setupPlayerHandlers(player: Player): void {
    const messageHandler = (data: ClientMessage) => this.handlePlayerMessage(player, data);
    const disconnectHandler = () => this.handlePlayerDisconnect(player);

    player.socket.on(this.roomId, messageHandler);
    player.socket.on('disconnecting', disconnectHandler);

    // Store handlers for cleanup
    (player as any)._messageHandler = messageHandler;
    (player as any)._disconnectHandler = disconnectHandler;
  }

  /**
   * Clean up message handlers for a player
   */
  private cleanupPlayerHandlers(player: Player): void {
    const messageHandler = (player as any)._messageHandler;
    const disconnectHandler = (player as any)._disconnectHandler;

    if (messageHandler) {
      player.socket.off(this.roomId, messageHandler);
    }
    if (disconnectHandler) {
      player.socket.off('disconnecting', disconnectHandler);
    }
  }

  /**
   * Handle incoming message from a player
   */
  private handlePlayerMessage(player: Player, data: ClientMessage): void {
    if (this.isGameOver) {
      return;
    }

    if ('verifyGameData' in data) {
      this.handleVerifyGameData(player, data);
    } else if ('move' in data) {
      this.handleMove(player, data);
    }
  }

  /**
   * Handle player disconnect
   */
  private handlePlayerDisconnect(player: Player): void {
    Logger.log(`Player ${player.playerId} disconnecting from room ${this.roomId}`);
    this.removePlayer(player.playerId);
  }

  /**
   * Handle state verification from a player
   */
  private handleVerifyGameData(player: Player, data: VerifyGameDataMessage): void {
    Logger.log(`Received state verification from player ${player.playerId}: ${JSON.stringify(data.verifyGameData)}`);

    this.pendingVerifications.set(player.playerId, data.verifyGameData);

    // Check if all players have verified
    if (this.pendingVerifications.size === this.maxPlayers) {
      this.onAllStatesVerified();
    }
  }

  /**
   * Called when all players have submitted their state verification
   * Validates states agree, then processes pending move if any
   */
  private onAllStatesVerified(): void {
    const states = Array.from(this.pendingVerifications.values());
    const statesAgree = this.gameService.gameDataAgree(states);

    if (!statesAgree) {
      Logger.error(`Game states do not agree in room ${this.roomId}`);
      this.broadcast({ message: 'invalidGameData' });
      this.endGame();
      return;
    }

    // States agree - update current verified state
    this.currentGameState = states[0];
    Logger.log(`Game states validated in room ${this.roomId}: ${JSON.stringify(this.currentGameState)}`);

    // Clear verifications
    this.pendingVerifications.clear();

    // If there's a pending move, process it now
    if (this.pendingMove) {
      this.processMove(this.pendingMove);
      this.pendingMove = null;
    }
  }

  /**
   * Handle move from a player
   * This triggers a state verification cycle, then processes the move
   */
  private handleMove(player: Player, data: MoveMessage): void {
    Logger.log(`Received move from player ${player.playerId}: ${JSON.stringify(data.move)}`);

    // Store the pending move
    this.pendingMove = {
      move: data.move,
      playerId: player.playerId,
    };

    // Request state verification from all players
    // Once all players respond, onAllStatesVerified() will process the move
    this.broadcast({ message: 'verifyGameData' });
  }

  /**
   * Process a move using the verified game state
   */
  private processMove(pendingMove: PendingMove): void {
    if (!this.currentGameState) {
      Logger.error(`No verified game state available in room ${this.roomId}`);
      return;
    }

    const { move, playerId } = pendingMove;

    // Validate the move is legal
    const isValidMove = this.gameService.canPlay(this.currentGameState, move);

    if (!isValidMove) {
      Logger.warn(`Invalid move from player ${playerId} in room ${this.roomId}: ${JSON.stringify(move)}`);
      this.broadcast({ message: 'badMove' });
      return;
    }

    // Execute the move and get new game state
    const newGameState = this.gameService.play(this.currentGameState, move);
    this.currentGameState = newGameState;

    Logger.log(`Move processed in room ${this.roomId}. New state: ${JSON.stringify(newGameState)}`);

    // Broadcast new state to all players
    this.broadcast({ gameData: newGameState });

    // Check if game is over
    if (newGameState.winner !== undefined) {
      Logger.log(`Game over in room ${this.roomId}. Winner: ${newGameState.winner}`);
      this.endGame();
    }
  }

  /**
   * Broadcast a message to all players in the room
   */
  private broadcast(message: ServerMessage): void {
    this.players.forEach((player) => {
      this.sendToPlayer(player, message);
    });
  }

  /**
   * Send a message to a specific player
   */
  private sendToPlayer(player: Player, message: ServerMessage): void {
    if (player.socket.disconnected) {
      return;
    }

    if (typeof message === 'object' && 'type' in message && message.type === 'disconnect') {
      player.socket.removeAllListeners();
      player.socket.disconnect();
      return;
    }

    player.socket.emit(this.roomId, message);
  }

  /**
   * End the game and clean up
   */
  private endGame(): void {
    this.isGameOver = true;
    this.pendingVerifications.clear();
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    Logger.log(`Destroying room ${this.roomId}`);

    // Clean up all players
    [...this.players].forEach((player) => {
      this.cleanupPlayerHandlers(player);
    });

    this.players = [];
    this.pendingVerifications.clear();
  }
}
