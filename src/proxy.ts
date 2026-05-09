import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip proxy for API routes and static files
  if (pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon")) {
    return NextResponse.next()
  }

  // Better Auth session cookie (dot and hyphen variants, plain and __Secure-)
  const sessionCookie = request.cookies.get("better-auth.session_token") ||
                        request.cookies.get("__Secure-better-auth.session_token") ||
                        request.cookies.get("better-auth-session_token") ||
                        request.cookies.get("__Secure-better-auth-session_token")

  const isAuthPage = pathname === "/login" || pathname === "/register"

  if (isAuthPage) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
