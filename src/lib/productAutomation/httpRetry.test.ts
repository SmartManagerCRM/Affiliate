import { describe, it, expect, vi } from "vitest";
import { withRetry, errorForResponse, fetchWithTimeout, HttpStatusError, RateLimitError, HttpTimeoutError } from "./httpRetry";

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn(async () => "ok");
    const result = await withRetry(fn, { sleep: async () => {} });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a transient error and eventually succeeds", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 2) throw new HttpStatusError("server error", 500);
      return "ok";
    });

    const result = await withRetry(fn, { sleep: async () => {} });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-transient error", async () => {
    const fn = vi.fn(async () => {
      throw new HttpStatusError("bad request", 400);
    });

    await expect(withRetry(fn, { sleep: async () => {} })).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops after maxAttempts and throws the last error", async () => {
    const fn = vi.fn(async () => {
      throw new HttpStatusError("server error", 503);
    });

    await expect(withRetry(fn, { maxAttempts: 2, sleep: async () => {} })).rejects.toThrow("server error");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects RateLimitError.retryAfterMs when sleeping", async () => {
    const sleep = vi.fn(async () => {});
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 2) throw new RateLimitError("rate limited", 5000);
      return "ok";
    });

    await withRetry(fn, { sleep });
    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it("retries a timeout error", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 2) throw new HttpTimeoutError();
      return "ok";
    });

    const result = await withRetry(fn, { sleep: async () => {} });
    expect(result).toBe("ok");
  });

  it("retries a plain network-level TypeError", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 2) throw new TypeError("fetch failed");
      return "ok";
    });

    const result = await withRetry(fn, { sleep: async () => {} });
    expect(result).toBe("ok");
  });
});

describe("errorForResponse", () => {
  it("maps a 429 to a RateLimitError with retryAfterMs from the header", () => {
    const response = new Response("", { status: 429, headers: { "retry-after": "3" } });
    const err = errorForResponse(response);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterMs).toBe(3000);
  });

  it("maps a 429 with no retry-after header to a RateLimitError with no retryAfterMs", () => {
    const response = new Response("", { status: 429 });
    const err = errorForResponse(response);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterMs).toBeUndefined();
  });

  it("maps any other non-ok status to an HttpStatusError carrying that status", () => {
    const response = new Response("", { status: 503 });
    const err = errorForResponse(response);
    expect(err).toBeInstanceOf(HttpStatusError);
    expect((err as HttpStatusError).status).toBe(503);
  });
});

describe("fetchWithTimeout", () => {
  it("returns the response when the call completes before the timeout", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok"));
    const response = await fetchWithTimeout(fetchImpl, "https://example.test", {}, 1000);
    expect(await response.text()).toBe("ok");
  });

  it("throws HttpTimeoutError when the call hangs past the timeout", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    await expect(
      fetchWithTimeout(fetchImpl as unknown as typeof fetch, "https://example.test", {}, 10)
    ).rejects.toThrow(HttpTimeoutError);
  });

  it("propagates a non-abort error unchanged", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network down");
    });

    await expect(fetchWithTimeout(fetchImpl, "https://example.test", {}, 1000)).rejects.toThrow("network down");
  });
});
