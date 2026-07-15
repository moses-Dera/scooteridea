import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Operator Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@scooter.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        try {
          const res = await fetch(`${backendUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          let json;
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            json = await res.json();
          } else {
            const text = await res.text();
            console.error(`[NextAuth] Expected JSON but got ${contentType}:`, text.substring(0, 100));
            throw new Error(`API Endpoint Misconfigured. Contact Support.`);
          }

          if (res.ok && json.success && json.data?.accessToken) {
            const { accessToken, refreshToken } = json.data;

            // Decode JWT to get role and user ID
            const payloadBase64 = accessToken.split('.')[1];
            const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
            const userRole = decodedPayload.role;
            const userId = decodedPayload.sub;

            // Only allow Operators and Admins
            if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
              throw new Error('Access Denied: You do not have operator privileges.');
            }

            return {
              id: userId,
              email: credentials.email,
              name: credentials.email.split('@')[0],
              role: userRole,
              accessToken,
              refreshToken,
            };
          }
          throw new Error(json.message || json.error || 'Invalid credentials');
        } catch (e: any) {
          throw new Error(e.message || 'Invalid credentials');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours sliding window
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
      }

      // Check if access token is expired (or close to expiring)
      if (token.accessToken && typeof token.accessToken === 'string') {
        try {
          const payloadBase64 = token.accessToken.split('.')[1];
          if (payloadBase64) {
            const decodedPayload = JSON.parse(
              Buffer.from(payloadBase64, 'base64').toString('utf-8'),
            );
            const exp = decodedPayload.exp * 1000;

            // If token expires in less than 5 minutes, refresh it
            if (Date.now() > exp - 5 * 60 * 1000) {
              console.log('[NextAuth] Access token expired/expiring, refreshing...');
              const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
              const refreshRes = await fetch(`${backendUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: token.refreshToken }),
              });

              if (refreshRes.ok) {
                const refreshedTokens = await refreshRes.json();
                if (refreshedTokens.success && refreshedTokens.data) {
                  token.accessToken = refreshedTokens.data.accessToken;
                  token.refreshToken = refreshedTokens.data.refreshToken;
                  console.log('[NextAuth] Successfully refreshed access token!');
                }
              }
            }
          }
        } catch (e) {
          console.error('[NextAuth] Error parsing token payload for expiration check:', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session as any).accessToken = token.accessToken; // Store safely in encrypted HttpOnly cookie
        (session as any).refreshToken = token.refreshToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}scooter-operator-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    },
  },
};
