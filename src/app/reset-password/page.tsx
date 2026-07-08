'use client';

import { useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setMessage('The two passwords do not match.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMessage(error.message);
    setMessage('Password changed. Taking you back to the campaign…');
    setTimeout(() => router.push('/dashboard'), 700);
  }

  return (
    <main className="app-shell grid min-h-screen place-items-center px-4 py-10">
      <form onSubmit={submit} className="surface w-full max-w-md rounded-2xl p-5">
        <KeyRound className="text-[var(--brass)]" size={28} />
        <h1 className="mt-3 text-3xl font-black">Choose a new password</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Enter it twice so a typo cannot lock you out again.</p>
        <label className="mt-5 block"><span className="mb-1 block text-xs font-black uppercase text-[var(--muted)]">New password</span><input className="field" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="mt-3 block"><span className="mb-1 block text-xs font-black uppercase text-[var(--muted)]">Confirm password</span><input className="field" type="password" minLength={6} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
        <button disabled={busy || password !== confirm} className="primary-button mt-4 w-full rounded-xl px-4 py-3 font-black disabled:opacity-45">{busy ? 'Changing password…' : 'Save new password'}</button>
        {message && <p className="mt-3 rounded-xl border border-[var(--line)] p-3 text-sm text-[var(--muted)]">{message}</p>}
      </form>
    </main>
  );
}
