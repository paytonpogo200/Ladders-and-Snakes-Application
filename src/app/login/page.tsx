import { redirect } from 'next/navigation';
import { Compass, Store, Users } from 'lucide-react';
import AuthForm from '@/components/AuthForm';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect('/dashboard');

  return (
    <main className="app-shell px-4 py-8 text-[var(--paper)]">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden lg:block">
          <p className="eyebrow mb-4">Ladders and Snakes Campaign Table</p>
          <h1 className="max-w-xl text-6xl font-black leading-[0.96] tracking-[-0.045em]">
            Welcome! To the world of Arta Malanda.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[var(--muted)]">
            In a world gone bleak after the Dozen-Year War, what possibilities await?
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {[
              [Compass, 'Battle map'],
              [Users, 'Character Sheets'],
              [Store, 'Working Shops']
            ].map(([Icon, label]) => (
              <div key={label as string} className="surface-soft rounded-2xl p-4">
                <Icon size={20} className="mb-3 text-[var(--brass)]" />
                <p className="text-sm font-bold">{label as string}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-7 text-center lg:hidden">
            <p className="eyebrow mb-3">Ladders and Snakes Campaign Table</p>
            <h1 className="text-4xl font-black leading-tight tracking-[-0.035em]">Welcome! To the world of Arta Malanda.</h1>
            <p className="mx-auto mt-3 max-w-sm leading-6 text-[var(--muted)]">In a world gone bleak after the Dozen-Year War, what possibilities await?</p>
          </div>
          <AuthForm />
        </div>
      </section>
    </main>
  );
}
