import { Logger } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { GamesService } from 'src/games/games.service';
import { GameRoom } from './game-room';
import { JoinMessage } from './message.types';

/**
 * WebSocket Gateway for handling real-time game communication
 * Manages game rooms and player connections
 */
@WebSocketGateway({ namespace: '/' })
// @UseGuards(WsJwtGuard)
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, GameRoom>();

  constructor(private gamesService: GamesService) {}

  afterInit(client: Socket) {
    // client.use(SocketAuthMiddleware() as any);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, data: string): string {
    return 'Hello world!';
  }

  /**
   * Handle player joining a game room
   */
  @SubscribeMessage('join')
  async handleJoin(client: Socket, { gameName, gameId, playerId }: JoinMessage): Promise<void> {
    const roomId = `${gameName}-${gameId}`;

    Logger.log(`Player ${playerId} attempting to join room ${roomId}`);

    // Get or create game room
    let room = this.rooms.get(roomId);

    if (!room) {
      // Create new room
      const gameService = this.gamesService.gameServices.get(gameName);

      if (!gameService) {
        Logger.error(`Unknown game: ${gameName}`);
        client.emit('error', 'Unknown game type');
        return;
      }

      room = new GameRoom(roomId, gameService, gameService.nbPlayer);
      this.rooms.set(roomId, room);

      Logger.log(`Created new room ${roomId}`);
    }

    // Check if room is full
    if (room.isFull()) {
      Logger.warn(`Room ${roomId} is already full`);
      client.emit('error', 'Game already full');
      return;
    }

    // Add player to room
    const playerAdded = room.addPlayer(playerId, client);

    if (!playerAdded) {
      Logger.error(`Failed to add player ${playerId} to room ${roomId}`);
      client.emit('error', 'Failed to join game');
      return;
    }

    // Set up disconnect handler to clean up room
    const disconnectHandler = () => {
      const shouldDestroy = room!.removePlayer(playerId);

      if (shouldDestroy) {
        room!.destroy();
        this.rooms.delete(roomId);
        Logger.log(`Removed empty room ${roomId}`);
      }
    };

    client.on('disconnecting', disconnectHandler);

    Logger.log(`Player ${playerId} successfully joined room ${roomId}`);
  }
}
