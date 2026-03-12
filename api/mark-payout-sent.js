export const runtime = "nodejs";

import { Connection, PublicKey } from "@solana/web3.js";
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

    const body = req.body || {};
    const weekKey = String(body.week_key || currentWeekKey()).trim();
    const txSignature = String(body.tx_signature || "").trim();

    if (!txSignature) {
      return res.status(400).json({ ok: false, error: "tx_signature required" });
    }

    const db = supa();

    const { data: job, error: readError } = await db
      .from("payout_jobs")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (readError) {
      return res.status(500).json({ ok: false, error: readError.message || "Failed to read payout job" });
    }

    if (!job) {
      return res.status(404).json({ ok: false, error: "Payout job not found" });
    }

    const rpc = process.env.SOLANA_RPC_URL;
    const treasury = process.env.TREASURY_WALLET;

    if (!rpc || !treasury) {
      return res.status(500).json({ ok: false, error: "Server not configured" });
    }

    const connection = new Connection(rpc, "confirmed");
    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed"
    });

    if (!tx || tx.meta?.err) {
      return res.status(400).json({ ok: false, error: "Invalid or failed transaction" });
    }

    const treasuryPk = new PublicKey(treasury).toString();
    const winnerWallet = String(job.winner_wallet || "");
    const needLamports = Number(job.amount_lamports || 0);

    let transferOk = false;

    for (const ix of tx.transaction.message.instructions || []) {
      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const info = ix.parsed.info || {};
        const source = String(info.source || "");
        const destination = String(info.destination || "");
        const lamports = Number(info.lamports || 0);

        if (
          source === treasuryPk &&
          destination === winnerWallet &&
          lamports >= needLamports
        ) {
          transferOk = true;
          break;
        }
      }
    }

    if (!transferOk) {
      return res.status(400).json({
        ok: false,
        error: "Matching payout transfer not found on-chain"
      });
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await db
      .from("payout_jobs")
      .update({
        status: "sent",
        tx_signature: txSignature,
        updated_at: nowIso
      })
      .eq("week_key", weekKey);

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: updateError.message || "Failed to update payout job"
      });
    }

    await db
      .from("weekly_jackpots")
      .update({
        status: "paid",
        paid_at: nowIso
      })
      .eq("week_key", weekKey);

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
