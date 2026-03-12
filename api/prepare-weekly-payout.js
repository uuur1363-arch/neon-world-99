export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";
import { requireAdmin } from "./_security.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const admin = requireAdmin(req);
    if (!admin.ok) {
      return res.status(admin.status).json({ ok: false, error: admin.error });
    }

    const db = supa();
    const weekKey = String(req.body?.week_key || currentWeekKey()).trim();

    const { data: jackpot, error: jackpotError } = await db
      .from("weekly_jackpots")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (jackpotError) {
      return res.status(500).json({ ok: false, error: jackpotError.message || "Failed to read jackpot" });
    }

    if (!jackpot) {
      return res.status(404).json({ ok: false, error: "No jackpot found" });
    }

    if (jackpot.status !== "closed") {
      return res.status(400).json({ ok: false, error: "Jackpot must be closed first" });
    }

    const { data: rankedScores, error: scoresError } = await db
      .from("scores")
      .select("wallet, score")
      .eq("mode", "ranked")
      .eq("verified", true)
      .eq("week_key", weekKey)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);

    if (scoresError) {
      return res.status(500).json({ ok: false, error: scoresError.message || "Failed to read winner" });
    }

    const leader = rankedScores?.[0];
    if (!leader?.wallet || Number(leader?.score || 0) <= 0) {
      return res.status(400).json({ ok: false, error: "No valid winner score found" });
    }

    const amountLamports = Number(jackpot.total_lamports || 0);
    const amountSol = amountLamports / 1e9;

    if (amountLamports <= 0) {
      return res.status(400).json({ ok: false, error: "No jackpot amount to pay" });
    }

    const { data: existingJob, error: existingError } = await db
      .from("payout_jobs")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ ok: false, error: existingError.message || "Failed to read payout job" });
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

    const { error: insertError } = await db.from("payout_jobs").insert({
      week_key: weekKey,
      winner_wallet: leader.wallet,
      amount_lamports: amountLamports,
      amount_sol: amountSol,
      status: "pending",
      updated_at: new Date().toISOString()
    });

    if (insertError) {
      return res.status(500).json({ ok: false, error: insertError.message || "Failed to create payout job" });
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
