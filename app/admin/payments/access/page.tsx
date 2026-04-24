'use client';

import { useEffect, useState } from 'react';

type AccessState =
  | 'LOADING'
  | 'NO_SESSION'
  | 'OTP_PENDING'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'LOCKED';

export default function PaymentAccessPage() {
  const [state, setState] = useState<AccessState>('LOADING');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  /* ===============================
     FETCH SESSION STATUS
  =================================*/
  async function fetchSession() {
    try {
      const res = await fetch('/api/admin/payments/access/session');
      const data = await res.json();

      if (!data.success) {
        setState('NO_SESSION');
        return;
      }

      const access = data.access;

      if (!access.active && access.requiresVerification) {
        if (access.reason === 'NO_SESSION') {
          setState('NO_SESSION');
        } else if (access.reason === 'OTP_PENDING') {
          setState('OTP_PENDING');
          setSessionId(access.session.id);
        } else if (access.reason === 'SESSION_EXPIRED') {
          setState('EXPIRED');
        } else if (access.reason === 'LOCKED') {
          setState('LOCKED');
        } else {
          setState('NO_SESSION');
        }
      }

      if (access.active) {
        setState('VERIFIED');
      }
    } catch (err) {
      console.error(err);
      setState('NO_SESSION');
    }
  }

  useEffect(() => {
    fetchSession();
  }, []);

  /* ===============================
     REQUEST OTP
  =================================*/
  async function requestOtp() {
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/payments/access/request-otp', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setSessionId(data.session.id);
        setState('OTP_PENDING');
        setMessage('OTP sent to your email.');
      } else {
        setMessage(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setMessage('Something went wrong.');
    }

    setLoading(false);
  }

  /* ===============================
     VERIFY OTP
  =================================*/
  async function verifyOtp() {
    if (!otp || otp.length !== 6) {
      setMessage('Enter valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/payments/access/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, otp }),
      });

      const data = await res.json();

      if (data.success) {
        setState('VERIFIED');
        setMessage('Access granted successfully.');
      } else {
        setMessage(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setMessage('Verification failed.');
    }

    setLoading(false);
  }

  /* ===============================
     UI
  =================================*/
  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#07152F] border border-white/10 rounded-2xl p-6 shadow-lg">

        <h1 className="text-2xl font-bold mb-4 text-center">
          Payment Access Control
        </h1>

        {/* ===============================
           VERIFIED
        =================================*/}
        {state === 'VERIFIED' && (
          <div className="text-center">
            <p className="text-green-400 font-semibold mb-3">
              Access Active ✅
            </p>
            <p className="text-sm text-[#94A3B8]">
              You can now access all payment controls.
            </p>
          </div>
        )}

        {/* ===============================
           REQUEST OTP
        =================================*/}
        {(state === 'NO_SESSION' || state === 'EXPIRED') && (
          <div className="text-center">
            <p className="text-[#94A3B8] mb-4">
              Secure access required for payment controls.
            </p>

            <button
              onClick={requestOtp}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] text-black font-semibold py-3 rounded-xl"
            >
              {loading ? 'Sending OTP...' : 'Request OTP'}
            </button>
          </div>
        )}

        {/* ===============================
           OTP INPUT
        =================================*/}
        {state === 'OTP_PENDING' && (
          <div>
            <p className="text-[#94A3B8] mb-3 text-center">
              Enter OTP sent to your email
            </p>

            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="w-full mb-4 px-4 py-3 rounded-xl bg-black/30 border border-white/10 outline-none text-center tracking-widest text-lg"
            />

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] text-black font-semibold py-3 rounded-xl"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        )}

        {/* ===============================
           LOCKED
        =================================*/}
        {state === 'LOCKED' && (
          <p className="text-red-400 text-center">
            Too many attempts. Access locked. Try again later.
          </p>
        )}

        {/* ===============================
           MESSAGE
        =================================*/}
        {message && (
          <p className="text-center text-sm mt-4 text-[#94A3B8]">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}