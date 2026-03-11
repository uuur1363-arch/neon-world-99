export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "POST only"
      });
    }

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
        error: jackpotError.message || "Failed to read jackpot"
      });
    }

    if (!jackpot) {
      return res.status(404).json({
        ok: false,
        error: "No jackpot found for current week"
      });
    }

    if (jackpot.status === "closed") {
      return res.status(200).json({
        ok: true,
        already_closed: true,
        week_key: weekKey,
        winner_wallet: jackpot.winner_wallet || null,
        winner_score: Number(jackpot.winner_score || 0),
        jackpot_lamports: Number(jackpot.total_lamports || 0),
        jackpot_sol: Number(jackpot.total_lamports || 0) / 1e9
      });
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const startMs = now - (7 * dayMs);

    const { data: rankedScores, error: scoresError } = await db
      .from("scores")
      .select("wallet, score, created_at")
      .eq("mode", "ranked")
      .gte("created_at", startMs)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);

    if (scoresError) {
      return res.status(500).json({
        ok: false,
        error: scoresError.message || "Failed to read ranked scores"
      });
    }

    const leader = Array.isArray(rankedScores) && rankedScores.length > 0
      ? rankedScores[0]
      : null;

    const winnerWallet = leader?.wallet || null;
    const winnerScore = Number(leader?.score || 0);

    const { error: updateError } = await db
      .from("weekly_jackpots")
      .update({
        winner_wallet: winnerWallet,
        winner_score: winnerScore,
        status: "closed",
        updated_at: new Date().toISOString()
      })
      .eq("week_key", weekKey);

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: updateError.message || "Failed to close jackpot"
      });
    }

    return res.status(200).json({
      ok: true,
      closed: true,
      week_key: weekKey,
      winner_wallet: winnerWallet,
      winner_score: winnerScore,
      jackpot_lamports: Number(jackpot.total_lamports || 0),
      jackpot_sol: Number(jackpot.total_lamports || 0) / 1e9,
      entry_count: Number(jackpot.entry_count || 0)
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
