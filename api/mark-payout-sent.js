export const runtime = "nodejs";

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { supa, currentWeekKey } from "./_db.js";

function loadTreasuryKeypair() {
  const raw = process.env.TREASURY_SECRET_KEY;
  if (!raw) {
    throw new Error("TREASURY_SECRET_KEY missing");
  }

  let arr;
  try {
    arr = JSON.parse(raw);
  } catch {
    throw new Error("TREASURY_SECRET_KEY must be a JSON array");
  }

  if (!Array.isArray(arr)) {
    throw new Error("TREASURY_SECRET_KEY must be a JSON array");
  }

  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

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

    const rpc = process.env.SOLANA_RPC_URL;
    if (!rpc) {
      return res.status(500).json({
        ok: false,
        error: "SOLANA_RPC_URL missing"
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

    if (job.status === "sent" && job.tx_signature) {
      return res.status(200).json({
        ok: true,
        already_sent: true,
        week_key: weekKey,
        tx_signature: job.tx_signature
      });
    }

    const amountLamports = Number(job.amount_lamports || 0);
    const winnerWallet = String(job.winner_wallet || "").trim();

    if (!winnerWallet) {
      return res.status(400).json({
        ok: false,
        error: "Winner wallet missing"
      });
    }

    if (amountLamports <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid payout amount"
      });
    }

    const treasury = loadTreasuryKeypair();
    const connection = new Connection(rpc, "confirmed");

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: new PublicKey(winnerWallet),
        lamports: amountLamports
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      [treasury],
      {
        commitment: "confirmed",
        preflightCommitment: "confirmed"
      }
    );

    const { error: updateError } = await db
      .from("payout_jobs")
      .update({
        status: "sent",
        tx_signature: signature,
        updated_at: new Date().toISOString()
      })
      .eq("week_key", weekKey);

    if (updateError) {
      return res.status(500).json({
        ok: false,
        error: updateError.message || "Payout sent but DB update failed",
        tx_signature: signature
      });
    }

    return res.status(200).json({
      ok: true,
      week_key: weekKey,
      status: "sent",
      tx_signature: signature,
      winner_wallet: winnerWallet,
      amount_lamports: amountLamports,
      amount_sol: amountLamports / 1e9
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
