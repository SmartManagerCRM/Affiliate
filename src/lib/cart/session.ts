import "server-only";
import { cookies } from "next/headers";
import { CART_SESSION_COOKIE_NAME, CART_SESSION_COOKIE_MAX_AGE_DAYS } from "@/lib/constants";
import { generateCartSessionToken } from "./token";

/** Read-only — never creates a session. Use this for pageviews/badges so a visitor who never adds anything never gets a session row. */
export async function getCartSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_SESSION_COOKIE_NAME)?.value ?? null;
}

/** Write path — returns the existing token, or mints and sets a new one. Call this only from a Server Action/Route Handler (cookie mutation isn't allowed during a Server Component render). */
export async function getOrCreateCartSessionToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_SESSION_COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = generateCartSessionToken();
  store.set(CART_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
  });
  return token;
}
