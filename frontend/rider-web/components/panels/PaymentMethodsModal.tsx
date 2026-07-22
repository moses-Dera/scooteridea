'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { LoadingSpinner } from '../LoadingSpinner';

export default function PaymentMethodsModal({ onClose }: { onClose: () => void }) {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await fetch('/api/proxy/payments/methods', {
          headers: {
            Authorization: `Bearer ${(session as any)?.accessToken}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setMethods(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchMethods();
  }, [session]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/proxy/payments/methods', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${(session as any)?.accessToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment method removed');
        setMethods([]);
      } else {
        toast.error(data.message || 'Failed to remove payment method');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-6 pb-6 text-white space-y-6">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex flex-shrink-0 items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
          <div className="text-2xl font-bold">Payment Methods</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : methods.length > 0 ? (
        <div className="space-y-4">
          {methods.map((method) => (
            <div key={method.id} className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {method.brand} {method.last4 && `•••• ${method.last4}`}
                    {method.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-[#1ED760]/20 text-[#1ED760] text-[10px] uppercase tracking-wider font-bold">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">Saved securely via Paystack</div>
                </div>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {deleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4 text-red-400" />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">No payment methods</h3>
          <p className="text-slate-400 text-sm">
            Top up your wallet via Paystack to automatically save a payment method for quick access.
          </p>
        </div>
      )}
    </div>
  );
}
