export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    const db = supa();
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const scope = String(req.query.scope || "all").trim();
    const weekKey = String(req.query.week_key || currentWeekKey()).trim();

    let query = db
      .from("scores")
      .select("wallet, score, city, country, mode, created_at, week_key")
      .eq("mode", "ranked")
      .eq("verified", true);

    if (scope === "week") {
      query = query.eq("week_key", weekKey);
    }

    const { data, error } = await query
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to read leaderboard"
      });
    }

    const rows = Array.isArray(data) ? data : [];
    const bestByWallet = new Map();

    for (const row of rows) {
      const key = String(row.wallet || "");
      if (!key) continue;
      if (!bestByWallet.has(key)) {
        bestByWallet.set(key, row);
      }
    }

    const items = Array.from(bestByWallet.values())
      .slice(0, limit)
      .map((row, i) => ({
        rank: i + 1,
        wallet: row.wallet,
        score: Number(row.score || 0),
        city: row.city || "",
        country: row.country || "",
        mode: row.mode || "ranked",
        week_key: row.week_key || "",
        created_at: Number(row.created_at || 0)
      }));

    return res.status(200).json({
      ok: true,
      count: items.length,
      scope,
      week_key: scope === "week" ? weekKey : null,
      items
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
