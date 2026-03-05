import { supa, nowMs } from "./_db.js";

export default async function handler(req, res) {
  try {
    const wallet = String(req.query.wallet || "");
    if (!wallet) return res.status(400).json({ ok: false, error: "wallet required" });

    const db = supa();
    const { data } = await db
      .from("users")
      .select("wallet,pass_until,best_score")
      .eq("wallet", wallet)
      .maybeSingle();

    const t = nowMs();
    const passUntil = Number(data?.pass_until || 0);
    const pass = passUntil > t;

    return res.status(200).json({
      ok: true,
      wallet,
      pass,
      pass_until: passUntil,
      best_score: Number(data?.best_score || 0),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
