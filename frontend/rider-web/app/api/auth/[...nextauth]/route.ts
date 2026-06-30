import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// IPv4-only networking is enforced at the process level via NODE_OPTIONS
// in package.json (--no-network-family-autoselection + --dns-result-order=ipv4first)

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
