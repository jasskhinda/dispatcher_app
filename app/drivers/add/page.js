import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AddDriverForm from './AddDriverForm';

export default async function AddDriverPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login?error=Authentication%20required');
  }
  
  // Get user profile to verify dispatcher role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile || profile.role !== 'dispatcher') {
    redirect('/login?error=Dispatcher%20access%20required');
  }
  
  return <AddDriverForm user={user} userProfile={profile} />;
}