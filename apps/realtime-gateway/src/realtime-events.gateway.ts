import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '@app/auth/auth.service';

interface SubscribePayload {
  channels: string[];
}

interface ClientHandshakeAuth {
  token?: string;
  operatorId?: string;
}

interface SocketClientData {
  operatorId?: string;
}

const CHANNEL_TO_ROOM: Record<string, string> = {
  jobs: 'jobs',
  alerts: 'alerts',
  incidents: 'incidents',
  notifications: 'notifications',
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
  },
})
export class RealtimeEventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeEventsGateway.name);

  constructor(private readonly authService: AuthService) {}

  handleConnection(client: Socket): void {
    const auth = client.handshake.auth as ClientHandshakeAuth;
    const token =
      auth.token ??
      this.pickQueryValue(client.handshake.query.token) ??
      this.pickHeaderValue(client.handshake.headers['x-operator-token']);

    if (!this.authService.validateToken(token)) {
      client.disconnect(true);
      return;
    }

    const operatorIdRaw =
      auth.operatorId ??
      this.pickQueryValue(client.handshake.query.operatorId) ??
      this.pickHeaderValue(client.handshake.headers['x-operator-id']) ??
      'observer';

    const operatorId = operatorIdRaw.toLowerCase();
    (client.data as SocketClientData).operatorId = operatorId;
    void client.join('operators');

    this.logger.log(`Socket connected ${client.id} operator=${operatorId}`);
    client.emit('connection.ready', {
      operatorId,
      channels: Object.keys(CHANNEL_TO_ROOM),
      connectedAt: new Date().toISOString(),
    });
  }

  @SubscribeMessage('subscribe')
  subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): { subscribed: string[] } {
    const subscribed: string[] = [];

    for (const channel of payload.channels ?? []) {
      const room = CHANNEL_TO_ROOM[channel];
      if (!room) {
        continue;
      }

      void client.join(room);
      subscribed.push(channel);
    }

    return { subscribed };
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): { unsubscribed: string[] } {
    const unsubscribed: string[] = [];

    for (const channel of payload.channels ?? []) {
      const room = CHANNEL_TO_ROOM[channel];
      if (!room) {
        continue;
      }

      void client.leave(room);
      unsubscribed.push(channel);
    }

    return { unsubscribed };
  }

  broadcast(topic: string, payload: Record<string, unknown>, emittedAt?: string): void {
    const event = {
      topic,
      payload,
      emittedAt: emittedAt ?? new Date().toISOString(),
    };

    this.server.to('operators').emit(topic, event);

    if (topic.startsWith('job.')) {
      this.server.to('jobs').emit(topic, event);
      return;
    }

    if (topic.startsWith('alert.')) {
      this.server.to('alerts').emit(topic, event);
      return;
    }

    if (topic.startsWith('incident.')) {
      this.server.to('incidents').emit(topic, event);
      return;
    }

    if (topic.startsWith('notification.')) {
      this.server.to('notifications').emit(topic, event);
    }
  }

  private pickQueryValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }

    return undefined;
  }

  private pickHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
