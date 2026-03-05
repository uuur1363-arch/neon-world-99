import { supa } from "./_db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    const db = supa();

    const { data, error } = await db
      .from("users")
      .select("wallet,best_score")
      .order("best_score", { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ ok: false, error: "supabase: " + error.message });
    }

    return res.status(200).json({ ok: true, top: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "server: " + String(e.message || e) });
  }
}
