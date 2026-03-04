import { supa } from "./_db.js";

export default async function handler(req, res) {
  try {
    const db = supa();
    const { data, error } = await db
      .from("users")
      .select("wallet,best_score")
      .order("best_score", { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.status(200).json({ ok: true, top: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
