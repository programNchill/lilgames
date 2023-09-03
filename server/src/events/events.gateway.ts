import { Logger, UseGuards } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import {
  EMPTY,
  Observable,
  bufferCount,
  filter,
  merge,
  tap,
  pipe,
  map,
  retry,
  first,
  firstValueFrom,
  throwError,
  combineLatest,
  of,
  takeWhile,
  sample,
  distinct,
  zip,
} from 'rxjs';
import { Socket, Server } from 'socket.io';
import { WsJwtGuard } from 'src/auth/ws-jwt/ws-jwt.guard';
import { SocketAuthMiddleware } from 'src/auth/ws-jwt/ws.mw';
import { GamesService } from 'src/games/games.service';

type Room = string;

@WebSocketGateway({ namespace: '/' })
// @UseGuards(WsJwtGuard)
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;
  rooms = new Map<string, [number, Observable<Record<string, unknown>>]>();
  constructor(private gamesService: GamesService) {}

  afterInit(client: Socket) {
    // client.use(SocketAuthMiddleware() as any);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, data: string): string {
    return 'Hello world!';
  }

  @SubscribeMessage('join')
  async handleJoin(
    client: Socket,
    { gameName, gameId, playerId }: { gameName: string; gameId: number; playerId: number },
  ) {
    const roomId = `${gameName}-${gameId}`;
    const maybeRoom = this.rooms.get(roomId);
    let [nbPlayer, room] = maybeRoom ? maybeRoom : [0, EMPTY];
    const gameIsAlreadyFull = this.gamesService.gameIsFull(gameName, nbPlayer);
    if (gameIsAlreadyFull) {
      client.send('Game already full');
      return;
    }

    const newPlayer = new Observable<Record<string, unknown>>((subscriber) => {
      const listener = (data: Record<string, unknown>) => {
        subscriber.next(data);
      };

      client.on(roomId, listener);
      return () => client.off(roomId, listener);
    });
    const updatedRoom = merge(room, newPlayer);
    this.rooms.set(roomId, [++nbPlayer, updatedRoom]);
    if (this.gamesService.gameIsFull(gameName, nbPlayer)) {
      // TODO: create super fancy code that's too fancy for nothing
      let gameService = this.gamesService.gameServices.get(gameName)!;

      const roomEmit = (data: unknown) => this.server.emit(roomId, data);
      const cleanup = () => {
        this.rooms.delete(roomId);
      };
      // start
      roomEmit({ initialGameData: gameService.initialGameData(playerId) });
      let states = updatedRoom.pipe(
        filter((m) => 'verifyGameData' in m),
        tap((e) => Logger.log(`RECEIVED VERIFY ${JSON.stringify(e)}`)),
        bufferCount(gameService.nbPlayer),
        map(([a, b]) => {
          // validate states here
          if (!gameService.gameDataAgree([a.verifyGameData, b.verifyGameData])) {
            roomEmit({ message: 'invalidGameData' });
            cleanup();
            return 'terminate';
          }
          return a.verifyGameData;
        }),
        takeWhile((e) => e !== 'terminate'),
        map(e => e as Record<string, unknown>),
      );
      
      let moves = updatedRoom.pipe(
        filter((m) => 'move' in m),
        tap((m) => {
          roomEmit({ message: 'verifyGameData' });
          Logger.log(`RECEIVED MOVE ${JSON.stringify(m)}`);
        }),
        map((m) => m.move as Record<string, unknown>),
      );

      zip(moves, states, (a,b) => [a,b])
        .pipe(
          map(([move, state]) => {
            Logger.log(`COHERENT STATE ${JSON.stringify(state)}`);
            return { move, state };
          }),
          map((moveAndState) => {
            // validate play here
            const { move, state } = moveAndState;
            if (!gameService.canPlay(state, move)) {
              roomEmit({ message: 'badMove' });
              throw new Error(`oop`);
            }
            return moveAndState;
          }),
          retry(),
          map(({ move, state }) => gameService.play(state as Record<string, unknown>, move)),
          tap((gameData) => {
            Logger.log(`NEW STATE ${JSON.stringify(gameData)}`);
            roomEmit({ gameData });
            if (gameData?.winner !== undefined) {
              cleanup();
            }
          }),
          takeWhile((e) => e?.winner === undefined),
        )
        .subscribe();
      // LOL WTF AM I DOING
    }
  }
}
