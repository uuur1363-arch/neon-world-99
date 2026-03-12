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
        error: jackpotError.message || "Failed to read jackpot"
      });
    }

    if (!jackpot) {
      return res.status(404).json({
        ok: false,
        error: "No jackpot found"
      });
    }

    if (jackpot.status !== "closed") {
      return res.status(400).json({
        ok: false,
        error: "Jackpot must be closed first"
      });
    }

    const winnerWallet = String(jackpot.winner_wallet || "").trim();
    const winnerScore = Number(jackpot.winner_score || 0);
    const amountLamports = Number(jackpot.total_lamports || 0);
    const amountSol = amountLamports / 1e9;

    if (!winnerWallet) {
      return res.status(400).json({
        ok: false,
        error: "No winner wallet found"
      });
    }

    if (winnerScore <= 0) {
      return res.status(400).json({
        ok: false,
        error: "No valid winner score found"
      });
    }

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

    const { error: insertError } = await db
      .from("payout_jobs")
      .insert({
        week_key: weekKey,
        winner_wallet: winnerWallet,
        amount_lamports: amountLamports,
        amount_sol: amountSol,
        status: "pending",
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      return res.status(500).json({
        ok: false,
        error: insertError.message || "Failed to create payout job"
      });
    }

    return res.status(200).json({
      ok: true,
      created: true,
      week_key: weekKey,
      winner_wallet: winnerWallet,
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
