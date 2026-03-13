export const runtime = "nodejs";

import { supa } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "GET only"
      });
    }

    const id = String(req.query.id || "").trim();

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "id required"
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
        error: error.message || "Failed to read challenge"
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
        id: data.id,
        creator_wallet: data.creator_wallet,
        score_to_beat: Number(data.score_to_beat || 0),
        bounty_lamports: Number(data.bounty_lamports || 0),
        bounty_sol: Number(data.bounty_lamports || 0) / 1e9,
        status: data.status || "open",
        created_at: Number(data.created_at || 0),
        claimed_at: Number(data.claimed_at || 0),
        winner_wallet: data.winner_wallet || null,
        week_key: data.week_key || "",
        city: data.city || "unknown",
        country: data.country || "unknown"
      }
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
