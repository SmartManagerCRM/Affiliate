/**
 * Generic retry-with-backoff wrapper for the HTTP calls an adapter makes.
 * Deliberately has no Admitad-specific knowledge, so it's reusable by
 * future adapters (CJ, ClickBank, ...) too.
 */

export class HttpTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "HttpTimeoutError";
  }
}

export class RateLimitError extends Error {
  constructor(
    message = "Rate limited",
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class HttpStatusError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "HttpStatusError";
  }
}

function isTransient(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (err instanceof HttpTimeoutError) return true;
  if (err instanceof HttpStatusError) return err.status >= 500;
  // Network-level failures (DNS, connection reset, etc.) surface as plain
  // fetch TypeErrors — worth one retry, unlike a 4xx we caused ourselves.
  if (err instanceof TypeError) return true;
  return false;
}

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Injectable so tests don't actually sleep. */
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Retries `fn` on transient failures (5xx, timeout, rate limit, network error)
 * with exponential backoff. Non-transient errors (4xx auth/validation) are
 * never retried — they fail immediately. */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!isTransient(err) || attempt === maxAttempts) {
        throw err;
      }

      const retryAfter = err instanceof RateLimitError ? err.retryAfterMs : undefined;
      const delay = retryAfter ?? baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  // Unreachable — the loop always returns or throws — but keeps TS satisfied.
  throw lastError;
}

/** Wraps a fetch Response into the appropriate typed error for a non-ok status. */
export function errorForResponse(response: Response): HttpStatusError | RateLimitError {
  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
    return new RateLimitError(`Rate limited (429)`, retryAfterMs);
  }
  return new HttpStatusError(`Request failed with status ${response.status}`, response.status);
}
