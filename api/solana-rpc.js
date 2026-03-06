export const runtime = "nodejs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const rpc = process.env.SOLANA_RPC_URL;
    if (!rpc) {
      return res.status(500).json({ error: "SOLANA_RPC_URL missing" });
    }

    const r = await fetch(rpc, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const text = await r.text();

    res.status(r.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (e) {
    return res.status(500).json({
      error: String(e?.message || e)
    });
  }
}
