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

    const db = supa();

    const { data, error } = await db
      .from("challenges")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to load active challenge"
      });
    }

    if (!data) {
      return res.status(200).json({
        ok: true,
        challenge: null
      });
    }

    return res.status(200).json({
      ok: true,
      challenge: {
        id: String(data.id || ""),
        creator_wallet: String(data.creator_wallet || ""),
        city: String(data.city || "unknown"),
        country: String(data.country || "unknown"),
        score_to_beat: Number(data.score_to_beat || 0),
        bounty_sol: Number(data.bounty_sol || 0),
        status: String(data.status || "open"),
        created_at: Number(data.created_at || 0),
        week_key: String(data.week_key || "")
      }
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
