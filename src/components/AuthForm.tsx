'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Crown, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function explainError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('fetch')) return 'The table could not reach Supabase. Check your project URL and public key, then restart the app.';
  return message;
}

export default function AuthForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [claimDm, setClaimDm] = useState(false);
  const [dmClaimed, setDmClaimed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase
      .from('dm_lock')
      .select('dm_user_id')
      .eq('id', true)
      .single()
      .then(({ data }) => setDmClaimed(Boolean(data?.dm_user_id)));
  }, [supabase]);

  async function finishLogin() {
    const name = displayName.trim() || email.split('@')[0] || 'Player';
    const { error: profileError } = await supabase.rpc('ensure_profile', { display_name_input: name });
    if (profileError) throw profileError;

    if (claimDm && !dmClaimed) {
      const { error: dmError } = await supabase.rpc('claim_dm', { display_name_input: name });
      if (dmError) throw dmError;
    }

    router.push('/dashboard');
    router.refresh();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('The two passwords do not match.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || email.split('@')[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Your account is ready. Confirm your email, then return here to log in.');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await finishLogin();
    } catch (error) {
      setMessage(explainError(error instanceof Error ? error.message : 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  }

  async function recoverPassword() {
    setMessage('');
    if (!email.trim()) {
      setMessage('Enter your email address first, then choose Recover password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
    });
    setLoading(false);
    setMessage(error ? explainError(error.message) : 'Password reset email sent. Open the link in that email to choose a new password.');
  }

  return (
    <div className="surface rounded-[1.6rem] p-4 sm:p-5">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1">
        {(['login', 'signup'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setMessage('');
            }}
            className={`rounded-lg px-4 py-3 text-sm font-extrabold transition ${
              mode === value ? 'bg-[var(--paper)] text-[#171b18]' : 'text-[var(--muted)]'
            }`}
          >
            {value === 'login' ? 'Log in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' && (
          <label className="block">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Name at the table</span>
            <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How the party knows you" />
          </label>
        )}
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Email</span>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Password</span>
          <input className="field" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </label>
        {mode === 'signup' && (
          <label className="block">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Confirm password</span>
            <input className="field" type="password" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Type the same password again" />
            {confirmPassword && password !== confirmPassword && <span className="mt-1 block text-xs font-bold text-[var(--red)]">Passwords do not match yet.</span>}
          </label>
        )}

        {!dmClaimed && (
          <button
            type="button"
            onClick={() => setClaimDm((value) => !value)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
              claimDm ? 'border-[var(--brass)] bg-[#d1a85b12]' : 'border-[var(--line)] bg-black/10'
            }`}
          >
            <Crown size={20} className="mt-0.5 shrink-0 text-[var(--brass)]" />
            <span>
              <span className="block text-sm font-black">I am the Dungeon Master</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">A table can only have one DM. This choice becomes permanent once claimed.</span>
            </span>
            <span className={`ml-auto mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${claimDm ? 'border-[var(--brass)] bg-[var(--brass)]' : 'border-[var(--muted)]'}`} />
          </button>
        )}

        <button disabled={loading} className="primary-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 font-black disabled:opacity-60">
          {loading ? <LoaderCircle className="animate-spin" size={19} /> : <ArrowRight size={19} />}
          {loading ? 'Opening the table…' : mode === 'login' ? 'Enter campaign' : 'Join campaign'}
        </button>
        {mode === 'login' && (
          <button type="button" onClick={recoverPassword} disabled={loading} className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-black text-[var(--muted)] disabled:opacity-50">
            Forgot password?
          </button>
        )}
      </form>

      {message && <p className="mt-4 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm leading-6 text-[var(--muted)]">{message}</p>}
    </div>
  );
}
