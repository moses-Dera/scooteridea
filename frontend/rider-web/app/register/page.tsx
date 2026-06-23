'use client';
import { useRouter } from 'next/navigation';
import RegisterOverlay from '@/components/panels/RegisterOverlay';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto flex items-center justify-center">
      <RegisterOverlay onClose={() => router.push('/')} />
    </div>
  );
}
