export const runtime = "nodejs";

import { supa, nowMs } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "GET only"
      });
    }

    const wallet = String(req.query.wallet || "").trim();

    if (!wallet) {
      return res.status(400).json({
        ok: false,
        error: "wallet required"
      });
    }

    const db = supa();
    const now = nowMs();

    const { data: user, error } = await db
      .from("users")
      .select("wallet, pass_until, best_score, created_at")
      .eq("wallet", wallet)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to read user"
      });
    }

    const passUntil = Number(user?.pass_until || 0);
    const bestScore = Number(user?.best_score || 0);

    return res.status(200).json({
      ok: true,
      wallet,
      exists: !!user,
      pass: passUntil > now,
      pass_until: passUntil,
      best_score: bestScore,
      created_at: Number(user?.created_at || 0)
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
