import { RealtimeEventsGateway } from '../../apps/realtime-gateway/src/realtime-events.gateway';

describe('RealtimeEventsGateway', () => {
  it('routes job events to operator and job rooms', () => {
    const gateway = new RealtimeEventsGateway({
      validateToken: () => true,
      resolveOperatorId: (value?: string) => value ?? 'test',
    } as never);

    const events: Array<{ room: string; topic: string }> = [];
    gateway.server = {
      to: (room: string) => ({
        emit: (topic: string) => {
          events.push({ room, topic });
        },
      }),
    } as never;

    gateway.broadcast('job.completed', { jobId: 'job-1' });

    expect(events).toEqual([
      { room: 'operators', topic: 'job.completed' },
      { room: 'jobs', topic: 'job.completed' },
    ]);
  });

  it('routes incident events to incidents room', () => {
    const gateway = new RealtimeEventsGateway({
      validateToken: () => true,
      resolveOperatorId: (value?: string) => value ?? 'test',
    } as never);

    const events: Array<{ room: string; topic: string }> = [];
    gateway.server = {
      to: (room: string) => ({
        emit: (topic: string) => {
          events.push({ room, topic });
        },
      }),
    } as never;

    gateway.broadcast('incident.updated', { incidentId: 'inc-1' });

    expect(events).toEqual([
      { room: 'operators', topic: 'incident.updated' },
      { room: 'incidents', topic: 'incident.updated' },
    ]);
  });

  it('disconnects unauthorized websocket clients during handshake', () => {
    const gateway = new RealtimeEventsGateway({
      validateToken: () => false,
      resolveOperatorId: (value?: string) => value ?? 'test',
    } as never);

    const join = jest.fn().mockResolvedValue(undefined);
    const emit = jest.fn();
    const disconnect = jest.fn();

    const client = {
      id: 'socket-1',
      handshake: {
        auth: {
          token: 'bad-token',
        },
        query: {},
        headers: {},
      },
      data: {},
      join,
      emit,
      disconnect,
    } as never;

    gateway.handleConnection(client);

    expect(disconnect).toHaveBeenCalledWith(true);
    expect(join).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalledWith('connection.ready', expect.anything());
  });

  it('accepts only known subscription channels', () => {
    const gateway = new RealtimeEventsGateway({
      validateToken: () => true,
      resolveOperatorId: (value?: string) => value ?? 'test',
    } as never);

    const join = jest.fn().mockResolvedValue(undefined);
    const client = {
      join,
      leave: jest.fn().mockResolvedValue(undefined),
    } as never;

    const result = gateway.subscribe(client, {
      channels: ['jobs', 'unknown-channel', 'alerts'],
    });

    expect(result.subscribed).toEqual(['jobs', 'alerts']);
    expect(join).toHaveBeenCalledTimes(2);
  });
});
