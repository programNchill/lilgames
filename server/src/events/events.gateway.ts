import { Logger, UseGuards } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WsJwtGuard } from 'src/auth/ws-jwt/ws-jwt.guard';
import { SocketAuthMiddleware } from 'src/auth/ws-jwt/ws.mw';

type Room = string;

@WebSocketGateway({ namespace: 'events' })
// @UseGuards(WsJwtGuard)
export class EventsGateway implements OnGatewayInit {
  rooms = new Map<string, Room>();
  afterInit(client: Socket) {
    client.use(SocketAuthMiddleware() as any);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, data: string): string {
    return 'Hello world!';
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, data: string) {
    const {gameName, gameId, playerId} = JSON.parse(data);
    // TODO: Join Room, wait for players, start game!

    // const roomId = g
    // client.join(`${gameName}-${gameId}`);
    // client.rooms
  }

}
