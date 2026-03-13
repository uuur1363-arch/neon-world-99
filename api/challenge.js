export const runtime = "nodejs";

import { supa, nowMs, currentWeekKey } from "./_db.js";
import { rateLimit, getIp } from "./_security.js";

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeWallet(value) {
  return String(value || "").trim();
}

function normalizeCity(value) {
  const s = String(value || "").trim();
  return s ? s.slice(0, 64) : "unknown";
}

function normalizeCountry(value) {
  const s = String(value || "").trim();
  return s ? s.slice(0, 16) : "unknown";
}

function toSafeScore(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function toSafeBounty(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function buildChallengeUrl(req, id) {
  const host = req.headers.host;
  const proto =
    req.headers["x-forwarded-proto"] ||
    (host && host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}/challenge.html?id=${encodeURIComponent(id)}`;
}

export default async function handler(req, res) {
  const action = String(req.query.action || "").trim().toLowerCase();

  try {
    const db = supa();

    if (req.method === "GET") {
      const id = String(req.query.id || "").trim();

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "challenge id required"
        });
      }

      const { data, error } = await db
        .from("challenges")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: error.message || "Failed to load challenge"
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
        challenge: {
          id: String(data.id || ""),
          creator_wallet: String(data.creator_wallet || ""),
          city: String(data.city || "unknown"),
          country: String(data.country || "unknown"),
          score_to_beat: toSafeScore(data.score_to_beat),
          bounty_sol: toSafeBounty(data.bounty_sol),
          status: String(data.status || "open"),
          winner_wallet: String(data.winner_wallet || ""),
          winning_score: toSafeScore(data.winning_score),
          created_at: Number(data.created_at || 0),
          claimed_at: Number(data.claimed_at || 0),
          week_key: String(data.week_key || "")
        }
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

      const body = req.body || {};

      if (action === "create") {
        const wallet = normalizeWallet(body.wallet);
        const city = normalizeCity(body.city);
        const country = normalizeCountry(body.country);
        const score = toSafeScore(body.score);
        const bounty = toSafeBounty(body.bounty_sol);

        if (!wallet) {
          return res.status(400).json({
            ok: false,
            error: "wallet required"
          });
        }

        if (score <= 0) {
          return res.status(400).json({
            ok: false,
            error: "valid score required"
          });
        }

        if (bounty < 0) {
          return res.status(400).json({
            ok: false,
            error: "invalid bounty"
          });
        }

        const id = randomId();
        const createdAt = nowMs();
        const weekKey = currentWeekKey();

        const { error } = await db
          .from("challenges")
          .insert({
            id,
            creator_wallet: wallet,
            city,
            country,
            score_to_beat: score,
            bounty_sol: bounty,
            status: "open",
            created_at: createdAt,
            week_key: weekKey
          });

        if (error) {
          return res.status(500).json({
            ok: false,
            error: error.message || "Failed to create challenge"
          });
        }

        return res.status(200).json({
          ok: true,
          id,
          challenge_url: buildChallengeUrl(req, id),
          challenge: {
            id,
            creator_wallet: wallet,
            city,
            country,
            score_to_beat: score,
            bounty_sol: bounty,
            status: "open",
            created_at: createdAt,
            week_key: weekKey
          }
        });
      }

      if (action === "claim") {
        const id = String(body.id || "").trim();
        const wallet = normalizeWallet(body.wallet);
        const score = toSafeScore(body.score);

        if (!id || !wallet) {
          return res.status(400).json({
            ok: false,
            error: "id and wallet required"
          });
        }

        if (score <= 0) {
          return res.status(400).json({
            ok: false,
            error: "valid score required"
          });
        }

        const { data: challenge, error: readError } = await db
          .from("challenges")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (readError) {
          return res.status(500).json({
            ok: false,
            error: readError.message || "Failed to load challenge"
          });
        }

        if (!challenge) {
          return res.status(404).json({
            ok: false,
            error: "challenge not found"
          });
        }

        if (String(challenge.creator_wallet || "") === wallet) {
          return res.status(400).json({
            ok: false,
            error: "creator cannot claim own challenge"
          });
        }

        if (String(challenge.status || "") !== "open") {
          return res.status(400).json({
            ok: false,
            error: "challenge already claimed"
          });
        }

        if (score <= toSafeScore(challenge.score_to_beat)) {
          return res.status(400).json({
            ok: false,
            error: "score not high enough"
          });
        }

        const claimedAt = nowMs();

        const { data: updated, error: updateError } = await db
          .from("challenges")
          .update({
            status: "claimed",
            winner_wallet: wallet,
            winning_score: score,
            claimed_at: claimedAt
          })
          .eq("id", id)
          .eq("status", "open")
          .select("*");

        if (updateError) {
          return res.status(500).json({
            ok: false,
            error: updateError.message || "Failed to claim challenge"
          });
        }

        if (!updated || updated.length === 0) {
          return res.status(400).json({
            ok: false,
            error: "challenge already claimed"
          });
        }

        const claimed = updated[0];

        return res.status(200).json({
          ok: true,
          challenge: {
            id: String(claimed.id || ""),
            creator_wallet: String(claimed.creator_wallet || ""),
            city: String(claimed.city || "unknown"),
            country: String(claimed.country || "unknown"),
            score_to_beat: toSafeScore(claimed.score_to_beat),
            bounty_sol: toSafeBounty(claimed.bounty_sol),
            status: String(claimed.status || "claimed"),
            winner_wallet: String(claimed.winner_wallet || ""),
            winning_score: toSafeScore(claimed.winning_score),
            created_at: Number(claimed.created_at || 0),
            claimed_at: Number(claimed.claimed_at || 0),
            week_key: String(claimed.week_key || "")
          }
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
      error: String(e?.message || e)
    });
  }
}
