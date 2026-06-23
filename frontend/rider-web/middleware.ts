import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // If you want to handle specific token logic or custom redirects
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Only return true if the user has a valid token
        return !!token;
      },
    },
    pages: {
      signIn: '/login', // Redirect to our smart overlay page
    }
  }
);

// Define exactly which routes require authentication
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - register (registration page)
     * - forgot-password
     * - public assets
     */
    '/menu/:path*',
    '/profile/:path*',
    '/wallet/:path*',
    '/history/:path*',
    '/settings/:path*',
    '/ride/:path*',
  ],
};
