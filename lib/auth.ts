import { createClient } from '@/lib/supabase/server';
import type { UserType } from '@/lib/ai/entitlements';
import { guestRegex } from '@/lib/constants';

export async function auth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  const userType: UserType = user.email && guestRegex.test(user.email) ? 'guest' : 'regular';
  
  return {
    user: {
      id: user.id,
      email: user.email,
      type: userType,
    }
  };
}