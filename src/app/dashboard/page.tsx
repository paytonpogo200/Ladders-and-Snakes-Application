import { redirect } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect('/login');
  }

  await supabase.rpc('ensure_profile', {
    display_name_input: authData.user.user_metadata?.display_name ?? authData.user.email?.split('@')[0] ?? 'Player'
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single<Profile>();

  if (!profile) {
    redirect('/login');
  }

  return <Dashboard profile={profile} userEmail={authData.user.email ?? ''} />;
}
