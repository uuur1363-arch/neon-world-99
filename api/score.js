import { supa } from "./_db.js";

export default async function handler(req, res) {
  try {
    const db = supa();

    // Top players
    const { data: top, error } = await db
      .from("users")
      .select("wallet,best_score,country")
      .order("best_score", { ascending: false })
      .limit(20);

    if (error) throw error;

    // Country totals
    const totals = {};
    (top || []).forEach(u => {
      const c = u.country || "??";
      totals[c] = (totals[c] || 0) + (u.best_score || 0);
    });

    const countries = Object.entries(totals)
      .map(([country, score]) => ({ country, score }))
      .sort((a,b)=>b.score-a.score);

    return res.status(200).json({
      ok: true,
      top: top || [],
      countries
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e.message || e)
    });
  }
}
