export const runtime = "nodejs";

import crypto from "crypto";
import { supa, nowMs } from "./_db.js";

const GAME_SECONDS = 60;
const RUN_TTL_MS = 2 * 60 * 1000;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "POST only"
      });
    }

    const body = req.body || {};
    const wallet = String(body.wallet || "guest").trim();
    const mode = String(body.mode || "free").trim();
    const city = String(body.city || "").trim();
    const country = String(body.country || "TR").trim();

    const now = nowMs();
    const expiresAt = now + RUN_TTL_MS;
    const runToken = crypto.randomBytes(24).toString("hex");

    const db = supa();

    if (mode === "ranked") {
      if (!wallet || wallet === "guest") {
        return res.status(403).json({
          ok: false,
          error: "Ranked wallet required"
        });
      }

      const { data: user, error: userError } = await db
        .from("users")
        .select("wallet, pass_until")
        .eq("wallet", wallet)
        .maybeSingle();

      if (userError) {
        return res.status(500).json({
          ok: false,
          error: userError.message || "Failed to read user"
        });
      }

      const passUntil = Number(user?.pass_until || 0);
      if (!user || passUntil <= now) {
        return res.status(403).json({
          ok: false,
          error: "Ranked pass required"
        });
      }
    }

    const { error: insertError } = await db
      .from("game_runs")
      .insert({
        run_token: runToken,
        wallet,
        mode,
        city,
        country,
        created_at: now,
        expires_at: expiresAt
      });

    if (insertError) {
      return res.status(500).json({
        ok: false,
        error: insertError.message || "Failed to create run"
      });
    }

    return res.status(200).json({
      ok: true,
      run_token: runToken,
      game_seconds: GAME_SECONDS,
      created_at: now,
      expires_at: expiresAt
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
