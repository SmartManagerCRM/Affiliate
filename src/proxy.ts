import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";
import { REF_COOKIE_NAME, REF_COOKIE_MAX_AGE_DAYS } from "@/lib/constants";

const REF_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/reset-password"];

// Admin, the affiliate redirect, the generated placeholder images, and API
// routes are deliberately not localized — the admin panel stays
// English-only by design, and /go + /placeholder + /api are technical
// routes with no UI text that must never get a locale prefix.
const UNLOCALIZED_PREFIXES = ["/admin", "/go", "/placeholder", "/api"];

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isUnlocalized = UNLOCALIZED_PREFIXES.some((p) => pathname.startsWith(p));

  let response: NextResponse;

  if (isUnlocalized) {
    response = NextResponse.next({ request });

    if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
      const session = await updateSession(request);
      response = session.response;
      if (!session.user) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
    }
  } else {
    response = intlMiddleware(request);
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
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico)$).*)",
  ],
};
