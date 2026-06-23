'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginOverlay from '@/components/panels/LoginOverlay';
import { Suspense } from 'react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feature = searchParams.get('feature');

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto flex items-center justify-center">
      <LoginOverlay feature={feature} onClose={() => router.push('/')} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
