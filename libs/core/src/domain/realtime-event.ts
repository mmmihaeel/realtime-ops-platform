export interface RealtimeEvent<TPayload = Record<string, unknown>> {
  type: string;
  occurredAt: string;
  payload: TPayload;
}
