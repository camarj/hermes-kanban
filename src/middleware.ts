import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for API routes and static files
  if (pathname.startsWith("/api") || 
      pathname.startsWith("/_next") || 
      pathname.startsWith("/favicon")) {
    return NextResponse.next()
  }
  
  const isAuthPage = pathname === "/login" || pathname === "/register"
  const isProtectedPage = pathname === "/" || 
                          pathname.startsWith("/dashboard") ||
                          pathname.startsWith("/onboarding")
  
  // Check for BetterAuth session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token") ||
                       request.cookies.get("__Secure-better-auth.session_token")
  
  // Redirect to login if accessing protected page without session
  if (isProtectedPage && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  
  // Redirect to dashboard if accessing auth pages with session
  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
