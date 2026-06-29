import NextAuth, { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
  },
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
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
      // Google OAuth
      if (account?.provider === 'google' && account?.id_token) {
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
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
               token.accessToken = data.data.accessToken
               token.refreshToken = data.data.refreshToken
            }
          }
        } catch (err) {
          console.error('Google token exchange error:', err)
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
      (session as any).accessToken = (token as any).accessToken
      (session as any).refreshToken = (token as any).refreshToken
      if (session.user) {
        (session.user as any).id = (token.id as string)
      }
      return session
    },
  }
})

export { handler as GET, handler as POST }
