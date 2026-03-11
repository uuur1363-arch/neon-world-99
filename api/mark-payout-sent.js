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
    const weekKey = String(body.week_key || currentWeekKey()).trim();
    const txSignature = String(body.tx_signature || "").trim();

    if (!txSignature) {
      return res.status(400).json({
        ok: false,
        error: "tx_signature required"
      });
    }

    const db = supa();

    const { data: job, error: readError } = await db
      .from("payout_jobs")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (readError) {
      return res.status(500).json({
        ok: false,
        error: readError.message || "Failed to read payout job"
      });
    }

    if (!job) {
      return res.status(404).json({
        ok: false,
        error: "Payout job not found"
      });
    }

    const { error: updateError } = await db
      .from("payout_jobs")
      .update({
        status: "sent",
        tx_signature: txSignature,
        updated_at: new Date().toISOString()
      })
      .eq("week_key", weekKey);

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: updateError.message || "Failed to update payout job"
      });
    }

    return res.status(200).json({
      ok: true,
      week_key: weekKey,
      status: "sent",
      tx_signature: txSignature
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
