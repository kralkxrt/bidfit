import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Public paths that don't require authentication
    const publicPaths = [
        "/login",
        "/api/auth",
        "/_next", // Next.js internals
        "/static", // Static assets
        "/favicon.ico"
    ];

    // Check if the path starts with any of the public paths
    const isPublic = publicPaths.some(p => path.startsWith(p));

    // Get the auth cookie
    const token = request.cookies.get("auth_token")?.value;

    // If path is protected and no token, redirect to login
    if (!isPublic && !token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If path is login and token exists, redirect to home
    if (path === "/login" && token) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (except auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
