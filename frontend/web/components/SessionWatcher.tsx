'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function SessionWatcher({ sessionError }: { sessionError?: string }) {
  useEffect(() => {
    if (sessionError === 'RefreshAccessTokenError') {
      console.warn('Session expired. Redirecting to login...');
      signOut({ callbackUrl: '/login' });
    }
  }, [sessionError]);

  return null;
}
