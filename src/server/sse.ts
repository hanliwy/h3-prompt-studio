export interface SseEventPayload {
  event: string;
  data: unknown;
}

export function formatSseEvent({ event, data }: SseEventPayload) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${payload.replace(/\n/g, '\\n')}\n\n`;
}
