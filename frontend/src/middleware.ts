import { NextResponse, type NextRequest } from "next/server";

/**
 * Case-sensitive legacy redirects.
 *
 * These cannot live in next.config's `redirects()`: Next matches a redirect
 * `source` case-insensitively, so a rule pointing /services/Banke-Bihariji at
 * /services/banke-bihariji also matches the lowercase canonical URL and sends
 * it to itself — an infinite loop that took the real page down with
 * ERR_TOO_MANY_REDIRECTS.
 *
 * The lookup below is an exact string comparison, so the canonical lowercase
 * path simply misses the table and falls through untouched. That holds even if
 * the `matcher` routes a lowercase request in here, which is why the guard is a
 * lookup rather than an assumption about how the matcher behaves.
 *
 * Background: macOS/APFS cannot host case-variant sibling route folders, so the
 * route on disk is lowercase and the old capitalised URL — which is indexed and
 * linked externally — has to be redirected rather than served.
 */
const LEGACY_REDIRECTS: Record<string, string> = {
  "/services/Banke-Bihariji": "/services/banke-bihariji",
};

export function middleware(request: NextRequest) {
  const destination = LEGACY_REDIRECTS[request.nextUrl.pathname];

  // Not a legacy path (this includes the canonical lowercase spelling) — serve
  // it normally. Never redirect a path onto itself.
  if (!destination || destination === request.nextUrl.pathname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = destination;
  return NextResponse.redirect(url, 308);
}

/**
 * Keep this narrow — middleware runs on every matching request, and there is
 * exactly one path that needs it. Add a path here whenever you add one above.
 */
export const config = {
  matcher: ["/services/Banke-Bihariji"],
};
