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
      .from("scores")
      .select("city, score")
      .eq("mode", "ranked")
      .order("score", { ascending: false })
      .limit(1000);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to read city leaderboard"
      });
    }

    const totals = new Map();

    for (const row of data || []) {
      const city = String(row.city || "unknown").trim() || "unknown";
      const score = Number(row.score || 0);
      totals.set(city, (totals.get(city) || 0) + score);
    }

    const items = Array.from(totals.entries())
      .map(([city, score], i) => ({
        rank: i + 1,
        city,
        score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((row, i) => ({
        rank: i + 1,
        city: row.city,
        score: row.score
      }));

    return res.status(200).json({
      ok: true,
      items
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
