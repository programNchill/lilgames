import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { GameServiceInterface } from 'src/games/game-service.interface';
import { ClientMessage, MoveMessage, ServerMessage, VerifyGameDataMessage } from './message.types';

/**
 * Explicit state machine for game room lifecycle
 */
enum GameRoomState {
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  GAME_STARTED = 'GAME_STARTED',
  WAITING_FOR_VERIFICATION = 'WAITING_FOR_VERIFICATION',
  PROCESSING_MOVE = 'PROCESSING_MOVE',
  GAME_OVER = 'GAME_OVER',
}

interface Player {
  playerId: number;
  socket: Socket;
  messageHandler: (data: ClientMessage) => void;
  disconnectHandler: () => void;
}

interface PendingMove {
  move: Record<string, unknown>;
  playerId: number;
}

/**
 * Manages a single game room with multiple players
 * Handles player lifecycle, state synchronization, and move processing
 * Uses explicit state machine for clear control flow
 */
export class GameRoom {
  private players: Player[] = [];
  private pendingVerifications = new Map<number, Record<string, unknown>>();
  private pendingMove: PendingMove | null = null;
  private currentState: GameRoomState = GameRoomState.WAITING_FOR_PLAYERS;
  private currentGameState: Record<string, unknown> | null = null;
  private verificationTimeoutHandle: NodeJS.Timeout | null = null;
  private readonly VERIFICATION_TIMEOUT_MS = 10000; // 10 seconds
  private onEmptyCallback?: () => void;

  constructor(
    public readonly roomId: string,
    private readonly gameService: GameServiceInterface,
    private readonly maxPlayers: number,
    onEmptyCallback?: () => void,
  ) {
    this.onEmptyCallback = onEmptyCallback;
  }

  /**
   * Add a player to the room
   * Returns true if player was added, false if room is full
   */
  addPlayer(playerId: number, socket: Socket): boolean {
    if (this.players.length >= this.maxPlayers) {
      return false;
    }

    // Create type-safe handlers
    const messageHandler = (data: ClientMessage) => this.handlePlayerMessage(playerId, data);
    const disconnectHandler = () => this.handlePlayerDisconnect(playerId);

    const player: Player = {
      playerId,
      socket,
      messageHandler,
      disconnectHandler,
    };

    this.players.push(player);

    // Set up message handlers for this player
    this.setupPlayerHandlers(player);

    Logger.log(`Player ${playerId} joined room ${this.roomId}. Players: ${this.players.length}/${this.maxPlayers} [State: ${this.currentState}]`);

    // Start game if room is full
    if (this.isFull()) {
      this.transitionTo(GameRoomState.GAME_STARTED);
      this.startGame();
    }

    return true;
  }

  /**
   * Remove a player from the room
   * Calls onEmptyCallback if room becomes empty
   */
  removePlayer(playerId: number): void {
    const playerIndex = this.players.findIndex((p) => p.playerId === playerId);

    if (playerIndex === -1) {
      Logger.warn(`Attempted to remove non-existent player ${playerId} from room ${this.roomId}`);
      return;
    }

    const player = this.players[playerIndex];
    this.cleanupPlayerHandlers(player);
    this.players.splice(playerIndex, 1);

    Logger.log(`Player ${playerId} left room ${this.roomId}. Players remaining: ${this.players.length} [State: ${this.currentState}]`);

    // If any player leaves, notify others and mark room for cleanup
    if (this.players.length > 0) {
      this.broadcast({ type: 'disconnect' });
    } else {
      // Room is empty - trigger callback for cleanup
      if (this.onEmptyCallback) {
        Logger.log(`Room ${this.roomId} is empty, triggering cleanup callback`);
        this.onEmptyCallback();
      }
    }
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
   * Explicit state transition with logging
   * Makes control flow clear and traceable
   */
  private transitionTo(newState: GameRoomState): void {
    const oldState = this.currentState;
    this.currentState = newState;
    Logger.log(`Room ${this.roomId} state transition: ${oldState} -> ${newState}`);
  }

  /**
   * Start the game when room is full
   */
  private startGame(): void {
    if (this.currentState !== GameRoomState.GAME_STARTED) {
      Logger.warn(`Attempted to start game in invalid state: ${this.currentState}`);
      return;
    }

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
   * Handlers are stored type-safely in the Player interface
   */
  private setupPlayerHandlers(player: Player): void {
    player.socket.on(this.roomId, player.messageHandler);
    player.socket.on('disconnecting', player.disconnectHandler);
    Logger.log(`Handlers registered for player ${player.playerId} in room ${this.roomId}`);
  }

  /**
   * Clean up message handlers for a player
   * Type-safe cleanup using handlers stored in Player interface
   */
  private cleanupPlayerHandlers(player: Player): void {
    player.socket.off(this.roomId, player.messageHandler);
    player.socket.off('disconnecting', player.disconnectHandler);
    Logger.log(`Handlers cleaned up for player ${player.playerId} in room ${this.roomId}`);
  }

  /**
   * Centralized message router based on current state
   * Makes control flow explicit and traceable
   */
  private handlePlayerMessage(playerId: number, data: ClientMessage): void {
    Logger.log(`Player ${playerId} sent message in state ${this.currentState}: ${JSON.stringify(data)}`);

    // State-based message routing
    switch (this.currentState) {
      case GameRoomState.WAITING_FOR_PLAYERS:
        Logger.warn(`Ignoring message from player ${playerId} - game not started yet`);
        break;

      case GameRoomState.GAME_STARTED:
        // Only accept moves when game is running
        if ('move' in data) {
          this.handleMove(playerId, data);
        } else {
          Logger.warn(`Unexpected message type in GAME_STARTED state: ${JSON.stringify(data)}`);
        }
        break;

      case GameRoomState.WAITING_FOR_VERIFICATION:
        // Only accept verification responses
        if ('verifyGameData' in data) {
          this.handleVerifyGameData(playerId, data);
        } else {
          Logger.warn(`Ignoring non-verification message in WAITING_FOR_VERIFICATION state`);
        }
        break;

      case GameRoomState.PROCESSING_MOVE:
        Logger.warn(`Ignoring message from player ${playerId} - move is being processed`);
        break;

      case GameRoomState.GAME_OVER:
        Logger.warn(`Ignoring message from player ${playerId} - game is over`);
        break;

      default:
        Logger.error(`Unknown state: ${this.currentState}`);
    }
  }

  /**
   * Handle player disconnect
   */
  private handlePlayerDisconnect(playerId: number): void {
    Logger.log(`Player ${playerId} disconnecting from room ${this.roomId} [State: ${this.currentState}]`);
    this.removePlayer(playerId);
  }

  /**
   * Handle state verification from a player
   */
  private handleVerifyGameData(playerId: number, data: VerifyGameDataMessage): void {
    if (this.currentState !== GameRoomState.WAITING_FOR_VERIFICATION) {
      Logger.warn(`Ignoring verification from player ${playerId} - not in verification state`);
      return;
    }

    Logger.log(`Received state verification from player ${playerId}: ${JSON.stringify(data.verifyGameData)}`);

    this.pendingVerifications.set(playerId, data.verifyGameData);

    // Check if all players have verified
    if (this.pendingVerifications.size === this.maxPlayers) {
      this.clearVerificationTimeout();
      this.transitionTo(GameRoomState.PROCESSING_MOVE);
      this.onAllStatesVerified();
    }
  }

  /**
   * Clear the verification timeout if it exists
   */
  private clearVerificationTimeout(): void {
    if (this.verificationTimeoutHandle) {
      clearTimeout(this.verificationTimeoutHandle);
      this.verificationTimeoutHandle = null;
      Logger.log(`Cleared verification timeout for room ${this.roomId}`);
    }
  }

  /**
   * Handle verification timeout - end game if players don't respond
   */
  private handleVerificationTimeout(): void {
    Logger.error(`Verification timeout in room ${this.roomId}. Received ${this.pendingVerifications.size}/${this.maxPlayers} responses`);

    const missingPlayers = this.players
      .filter(p => !this.pendingVerifications.has(p.playerId))
      .map(p => p.playerId);

    Logger.error(`Players who didn't respond: ${missingPlayers.join(', ')}`);

    this.broadcast({ message: 'verifyGameData' }); // Notify about timeout
    this.transitionTo(GameRoomState.GAME_OVER);
    this.endGame();
  }

  /**
   * Called when all players have submitted their state verification
   * Validates states agree, then processes pending move if any
   */
  private onAllStatesVerified(): void {
    if (this.currentState !== GameRoomState.PROCESSING_MOVE) {
      Logger.warn(`onAllStatesVerified called in invalid state: ${this.currentState}`);
      return;
    }

    const states = Array.from(this.pendingVerifications.values());
    const statesAgree = this.gameService.gameDataAgree(states);

    if (!statesAgree) {
      Logger.error(`Game states do not agree in room ${this.roomId}`);
      this.broadcast({ message: 'invalidGameData' });
      this.transitionTo(GameRoomState.GAME_OVER);
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
    } else {
      // No pending move, return to game started state
      this.transitionTo(GameRoomState.GAME_STARTED);
    }
  }

  /**
   * Handle move from a player
   * This triggers a state verification cycle, then processes the move
   */
  private handleMove(playerId: number, data: MoveMessage): void {
    if (this.currentState !== GameRoomState.GAME_STARTED) {
      Logger.warn(`Ignoring move from player ${playerId} - not in GAME_STARTED state`);
      return;
    }

    Logger.log(`Received move from player ${playerId}: ${JSON.stringify(data.move)}`);

    // Store the pending move
    this.pendingMove = {
      move: data.move,
      playerId: playerId,
    };

    // Transition to verification state
    this.transitionTo(GameRoomState.WAITING_FOR_VERIFICATION);

    // Start verification timeout
    this.verificationTimeoutHandle = setTimeout(
      () => this.handleVerificationTimeout(),
      this.VERIFICATION_TIMEOUT_MS
    );
    Logger.log(`Started verification timeout (${this.VERIFICATION_TIMEOUT_MS}ms) for room ${this.roomId}`);

    // Request state verification from all players
    // Once all players respond, onAllStatesVerified() will process the move
    this.broadcast({ message: 'verifyGameData' });
  }

  /**
   * Process a move using the verified game state
   */
  private processMove(pendingMove: PendingMove): void {
    if (this.currentState !== GameRoomState.PROCESSING_MOVE) {
      Logger.warn(`processMove called in invalid state: ${this.currentState}`);
      return;
    }

    if (!this.currentGameState) {
      Logger.error(`No verified game state available in room ${this.roomId}`);
      this.transitionTo(GameRoomState.GAME_OVER);
      this.endGame();
      return;
    }

    const { move, playerId } = pendingMove;

    // Validate the move is legal
    const isValidMove = this.gameService.canPlay(this.currentGameState, move);

    if (!isValidMove) {
      Logger.warn(`Invalid move from player ${playerId} in room ${this.roomId}: ${JSON.stringify(move)}`);
      this.broadcast({ message: 'badMove' });
      // Return to game started state after bad move
      this.transitionTo(GameRoomState.GAME_STARTED);
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
      this.transitionTo(GameRoomState.GAME_OVER);
      this.endGame();
    } else {
      // Game continues - return to game started state
      this.transitionTo(GameRoomState.GAME_STARTED);
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
    this.transitionTo(GameRoomState.GAME_OVER);
    this.clearVerificationTimeout();
    this.pendingVerifications.clear();
    this.pendingMove = null;
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    Logger.log(`Destroying room ${this.roomId} [State: ${this.currentState}]`);

    // Clear any pending timeouts
    this.clearVerificationTimeout();

    // Clean up all players
    [...this.players].forEach((player) => {
      this.cleanupPlayerHandlers(player);
    });

    this.players = [];
    this.pendingVerifications.clear();
    this.pendingMove = null;
  }
}
