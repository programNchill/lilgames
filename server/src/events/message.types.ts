/**
 * Message types for WebSocket communication between client and server
 */

// Client → Server messages
export interface JoinMessage {
  gameName: string;
  gameId: number;
  playerId: number;
}

export interface MoveMessage {
  move: Record<string, unknown>;
}

export interface VerifyGameDataMessage {
  verifyGameData: Record<string, unknown>;
}

export type ClientMessage = MoveMessage | VerifyGameDataMessage;

// Server → Client messages
export interface InitialGameDataMessage {
  initialGameData: Record<string, unknown>;
}

export interface GameDataMessage {
  gameData: Record<string, unknown>;
}

export interface ErrorMessage {
  message: 'invalidGameData' | 'badMove' | 'verifyGameData';
}

export interface DisconnectMessage {
  type: 'disconnect';
}

export type ServerMessage =
  | InitialGameDataMessage
  | GameDataMessage
  | ErrorMessage
  | DisconnectMessage
  | string;
