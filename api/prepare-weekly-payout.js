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

    const body = req.body || {};
    const adminSecret = String(body.admin_secret || "").trim();
    const expectedSecret = String(process.env.ADMIN_SECRET || "").trim();
    const weekKey = String(body.week_key || currentWeekKey()).trim();

    if (!expectedSecret) {
      return res.status(500).json({
        ok: false,
        error: "ADMIN_SECRET missing"
      });
    }

    if (!adminSecret || adminSecret !== expectedSecret) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    const db = supa();

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
        error: "No jackpot found"
      });
    }

    const jackpotStatus = String(jackpot.status || "open");
    if (jackpotStatus !== "closed" && jackpotStatus !== "open") {
      return res.status(400).json({
        ok: false,
        error: "Invalid jackpot status"
      });
    }

    let rankedScores = null;
    let scoresError = null;

    {
      const attempt = await db
        .from("scores")
        .select("wallet, score, city, country, mode, created_at")
        .eq("mode", "ranked")
        .eq("week_key", weekKey)
        .eq("verified", true)
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);

      rankedScores = attempt.data || null;
      scoresError = attempt.error || null;
    }

    if (scoresError) {
      const msg = String(scoresError.message || "").toLowerCase();
      const missingColumn =
        msg.includes("column") ||
        msg.includes("week_key") ||
        msg.includes("verified");

      if (!missingColumn) {
        return res.status(500).json({
          ok: false,
          error: scoresError.message || "Failed to read winner"
        });
      }

      const legacy = await db
        .from("scores")
        .select("wallet, score, city, country, mode, created_at")
        .eq("mode", "ranked")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (legacy.error) {
        return res.status(500).json({
          ok: false,
          error: legacy.error.message || "Failed to read winner"
        });
      }

      rankedScores = legacy.data || [];
    }

    const leader = rankedScores?.[0];

    if (!leader?.wallet || Number(leader?.score || 0) <= 0) {
      return res.status(400).json({
        ok: false,
        error: "No valid winner score found"
      });
    }

    const amountLamports = Number(jackpot.total_lamports || 0);
    const amountSol = amountLamports / 1e9;

    if (amountLamports <= 0) {
      return res.status(400).json({
        ok: false,
        error: "No jackpot amount to pay"
      });
    }

    const { data: existingJob, error: existingError } = await db
      .from("payout_jobs")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        ok: false,
        error: existingError.message || "Failed to read payout job"
      });
    }

    if (existingJob) {
      return res.status(200).json({
        ok: true,
        already_exists: true,
        week_key: weekKey,
        winner_wallet: existingJob.winner_wallet,
        amount_lamports: Number(existingJob.amount_lamports || 0),
        amount_sol: Number(existingJob.amount_sol || 0),
        status: existingJob.status,
        tx_signature: existingJob.tx_signature || null
      });
    }

    const nowIso = new Date().toISOString();

    const { error: insertError } = await db
      .from("payout_jobs")
      .insert({
        week_key: weekKey,
        winner_wallet: leader.wallet,
        amount_lamports: amountLamports,
        amount_sol: amountSol,
        status: "pending",
        updated_at: nowIso
      });

    if (insertError) {
      return res.status(500).json({
        ok: false,
        error: insertError.message || "Failed to create payout job"
      });
    }

    const { error: jackpotUpdateError } = await db
      .from("weekly_jackpots")
      .update({
        status: "closed",
        winner_wallet: leader.wallet,
        winner_score: Number(leader.score || 0),
        closed_at: nowIso,
        updated_at: nowIso
      })
      .eq("week_key", weekKey);

    if (jackpotUpdateError) {
      return res.status(500).json({
        ok: false,
        error: jackpotUpdateError.message || "Failed to close jackpot"
      });
    }

    return res.status(200).json({
      ok: true,
      created: true,
      week_key: weekKey,
      winner_wallet: leader.wallet,
      winner_score: Number(leader.score || 0),
      amount_lamports: amountLamports,
      amount_sol: amountSol,
      status: "pending"
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
