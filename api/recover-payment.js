export const runtime = "nodejs";

import { Connection, PublicKey } from "@solana/web3.js";
import { supa, nowMs, currentWeekKey } from "./_db.js";
import { rateLimit, getIp } from "./_security.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "POST only"
      });
    }

    const ip = getIp(req);
    const gate = rateLimit(`recover-payment:${ip}`, 10, 60 * 1000);
    if (!gate.ok) {
      return res.status(429).json({
        ok: false,
        error: "Too many requests"
      });
    }

    const { wallet, signature } = req.body || {};

    if (!wallet || !signature) {
      return res.status(400).json({
        ok: false,
        error: "Missing wallet/signature"
      });
    }

    const rpc = process.env.SOLANA_RPC_URL;
    const treasury = process.env.TREASURY_WALLET;
    const ENTRY_SOL = Number(process.env.ENTRY_SOL || 0.01);
    const PASS_HOURS = Number(process.env.PASS_HOURS || 24);

    if (!rpc || !treasury) {
      return res.status(500).json({
        ok: false,
        error: "Server not configured"
      });
    }

    const connection = new Connection(rpc, "confirmed");
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed"
    });

    if (!tx) {
      return res.status(400).json({
        ok: false,
        error: "Tx not found/confirmed yet"
      });
    }

    if (tx.meta?.err) {
      return res.status(400).json({
        ok: false,
        error: "Transaction failed"
      });
    }

    const feePayer = tx.transaction?.message?.accountKeys?.[0]?.pubkey?.toString();
    if (!feePayer || feePayer !== wallet) {
      return res.status(400).json({
        ok: false,
        error: "Wallet mismatch"
      });
    }

    const treasuryPk = new PublicKey(treasury);
    const needLamports = Math.round(ENTRY_SOL * 1e9);

    let transferOk = false;

    for (const ix of tx.transaction.message.instructions || []) {
      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const info = ix.parsed.info || {};
        const source = String(info.source || "");
        const dest = String(info.destination || "");
        const lamports = Number(info.lamports || 0);

        if (
          source === wallet &&
          dest === treasuryPk.toString() &&
          lamports >= needLamports
        ) {
          transferOk = true;
        }
      }
    }

    if (!transferOk) {
      return res.status(400).json({
        ok: false,
        error: "Transfer not found / amount too low"
      });
    }

    const db = supa();
    const now = nowMs();

    const { data: existingSig, error: existingSigError } = await db
      .from("used_signatures")
      .select("sig")
      .eq("sig", signature)
      .maybeSingle();

    if (existingSigError) {
      return res.status(500).json({
        ok: false,
        error: existingSigError.message || "Failed to check signature"
      });
    }

    if (existingSig) {
      const { data: existingUser, error: existingUserError } = await db
        .from("users")
        .select("wallet, pass_until")
        .eq("wallet", wallet)
        .maybeSingle();

      if (existingUserError) {
        return res.status(500).json({
          ok: false,
          error: existingUserError.message || "Failed to read existing user"
        });
      }

      return res.status(200).json({
        ok: true,
        already_recovered: true,
        pass_until: Number(existingUser?.pass_until || 0)
      });
    }

    const { error: usedInsertError } = await db
      .from("used_signatures")
      .insert({
        sig: signature,
        wallet,
        used_at: now
      });

    if (usedInsertError) {
      const msg = String(usedInsertError.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
        return res.status(400).json({
          ok: false,
          error: "Signature already used"
        });
      }

      return res.status(500).json({
        ok: false,
        error: usedInsertError.message || "Failed to store signature"
      });
    }

    const { data: existingUser, error: userReadError } = await db
      .from("users")
      .select("wallet, pass_until, best_score, created_at")
      .eq("wallet", wallet)
      .maybeSingle();

    if (userReadError) {
      return res.status(500).json({
        ok: false,
        error: userReadError.message || "Failed to read user"
      });
    }

    const currentPassUntil = Number(existingUser?.pass_until || 0);
    const baseTime = currentPassUntil > now ? currentPassUntil : now;
    const passUntil = baseTime + PASS_HOURS * 60 * 60 * 1000;

    if (existingUser) {
      const { error: updateError } = await db
        .from("users")
        .update({
          pass_until: passUntil
        })
        .eq("wallet", wallet);

      if (updateError) {
        return res.status(500).json({
          ok: false,
          error: updateError.message || "Failed to update user"
        });
      }
    } else {
      const { error: insertError } = await db
        .from("users")
        .insert({
          wallet,
          pass_until: passUntil,
          created_at: now,
          best_score: 0
        });

      if (insertError) {
        return res.status(500).json({
          ok: false,
          error: insertError.message || "Failed to create user"
        });
      }
    }

    const weekKey = currentWeekKey();
    const jackpotLamports = 3000000;

    const { data: existingJackpot, error: jackpotReadError } = await db
      .from("weekly_jackpots")
      .select("*")
      .eq("week_key", weekKey)
      .maybeSingle();

    if (jackpotReadError) {
      return res.status(500).json({
        ok: false,
        error: jackpotReadError.message || "Failed to read jackpot"
      });
    }

    if (existingJackpot) {
      const { error: jackpotUpdateError } = await db
        .from("weekly_jackpots")
        .update({
          total_lamports: Number(existingJackpot.total_lamports || 0) + jackpotLamports,
          entry_count: Number(existingJackpot.entry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("week_key", weekKey);

      if (jackpotUpdateError) {
        return res.status(500).json({
          ok: false,
          error: jackpotUpdateError.message || "Failed to update jackpot"
        });
      }
    } else {
      const { error: jackpotInsertError } = await db
        .from("weekly_jackpots")
        .insert({
          week_key: weekKey,
          total_lamports: jackpotLamports,
          entry_count: 1,
          status: "open",
          updated_at: new Date().toISOString()
        });

      if (jackpotInsertError) {
        return res.status(500).json({
          ok: false,
          error: jackpotInsertError.message || "Failed to create jackpot"
        });
      }
    }

    return res.status(200).json({
      ok: true,
      pass_until: passUntil
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
