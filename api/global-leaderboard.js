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
    const limit = Math.min(
      Math.max(Number(req.query.limit || 20), 1),
      100
    );

    const { data, error } = await db
      .from("scores")
      .select("wallet, score, city, country, mode, created_at")
      .eq("mode", "ranked")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to read leaderboard"
      });
    }

    const rows = Array.isArray(data) ? data : [];

    return res.status(200).json({
      ok: true,
      count: rows.length,
      items: rows.map((row, i) => ({
        rank: i + 1,
        wallet: row.wallet,
        score: Number(row.score || 0),
        city: row.city || "",
        country: row.country || "",
        mode: row.mode || "ranked",
        created_at: Number(row.created_at || 0)
      }))
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
