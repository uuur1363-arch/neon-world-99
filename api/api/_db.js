import { createClient } from "@supabase/supabase-js";

export function supa() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export function nowMs() {
  return Date.now();
}
