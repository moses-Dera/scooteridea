// ─────────────────────────────────────────────────────────────────────────────
//  @ebike/core — Error Hierarchy
//
//  All application errors inherit from AppError.
//  Every error carries:
//    - statusCode   → HTTP status to return
//    - code         → machine-readable string (e.g. 'RIDE_NOT_FOUND')
//    - isOperational → true = expected error (log as warn), false = bug (log as error)
//    - context      → arbitrary metadata for structured logging / debugging
// ─────────────────────────────────────────────────────────────────────────────

export interface AppErrorOptions {
  /** HTTP status code (default 500). */
  statusCode?: number;
  /** Machine-readable code, e.g. 'RIDE_NOT_ACTIVE'. */
  code?: string;
  /** If false, this is a programming bug — crash the process on unhandled. */
  isOperational?: boolean;
  /** Extra metadata attached to structured logs. */
  context?: Record<string, unknown>;
  /** Original cause — use for wrapping low-level errors. */
  cause?: Error;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;
  readonly context: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.isOperational = options.isOperational ?? true;
    this.context = options.context ?? {};

    if (options.cause) this.cause = options.cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── 4xx Client Errors ─────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  readonly details: unknown[];
  constructor(message: string, details: unknown[] = [], context?: Record<string, unknown>) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', context });
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', context?: Record<string, unknown>) {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED', context });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', context?: Record<string, unknown>) {
    super(message, { statusCode: 403, code: 'FORBIDDEN', context });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
    super(msg, { statusCode: 404, code: 'NOT_FOUND', context: { resource, id } });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { statusCode: 409, code: 'CONFLICT', context });
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { statusCode: 422, code: 'UNPROCESSABLE', context });
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Too many requests', { statusCode: 429, code: 'RATE_LIMITED' });
  }
}

// ── 5xx Server Errors ─────────────────────────────────────────────────────────

export class InternalError extends AppError {
  constructor(message = 'Internal server error', cause?: Error, context?: Record<string, unknown>) {
    super(message, {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      isOperational: false,
      cause,
      context,
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(dependency: string) {
    super(`Service unavailable: ${dependency}`, {
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      context: { dependency },
    });
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(dependency: string) {
    super(`Timeout waiting for: ${dependency}`, {
      statusCode: 504,
      code: 'GATEWAY_TIMEOUT',
      context: { dependency },
    });
  }
}

// ── Domain-specific Errors ────────────────────────────────────────────────────

export class RideNotActiveError extends AppError {
  constructor(rideId: string, currentStatus: string) {
    super(`Ride '${rideId}' is not active (status: ${currentStatus})`, {
      statusCode: 409,
      code: 'RIDE_NOT_ACTIVE',
      context: { rideId, currentStatus },
    });
  }
}

export class BikeUnavailableError extends AppError {
  constructor(bikeId: string, status: string) {
    super(`Bike '${bikeId}' is not available (status: ${status})`, {
      statusCode: 409,
      code: 'BIKE_UNAVAILABLE',
      context: { bikeId, status },
    });
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(requiredCents: number, balanceCents: number) {
    super('Insufficient wallet balance', {
      statusCode: 422,
      code: 'INSUFFICIENT_BALANCE',
      context: { requiredCents, balanceCents },
    });
  }
}

export class DockFullError extends AppError {
  constructor(dockId: string) {
    super(`Dock '${dockId}' has no available slots`, {
      statusCode: 409,
      code: 'DOCK_FULL',
      context: { dockId },
    });
  }
}

// ── Type guards ───────────────────────────────────────────────────────────────

export function isAppError(err: unknown): err is AppError {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'code' in err;
}

export function isOperationalError(err: unknown): boolean {
  if (isAppError(err)) return (err as any).isOperational === true;
  return false;
}
