export const runtime = "nodejs";

import { Connection, PublicKey } from "@solana/web3.js";
import { supa, nowMs, currentWeekKey } from "./_db.js";
import { rateLimit, getIp } from "./_security.js";

export default async function handler(req, res) {
  try {

    if (req.method !== "POST") {
      return res.status(405).json({
        ok:false,
        error:"POST only"
      });
    }

    const ip = getIp(req);
    const gate = rateLimit(`verify-payment:${ip}`,20,60000);

    if (!gate.ok) {
      return res.status(429).json({
        ok:false,
        error:"Too many requests"
      });
    }

    const { wallet, signature } = req.body || {};

    if (!wallet || !signature) {
      return res.status(400).json({
        ok:false,
        error:"Missing wallet/signature"
      });
    }

    const rpc = process.env.SOLANA_RPC_URL;
    const treasury = process.env.TREASURY_WALLET;
    const ENTRY_SOL = Number(process.env.ENTRY_SOL || 0.01);
    const PASS_HOURS = Number(process.env.PASS_HOURS || 24);

    if (!rpc || !treasury) {
      return res.status(500).json({
        ok:false,
        error:"Server not configured"
      });
    }

    const connection = new Connection(rpc,"confirmed");

    const tx = await connection.getParsedTransaction(signature,{
      maxSupportedTransactionVersion:0,
      commitment:"confirmed"
    });

    if (!tx) {
      return res.status(400).json({
        ok:false,
        error:"Transaction not found"
      });
    }

    if (tx.meta?.err) {
      return res.status(400).json({
        ok:false,
        error:"Transaction failed"
      });
    }

    const feePayer =
      tx.transaction.message.accountKeys[0].pubkey.toString();

    if (feePayer !== wallet) {
      return res.status(400).json({
        ok:false,
        error:"Wallet mismatch"
      });
    }

    const treasuryPk = new PublicKey(treasury);
    const needLamports = Math.round(ENTRY_SOL * 1e9);

    let transferOk = false;

    for (const ix of tx.transaction.message.instructions) {

      if (
        ix.program === "system" &&
        ix.parsed?.type === "transfer"
      ) {

        const info = ix.parsed.info;

        if (
          info.source === wallet &&
          info.destination === treasuryPk.toString() &&
          Number(info.lamports) >= needLamports
        ) {
          transferOk = true;
        }

      }

    }

    if (!transferOk) {
      return res.status(400).json({
        ok:false,
        error:"Payment not detected"
      });
    }

    const db = supa();
    const now = nowMs();

    const { data:existingSig } = await db
      .from("used_signatures")
      .select("sig")
      .eq("sig",signature)
      .maybeSingle();

    if (existingSig) {
      return res.status(400).json({
        ok:false,
        error:"Signature already used"
      });
    }

    await db
      .from("used_signatures")
      .insert({
        sig:signature,
        wallet,
        used_at:now
      });

    const { data:user } = await db
      .from("users")
      .select("*")
      .eq("wallet",wallet)
      .maybeSingle();

    const passUntil =
      now + PASS_HOURS * 60 * 60 * 1000;

    if (user) {

      await db
        .from("users")
        .update({
          pass_until:passUntil
        })
        .eq("wallet",wallet);

    } else {

      await db
        .from("users")
        .insert({
          wallet,
          pass_until:passUntil,
          best_score:0,
          created_at:now
        });

    }

    const weekKey = currentWeekKey();

    const { data:jackpot } = await db
      .from("weekly_jackpots")
      .select("*")
      .eq("week_key",weekKey)
      .maybeSingle();

    const jackpotAdd =
      Math.round(ENTRY_SOL * 1e9 * 0.30);

    if (jackpot) {

      await db
        .from("weekly_jackpots")
        .update({
          total_lamports:
            Number(jackpot.total_lamports || 0) + jackpotAdd,
          entry_count:
            Number(jackpot.entry_count || 0) + 1,
          updated_at:new Date().toISOString()
        })
        .eq("week_key",weekKey);

    } else {

      await db
        .from("weekly_jackpots")
        .insert({
          week_key:weekKey,
          total_lamports:jackpotAdd,
          entry_count:1,
          status:"open",
          updated_at:new Date().toISOString()
        });

    }

    return res.status(200).json({
      ok:true,
      pass_until:passUntil
    });

  } catch (e) {

    console.error("verify-payment fatal",e);

    return res.status(500).json({
      ok:false,
      error:String(e?.message || e)
    });

  }
}
