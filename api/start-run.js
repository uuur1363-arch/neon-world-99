export const runtime = "nodejs";

import crypto from "crypto";
import { supa, nowMs, currentWeekKey } from "./_db.js";
import { rateLimit, getIp } from "./_security.js";

const GAME_SECONDS = 60;
const RUN_TTL_MS = 2 * 60 * 1000;
const MAX_ACTIVE_RUNS_PER_WALLET = 1;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const ip = getIp(req);
    const body = req.body || {};
    const wallet = String(body.wallet || "guest").trim();
    const mode = String(body.mode || "free").trim();
    const city = String(body.city || "").trim();
    const country = String(body.country || "TR").trim();
    const now = nowMs();

    const ipKey = `start-run:ip:${ip}`;
    const walletKey = `start-run:wallet:${wallet || "guest"}`;

    const ipGate = rateLimit(ipKey, 20, 60 * 1000);
    if (!ipGate.ok) {
      return res.status(429).json({ ok: false, error: "Too many requests" });
    }

    const walletGate = rateLimit(walletKey, 8, 60 * 1000);
    if (!walletGate.ok) {
      return res.status(429).json({ ok: false, error: "Too many wallet requests" });
    }

    const db = supa();

    if (mode === "ranked") {
      if (!wallet || wallet === "guest") {
        return res.status(403).json({ ok: false, error: "Ranked wallet required" });
      }

      const { data: user, error: userError } = await db
        .from("users")
        .select("wallet, pass_until")
        .eq("wallet", wallet)
        .maybeSingle();

      if (userError) {
        return res.status(500).json({ ok: false, error: userError.message || "Failed to read user" });
      }

      const passUntil = Number(user?.pass_until || 0);
      if (!user || passUntil <= now) {
        return res.status(403).json({ ok: false, error: "Ranked pass required" });
      }

      const { data: activeRuns, error: activeError } = await db
        .from("game_runs")
        .select("run_token")
        .eq("wallet", wallet)
        .is("used_at", null)
        .gt("expires_at", now)
        .limit(5);

      if (activeError) {
        return res.status(500).json({ ok: false, error: activeError.message || "Failed to check active runs" });
      }

      if ((activeRuns || []).length >= MAX_ACTIVE_RUNS_PER_WALLET) {
        return res.status(409).json({
          ok: false,
          error: "Active run already exists"
        });
      }
    }

    const expiresAt = now + RUN_TTL_MS;
    const runToken = crypto.randomBytes(24).toString("hex");
    const runSeed = crypto.randomBytes(16).toString("hex");
    const weekKey = currentWeekKey();

    const { error: insertError } = await db.from("game_runs").insert({
      run_token: runToken,
      wallet,
      mode,
      city,
      country,
      week_key: weekKey,
      run_seed: runSeed,
      verification_status: "pending",
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
      run_seed: runSeed,
      week_key: weekKey,
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
