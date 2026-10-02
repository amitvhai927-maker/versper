import React, { useState } from 'react';
import { Phone, KeyRound, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { api } from '../services/api.ts';

interface AuthModalProps {
  onSuccess: (user: any, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+15551234567');
  const [otpCode, setOtpCode] = useState('');
  const [hintCode, setHintCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!phone.trim()) {
      setError('Please provide a valid phone number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(phone.trim());
      if (res.success) {
        setHintCode(res.devHintCode || '123456');
        setOtpCode(res.devHintCode || '123456');
        setStep('otp');
      } else {
        setError('Failed to request OTP');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit code');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone.trim(), otpCode.trim());
      if (res.success && res.user) {
        onSuccess(res.user, res.token);
      } else {
        setError(res.error || 'Invalid code');
      }
    } catch {
      setError('Verification network error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (presetPhone: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyOtp(presetPhone, '123456');
      if (res.success && res.user) {
        onSuccess(res.user, res.token);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 text-cyan-400 mx-auto flex items-center justify-center border border-cyan-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Vesper Messenger</h2>
          <p className="text-xs text-slate-400">
            Unified cross-platform encrypted messaging platform
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+15551234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-slate-800 text-sm text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-900/30"
            >
              <span>{loading ? 'Sending Code...' : 'Send Verification OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Enter 6-Digit OTP</label>
                <button
                  onClick={() => setStep('phone')}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Change phone
                </button>
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-slate-800 text-base text-white tracking-widest text-center rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 font-mono font-bold"
                />
              </div>

              {hintCode && (
                <p className="text-[11px] text-emerald-400 mt-1.5 text-center">
                  SMS Code (Auto-filled): <strong>{hintCode}</strong>
                </p>
              )}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-900/30"
            >
              <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Demo Personas */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 block text-center uppercase tracking-wider">
            Quick Persona Switch
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin('+15551234567')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-medium border border-slate-700"
            >
              Alex (User)
            </button>
            <button
              onClick={() => handleQuickLogin('+15552345678')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-center font-medium border border-slate-700"
            >
              Elena (Peer)
            </button>
            <button
              onClick={() => handleQuickLogin('+15559999999')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-center font-medium border border-cyan-900/60"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
