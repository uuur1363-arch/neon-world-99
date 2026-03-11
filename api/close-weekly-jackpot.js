export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";

export default async function handler(req, res) {
  try {

    const db = supa();
    const weekKey = currentWeekKey();

    const { data: jackpot, error: jackpotError } = await db
      .from("weekly_jackpots")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (jackpotError) {
      return res.status(500).json({
        ok: false,
        error: jackpotError.message
      });
    }

    if (!jackpot) {
      return res.status(404).json({
        ok: false,
        error: "No jackpot found"
      });
    }

    if (jackpot.status === "closed") {
      return res.status(200).json({
        ok: true,
        already_closed: true,
        winner_wallet: jackpot.winner_wallet,
        winner_score: jackpot.winner_score
      });
    }

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const startMs = now - weekMs;

    const { data: rankedScores, error: scoresError } = await db
      .from("scores")
      .select("wallet, score")
      .eq("mode", "ranked")
      .gte("created_at", startMs)
      .order("score", { ascending: false })
      .limit(1);

    if (scoresError) {
      return res.status(500).json({
        ok: false,
        error: scoresError.message
      });
    }

    const leader = rankedScores?.[0] || null;

    const winnerWallet = leader?.wallet || null;
    const winnerScore = Number(leader?.score || 0);

    await db
      .from("weekly_jackpots")
      .update({
        winner_wallet: winnerWallet,
        winner_score: winnerScore,
        status: "closed",
        updated_at: new Date().toISOString()
      })
      .eq("week_key", weekKey);

    return res.status(200).json({
      ok: true,
      week_key: weekKey,
      winner_wallet: winnerWallet,
      winner_score: winnerScore,
      jackpot_sol: Number(jackpot.total_lamports || 0) / 1e9
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
