export const runtime = "nodejs";

import { supa, nowMs } from "./_db.js";
import { getIp, rateLimit } from "./_security.js";

export default async function handler(req, res) {

  const action = String(req.query.action || "").trim().toLowerCase();

  try {

    const db = supa();

    if (req.method === "GET") {

      const weekKey = String(req.query.week_key || "").trim();

      if (!weekKey) {
        return res.status(400).json({
          ok: false,
          error: "week_key required"
        });
      }

      const { data, error } = await db
        .from("weekly_payouts")
        .select("*")
        .eq("week_key", weekKey)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: error.message
        });
      }

      return res.status(200).json({
        ok: true,
        payout: data || null
      });
    }

    if (req.method === "POST") {

      const ip = getIp(req);
      const gate = rateLimit(`payout:${ip}`, 10, 60 * 1000);

      if (!gate.ok) {
        return res.status(429).json({
          ok: false,
          error: "Too many requests"
        });
      }

      const body = req.body || {};

      if (action === "prepare") {

        const weekKey = String(body.week_key || "").trim();
        const wallet = String(body.wallet || "").trim();
        const amount = Number(body.amount_sol || 0);

        if (!weekKey || !wallet) {
          return res.status(400).json({
            ok: false,
            error: "week_key and wallet required"
          });
        }

        const { error } = await db
          .from("weekly_payouts")
          .insert({
            week_key: weekKey,
            winner_wallet: wallet,
            amount_sol: amount,
            status: "pending",
            created_at: nowMs()
          });

        if (error) {
          return res.status(500).json({
            ok: false,
            error: error.message
          });
        }

        return res.status(200).json({
          ok: true
        });
      }

      if (action === "mark-sent") {

        const weekKey = String(body.week_key || "").trim();
        const signature = String(body.signature || "").trim();

        if (!weekKey || !signature) {
          return res.status(400).json({
            ok: false,
            error: "week_key and signature required"
          });
        }

        const { error } = await db
          .from("weekly_payouts")
          .update({
            status: "sent",
            tx_signature: signature,
            sent_at: nowMs()
          })
          .eq("week_key", weekKey);

        if (error) {
          return res.status(500).json({
            ok: false,
            error: error.message
          });
        }

        return res.status(200).json({
          ok: true
        });
      }

      return res.status(400).json({
        ok: false,
        error: "invalid action"
      });
    }

    return res.status(405).json({
      ok: false,
      error: "method not allowed"
    });

  } catch (e) {

    return res.status(500).json({
      ok: false,
      error: String(e.message || e)
    });

  }
}
