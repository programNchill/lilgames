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
  Subject,
} from 'rxjs';
import { Socket, Server } from 'socket.io';
import { WsJwtGuard } from 'src/auth/ws-jwt/ws-jwt.guard';
import { SocketAuthMiddleware } from 'src/auth/ws-jwt/ws.mw';
import { GamesService } from 'src/games/games.service';

type InputStream = Observable<Record<string, unknown>>;
type OutputSteam = Subject<unknown>;

@WebSocketGateway({ namespace: '/' })
// @UseGuards(WsJwtGuard)
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;
  rooms = new Map<string, [number, InputStream, OutputSteam]>();
  constructor(private gamesService: GamesService) {}

  afterInit(client: Socket) {
    // client.use(SocketAuthMiddleware() as any);
  }

  gameDataAgree(gameDataUnknown: unknown[]): boolean {
    const same = gameDataUnknown
      .map((d) => JSON.stringify(d))
      .reduce((previous, current) =>
        // no no no
        previous === current ? previous : '',
      );
    return same !== '';
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
    let [nbPlayer, inputStream, outputStream] = maybeRoom ? maybeRoom : [0, EMPTY, new Subject() as OutputSteam];
    const gameIsAlreadyFull = this.gamesService.gameIsFull(gameName, nbPlayer);
    if (gameIsAlreadyFull) {
      client.send('Game already full');
      return;
    }

    const outputStreamSubscription = outputStream.subscribe(makeClientSender(client, roomId));
    const roomEmit = (data: unknown) => outputStream.next(data);
    const cleanup = () => {
      Logger.log(`cleanup player ${playerId}`);
      let [nbPlayerr, ...rest] = this.rooms.get(roomId)!;
      outputStreamSubscription.unsubscribe();
      nbPlayerr--;
      this.rooms.set(roomId, [nbPlayerr, ...rest]);
      if (nbPlayerr === 0) {
        Logger.log(`total cleanup. remove room ${roomId}`);
        roomEmit('disconnect');
        this.rooms.delete(roomId);
      }
    };

    const updatedInputStream = merge(inputStream, makePlayerInputStream(client, roomId, cleanup));
    this.rooms.set(roomId, [++nbPlayer, updatedInputStream, outputStream]);

    if (this.gamesService.gameIsFull(gameName, nbPlayer)) {
      let gameService = this.gamesService.gameServices.get(gameName)!;

      // start
      roomEmit({ initialGameData: gameService.initialGameData(playerId) });

      let states = updatedInputStream.pipe(
        filter((m) => 'verifyGameData' in m),
        tap((e) => Logger.log(`RECEIVED VERIFY ${JSON.stringify(e)}`)),
        bufferCount(gameService.nbPlayer),
        map((verifyDatas) => {
          // validate states here
          if (!this.gameDataAgree(verifyDatas.map(a => a.verifyGameData))) {
            roomEmit({ message: 'invalidGameData' });
            return 'terminate';
          }
          return verifyDatas[0].verifyGameData;
        }),
        takeWhile((e) => e !== 'terminate'),
        map((e) => e as Record<string, unknown>),
      );

      let moves = updatedInputStream.pipe(
        filter((m) => 'move' in m),
        tap((m) => {
          roomEmit({ message: 'verifyGameData' });
          Logger.log(`RECEIVED MOVE ${JSON.stringify(m)}`);
        }),
        map((m) => m.move as Record<string, unknown>),
      );

      zip(moves, states, (a, b) => [a, b])
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
          }),
          takeWhile((e) => e?.winner === undefined),
        )
        .subscribe();
      // LOL WTF AM I DOING
    }
  }
}

const makeClientSender = (client: Socket, roomId: string) => (data: unknown) => {
  if (client.disconnected) {
    return;
  }

  if (data === 'disconnect') {
    client.removeAllListeners();
    client.disconnect();
    return;
  }
  client.emit(roomId, data);
};

const makePlayerInputStream = (client: Socket, roomId: string, cleanup: () => void) =>
  new Observable<Record<string, unknown>>((subscriber) => {
    const dataForwarder = (data: Record<string, unknown>) => {
      subscriber.next(data);
    };
    client.on(roomId, dataForwarder);
    client.on('disconnecting', cleanup);
  });
