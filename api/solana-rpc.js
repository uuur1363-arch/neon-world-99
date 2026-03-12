export const runtime = "nodejs";

import { rateLimit, getIp } from "./_security.js";

const ALLOWED_METHODS = new Set([
  "getLatestBlockhash",
  "sendTransaction",
  "getSignatureStatuses",
  "confirmTransaction",
  "getParsedTransaction",
  "getTransaction",
  "getBalance",
  "getSlot",
  "getBlockHeight",
  "getVersion",
  "getGenesisHash",
  "getFeeForMessage",
  "simulateTransaction"
]);

export default async function handler(req, res) {
  try {
    const ip = getIp(req);
    const gate = rateLimit(`solana-rpc:${ip}`, 80, 60 * 1000);

    if (!gate.ok) {
      return res.status(429).json({
        ok: false,
        error: "Too many RPC requests"
      });
    }

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

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed"
      });
    }

    const payload = req.body || {};
    const method = String(payload.method || "").trim();

    if (!method || !ALLOWED_METHODS.has(method)) {
      return res.status(400).json({
        ok: false,
        error: "RPC method not allowed"
      });
    }

    const upstream = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.send(text);

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
