export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    const db = supa();
    const weekKey = String(req.query.week_key || currentWeekKey()).trim();

    const { data: jackpot, error: jackpotError } = await db
      .from("weekly_jackpots")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (jackpotError) {
      return res.status(500).json({ ok: false, error: jackpotError.message || "Failed to read jackpot" });
    }

    const { data: rankedScores, error: scoresError } = await db
      .from("scores")
      .select("wallet, score, city, country, mode, created_at")
      .eq("mode", "ranked")
      .eq("week_key", weekKey)
      .eq("verified", true)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);

    if (scoresError) {
      return res.status(500).json({ ok: false, error: scoresError.message || "Failed to read ranked scores" });
    }

    const leader = Array.isArray(rankedScores) && rankedScores.length > 0
      ? rankedScores[0]
      : null;

    const totalLamports = Number(jackpot?.total_lamports || 0);
    const totalSol = totalLamports / 1e9;
    const entryCount = Number(jackpot?.entry_count || 0);

    return res.status(200).json({
      ok: true,
      week_key: weekKey,
      jackpot_lamports: totalLamports,
      jackpot_sol: totalSol,
      entry_count: entryCount,
      status: jackpot?.status || "open",
      leader_wallet: leader?.wallet || null,
      leader_score: Number(leader?.score || 0),
      leader_city: leader?.city || null,
      leader_country: leader?.country || null,
      winner_wallet: jackpot?.winner_wallet || null,
      winner_score: Number(jackpot?.winner_score || 0)
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
