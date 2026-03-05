export const runtime = "nodejs";

import { supa } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { wallet, score } = req.body || {};
    if (!wallet || typeof score !== "number") {
      return res.status(400).json({ ok: false, error: "wallet and score required" });
    }

    const db = supa();

    // get previous best
    const { data: u } = await db
      .from("users")
      .select("best_score")
      .eq("wallet", wallet)
      .maybeSingle();

    const prev = Number(u?.best_score || 0);
    const best = Math.max(prev, score);

    const { error } = await db.from("users").upsert({
      wallet,
      best_score: best,
      created_at: Date.now(),
    });

    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.status(200).json({ ok: true, best });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
