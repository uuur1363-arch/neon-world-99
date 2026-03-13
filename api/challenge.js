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
          week_key: String(data.week_key || ""),
          run_token: String(data.run_token || "")
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
        const runToken = String(body.run_token || "").trim();

        if (!wallet || wallet === "guest") {
          return res.status(400).json({
            ok: false,
            error: "valid wallet required"
          });
        }

        if (!runToken) {
          return res.status(400).json({
            ok: false,
            error: "run_token required"
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

        const { data: run, error: runError } = await db
          .from("game_runs")
          .select("run_token, wallet, city, country, mode, used_at, final_score, verification_status, week_key")
          .eq("run_token", runToken)
          .maybeSingle();

        if (runError) {
          return res.status(500).json({
            ok: false,
            error: runError.message || "Failed to validate run"
          });
        }

        if (!run) {
          return res.status(400).json({
            ok: false,
            error: "run not found"
          });
        }

        if (String(run.wallet || "") !== wallet) {
          return res.status(403).json({
            ok: false,
            error: "wallet mismatch"
          });
        }

        if (Number(run.used_at || 0) <= 0) {
          return res.status(400).json({
            ok: false,
            error: "run not finalized"
          });
        }

        if (String(run.verification_status || "") !== "verified") {
          return res.status(400).json({
            ok: false,
            error: "only verified runs can create challenges"
          });
        }

        const verifiedScore = toSafeScore(run.final_score);
        if (verifiedScore <= 0) {
          return res.status(400).json({
            ok: false,
            error: "verified final score not found"
          });
        }

        if (score !== verifiedScore) {
          return res.status(400).json({
            ok: false,
            error: "score must match verified run score"
          });
        }

        if (city !== String(run.city || "")) {
          return res.status(400).json({
            ok: false,
            error: "city must match verified run city"
          });
        }

        const { data: existingChallenge, error: existingChallengeError } = await db
          .from("challenges")
          .select("id, status")
          .eq("run_token", runToken)
          .maybeSingle();

        if (existingChallengeError) {
          return res.status(500).json({
            ok: false,
            error: existingChallengeError.message || "Failed to check existing challenge"
          });
        }

        if (existingChallenge) {
          return res.status(200).json({
            ok: true,
            reused: true,
            id: String(existingChallenge.id || ""),
            challenge_url: buildChallengeUrl(req, String(existingChallenge.id || "")),
            challenge: {
              id: String(existingChallenge.id || ""),
              creator_wallet: wallet,
              city,
              country,
              score_to_beat: verifiedScore,
              bounty_sol: bounty,
              status: String(existingChallenge.status || "open"),
              run_token: runToken,
              week_key: String(run.week_key || currentWeekKey())
            }
          });
        }

        const id = randomId();
        const createdAt = nowMs();
        const weekKey = String(run.week_key || currentWeekKey());

        const { error } = await db
          .from("challenges")
          .insert({
            id,
            creator_wallet: wallet,
            city,
            country,
            score_to_beat: verifiedScore,
            bounty_sol: bounty,
            status: "open",
            created_at: createdAt,
            week_key: weekKey,
            run_token: runToken
          });

        if (error) {
          return res.status(500).json({
            ok: false,
            error: error.message || "Failed to create challenge"
          });
        }

        return res.status(200).json({
          ok: true,
          reused: false,
          id,
          challenge_url: buildChallengeUrl(req, id),
          challenge: {
            id,
            creator_wallet: wallet,
            city,
            country,
            score_to_beat: verifiedScore,
            bounty_sol: bounty,
            status: "open",
            created_at: createdAt,
            week_key: weekKey,
            run_token: runToken
          }
        });
      }

      if (action === "claim") {
        return res.status(403).json({
          ok: false,
          error: "public claim disabled"
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
