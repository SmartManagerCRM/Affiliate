import "server-only";
import dns from "node:dns";
import type { createClient } from "@/lib/supabase/server";
import { fetchWithTimeout } from "../httpRetry";
import { isPrivateOrReservedIp } from "./ipSafety";

type SupabaseAdmin = Awaited<ReturnType<typeof createClient>>;

const BUCKET = "product-images";
// Matches the product-images bucket's own configured file_size_limit and
// allowed_mime_types exactly (checked live against Supabase) — no point
// downloading a file storage will reject anyway.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Re-hosts one externally-hosted feed image into our own Supabase Storage
 * bucket — the same "product-images" bucket actions/images.ts's manual
 * upload flow already uses — so it ends up on a host next.config.ts's
 * next/image remotePatterns allow-lists, instead of depending on the
 * affiliate network's CDN staying up / not blocking hotlinking.
 *
 * `url` ultimately comes from a network's feed data, not something this
 * app fully controls, so this is SSRF-conscious: only http(s) URLs are
 * considered, every DNS-resolved address is checked against private/
 * loopback/link-local/reserved ranges (including the cloud metadata
 * address, 169.254.169.254) before connecting, redirects are never
 * followed automatically, the response must declare an image/* content
 * type, and the body is capped at MAX_IMAGE_BYTES.
 *
 * Never throws. On any failure — blocked address, timeout, wrong content
 * type, too large, a storage error — this returns the original external
 * URL unchanged. The caller still has something to display: lib/image.ts's
 * isOptimizableImageSrc() already renders a non-Supabase-hosted URL
 * unoptimized rather than broken. Re-hosting is a reliability/perf
 * improvement, never a hard requirement for approval to succeed.
 */
export async function rehostImage(supabase: SupabaseAdmin, url: string, pathPrefix: string): Promise<string> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return url;

    const addresses = await resolveHostname(parsed.hostname);
    if (addresses.length === 0 || addresses.some(isPrivateOrReservedIp)) return url;

    const response = await fetchWithTimeout(fetch, url, { redirect: "manual" }, FETCH_TIMEOUT_MS);
    // Anything outside 2xx — including an opaque "manual" redirect response,
    // which fetch reports as status 0 — is treated as a failure rather than
    // chased further.
    if (response.status < 200 || response.status >= 300) return url;

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const extension = contentType ? CONTENT_TYPE_EXTENSIONS[contentType] : undefined;
    if (!contentType || !extension) return url;

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_IMAGE_BYTES) return url;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return url;

    const path = `${pathPrefix}/automation-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (uploadError) return url;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch {
    return url;
  }
}

/** Re-hosts every image in order. A single failing image falls back to its original URL rather than failing the whole batch. */
export async function rehostImages(supabase: SupabaseAdmin, urls: string[], pathPrefix: string): Promise<string[]> {
  const results: string[] = [];
  for (const url of urls) {
    results.push(await rehostImage(supabase, url, pathPrefix));
  }
  return results;
}

async function resolveHostname(hostname: string): Promise<string[]> {
  try {
    const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    return records.map((r) => r.address);
  } catch {
    return [];
  }
}
