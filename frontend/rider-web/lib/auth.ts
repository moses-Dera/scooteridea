import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: { prompt: "select_account" }
      }
    }),
    CredentialsProvider({
      name: 'Email and Password',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Exchange credentials with backend BFF endpoint
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
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
            }
          )
          
          if (!response.ok) {
            return null
          }
          
          const data = await response.json()
          
          if (data.success && data.data?.accessToken) {
            return {
              id: credentials.email,
              email: credentials.email,
              name: credentials.email.split('@')[0],
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
            }
          }
          return null
        } catch (err) {
          console.error('Auth error:', err)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours sliding window
  },
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}scooter-session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      }
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      }
    }
  },
  callbacks: {
    async jwt({ token, account, user }) {
      const fs = require('fs')
      if (account) {
        console.log('[NextAuth] JWT callback triggered with account:', account)
        try { fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] account: ' + JSON.stringify(account) + '\n') } catch(e){}
      }
      // Google OAuth
      if (account?.provider === 'google' && account?.id_token) {
        console.log('[NextAuth] Exchanging Google token...')
        try { fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] Exchanging...\n') } catch(e){}
        try {
          // Exchange Google token for backend JWT via BFF
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'}/auth/oauth/google`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: account.id_token }),
            }
          )
          
          console.log('[NextAuth] Google backend response status:', response.status)
          try { fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] status: ' + response.status + '\n') } catch(e){}
          if (response.ok) {
            const data = await response.json()
            console.log('[NextAuth] Google backend success:', data.success)
            try { fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] data: ' + JSON.stringify(data) + '\n') } catch(e){}
            if (data.success && data.data) {
               token.accessToken = data.data.accessToken
               token.refreshToken = data.data.refreshToken
               console.log('[NextAuth] Tokens successfully attached to jwt token')
               try { fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] Success\n') } catch(e){}
            } else {
               console.error('[NextAuth] Google backend returned ok but missing success/data', data)
            }
          } else {
            const text = await response.text()
            console.error('[NextAuth] Google backend returned non-ok status:', response.status, text)
            try { fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] error text: ' + text + '\n') } catch(e){}
          }
        } catch (err) {
          console.error('Google token exchange error:', err)
          try { fs.appendFileSync('/tmp/nextauth.log', '[NextAuth] catch error: ' + (err as any).message + '\n') } catch(e){}
        }
        token.id = user?.id || account.sub
      }
      
      // Email/password - tokens from credentials provider
      if ((user as any)?.accessToken) {
        token.accessToken = (user as any).accessToken
        token.refreshToken = (user as any).refreshToken
        token.id = user?.email || user?.id
      }
      
      return token
    },
    async session({ session, token }) {
      // Store token in session for API requests
      ;(session as any).accessToken = (token as any).accessToken;
      ;(session as any).refreshToken = (token as any).refreshToken;
      if (session.user) {
        ;(session.user as any).id = (token.id as string);
      }
      return session;
    },
  }
}
