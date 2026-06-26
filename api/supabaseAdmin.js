import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdminKey(env = process.env) {
  return env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function hasSupabaseAdminConfig(env = process.env) {
  return Boolean(env.SUPABASE_URL && getSupabaseAdminKey(env));
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  getSupabaseAdminKey()
);
