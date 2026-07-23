'use client';

import { SessionProvider } from 'next-auth/react';

export default function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  // refetchInterval={5 * 60} means it will hit /api/auth/session every 5 minutes
  // refetchOnWindowFocus triggers a check when the user switches tabs back
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      {children}
    </SessionProvider>
  );
}
