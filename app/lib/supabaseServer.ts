import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using the service role key for secure DB operations
// Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present in the environment
export function getSupabaseServerClient() {
  const supabaseUrl = "https://krqrrtsjtgfnsmymlcig.supabase.co";
  const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycXJydHNqdGdmbnNteW1sY2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTkwODQsImV4cCI6MjA3NzIzNTA4NH0.5f26L2D_HP4dc7jWg2YepzqfT8YNQ8vBT9mn3zPwqHo";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


