import { supa } from "./_db.js";

export default async function handler(req, res) {
  try {

    const db = supa();

    const { data, error } = await db
      .from("users")
      .select("*")
      .limit(1);

    if (error) {
      return res.json({ ok:false, error:error.message });
    }

    return res.json({ ok:true, data });

  } catch (e) {
    return res.json({ ok:false, error:String(e) });
  }
}
