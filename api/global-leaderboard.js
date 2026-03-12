export const runtime = "nodejs";

import { supa, currentWeekKey } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "GET only"
      });
    }

    const db = supa();
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const scope = String(req.query.scope || "all").trim();
    const weekKey = String(req.query.week_key || currentWeekKey()).trim();

    let rows = null;
    let queryError = null;

    {
      let query = db
        .from("scores")
        .select("wallet, score, city, country, mode, created_at, week_key")
        .eq("mode", "ranked")
        .eq("verified", true);

      if (scope === "week") {
        query = query.eq("week_key", weekKey);
      }

      const attempt = await query
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1000);

      rows = attempt.data || null;
      queryError = attempt.error || null;
    }

    if (queryError) {
      const msg = String(queryError.message || "").toLowerCase();
      const missingColumn =
        msg.includes("column") ||
        msg.includes("verified") ||
        msg.includes("week_key");

      if (!missingColumn) {
        return res.status(500).json({
          ok: false,
          error: queryError.message || "Failed to read leaderboard"
        });
      }

      let legacyQuery = db
        .from("scores")
        .select("wallet, score, city, country, mode, created_at")
        .eq("mode", "ranked");

      const legacy = await legacyQuery
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1000);

      if (legacy.error) {
        return res.status(500).json({
          ok: false,
          error: legacy.error.message || "Failed to read leaderboard"
        });
      }

      rows = legacy.data || [];
    }

    const bestByWallet = new Map();

    for (const row of rows || []) {
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
        week_key: row.week_key || (scope === "week" ? weekKey : ""),
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
