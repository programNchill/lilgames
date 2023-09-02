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
} from 'rxjs';
import { Socket, Server } from 'socket.io';
import { WsJwtGuard } from 'src/auth/ws-jwt/ws-jwt.guard';
import { SocketAuthMiddleware } from 'src/auth/ws-jwt/ws.mw';
import { GamesService } from 'src/games/games.service';

type Room = string;

@WebSocketGateway({ namespace: 'events' })
// @UseGuards(WsJwtGuard)
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;
  rooms = new Map<string, [number, Observable<Record<string, unknown>>]>();

  a: unknown;
  b: unknown;

  constructor(private gamesService: GamesService) {}

  afterInit(client: Socket) {
    client.use(SocketAuthMiddleware() as any);
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
        tap((e) => Logger.log(`VERIFY ${JSON.stringify(e)}`)),
        bufferCount(gameService.nbPlayer),
        map(([a, b]) => {
          // validate states here
          if (!gameService.gameDataAgree([a.verifyGameData, b.verifyGameData])) {
            roomEmit({ message: 'invalidGameData' });
            return 'terminate';
          }
          return a.verifyGameData;
        }),
        takeWhile((e) => e !== 'terminate'),
      );

      let moves = updatedRoom.pipe(
        filter((m) => 'move' in m),
        tap((m) => {
          roomEmit({ message: 'verifyGameData' });
          Logger.log(`MOVE ${JSON.stringify(m)}`);
        }),
        map((m) => m.move),
      );

      let movesAndStates = combineLatest([moves, states])
        .pipe(
          map(([move, state]) => {
            Logger.log(`COHERENT STATE ${JSON.stringify(state)}`);
            return { move, state };
          }),
          map((moveAndState) => {
            // validate states here
            const { move, state } = moveAndState;
            if (!gameService.canPlay(state, move)) {
              roomEmit({ message: 'badMove' });
              throw new Error(`oop`);
            }
            return moveAndState;
          }),
          retry(),
          map(({ move, state }) => gameService.play(state, move)),

          map((gameData) => {
            if (gameService.someoneWon(gameData)) {
              return 'done';
            }
            return gameData;
          }),
          takeWhile((e) => e !== 'done'),
          tap(gameData => {
            roomEmit({ gameData });
          }),
        )
        .subscribe();
      // LOL WTF AM I DOING
    }
  }
}
