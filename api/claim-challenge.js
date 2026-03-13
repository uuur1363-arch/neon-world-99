export const runtime = "nodejs";

import { supa, nowMs } from "./_db.js";
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
    const gate = rateLimit(`claim-challenge:${ip}`, 20, 60 * 1000);
    if (!gate.ok) {
      return res.status(429).json({
        ok: false,
        error: "Too many requests"
      });
    }

    const body = req.body || {};
    const id = String(body.id || "").trim();
    const challengerWallet = String(body.challenger_wallet || "").trim();
    const challengerScore = Number(body.challenger_score || 0);

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "id required"
      });
    }

    if (!challengerWallet) {
      return res.status(400).json({
        ok: false,
        error: "challenger_wallet required"
      });
    }

    if (!Number.isFinite(challengerScore) || challengerScore <= 0) {
      return res.status(400).json({
        ok: false,
        error: "valid challenger_score required"
      });
    }

    const db = supa();
    const now = nowMs();

    const { data: challenge, error: readError } = await db
      .from("challenges")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      return res.status(500).json({
        ok: false,
        error: readError.message || "Failed to read challenge"
      });
    }

    if (!challenge) {
      return res.status(404).json({
        ok: false,
        error: "challenge not found"
      });
    }

    if (String(challenge.status || "") !== "open") {
      return res.status(400).json({
        ok: false,
        error: "challenge is not open"
      });
    }

    if (String(challenge.creator_wallet || "") === challengerWallet) {
      return res.status(400).json({
        ok: false,
        error: "creator cannot claim own challenge"
      });
    }

    const scoreToBeat = Number(challenge.score_to_beat || 0);
    if (challengerScore <= scoreToBeat) {
      return res.status(400).json({
        ok: false,
        error: "score not high enough to claim challenge"
      });
    }

    const { data: updated, error: updateError } = await db
      .from("challenges")
      .update({
        status: "claimed",
        claimed_at: now,
        winner_wallet: challengerWallet
      })
      .eq("id", id)
      .eq("status", "open")
      .select("id");

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

    return res.status(200).json({
      ok: true,
      id,
      status: "claimed",
      winner_wallet: challengerWallet,
      challenger_score: challengerScore,
      bounty_lamports: Number(challenge.bounty_lamports || 0),
      bounty_sol: Number(challenge.bounty_lamports || 0) / 1e9
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
