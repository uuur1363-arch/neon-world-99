export const runtime = "nodejs";

import { supa, nowMs } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const body = req.body || {};
    const wallet = String(body.wallet || "").trim();
    const score = Number(body.score);
    const city = String(body.city || "").trim();
    const country = String(body.country || "TR").trim();
    const mode = String(body.mode || "free").trim();

    if (!Number.isFinite(score) || score < 0) {
      return res.status(400).json({ ok: false, error: "valid score required" });
    }

    if (!wallet) {
      return res.status(400).json({ ok: false, error: "wallet required" });
    }

    const db = supa();
    const now = nowMs();

    const { data: user, error: userError } = await db
      .from("users")
      .select("wallet, best_score, pass_until, created_at")
      .eq("wallet", wallet)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({ ok: false, error: userError.message || "Failed to read user" });
    }

    // ranked skor için aktif pass şart
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
      const { error: insertError } = await db
        .from("users")
        .insert({
          wallet,
          best_score: best,
          pass_until: 0,
          created_at: now
        });

      if (insertError) {
        return res.status(500).json({
          ok: false,
          error: insertError.message || "Failed to create user"
        });
      }
    }

    // skor geçmişi/log tablon varsa yaz, yoksa sessiz geç
    try {
      await db.from("scores").insert({
        wallet,
        score,
        best_score: best,
        city,
        country,
        mode,
        created_at: now
      });
    } catch (_) {}

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
