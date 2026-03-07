export interface EventEnvelope<TPayload = Record<string, unknown>> {
  topic: string;
  payload: TPayload;
  emittedAt: string;
}
