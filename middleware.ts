import { NextResponse, type NextRequest } from "next/server";

/** Signed-out visitors go straight to /login (Core still verifies every API call). */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("cb_session")) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.pathname + req.nextUrl.search;
    url.pathname = "/login";
    url.search = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard", "/accounts/:path*", "/transfers/:path*", "/payments/:path*", "/cards/:path*", "/insights/:path*", "/loans/:path*", "/settings/:path*", "/statements/:path*", "/profile"],
};
