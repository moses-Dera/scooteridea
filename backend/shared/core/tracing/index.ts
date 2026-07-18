import { AsyncLocalStorage } from 'async_hooks';

export interface TraceContext {
  traceId: string;
}

export const traceContext = new AsyncLocalStorage<TraceContext>();

export function getTraceId(): string | undefined {
  return traceContext.getStore()?.traceId;
}
