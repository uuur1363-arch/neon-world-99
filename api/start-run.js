export const runtime = "nodejs";

import crypto from "crypto";
import { supa, nowMs, currentWeekKey } from "./_db.js";
import { rateLimit, getIp } from "./_security.js";

const GAME_SECONDS = 60;
const RUN_TTL_MS = 2 * 60 * 1000;
const MAX_ACTIVE_RUNS_PER_WALLET = 1;
const MIN_RUN_GAP_MS = 30000;

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
    const runSeed = crypto.randomBytes(16).toString("hex");
    const weekKey = currentWeekKey();

    const ip = getIp(req);

    const ipGate = rateLimit(`start-run:ip:${ip}`, 20, 60 * 1000);
    if (!ipGate.ok) {
      return res.status(429).json({
        ok: false,
        error: "Too many requests"
      });
    }

    const walletGate = rateLimit(`start-run:wallet:${wallet || "guest"}`, 8, 60 * 1000);
    if (!walletGate.ok) {
      return res.status(429).json({
        ok: false,
        error: "Too many wallet requests"
      });
    }

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

      // 1) Önce wallet için açık runları çek
      const { data: openRuns, error: openRunsError } = await db
        .from("game_runs")
        .select("run_token, run_seed, week_key, city, country, mode, created_at, expires_at, used_at")
        .eq("wallet", wallet)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (openRunsError) {
        return res.status(500).json({
          ok: false,
          error: openRunsError.message || "Failed to check active runs"
        });
      }

      const runs = openRuns || [];

      // 2) Expired açık runları kapat
      const expiredRuns = runs.filter((r) => Number(r.expires_at || 0) <= now);
      for (const r of expiredRuns) {
        await db
          .from("game_runs")
          .update({
            used_at: Number(r.expires_at || now)
          })
          .eq("run_token", String(r.run_token || ""))
          .is("used_at", null);
      }

      // 3) Hâlâ aktif bir run varsa hata verme, onu geri döndür
      const activeRuns = runs.filter((r) => Number(r.expires_at || 0) > now);

      if (activeRuns.length > 0) {
        const existing = activeRuns[0];

        return res.status(200).json({
          ok: true,
          reused: true,
          run_token: String(existing.run_token || ""),
          run_seed: String(existing.run_seed || ""),
          week_key: String(existing.week_key || weekKey),
          game_seconds: GAME_SECONDS,
          created_at: Number(existing.created_at || now),
          expires_at: Number(existing.expires_at || (now + RUN_TTL_MS))
        });
      }

      // 4) Spam kontrolü
      const { data: recentRuns, error: recentRunsError } = await db
        .from("game_runs")
        .select("created_at")
        .eq("wallet", wallet)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentRunsError) {
        return res.status(500).json({
          ok: false,
          error: recentRunsError.message || "Failed to check recent runs"
        });
      }

      const lastRunAt = Number(recentRuns?.[0]?.created_at || 0);
      if (lastRunAt > 0 && (now - lastRunAt) < MIN_RUN_GAP_MS) {
        return res.status(429).json({
          ok: false,
          error: "Please wait before starting another run"
        });
      }

      // 5) Güvenlik için bir daha bak
      if (MAX_ACTIVE_RUNS_PER_WALLET > 0) {
        const { data: finalActiveCheck, error: finalActiveError } = await db
          .from("game_runs")
          .select("run_token")
          .eq("wallet", wallet)
          .is("used_at", null)
          .gt("expires_at", now)
          .limit(5);

        if (finalActiveError) {
          return res.status(500).json({
            ok: false,
            error: finalActiveError.message || "Failed to verify active runs"
          });
        }

        if ((finalActiveCheck || []).length >= MAX_ACTIVE_RUNS_PER_WALLET) {
          const existing = finalActiveCheck[0];
          return res.status(200).json({
            ok: true,
            reused: true,
            run_token: String(existing?.run_token || ""),
            run_seed: "",
            week_key: weekKey,
            game_seconds: GAME_SECONDS,
            created_at: now,
            expires_at: expiresAt
          });
        }
      }
    }

    const payload = {
      run_token: runToken,
      wallet,
      mode,
      city,
      country,
      created_at: now,
      expires_at: expiresAt
    };

    let insertError = null;

    {
      const attempt = await db.from("game_runs").insert({
        ...payload,
        week_key: weekKey,
        run_seed: runSeed,
        verification_status: "pending"
      });
      insertError = attempt.error || null;
    }

    if (insertError) {
      const msg = String(insertError.message || "").toLowerCase();
      const missingColumn =
        msg.includes("column") ||
        msg.includes("week_key") ||
        msg.includes("run_seed") ||
        msg.includes("verification_status");

      if (!missingColumn) {
        return res.status(500).json({
          ok: false,
          error: insertError.message || "Failed to create run"
        });
      }

      const fallback = await db.from("game_runs").insert(payload);
      if (fallback.error) {
        return res.status(500).json({
          ok: false,
          error: fallback.error.message || "Failed to create run"
        });
      }
    }

    return res.status(200).json({
      ok: true,
      reused: false,
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
