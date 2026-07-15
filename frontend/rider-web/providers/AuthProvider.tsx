'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

function SessionErrorWatcher({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if ((session as any)?.error === 'RefreshAccessTokenError') {
      console.error('Session refresh failed. Forcing signout...');
      signOut({ redirect: false }).then(() => {
        window.dispatchEvent(
          new CustomEvent('auth-required', { detail: { feature: 'your account' } }),
        );
      });
    }
  }, [session]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionErrorWatcher>{children}</SessionErrorWatcher>
    </SessionProvider>
  );
}
