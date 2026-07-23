import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Operator Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@scooter.com' },
        password: { label: 'Password', type: 'password' },
        token: { label: 'Token', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials) return null;

        const clientIp =
          req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || '127.0.0.1';

        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        try {
          let res;

          if (credentials.token && credentials.otp) {
            // 2FA login step
            res = await fetch(`${backendUrl}/auth/2fa/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-forwarded-for':
                  typeof clientIp === 'string'
                    ? clientIp
                    : Array.isArray(clientIp)
                      ? clientIp[0]
                      : '127.0.0.1',
              },
              body: JSON.stringify({
                token: credentials.token,
                otp: credentials.otp,
              }),
            });
          } else if (credentials.email && credentials.password) {
            // Initial login step
            res = await fetch(`${backendUrl}/auth/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-forwarded-for':
                  typeof clientIp === 'string'
                    ? clientIp
                    : Array.isArray(clientIp)
                      ? clientIp[0]
                      : '127.0.0.1',
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            });
          } else {
            return null;
          }

          let json;
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            json = await res.json();
          } else {
            const text = await res.text();
            console.error(
              `[NextAuth] Expected JSON but got ${contentType}:`,
              text.substring(0, 100),
            );
            throw new Error(`API Endpoint Misconfigured. Contact Support.`);
          }

          if (json.success && json.data?.requires2FA) {
            throw new Error(`2FA_REQUIRED:${json.data.tempToken}`);
          }

          if (res.ok && json.success && json.data?.accessToken) {
            const { accessToken, refreshToken } = json.data;

            // Decode JWT to get role and user ID
            const payloadBase64 = accessToken.split('.')[1];
            const decodedPayload = JSON.parse(
              Buffer.from(payloadBase64, 'base64').toString('utf-8'),
            );
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
    async signIn({ user, account }) {
      // For Google OAuth, verify the user exists in our backend and has operator/admin role
      if (account?.provider === 'google') {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const res = await fetch(`${backendUrl}/auth/oauth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
            body: JSON.stringify({ idToken: account.id_token }),
          });
          const json = await res.json();
          if (!res.ok || !json.data?.accessToken) return '/login?error=OAuthFailed';

          const payloadBase64 = json.data.accessToken.split('.')[1];
          const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));

          if (decoded.role !== 'OPERATOR' && decoded.role !== 'ADMIN') {
            return '/login?error=AccessDenied';
          }

          // Attach tokens to user object so jwt callback can pick them up
          (user as any).role = decoded.role;
          (user as any).id = decoded.sub;
          (user as any).accessToken = json.data.accessToken;
          (user as any).refreshToken = json.data.refreshToken;
        } catch {
          return '/login?error=OAuthFailed';
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id ?? user.id;
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
      }

      // Check if access token is expired (or close to expiring)
      if (!token.accessToken || typeof token.accessToken !== 'string' || token.error) {
        return token;
      }

      try {
        const payloadBase64 = token.accessToken.split('.')[1];
        if (!payloadBase64) return token;

        const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
        const exp = decodedPayload.exp * 1000;

        // If token expires in less than 5 minutes, refresh it
        if (Date.now() <= exp - 5 * 60 * 1000) {
          return token; // Still valid
        }

        console.log('[NextAuth] Access token expired/expiring, refreshing...');
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const refreshRes = await fetch(`${backendUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
          body: JSON.stringify({ refreshToken: token.refreshToken }),
        });

        if (!refreshRes.ok) {
          if (refreshRes.status === 401 || refreshRes.status === 403) {
            token.error = 'RefreshAccessTokenError';
          }
          throw new Error(`Refresh failed with status: ${refreshRes.status}`);
        }

        const refreshedTokens = await refreshRes.json();
        if (!refreshedTokens.success || !refreshedTokens.data) {
          throw new Error('Invalid refresh response payload');
        }

        token.accessToken = refreshedTokens.data.accessToken;
        token.refreshToken = refreshedTokens.data.refreshToken;
        console.log('[NextAuth] Successfully refreshed access token!');
      } catch (e) {
        console.error('[NextAuth] Token refresh error:', e);
        // Do not permanently invalidate the token on network error.
        // It will retry on the next session read.
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.error === 'RefreshAccessTokenError') {
        (session as any).error = 'RefreshAccessTokenError';
      }
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
  secret: process.env.NEXTAUTH_SECRET,
};
