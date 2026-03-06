import { Connection, PublicKey } from "@solana/web3.js";
import { supa, nowMs } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { wallet, signature, memo } = req.body || {};

    if (!wallet || !signature || !memo) {
      return res.status(400).json({
        ok: false,
        error: "Missing wallet/signature/memo"
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
    let memoOk = false;

    for (const ix of tx.transaction.message.instructions || []) {
      if (ix.program === "spl-memo") {
        const parsed = ix.parsed;
        const memoText =
          typeof parsed === "string"
            ? parsed
            : (parsed && (parsed.memo || parsed.data || parsed.message)) || null;

        if (memoText && String(memoText) === String(memo)) {
          memoOk = true;
        }
      }

      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const info = ix.parsed.info || {};
        const dest = info.destination;
        const lamports = Number(info.lamports || 0);

        if (dest === treasuryPk.toString() && lamports >= needLamports) {
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

    if (!memoOk) {
      return res.status(400).json({
        ok: false,
        error: "Memo mismatch"
      });
    }

    const db = supa();
    const now = nowMs();

    // önce kullanıcıyı çek
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

    // signature tekrar kullanım koruması
    // tabloda sig unique olmalı
    const { error: usedInsertError } = await db
      .from("used_signatures")
      .insert({
        sig: signature,
        wallet,
        used_at: now
      });

    if (usedInsertError) {
      const msg = String(usedInsertError.message || "").toLowerCase();

      if (
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        msg.includes("already")
      ) {
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

    // aktif pass varsa üstüne ekle
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
