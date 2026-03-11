export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    const db = supa();
    const weekKey = currentWeekKey();

    const { data, error } = await db
      .from("weekly_jackpots")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to read jackpot"
      });
    }

    const totalLamports = Number(data?.total_lamports || 0);
    const totalSol = totalLamports / 1e9;

    return res.status(200).json({
      ok: true,
      week_key: weekKey,
      total_lamports: totalLamports,
      total_sol: totalSol,
      entry_count: Number(data?.entry_count || 0),
      status: data?.status || "open",
      winner_wallet: data?.winner_wallet || null,
      winner_score: Number(data?.winner_score || 0)
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
