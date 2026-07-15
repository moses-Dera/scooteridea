import { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: { prompt: 'select_account' },
      },
    }),
    CredentialsProvider({
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Exchange credentials with backend BFF endpoint
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'}/auth/login`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            },
          );

          if (!response.ok) {
            return null;
          }

          let data;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            console.error(
              `[NextAuth] Expected JSON but got ${contentType}:`,
              text.substring(0, 100),
            );
            throw new Error(`API Endpoint Misconfigured. Contact Support.`);
          }

          if (data.success && data.data?.accessToken) {
            // Decode JWT to get user ID
            const payloadBase64 = data.data.accessToken.split('.')[1];
            const decodedPayload = JSON.parse(
              Buffer.from(payloadBase64, 'base64').toString('utf-8'),
            );
            const userId = decodedPayload.sub;

            return {
              id: userId,
              email: credentials.email,
              name: credentials.email.split('@')[0],
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
            };
          }
          throw new Error(data.message || data.error || 'Invalid credentials');
        } catch (err) {
          console.error('Auth error:', err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours sliding window
  },
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}scooter-rider-token`,
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
  callbacks: {
    async jwt({ token, account, user }) {
      const fs = require('fs');
      if (account) {
        console.log('[NextAuth] JWT callback triggered with account:', account);
        try {
          fs.appendFileSync(
            '/tmp/nextauth.log',
            '[NextAuth] account: ' + JSON.stringify(account) + '\n',
          );
        } catch (e) {}
      }
      // Google OAuth
      if (account?.provider === 'google' && account?.id_token) {
        console.log('[NextAuth] Exchanging Google token...');
        try {
          fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] Exchanging...\n');
        } catch (e) {}
        try {
          // Exchange Google token for backend JWT via BFF
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'}/auth/oauth/google`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: account.id_token }),
            },
          );

          console.log('[NextAuth] Google backend response status:', response.status);
          try {
            fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] status: ' + response.status + '\n');
          } catch (e) {}
          if (response.ok) {
            const data = await response.json();
            console.log('[NextAuth] Google backend success:', data.success);
            try {
              fs.appendFileSync(
                '/tmp/nextauth.log',
                '[NextAuth] data: ' + JSON.stringify(data) + '\n',
              );
            } catch (e) {}
            if (data.success && data.data) {
              token.accessToken = data.data.accessToken;
              token.refreshToken = data.data.refreshToken;

              // Decode JWT to get database UUID
              const payloadBase64 = data.data.accessToken.split('.')[1];
              const decodedPayload = JSON.parse(
                Buffer.from(payloadBase64, 'base64').toString('utf-8'),
              );
              token.id = decodedPayload.sub;

              console.log('[NextAuth] Tokens successfully attached to jwt token');
              try {
                fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] Success\n');
              } catch (e) {}
            } else {
              console.error('[NextAuth] Google backend returned ok but missing success/data', data);
            }
          } else {
            const text = await response.text();
            console.error(
              '[NextAuth] Google backend returned non-ok status:',
              response.status,
              text,
            );
            try {
              fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] error text: ' + text + '\n');
            } catch (e) {}
          }
        } catch (err) {
          console.error('Google token exchange error:', err);
          try {
            fs.appendFileSync(
              '/tmp/nextauth.log',
              '[NextAuth] catch error: ' + (err as any).message + '\n',
            );
          } catch (e) {}
        }
        token.id = token.id || user?.id || account.sub;
      }

      // Email/password - tokens from credentials provider
      if ((user as any)?.accessToken) {
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        token.id = (user as any).id || (user as any).email;
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
          return token;
        }

        console.log('[NextAuth] Access token expired/expiring, refreshing...');
        const refreshRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'}/auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token.refreshToken }),
          },
        );

        if (!refreshRes.ok) {
          console.error('[NextAuth] Failed to refresh token, backend returned:', refreshRes.status);
          token.error = 'RefreshAccessTokenError';
          return token;
        }

        const refreshedTokens = await refreshRes.json();
        if (!refreshedTokens.success || !refreshedTokens.data) {
          console.error('[NextAuth] Missing token data in response');
          token.error = 'RefreshAccessTokenError';
          return token;
        }

        token.accessToken = refreshedTokens.data.accessToken;
        token.refreshToken = refreshedTokens.data.refreshToken;
        console.log('[NextAuth] Successfully refreshed access token!');
      } catch (e) {
        console.error('[NextAuth] Error parsing token payload for expiration check:', e);
        token.error = 'RefreshAccessTokenError';
      }

      return token;
    },
    async session({ session, token }) {
      // Store token in session for API requests
      (session as any).accessToken = (token as any).accessToken;
      (session as any).refreshToken = (token as any).refreshToken;
      (session as any).error = token.error;
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
};
