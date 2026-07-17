import { withAuth } from 'next-auth/middleware';

import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Since we use a custom cookie name, we must check it manually
        // if withAuth's getToken fails to find the default cookie.
        const secureCookie = req.cookies.get('__Secure-scooter-operator-token');
        const standardCookie = req.cookies.get('scooter-operator-token');
        return !!token || !!secureCookie || !!standardCookie;
      },
    },
    pages: {
      signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (next-auth API routes)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)',
  ],
};
