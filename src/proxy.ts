import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { REF_COOKIE_NAME, REF_COOKIE_MAX_AGE_DAYS } from "@/lib/constants";

const REF_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, searchParams } = request.nextUrl;

  // Admin route protection (defense in depth — RLS enforces this at the data layer too).
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) {
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
