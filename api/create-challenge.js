export const runtime = "nodejs";

import crypto from "crypto";
import { supa, nowMs, currentWeekKey } from "./_db.js";
import { rateLimit, getIp } from "./_security.js";

function normalizeCountry(value) {
  const s = String(value || "").trim();
  if (!s) return "unknown";
  return s.slice(0, 64);
}

function normalizeCity(value) {
  const s = String(value || "").trim();
  if (!s) return "unknown";
  return s.slice(0, 128);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "POST only"
      });
    }

    const ip = getIp(req);
    const gate = rateLimit(`create-challenge:${ip}`, 20, 60 * 1000);
    if (!gate.ok) {
      return res.status(429).json({
        ok: false,
        error: "Too many requests"
      });
    }

    const body = req.body || {};
    const creatorWallet = String(body.creator_wallet || "").trim();
    const scoreToBeat = Number(body.score_to_beat || 0);
    const bountyLamports = Number(body.bounty_lamports || 0);
    const city = normalizeCity(body.city);
    const country = normalizeCountry(body.country);
    const now = nowMs();
    const weekKey = currentWeekKey();

    if (!creatorWallet) {
      return res.status(400).json({
        ok: false,
        error: "creator_wallet required"
      });
    }

    if (!Number.isFinite(scoreToBeat) || scoreToBeat <= 0) {
      return res.status(400).json({
        ok: false,
        error: "valid score_to_beat required"
      });
    }

    if (!Number.isFinite(bountyLamports) || bountyLamports < 0) {
      return res.status(400).json({
        ok: false,
        error: "valid bounty_lamports required"
      });
    }

    const db = supa();

    const { data: user, error: userError } = await db
      .from("users")
      .select("wallet, best_score")
      .eq("wallet", creatorWallet)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({
        ok: false,
        error: userError.message || "Failed to read user"
      });
    }

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "creator not found"
      });
    }

    const bestScore = Number(user.best_score || 0);
    if (bestScore <= 0) {
      return res.status(400).json({
        ok: false,
        error: "creator has no score yet"
      });
    }

    if (scoreToBeat > bestScore) {
      return res.status(400).json({
        ok: false,
        error: "score_to_beat cannot exceed creator best score"
      });
    }

    const id = crypto.randomBytes(10).toString("hex");

    const { error: insertError } = await db
      .from("challenges")
      .insert({
        id,
        creator_wallet: creatorWallet,
        score_to_beat: scoreToBeat,
        bounty_lamports: bountyLamports,
        status: "open",
        created_at: now,
        week_key: weekKey,
        city,
        country
      });

    if (insertError) {
      return res.status(500).json({
        ok: false,
        error: insertError.message || "Failed to create challenge"
      });
    }

    return res.status(200).json({
      ok: true,
      id,
      challenge_url: `/challenge.html?id=${encodeURIComponent(id)}`,
      creator_wallet: creatorWallet,
      score_to_beat: scoreToBeat,
      bounty_lamports: bountyLamports,
      week_key: weekKey,
      city,
      country,
      status: "open"
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
