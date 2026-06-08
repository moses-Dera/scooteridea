// ─────────────────────────────────────────────────────────────────────────────
//  Local type shim for 'opossum'
//
//  @types/opossum does not exist on npm. This minimal declaration satisfies
//  the TypeScript compiler while preserving full type safety for the
//  withCircuitBreaker wrapper in ../resilience/index.ts.
// ─────────────────────────────────────────────────────────────────────────────

declare module 'opossum' {
  type AnyFunction = (...args: unknown[]) => Promise<unknown>;

  interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
    rollingCountTimeout?: number;
    rollingCountBuckets?: number;
    name?: string;
    enabled?: boolean;
    allowWarmUp?: boolean;
    capacity?: number;
  }

  class CircuitBreaker<TArgs extends unknown[] = unknown[], TResult = unknown> {
    constructor(action: (...args: TArgs) => Promise<TResult>, options?: CircuitBreakerOptions);

    fire(...args: TArgs): Promise<TResult>;
    fallback(fn: (...args: unknown[]) => unknown): this;

    on(event: 'open' | 'close' | 'halfOpen' | 'reject' | 'timeout' | 'fallback' | 'success' | 'failure', listener: (...args: unknown[]) => void): this;

    readonly opened: boolean;
    readonly closed: boolean;
    readonly halfOpen: boolean;
    readonly name: string;
  }

  export = CircuitBreaker;
}
