import { supa, nowMs } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    const wallet = String(req.query.wallet || "").trim();

    if (!wallet) {
      return res.status(400).json({
        ok: false,
        error: "wallet required"
      });
    }

    const db = supa();

    const { data, error } = await db
      .from("users")
      .select("wallet, pass_until, best_score")
      .eq("wallet", wallet)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to read user"
      });
    }

    const now = nowMs();
    const passUntil = Number(data?.pass_until || 0);
    const bestScore = Number(data?.best_score || 0);
    const pass = passUntil > now;

    return res.status(200).json({
      ok: true,
      wallet,
      exists: !!data,
      pass,
      pass_until: passUntil,
      best_score: bestScore
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
