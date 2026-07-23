'use client';

import { useState, useEffect } from 'react';
import { FiX, FiShield, FiLock, FiCreditCard, FiTrash2 } from 'react-icons/fi';
import { useSession } from 'next-auth/react';

export default function ProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'password' | '2fa' | 'payment'>('password');

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // 2FA State
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [twoFactorMsg, setTwoFactorMsg] = useState('');

  // Payment State
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState('');

  useEffect(() => {
    if (isOpen && activeTab === 'payment') {
      fetchPaymentMethods();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // -- Password Update --
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg('');
    try {
      const res = await fetch('/api/proxy/auth/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMsg('Password updated successfully.');
        setOldPassword('');
        setNewPassword('');
      } else {
        setPasswordMsg(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordMsg('An error occurred.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // -- 2FA Setup --
  const handleRequest2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorMsg('');
    try {
      const res = await fetch('/api/proxy/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSetupMode(true);
        setTwoFactorMsg('Check your email for the OTP to complete setup.');
      } else {
        setTwoFactorMsg(data.error || 'Failed to request 2FA setup.');
      }
    } catch (err) {
      setTwoFactorMsg('An error occurred.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorLoading(true);
    setTwoFactorMsg('');
    try {
      const res = await fetch('/api/proxy/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTwoFactorMsg('2FA has been successfully enabled.');
        setSetupMode(false);
        setOtp('');
      } else {
        setTwoFactorMsg(data.error || 'Invalid OTP.');
      }
    } catch (err) {
      setTwoFactorMsg('An error occurred.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // -- Payment Methods --
  const fetchPaymentMethods = async () => {
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/proxy/payments/methods');
      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentMethods(data.data);
      }
    } catch (err) {
      setPaymentMsg('Failed to fetch payment methods.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm('Remove this payment method?')) return;
    try {
      const res = await fetch('/api/proxy/payments/methods', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentMethods([]);
        setPaymentMsg('Payment method removed.');
      } else {
        setPaymentMsg('Failed to remove method.');
      }
    } catch (err) {
      setPaymentMsg('Error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-800/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FiShield className="text-primary" /> Profile & Security
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 p-4 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'password' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <FiLock /> Password
          </button>
          <button
            onClick={() => setActiveTab('2fa')}
            className={`flex-1 p-4 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === '2fa' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <FiShield /> 2FA Setup
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`flex-1 p-4 font-medium text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'payment' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            <FiCreditCard /> Payment
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {passwordMsg && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                  {passwordMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Old Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-4"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {activeTab === '2fa' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Enhance your account security by requiring a 6-digit OTP sent to your email during
                login.
              </p>
              {twoFactorMsg && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                  {twoFactorMsg}
                </div>
              )}
              {!setupMode ? (
                <button
                  onClick={handleRequest2FA}
                  disabled={twoFactorLoading}
                  className="w-full bg-white/10 text-white font-bold py-3 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 border border-white/10 mt-4"
                >
                  {twoFactorLoading ? 'Requesting...' : 'Enable 2FA (Email OTP)'}
                </button>
              ) : (
                <form onSubmit={handleVerify2FA} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      6-Digit OTP
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary tracking-widest text-center text-xl font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={twoFactorLoading}
                    className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Manage your saved payment methods for billing operations.
              </p>
              {paymentMsg && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                  {paymentMsg}
                </div>
              )}
              {paymentLoading ? (
                <div className="text-sm text-slate-500">Loading payment methods...</div>
              ) : paymentMethods.length === 0 ? (
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center text-sm text-slate-400">
                  No payment methods found. Use the consumer app to add a payment method.
                </div>
              ) : (
                <div className="space-y-2 mt-4">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg text-white">
                          <FiCreditCard size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {pm.brand} ending in {pm.last4}
                          </div>
                          {pm.isDefault && (
                            <div className="text-xs text-primary mt-1">Default Method</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePaymentMethod(pm.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Remove Payment Method"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
