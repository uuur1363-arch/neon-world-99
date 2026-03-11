import { createClient } from "@supabase/supabase-js";

export function supa() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key);
}

export function nowMs() {
  return Date.now();
}

export function currentWeekKey() {
  const d = new Date();
  const year = d.getUTCFullYear();

  const oneJan = new Date(Date.UTC(year, 0, 1));
  const dayMs = 24 * 60 * 60 * 1000;
  const dayOfYear = Math.floor((d - oneJan) / dayMs) + 1;
  const week = Math.ceil(dayOfYear / 7);

  return `${year}-W${String(week).padStart(2, "0")}`;
}
