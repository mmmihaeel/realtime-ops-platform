export interface JobProcessingMessage {
  jobId: string;
  reason: 'created' | 'retry';
  requestedBy: string;
}
