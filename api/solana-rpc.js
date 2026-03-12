export const runtime = "nodejs";

export default async function handler(req, res) {
  try {
    const rpcUrl = String(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"
    ).trim();

    if (!rpcUrl) {
      return res.status(500).json({
        ok: false,
        error: "SOLANA_RPC_URL missing"
      });
    }

    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        rpc_url: rpcUrl
      });
    }

    if (req.method === "POST") {
      const upstream = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body || {})
      });

      const text = await upstream.text();
      res.status(upstream.status);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(text);
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
