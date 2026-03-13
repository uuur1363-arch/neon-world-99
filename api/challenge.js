export const runtime = "nodejs";

import { supa, nowMs } from "./_db.js";
import { rateLimit, getIp } from "./_security.js";

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default async function handler(req, res) {

  const action = String(req.query.action || "").trim().toLowerCase();

  try {

    if (req.method === "GET") {

      const id = String(req.query.id || "").trim();

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "challenge id required"
        });
      }

      const db = supa();

      const { data, error } = await db
        .from("challenges")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: error.message
        });
      }

      if (!data) {
        return res.status(404).json({
          ok: false,
          error: "challenge not found"
        });
      }

      return res.status(200).json({
        ok: true,
        challenge: data
      });
    }

    if (req.method === "POST") {

      const ip = getIp(req);
      const gate = rateLimit(`challenge:${ip}`, 20, 60 * 1000);

      if (!gate.ok) {
        return res.status(429).json({
          ok: false,
          error: "Too many requests"
        });
      }

      const db = supa();
      const body = req.body || {};

      if (action === "create") {

        const wallet = String(body.wallet || "").trim();
        const city = String(body.city || "").trim();
        const score = Number(body.score || 0);
        const bounty = Number(body.bounty_sol || 0);

        if (!wallet) {
          return res.status(400).json({
            ok: false,
            error: "wallet required"
          });
        }

        const id = randomId();

        const { error } = await db
          .from("challenges")
          .insert({
            id,
            creator_wallet: wallet,
            city,
            score_to_beat: score,
            bounty_sol: bounty,
            status: "open",
            created_at: nowMs()
          });

        if (error) {
          return res.status(500).json({
            ok: false,
            error: error.message
          });
        }

        return res.status(200).json({
          ok: true,
          id,
          challenge_url: `/challenge.html?id=${id}`
        });
      }

      if (action === "claim") {

        const id = String(body.id || "").trim();
        const wallet = String(body.wallet || "").trim();
        const score = Number(body.score || 0);

        if (!id || !wallet) {
          return res.status(400).json({
            ok: false,
            error: "id and wallet required"
          });
        }

        const { data: challenge } = await db
          .from("challenges")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (!challenge) {
          return res.status(404).json({
            ok: false,
            error: "challenge not found"
          });
        }

        if (challenge.status !== "open") {
          return res.status(400).json({
            ok: false,
            error: "challenge already claimed"
          });
        }

        if (score <= Number(challenge.score_to_beat || 0)) {
          return res.status(400).json({
            ok: false,
            error: "score not high enough"
          });
        }

        const { error } = await db
          .from("challenges")
          .update({
            status: "claimed",
            winner_wallet: wallet,
            winning_score: score,
            claimed_at: nowMs()
          })
          .eq("id", id);

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
