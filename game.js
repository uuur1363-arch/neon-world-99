// NEON WORLD '99 — FINAL GAME.JS
// smoother input, anti-cheat run token, share score, jackpot share,
// full city theme map, city difficulty profiles, retro 90s arcade feel

// ---------------- CONFIG ----------------
const GAME_SECONDS = 60;
const SITE_URL = "https://neon-world-99.vercel.app";

// City unlock progression used by BOTH city screen logic and game start logic
const UNLOCKS = [
  { name: "New York", need: 0 },
  { name: "Tokyo", need: 300 },
  { name: "Berlin", need: 700 },
  { name: "Rio", need: 1200 },
  { name: "Seoul", need: 1800 },
  { name: "London", need: 2500 },
  { name: "Paris", need: 3300 },
  { name: "Dubai", need: 4200 },
  { name: "Singapore", need: 5200 },
  { name: "Istanbul", need: 6500 }
];

const CITY_THEMES = {
  "New York": {
    bg: "/bg_ny.jpg",
    bgFallback: "/bg_ny.jpg",
    music: "/bgm_ny.mp3",
    musicFallback: "/bgm_ny.mp3",
    accent: "#00d4ff",
    note: "rgba(255,45,107,0.82)",
    lane: "rgba(0,212,255,0.08)",
    line: "rgba(0,212,255,0.72)",
    profile: {
      bpmStart: 112,
      bpmMin: 88,
      bpmMax: 145,
      noteSpeedBase: 165,
      noteSpeedScale: 1.0,
      tempoBonusScale: 9
    }
  },
  "Tokyo": {
    bg: "/bg_tokyo.jpg",
    bgFallback: "/bg_ny.jpg",
    music: "/bgm_tokyo.mp3",
    musicFallback: "/bgm_ny.mp3",
    accent: "#ff4fd8",
    note: "rgba(0,212,255,0.86)",
    lane: "rgba(255,79,216,0.08)",
    line: "rgba(255,79,216,0.74)",
    profile: {
      bpmStart: 118,
      bpmMin: 92,
      bpmMax: 152,
      noteSpeedBase: 172,
      noteSpeedScale: 1.05,
      tempoBonusScale: 9.5
    }
  },
  "Berlin": {
    bg: "/bg_berlin.jpg",
    bgFallback: "/bg_ny.jpg",
    music: "/bgm_berlin.mp3",
    musicFallback: "/bgm_ny.mp3",
    accent: "#a8ff3e",
    note: "rgba(168,255,62,0.84)",
    lane: "rgba(168,255,62,0.08)",
    line: "rgba(168,255,62,0.72)",
    profile: {
      bpmStart: 122,
      bpmMin: 95,
      bpmMax: 158,
      noteSpeedBase: 178,
      noteSpeedScale: 1.08,
      tempoBonusScale: 10
    }
  },
  "Rio": {
    bg: "/bg_rio.jpg",
    bgFallback: "/bg_ny.jpg",
    music: "/bgm_pulse.mp3",
    musicFallback: "/bgm_ny.mp3",
    accent: "#ffd166",
    note: "rgba(255,209,102,0.86)",
    lane: "rgba(255,209,102,0.08)",
    line: "rgba(255,209,102,0.75)",
    profile: {
      bpmStart: 124,
      bpmMin: 96,
      bpmMax: 162,
      noteSpeedBase: 182,
      noteSpeedScale: 1.1,
      tempoBonusScale: 10.5
    }
  },
  "Seoul": {
    bg: "/bg_seoul.jpg",
    bgFallback: "/bg_tokyo.jpg",
    music: "/bgm_pulse.mp3",
    musicFallback: "/bgm_tokyo.mp3",
    accent: "#7afcff",
    note: "rgba(122,252,255,0.87)",
    lane: "rgba(122,252,255,0.08)",
    line: "rgba(122,252,255,0.76)",
    profile: {
      bpmStart: 126,
      bpmMin: 98,
      bpmMax: 165,
      noteSpeedBase: 186,
      noteSpeedScale: 1.12,
      tempoBonusScale: 10.8
    }
  },
  "London": {
    bg: "/bg_london.jpg",
    bgFallback: "/bg_berlin.jpg",
    music: "/bgm_midnight.mp3",
    musicFallback: "/bgm_berlin.mp3",
    accent: "#c8b6ff",
    note: "rgba(200,182,255,0.87)",
    lane: "rgba(200,182,255,0.08)",
    line: "rgba(200,182,255,0.76)",
    profile: {
      bpmStart: 128,
      bpmMin: 100,
      bpmMax: 168,
      noteSpeedBase: 190,
      noteSpeedScale: 1.15,
      tempoBonusScale: 11.2
    }
  },
  "Paris": {
    bg: "/bg_paris.jpg",
    bgFallback: "/bg_london.jpg",
    music: "/bgm_midnight.mp3",
    musicFallback: "/bgm_ny.mp3",
    accent: "#ff99c8",
    note: "rgba(255,153,200,0.87)",
    lane: "rgba(255,153,200,0.08)",
    line: "rgba(255,153,200,0.76)",
    profile: {
      bpmStart: 130,
      bpmMin: 102,
      bpmMax: 170,
      noteSpeedBase: 194,
      noteSpeedScale: 1.18,
      tempoBonusScale: 11.5
    }
  },
  "Dubai": {
    bg: "/bg_dubai.jpg",
    bgFallback: "/bg_ny.jpg",
    music: "/bgm_lux.mp3",
    musicFallback: "/bgm_ny.mp3",
    accent: "#f8e16c",
    note: "rgba(248,225,108,0.88)",
    lane: "rgba(248,225,108,0.08)",
    line: "rgba(248,225,108,0.78)",
    profile: {
      bpmStart: 134,
      bpmMin: 104,
      bpmMax: 174,
      noteSpeedBase: 198,
      noteSpeedScale: 1.2,
      tempoBonusScale: 12
    }
  },
  "Singapore": {
    bg: "/bg_singapore.jpg",
    bgFallback: "/bg_dubai.jpg",
    music: "/bgm_lux.mp3",
    musicFallback: "/bgm_ny.mp3",
    accent: "#8be9fd",
    note: "rgba(139,233,253,0.88)",
    lane: "rgba(139,233,253,0.08)",
    line: "rgba(139,233,253,0.78)",
    profile: {
      bpmStart: 138,
      bpmMin: 106,
      bpmMax: 178,
      noteSpeedBase: 202,
      noteSpeedScale: 1.24,
      tempoBonusScale: 12.5
    }
  },
  "Istanbul": {
    bg: "/bg_istanbul.jpg",
    bgFallback: "/bg_paris.jpg",
    music: "/bgm_lux.mp3",
    musicFallback: "/bgm_ny.mp3",
    accent: "#ffb703",
    note: "rgba(255,183,3,0.89)",
    lane: "rgba(255,183,3,0.08)",
    line: "rgba(255,183,3,0.8)",
    profile: {
      bpmStart: 142,
      bpmMin: 108,
      bpmMax: 182,
      noteSpeedBase: 208,
      noteSpeedScale: 1.28,
      tempoBonusScale: 13
    }
  }
};

// ---------------- STORAGE ----------------
function loadBest() {
  try {
    const v = localStorage.getItem("neon99_best");
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

function saveBest(v) {
  try {
    localStorage.setItem("neon99_best", String(v));
  } catch {}
}

function getMode() {
  return localStorage.getItem("neon99_mode") || "free";
}

function getCountry() {
  return localStorage.getItem("neon99_country") || "TR";
}

function getWallet() {
  try {
    return localStorage.getItem("neon99_wallet") || "";
  } catch {
    return "";
  }
}

function getLocalPassUntil() {
  try {
    return parseInt(localStorage.getItem("neon99_pass_until") || "0", 10);
  } catch {
    return 0;
  }
}

function setLocalPassUntil(v) {
  try {
    localStorage.setItem("neon99_pass_until", String(Number(v) || 0));
  } catch {}
}

// ---------------- GLOBAL STATE ----------------
let currentCity = "New York";
let bestScore = loadBest();
let currentRunToken = "";

// ---------------- SFX ----------------
function makeAudioPool(src, size = 4) {
  const pool = Array.from({ length: size }, () => {
    const a = new Audio(src);
    a.preload = "auto";
    return a;
  });
  let i = 0;

  return {
    play() {
      try {
        const a = pool[i];
        i = (i + 1) % pool.length;
        a.currentTime = 0;
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } catch {}
    }
  };
}

const sHitPool = makeAudioPool("/hit.mp3", 4);
const sMissPool = makeAudioPool("/miss.mp3", 3);
const sComboPool = makeAudioPool("/combo.mp3", 3);

// ---------------- HELPERS ----------------
function getCityTheme(city) {
  return CITY_THEMES[city] || CITY_THEMES["New York"];
}

function getUnlockData(cityName) {
  return UNLOCKS.find((c) => c.name === cityName) || null;
}

function shortWallet(w) {
  const s = String(w || "");
  if (!s) return "N/A";
  if (s.length <= 12) return s;
  return s.slice(0, 4) + "..." + s.slice(-4);
}

function fileExists(url) {
  return new Promise((resolve) => {
    const a = new Audio();
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    a.addEventListener("canplaythrough", () => finish(true), { once: true });
    a.addEventListener("error", () => finish(false), { once: true });
    a.src = url;

    setTimeout(() => finish(false), 1000);
  });
}

function imageExists(url) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;

    setTimeout(() => finish(false), 1000);
  });
}

function retroCalloutFromCombo(combo, hit) {
  if (!hit) return "MISS";
  if (combo >= 30) return "RADICAL";
  if (combo >= 20) return "TUBULAR";
  if (combo >= 10) return "GREAT";
  return "PERFECT";
}

// ---------------- MUSIC ----------------
let bgm = null;
let bgmStarted = false;

async function musicForCity(city) {
  const theme = getCityTheme(city);
  const ok = await fileExists(theme.music);
  return ok ? theme.music : theme.musicFallback;
}

async function startMusicGesture() {
  if (bgmStarted) return;

  try {
    stopMusic();
    const musicUrl = await musicForCity(currentCity);
    bgm = new Audio(musicUrl);
    bgm.loop = true;
    bgm.volume = 0.38;

    const p = bgm.play();
    bgmStarted = true;

    if (p && p.catch) {
      p.catch(() => {
        bgmStarted = false;
      });
    }
  } catch {
    bgmStarted = false;
  }
}

function stopMusic() {
  try {
    if (bgm) {
      bgm.pause();
      bgm.currentTime = 0;
      bgm = null;
    }
  } catch {}
  bgmStarted = false;
}

function armMusicOnFirstTap() {
  const once = () => startMusicGesture();
  document.addEventListener("pointerdown", once, { once: true });
  document.addEventListener("touchstart", once, { once: true, passive: true });
}

// ---------------- BACKGROUND ----------------
async function bgForCity(city) {
  const theme = getCityTheme(city);
  const ok = await imageExists(theme.bg);
  return ok ? theme.bg : theme.bgFallback;
}

async function applyBackground(city) {
  const bg = await bgForCity(city);
  document.body.style.backgroundColor = "#000";
  document.body.style.backgroundImage = `url("${bg}")`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
}

// ---------------- RANKED ACCESS ----------------
function rankedLocked() {
  if (getMode() !== "ranked") return false;
  const pu = getLocalPassUntil();
  return Date.now() > pu;
}

async function fetchRankedPassFromServer() {
  const wallet = getWallet();

  if (!wallet) {
    return {
      ok: false,
      pass: false,
      pass_until: 0,
      reason: "no_wallet"
    };
  }

  const res = await fetch(`/api/me?wallet=${encodeURIComponent(wallet)}`, {
    method: "GET"
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new Error(data.error || "Failed to check ranked pass");
  }

  const passUntil = Number(data.pass_until || 0);
  setLocalPassUntil(passUntil);

  return {
    ok: !!data.ok,
    pass: !!data.pass,
    pass_until: passUntil
  };
}

async function ensureRankedAccess() {
  if (getMode() !== "ranked") return true;

  const wallet = getWallet();
  if (!wallet) return false;

  try {
    const passInfo = await fetchRankedPassFromServer();
    return !!(passInfo.ok && passInfo.pass && Date.now() < Number(passInfo.pass_until || 0));
  } catch {
    return !rankedLocked();
  }
}

// ---------------- RUN TOKEN ----------------
async function createRunToken(cityName) {
  const modeNow = getMode();
  const wallet =
    (modeNow === "ranked" ? (getWallet() || "") : "") || "guest";

  const res = await fetch("/api/start-run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      wallet,
      mode: modeNow,
      city: cityName,
      country: getCountry()
    })
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok || !data.ok || !data.run_token) {
    throw new Error(data.error || "Failed to create run");
  }

  currentRunToken = String(data.run_token);
}

// ---------------- NAV HELPERS ----------------
window.goFree = function () {
  localStorage.setItem("neon99_mode", "free");
  location.href = "/city.html";
};

window.goRanked = function () {
  localStorage.setItem("neon99_mode", "ranked");
  location.href = "/city.html";
};

window.goBoard = function () {
  location.href = "/board.html";
};

window.goHome = function () {
  location.href = "/index.html";
};

// ---------------- CITY SELECT ----------------
window.city = async function (name) {
  const cityData = getUnlockData(name);

  if (!cityData) {
    alert("Unknown city: " + name);
    return;
  }

  // Always refresh latest local best right before checking
  bestScore = loadBest();

  if (getMode() === "ranked") {
    const hasAccess = await ensureRankedAccess();
    if (!hasAccess) {
      alert("RANKED locked.\nConnect + Pay 0.01 SOL first.");
      return;
    }
  }

  if (bestScore < cityData.need) {
    alert(
      "LOCKED\n" +
      "CITY: " + name + "\n" +
      "NEED: " + cityData.need + "\n" +
      "YOUR BEST: " + bestScore
    );
    return;
  }

  stopMusic();
  currentCity = name;

  try {
    await createRunToken(name);
  } catch (e) {
    alert("Could not start run:\n" + String(e.message || e));
    return;
  }

  startGame();
};

// ---------------- GAME UI ----------------
async function startGame() {
  await applyBackground(currentCity);

  const theme = getCityTheme(currentCity);

  document.body.innerHTML = `
    <div style="text-align:center; padding:16px; color:#fff; font-family:monospace;">
      <h1 style="color:${theme.accent}; margin:10px 0; text-shadow:0 0 12px ${theme.accent};">NEON WORLD '99</h1>
      <div style="color:rgba(255,255,255,.86); font-size:12px; letter-spacing:.5px;">
        STAGE: <b>${escapeHtml(currentCity.toUpperCase())}</b> · TAP TO HIT
      </div>

      <div style="display:flex; justify-content:center; gap:14px; margin:10px 0; flex-wrap:wrap;">
        <div style="color:rgba(255,255,255,.88); font-size:12px;">TIME <b id="t">${GAME_SECONDS}</b></div>
        <div style="color:rgba(255,255,255,.88); font-size:12px;">SCORE <b id="s">0</b></div>
        <div style="color:rgba(255,255,255,.88); font-size:12px;">COMBO <b id="c">x0</b></div>
        <div style="color:rgba(255,255,255,.88); font-size:12px;">BEST <b id="b">${bestScore}</b></div>
      </div>

      <canvas id="cv" width="390" height="600"
        style="width:100%; max-width:420px; border:1px solid rgba(255,255,255,.14); border-radius:12px; background:rgba(0,0,0,.36); touch-action:manipulation;"></canvas>

      <div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
        <button id="exit"
          style="padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.25); background:rgba(0,0,0,.42); color:#fff; font-family:monospace;">
          BACK TO CITIES
        </button>
        <button id="playMusic"
          style="padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.25); background:rgba(0,0,0,.42); color:#fff; font-family:monospace;">
          PLAY MUSIC
        </button>
      </div>

      <div style="margin-top:10px; color:rgba(255,255,255,.82); font-size:12px;">
        SWIPE L/R = TEMPO · HOLD = REVERSE
      </div>
      <div style="margin-top:6px; color:rgba(255,255,255,.58); font-size:11px;">
        90s ARCADE RULE: MUSIC STARTS AFTER YOUR TAP
      </div>
    </div>
  `;

  document.getElementById("exit").onclick = () => {
    stopMusic();
    location.href = "/city.html";
  };

  document.getElementById("playMusic").onclick = startMusicGesture;

  armMusicOnFirstTap();
  runMiniGame();
}

// ---------------- SHARE ----------------
async function fetchCurrentJackpotText() {
  const fallback = "Weekly jackpot is live.";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const r = await fetch("/api/weekly-winner", {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeout);

    let j = {};
    try {
      j = await r.json();
    } catch (_) {
      return fallback;
    }

    if (!r.ok || !j.ok) {
      return fallback;
    }

    const jackpotSol = Number(j.jackpot_sol || 0).toFixed(3);
    return `Weekly jackpot is now ${jackpotSol} SOL.`;
  } catch (_) {
    return fallback;
  }
}

async function buildShareText(finalScore, city, mode) {
  const jackpotLine = await fetchCurrentJackpotText();

  const lines = [
    `I scored ${finalScore} in Neon World '99 🎮`,
    "",
    `${mode === "ranked" ? "Ranked mode is live on Solana." : "Retro arcade rhythm on Solana."}`,
    `City: ${city}`,
    jackpotLine,
    "",
    `Play now: ${SITE_URL}`
  ];

  return lines.join("\n");
}

async function openShareScore(finalScore, city, mode) {
  const text = await buildShareText(finalScore, city, mode);
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.location.href = url;
}

async function showEndScreen(finalScore, unlocked, modeNow) {
  await applyBackground(currentCity);
  const theme = getCityTheme(currentCity);

  document.body.innerHTML = `
    <div style="text-align:center; padding:24px 16px 40px; color:#fff; font-family:monospace; min-height:100vh; box-sizing:border-box;">
      <div style="color:rgba(255,255,255,.72); font-size:12px; letter-spacing:1px;">STAGE CLEAR</div>
      <h1 style="color:${theme.accent}; margin:10px 0 8px; text-shadow:0 0 12px ${theme.accent};">RUN COMPLETE</h1>

      <div style="max-width:420px; margin:0 auto; border:1px solid rgba(255,255,255,.14); border-radius:14px; background:rgba(0,0,0,.46); padding:18px;">
        <div style="color:rgba(255,255,255,.7); font-size:12px;">MODE</div>
        <div style="font-size:24px; color:${modeNow === "ranked" ? "#ff2d6b" : "#a8ff3e"}; margin-bottom:14px;">
          ${escapeHtml(modeNow.toUpperCase())}
        </div>

        <div style="color:rgba(255,255,255,.7); font-size:12px;">CITY</div>
        <div style="font-size:22px; color:#fff; margin-bottom:14px;">
          ${escapeHtml(currentCity)}
        </div>

        <div style="color:rgba(255,255,255,.7); font-size:12px;">SCORE</div>
        <div style="font-size:32px; color:#ff2d6b; margin-bottom:14px;">
          ${Number(finalScore)}
        </div>

        <div style="color:rgba(255,255,255,.7); font-size:12px;">BEST</div>
        <div style="font-size:22px; color:${theme.accent}; margin-bottom:14px;">
          ${Number(bestScore)}
        </div>

        <div style="color:rgba(255,255,255,.7); font-size:12px;">UNLOCKED CITIES</div>
        <div style="font-size:14px; color:#fff; line-height:1.5;">
          ${escapeHtml(unlocked.join(", ") || "None")}
        </div>
      </div>

      <div style="margin-top:18px; display:flex; flex-direction:column; gap:10px; align-items:center;">
        <button id="shareScoreBtn"
          style="width:100%; max-width:420px; padding:14px 16px; border-radius:12px; border:none; background:${theme.accent}; color:#000; font-family:monospace; font-weight:bold;">
          SHARE SCORE
        </button>

        <button id="playAgainBtn"
          style="width:100%; max-width:420px; padding:14px 16px; border-radius:12px; border:1px solid rgba(255,255,255,.25); background:rgba(0,0,0,.42); color:#fff; font-family:monospace;">
          INSERT COIN AGAIN
        </button>

        <button id="homeBtn"
          style="width:100%; max-width:420px; padding:14px 16px; border-radius:12px; border:1px solid rgba(255,255,255,.25); background:rgba(0,0,0,.42); color:#fff; font-family:monospace;">
          HOME
        </button>
      </div>
    </div>
  `;

  document.getElementById("shareScoreBtn").onclick = async () => {
    const btn = document.getElementById("shareScoreBtn");
    btn.disabled = true;
    btn.textContent = "OPENING X...";

    try {
      await openShareScore(finalScore, currentCity, modeNow);
    } catch (_) {
      btn.disabled = false;
      btn.textContent = "SHARE SCORE";
      alert("Share could not be opened.");
    }
  };

  document.getElementById("playAgainBtn").onclick = () => {
    location.href = "/city.html";
  };

  document.getElementById("homeBtn").onclick = () => {
    location.href = "/index.html";
  };
}

// ---------------- GAME LOOP ----------------
function runMiniGame() {
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d", { alpha: false });
  const W = cv.width;
  const H = cv.height;
  const theme = getCityTheme(currentCity);
  const profile = theme.profile;

  let tLeft = GAME_SECONDS;
  let score = 0;
  let combo = 0;

  let bpm = profile.bpmStart;
  let reverse = false;

  const notes = [];
  let spawnAcc = 0;

  let sx = null;
  cv.addEventListener("touchstart", (e) => {
    sx = e.touches[0].clientX;
  }, { passive: true });

  cv.addEventListener("touchmove", (e) => {
    if (sx == null) return;
    const x = e.touches[0].clientX;
    const dx = x - sx;

    if (Math.abs(dx) > 30) {
      bpm = clamp(bpm + (dx > 0 ? 6 : -6), profile.bpmMin, profile.bpmMax);
      sx = x;
    }
  }, { passive: true });

  cv.addEventListener("touchend", () => {
    sx = null;
  }, { passive: true });

  let holdTimer = null;

  const holdStart = () => {
    holdTimer = setTimeout(() => {
      reverse = true;
      flash("REVERSE");
    }, 220);
  };

  const holdEnd = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    reverse = false;
  };

  cv.addEventListener("mousedown", holdStart);
  cv.addEventListener("mouseup", holdEnd);
  cv.addEventListener("mouseleave", holdEnd);
  cv.addEventListener("touchstart", holdStart, { passive: true });
  cv.addEventListener("touchend", holdEnd, { passive: true });

  let msg = "";
  let msgT = 0;

  function flash(s) {
    msg = s;
    msgT = 0.72;
  }

  function onTap(e) {
    if (e && e.cancelable) e.preventDefault();
    startMusicGesture();

    const hitY = H * 0.78;
    let bestIdx = -1;
    let bestDist = 99999;

    for (let i = 0; i < notes.length; i++) {
      const d = Math.abs(notes[i].y - hitY);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestDist < 22) {
      notes.splice(bestIdx, 1);
      combo++;
      score += 200 + combo * 10;
      flash(retroCalloutFromCombo(combo, true));

      sHitPool.play();
      if (combo % 10 === 0) sComboPool.play();
    } else {
      combo = Math.max(0, combo - 2);
      score = Math.max(0, score - 80);
      flash(retroCalloutFromCombo(combo, false));
      sMissPool.play();
    }
  }

  cv.addEventListener("pointerdown", onTap, { passive: false });

  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.028, (now - last) / 1000);
    last = now;

    tLeft -= dt;
    if (tLeft < 0) tLeft = 0;

    const bps = bpm / 60;
    spawnAcc += bps * dt;

    if (spawnAcc >= 1) {
      spawnAcc -= 1;
      notes.push({
        y: -20,
        speed: profile.noteSpeedBase + (bpm - 110) * profile.noteSpeedScale
      });
    }

    for (let i = 0; i < notes.length; i++) {
      notes[i].y += (reverse ? -1 : 1) * notes[i].speed * dt;
    }

    const hitY = H * 0.78;

    for (let i = notes.length - 1; i >= 0; i--) {
      if (notes[i].y > hitY + 40) {
        notes.splice(i, 1);
        combo = Math.max(0, combo - 3);
        score = Math.max(0, score - 120);
      } else if (notes[i].y < -80) {
        notes.splice(i, 1);
      }
    }

    const tempoBonus = Math.max(0, 1 - Math.abs(profile.bpmStart - bpm) / 40);
    score += tempoBonus * profile.tempoBonusScale * dt * (1 + combo / 30);

    draw(ctx, W, H, bpm, reverse, notes, msg, msgT);

    document.getElementById("t").textContent = String(Math.ceil(tLeft));
    document.getElementById("s").textContent = String(score | 0);
    document.getElementById("c").textContent = `x${combo}`;

    if (msgT > 0) msgT -= dt;

    if (tLeft <= 0) {
      end(score | 0);
      return;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  function end(finalScore) {
    stopMusic();

    bestScore = Math.max(loadBest(), finalScore);
    saveBest(bestScore);

    try {
      const modeNow = getMode();
      const wallet =
        (modeNow === "ranked" ? (getWallet() || "") : "") || "guest";

      fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          run_token: currentRunToken,
          score: Number(finalScore),
          city: currentCity,
          country: getCountry(),
          mode: modeNow
        })
      }).catch(() => {});
    } catch {}

    const unlocked = UNLOCKS
      .filter((u) => bestScore >= u.need)
      .map((u) => u.name);

    showEndScreen(finalScore, unlocked, getMode());
  }
}

// ---------------- DRAW ----------------
function draw(ctx, W, H, bpm, reverse, notes, msg, msgT) {
  const theme = getCityTheme(currentCity);

  ctx.fillStyle = "#070707";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  for (let y = 0; y < H; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const laneX = W * 0.5;
  ctx.fillStyle = theme.lane;
  ctx.fillRect(laneX - 70, 0, 140, H);

  const hitY = H * 0.78;
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(laneX - 90, hitY);
  ctx.lineTo(laneX + 90, hitY);
  ctx.stroke();

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    ctx.fillStyle = theme.note;
    ctx.fillRect(laneX - 36, n.y, 72, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.strokeRect(laneX - 36, n.y, 72, 16);
  }

  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.fillText(`BPM ${Math.round(bpm)}${reverse ? " (REV)" : ""}`, 12, 24);

  if (msgT > 0) {
    ctx.font = "22px monospace";
    ctx.fillStyle = theme.accent;
    ctx.fillText(msg, 12, 54);
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[m];
  });
}
