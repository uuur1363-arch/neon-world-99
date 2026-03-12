const buckets = new Map();

export function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const row = buckets.get(key);

  if (!row || row.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return { ok: true, remaining: limit - 1 };
  }

  if (row.count >= limit) {
    return {
      ok: false,
      retry_after_ms: Math.max(0, row.resetAt - now)
    };
  }

  row.count += 1;
  buckets.set(key, row);

  return {
    ok: true,
    remaining: Math.max(0, limit - row.count)
  };
}
