export const runtime = "nodejs";

import { supa, nowMs } from "./_db.js";
import { rateLimit, getIp, logSuspiciousRun } from "./_security.js";

const MIN_PLAY_MS = 45000;
const MAX_PLAY_MS = 5 * 60 * 1000;
const MAX_REASONABLE_SCORE = 5000000;

function getMaxPossibleScore(hitCount, maxCombo) {
  const safeHits = Math.max(0, Number(hitCount || 0));
  const safeCombo = Math.max(0, Number(maxCombo || 0));
  return (safeHits * 200) + (safeHits * Math.min(safeCombo, safeHits) * 10);
}

function validateTelemetry({ score, hitCount, missCount, maxCombo, durationMs }) {
  if (!Number.isFinite(hitCount) || hitCount < 0) return "invalid hit_count";
  if (!Number.isFinite(missCount) || missCount < 0) return "invalid miss_count";
  if (!Number.isFinite(maxCombo) || maxCombo < 0) return "invalid max_combo";
  if (!Number.isFinite(durationMs) || durationMs < MIN_PLAY_MS || durationMs > MAX_PLAY_MS) {
    return "invalid duration_ms";
  }

  if (maxCombo > hitCount) return "max_combo exceeds hit_count";

  const maxPossible = getMaxPossibleScore(hitCount, maxCombo);
  const floorPossible = Math.max(0, (hitCount * 200) - (missCount * 80));

  if (score > maxPossible + 5000) return "score above possible max";
  if (score < floorPossible - 5000) return "score below expected floor";

  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const ip = getIp(req);
    const gate = rateLimit(`submit-score:${ip}`, 30, 60 * 1000);
    if (!gate.ok) {
      return res.status(429).json({ ok: false, error: "Too many requests" });
    }

    const body = req.body || {};
    const wallet = String(body.wallet || "").trim();
    const runToken = String(body.run_token || "").trim();
    const score = Number(body.score);
    const city = String(body.city || "").trim();
    const country = String(body.country || "TR").trim();
    const mode = String(body.mode || "free").trim();
    const hitCount = Number(body.hit_count || 0);
    const missCount = Number(body.miss_count || 0);
    const maxCombo = Number(body.max_combo || 0);
    const durationMs = Number(body.duration_ms || 0);

    if (!wallet) {
      return res.status(400).json({ ok: false, error: "wallet required" });
    }

    if (!runToken) {
      return res.status(400).json({ ok: false, error: "run_token required" });
    }

    if (!Number.isFinite(score) || score < 0 || score > MAX_REASONABLE_SCORE) {
      return res.status(400).json({ ok: false, error: "valid score required" });
    }

    const db = supa();
    const now = nowMs();

    const { data: run, error: runError } = await db
      .from("game_runs")
      .select("*")
      .eq("run_token", runToken)
      .maybeSingle();

    if (runError) {
      return res.status(500).json({ ok: false, error: runError.message || "Failed to read run" });
    }

    if (!run) {
      return res.status(400).json({ ok: false, error: "run not found" });
    }

    if (String(run.wallet || "") !== wallet) {
      return res.status(400).json({ ok: false, error: "wallet mismatch" });
    }

    if (String(run.mode || "") !== mode) {
      return res.status(400).json({ ok: false, error: "mode mismatch" });
    }

    if (String(run.city || "") !== city) {
      return res.status(400).json({ ok: false, error: "city mismatch" });
    }

    if (Number(run.used_at || 0) > 0) {
      return res.status(400).json({ ok: false, error: "run already used" });
    }

    const createdAt = Number(run.created_at || 0);
    const expiresAt = Number(run.expires_at || 0);
    const ageMs = now - createdAt;

    if (now > expiresAt) {
      return res.status(400).json({ ok: false, error: "run expired" });
    }

    if (ageMs < MIN_PLAY_MS) {
      return res.status(400).json({ ok: false, error: "run finished too early" });
    }

    if (ageMs > MAX_PLAY_MS) {
      return res.status(400).json({ ok: false, error: "run too old" });
    }

    const telemetryError = validateTelemetry({
      score,
      hitCount,
      missCount,
      maxCombo,
      durationMs
    });

    const verified = !telemetryError;

    if (telemetryError) {
      await logSuspiciousRun({
        runToken,
        wallet,
        reason: telemetryError,
        rawPayload: body
      });
    }

    const { data: user, error: userError } = await db
      .from("users")
      .select("wallet, best_score, pass_until, created_at")
      .eq("wallet", wallet)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({ ok: false, error: userError.message || "Failed to read user" });
    }

    if (mode === "ranked") {
      const passUntil = Number(user?.pass_until || 0);
      if (!user || passUntil <= now) {
        return res.status(403).json({ ok: false, error: "Ranked pass required" });
      }
    }

    const prevBest = Number(user?.best_score || 0);
    const best = verified ? Math.max(prevBest, score) : prevBest;

    if (user) {
      const { error: updateError } = await db
        .from("users")
        .update({ best_score: best })
        .eq("wallet", wallet);

      if (updateError) {
        return res.status(500).json({ ok: false, error: updateError.message || "Failed to update best score" });
      }
    } else {
      const { error: insertUserError } = await db
        .from("users")
        .insert({
          wallet,
          best_score: best,
          pass_until: 0,
          created_at: now
        });

      if (insertUserError) {
        return res.status(500).json({ ok: false, error: insertUserError.message || "Failed to create user" });
      }
    }

    const weekKey = String(run.week_key || "");

    const { error: scoreInsertError } = await db
      .from("scores")
      .insert({
        wallet,
        run_token: runToken,
        score,
        best_score: best,
        city,
        country,
        mode,
        week_key: weekKey,
        verified,
        hit_count: hitCount,
        miss_count: missCount,
        max_combo: maxCombo,
        duration_ms: durationMs,
        created_at: now
      });

    if (scoreInsertError) {
      return res.status(500).json({ ok: false, error: scoreInsertError.message || "Failed to save score history" });
    }

    const { error: runUpdateError } = await db
      .from("game_runs")
      .update({
        used_at: now,
        final_score: score,
        verification_status: verified ? "verified" : "rejected",
        hit_count: hitCount,
        miss_count: missCount,
        max_combo: maxCombo,
        duration_ms: durationMs,
        suspicious: !verified
      })
      .eq("run_token", runToken);

    if (runUpdateError) {
      return res.status(500).json({ ok: false, error: runUpdateError.message || "Failed to close run" });
    }

    return res.status(200).json({
      ok: true,
      best,
      mode,
      verified
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
