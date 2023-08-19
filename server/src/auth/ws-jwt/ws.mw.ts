import { Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';
import { Logger } from '@nestjs/common';

type SocketIoMiddleWare = {
    (client: Socket, next: (err?: Error) => void): void;
}

export const SocketAuthMiddleware = (): SocketIoMiddleWare => (client, next) => {
    try {
        Logger.log("hello");
        WsJwtGuard.validateToken(client);
        next();
    } catch (error) {
        next(error as Error);
    }
}