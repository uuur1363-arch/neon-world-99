export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "GET only"
      });
    }

    const db = supa();
    const weekKey = String(req.query.week_key || currentWeekKey()).trim();

    let totalRuns = 0;
    let freeRuns = 0;
    let rankedRuns = 0;
    let uniqueWallets = 0;
    let totalScores = 0;
    let challengesCreated = 0;
    let activeChallenges = 0;
    let claimedChallenges = 0;

    // scores
    const { data: scores, error: scoresError } = await db
      .from("scores")
      .select("wallet, mode, week_key");

    if (scoresError) {
      return res.status(500).json({
        ok: false,
        error: scoresError.message || "Failed to read scores"
      });
    }

    const allScores = Array.isArray(scores) ? scores : [];
    totalScores = allScores.length;

    const weekScores = allScores.filter((row) => String(row.week_key || "") === weekKey);
    totalRuns = weekScores.length;
    freeRuns = weekScores.filter((row) => String(row.mode || "") === "free").length;
    rankedRuns = weekScores.filter((row) => String(row.mode || "") === "ranked").length;

    const walletSet = new Set();
    for (const row of weekScores) {
      const w = String(row.wallet || "").trim();
      if (w) walletSet.add(w);
    }
    uniqueWallets = walletSet.size;

    // challenges
    const { data: challenges, error: challengesError } = await db
      .from("challenges")
      .select("id, status, week_key");

    if (challengesError) {
      return res.status(500).json({
        ok: false,
        error: challengesError.message || "Failed to read challenges"
      });
    }

    const allChallenges = Array.isArray(challenges) ? challenges : [];
    const weekChallenges = allChallenges.filter((row) => String(row.week_key || "") === weekKey);

    challengesCreated = weekChallenges.length;
    activeChallenges = weekChallenges.filter((row) => String(row.status || "") === "open").length;
    claimedChallenges = weekChallenges.filter((row) => String(row.status || "") === "claimed").length;

    return res.status(200).json({
      ok: true,
      week_key: weekKey,
      total_runs: totalRuns,
      free_runs: freeRuns,
      ranked_runs: rankedRuns,
      unique_wallets: uniqueWallets,
      total_scores_all_time: totalScores,
      challenges_created: challengesCreated,
      active_challenges: activeChallenges,
      claimed_challenges: claimedChallenges
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
