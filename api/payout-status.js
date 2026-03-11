export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";

export default async function handler(req, res) {
  try {
    const db = supa();
    const weekKey = String(req.query.week_key || currentWeekKey()).trim();

    const { data, error } = await db
      .from("payout_jobs")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to read payout status"
      });
    }

    if (!data) {
      return res.status(200).json({
        ok: true,
        exists: false,
        week_key: weekKey
      });
    }

    return res.status(200).json({
      ok: true,
      exists: true,
      week_key: weekKey,
      winner_wallet: data.winner_wallet,
      amount_lamports: Number(data.amount_lamports || 0),
      amount_sol: Number(data.amount_sol || 0),
      status: data.status,
      tx_signature: data.tx_signature || null
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
