import { supa } from "./_db.js";

export default async function handler(req, res) {
  try {
    // allow GET (browser) and POST (optional)
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "method" });
    }

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
