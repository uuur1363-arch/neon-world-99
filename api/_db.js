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

export function isoWeekInfo(input = new Date()) {
  const d = new Date(input);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  const year = utc.getUTCFullYear();

  const weekStart = new Date(utc);
  weekStart.setUTCDate(utc.getUTCDate() - 3);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  return {
    year,
    week: weekNo,
    weekKey: `${year}-W${String(weekNo).padStart(2, "0")}`,
    startMs: weekStart.getTime(),
    endMs: weekEnd.getTime()
  };
}

export function currentWeekKey() {
  return isoWeekInfo().weekKey;
}

export function currentWeekWindow() {
  const { startMs, endMs, weekKey } = isoWeekInfo();
  return { startMs, endMs, weekKey };
}

export function shortWallet(wallet = "") {
  const s = String(wallet || "");
  if (!s) return "";
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}
