import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Operator Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@scooter.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        
        try {
          const res = await fetch(`${backendUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });

          const json = await res.json();
          
          if (res.ok && json.success && json.data?.token) {
            const { user, token } = json.data;
            
            // Only allow Operators and Admins
            if (user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
              throw new Error("Access Denied: You do not have operator privileges.");
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              accessToken: token
            };
          }
          return null;
        } catch (e: any) {
          throw new Error(e.message || "Invalid credentials");
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session as any).accessToken = token.accessToken; // Store safely in encrypted HttpOnly cookie
      }
      return session;
    }
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
};
