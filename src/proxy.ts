import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { REF_COOKIE_NAME, REF_COOKIE_MAX_AGE_DAYS } from "@/lib/constants";

const REF_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Only /admin needs a session check, and it's the only thing in this app that
  // does — every other route is public and must never pay for a Supabase Auth
  // round trip just to render. Skipping it here is a meaningful chunk of the
  // latency on every public page load.
  let response = NextResponse.next({ request });
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = await updateSession(request);
    response = session.response;
    if (!session.user) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Preserve client-site attribution (?ref=beanandbite) across the visit.
  const ref = searchParams.get("ref");
  if (ref && REF_PATTERN.test(ref)) {
    response.cookies.set(REF_COOKIE_NAME, ref, {
      maxAge: REF_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|placeholder|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico)$).*)",
  ],
};
