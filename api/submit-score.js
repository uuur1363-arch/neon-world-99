export const runtime = "nodejs";

import { supa, nowMs } from "./_db.js";

const GAME_SECONDS = 60;
const MIN_PLAY_MS = 45000;
const MAX_PLAY_MS = 5 * 60 * 1000;
const MAX_REASONABLE_SCORE = 5000000;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const body = req.body || {};
    const wallet = String(body.wallet || "").trim();
    const runToken = String(body.run_token || "").trim();
    const score = Number(body.score);
    const city = String(body.city || "").trim();
    const country = String(body.country || "TR").trim();
    const mode = String(body.mode || "free").trim();

    if (!wallet) {
      return res.status(400).json({
        ok: false,
        error: "wallet required"
      });
    }

    if (!runToken) {
      return res.status(400).json({
        ok: false,
        error: "run_token required"
      });
    }

    if (!Number.isFinite(score) || score < 0) {
      return res.status(400).json({
        ok: false,
        error: "valid score required"
      });
    }

    if (score > MAX_REASONABLE_SCORE) {
      return res.status(400).json({
        ok: false,
        error: "score too high"
      });
    }

    const db = supa();
    const now = nowMs();

    const { data: run, error: runError } = await db
      .from("game_runs")
      .select("*")
      .eq("run_token", runToken)
      .maybeSingle();

    if (runError) {
      return res.status(500).json({
        ok: false,
        error: runError.message || "Failed to read run"
      });
    }

    if (!run) {
      return res.status(400).json({
        ok: false,
        error: "run not found"
      });
    }

    if (String(run.wallet || "") !== wallet) {
      return res.status(400).json({
        ok: false,
        error: "wallet mismatch"
      });
    }

    if (String(run.mode || "") !== mode) {
      return res.status(400).json({
        ok: false,
        error: "mode mismatch"
      });
    }

    if (Number(run.used_at || 0) > 0) {
      return res.status(400).json({
        ok: false,
        error: "run already used"
      });
    }

    const createdAt = Number(run.created_at || 0);
    const expiresAt = Number(run.expires_at || 0);
    const ageMs = now - createdAt;

    if (now > expiresAt) {
      return res.status(400).json({
        ok: false,
        error: "run expired"
      });
    }

    if (ageMs < MIN_PLAY_MS) {
      return res.status(400).json({
        ok: false,
        error: "run finished too early"
      });
    }

    if (ageMs > MAX_PLAY_MS) {
      return res.status(400).json({
        ok: false,
        error: "run too old"
      });
    }

    const { data: user, error: userError } = await db
      .from("users")
      .select("wallet, best_score, pass_until, created_at")
      .eq("wallet", wallet)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({
        ok: false,
        error: userError.message || "Failed to read user"
      });
    }

    if (mode === "ranked") {
      const passUntil = Number(user?.pass_until || 0);

      if (!user || passUntil <= now) {
        return res.status(403).json({
          ok: false,
          error: "Ranked pass required"
        });
      }
    }

    const prevBest = Number(user?.best_score || 0);
    const best = Math.max(prevBest, score);

    if (user) {
      const { error: updateError } = await db
        .from("users")
        .update({
          best_score: best
        })
        .eq("wallet", wallet);

      if (updateError) {
        return res.status(500).json({
          ok: false,
          error: updateError.message || "Failed to update best score"
        });
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
        return res.status(500).json({
          ok: false,
          error: insertUserError.message || "Failed to create user"
        });
      }
    }

    const { error: scoreInsertError } = await db
      .from("scores")
      .insert({
        wallet,
        score,
        best_score: best,
        city,
        country,
        mode,
        created_at: now
      });

    if (scoreInsertError) {
      return res.status(500).json({
        ok: false,
        error: scoreInsertError.message || "Failed to save score history"
      });
    }

    const { error: runUpdateError } = await db
      .from("game_runs")
      .update({
        used_at: now,
        final_score: score
      })
      .eq("run_token", runToken);

    if (runUpdateError) {
      return res.status(500).json({
        ok: false,
        error: runUpdateError.message || "Failed to close run"
      });
    }

    return res.status(200).json({
      ok: true,
      best,
      mode
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
