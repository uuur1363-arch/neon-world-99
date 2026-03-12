import { supa } from "./_db.js";

const buckets = new Map();

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const row = buckets.get(key);

  if (!row || row.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (row.count >= limit) {
    return { ok: false, retry_after_ms: row.resetAt - now };
  }

  row.count += 1;
  buckets.set(key, row);
  return { ok: true, remaining: limit - row.count };
}

export function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export function requireAdmin(req) {
  const expected = String(process.env.ADMIN_SECRET || "").trim();
  const got =
    String(req.headers["x-admin-secret"] || "") ||
    String(req.body?.admin_secret || "") ||
    String(req.query?.admin_secret || "");

  if (!expected) {
    return { ok: false, status: 500, error: "ADMIN_SECRET missing" };
  }

  if (!got || got.trim() !== expected) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}

export async function logSuspiciousRun({
  runToken,
  wallet,
  reason,
  rawPayload
}) {
  try {
    const db = supa();
    await db.from("suspicious_runs").insert({
      run_token: runToken || "",
      wallet: wallet || "",
      reason: reason || "unknown",
      raw_payload: rawPayload || {}
    });
  } catch {}
}
