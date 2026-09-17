import { AsyncLocalStorage } from 'async_hooks';

interface CorrelationContext {
  correlationId: string;
}

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export function runWithCorrelationId<T>(
  correlationId: string,
  callback: () => T,
): T {
  return correlationStorage.run({ correlationId }, callback);
}

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}
