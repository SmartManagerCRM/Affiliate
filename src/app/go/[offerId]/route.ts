import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REF_COOKIE_NAME } from "@/lib/constants";

function detectDeviceType(userAgent: string | null) {
  if (!userAgent) return null;
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobile|android|iphone/i.test(userAgent)) return "mobile";
  return "desktop";
}

function landingPathFromReferer(referer: string | null, origin: string) {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.origin !== origin) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const supabase = await createClient();

  const ref =
    request.nextUrl.searchParams.get("ref") ??
    request.cookies.get(REF_COOKIE_NAME)?.value ??
    undefined;
  const referrer = request.headers.get("referer") ?? undefined;
  const userAgent = request.headers.get("user-agent");

  const { data, error } = await supabase.rpc("record_offer_click", {
    p_offer_id: offerId,
    p_ref: ref,
    p_referrer: referrer,
    p_landing_path: landingPathFromReferer(referrer ?? null, request.nextUrl.origin) ?? undefined,
    p_device_type: detectDeviceType(userAgent) ?? undefined,
    p_country: request.headers.get("x-vercel-ip-country") ?? undefined,
  });

  const result = data?.[0];

  if (error || !result?.affiliate_url) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(result.affiliate_url, { status: 307 });
}
