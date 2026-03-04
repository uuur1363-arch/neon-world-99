import { Connection, PublicKey } from "@solana/web3.js";
import { supa, nowMs } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });

    const { wallet, signature, memo } = req.body || {};
    if (!wallet || !signature || !memo) {
      return res.status(400).json({ ok: false, error: "Missing wallet/signature/memo" });
    }

    const rpc = process.env.SOLANA_RPC_URL;
    const treasury = process.env.TREASURY_WALLET;
    const ENTRY_SOL = Number(process.env.ENTRY_SOL || 0.01);
    const PASS_HOURS = Number(process.env.PASS_HOURS || 24);

    if (!rpc || !treasury) return res.status(500).json({ ok: false, error: "Server not configured" });

    const connection = new Connection(rpc, "confirmed");
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx) return res.status(400).json({ ok: false, error: "Tx not found/confirmed yet" });

    const feePayer = tx.transaction.message.accountKeys?.[0]?.pubkey?.toString();
    if (!feePayer || feePayer !== wallet) {
      return res.status(400).json({ ok: false, error: "Wallet mismatch" });
    }

    const treasuryPk = new PublicKey(treasury);
    const needLamports = Math.round(ENTRY_SOL * 1e9);

    let transferOk = false;
    let memoOk = false;

    for (const ix of tx.transaction.message.instructions) {
      if (ix.program === "spl-memo") {
        const m = ix.parsed;
        const memoText =
          typeof m === "string" ? m : (m && (m.memo || m.data || m.message)) || null;
        if (memoText && String(memoText) === String(memo)) memoOk = true;
      }

      if (ix.program === "system" && ix.parsed?.type === "transfer") {
        const info = ix.parsed.info;
        const dest = info?.destination;
        const lamports = Number(info?.lamports || 0);
        if (dest === treasuryPk.toString() && lamports >= needLamports) transferOk = true;
      }
    }

    if (!transferOk) return res.status(400).json({ ok: false, error: "Transfer not found / amount too low" });
    if (!memoOk) return res.status(400).json({ ok: false, error: "Memo mismatch" });

    const db = supa();

    // signature reuse protection
    const { data: used } = await db.from("used_signatures").select("sig").eq("sig", signature).maybeSingle();
    if (used?.sig) return res.status(400).json({ ok: false, error: "Signature already used" });

    const t = nowMs();
    const passUntil = t + PASS_HOURS * 60 * 60 * 1000;

    await db.from("users").upsert({
      wallet,
      pass_until: passUntil,
      created_at: t,
      best_score: 0
    });

    await db.from("used_signatures").insert({ sig: signature, wallet, used_at: t });

    return res.status(200).json({ ok: true, pass_until: passUntil });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
