// NEON WORLD '99 — FINAL GAME ENGINE

const GAME_SECONDS = 60;
const SITE_URL = "https://neon-world-99.vercel.app";

// ---------------- PROGRESSION ----------------
const CITY_ORDER = [
  "New York",
  "Tokyo",
  "Berlin",
  "Rio",
  "Seoul",
  "London",
  "Paris",
  "Dubai",
  "Singapore",
  "Istanbul"
];

const CITY_REQUIRE = {
  "New York": 0,
  "Tokyo": 500,
  "Berlin": 700,
  "Rio": 900,
  "Seoul": 1100,
  "London": 1300,
  "Paris": 1500,
  "Dubai": 1800,
  "Singapore": 2100,
  "Istanbul": 2500
};

// ---------------- DIFFICULTY ----------------
const CITY_DIFF = {
  "New York":  { bpm: 110, note: 165, spawn: 0.92, accent: "#00d4ff" },
  "Tokyo":     { bpm: 116, note: 178, spawn: 0.96, accent: "#ff4fd8" },
  "Berlin":    { bpm: 120, note: 190, spawn: 1.00, accent: "#a8ff3e" },
  "Rio":       { bpm: 124, note: 202, spawn: 1.04, accent: "#ffd166" },
  "Seoul":     { bpm: 128, note: 214, spawn: 1.08, accent: "#7afcff" },
  "London":    { bpm: 132, note: 228, spawn: 1.12, accent: "#c8b6ff" },
  "Paris":     { bpm: 136, note: 242, spawn: 1.16, accent: "#ff99c8" },
  "Dubai":     { bpm: 140, note: 258, spawn: 1.20, accent: "#f8e16c" },
  "Singapore": { bpm: 144, note: 274, spawn: 1.25, accent: "#8be9fd" },
  "Istanbul":  { bpm: 148, note: 292, spawn: 1.30, accent: "#ffb703" }
};

// ---------------- THEMES ----------------
const CITY_BG = {
  "New York": "/bg_ny.jpg",
  "Tokyo": "/bg_tokyo.jpg",
  "Berlin": "/bg_berlin.jpg",
  "Rio": "/bg_rio.jpg",
  "Seoul": "/bg_seoul.jpg",
  "London": "/bg_london.jpg",
  "Paris": "/bg_paris.jpg",
  "Dubai": "/bg_dubai.jpg",
  "Singapore": "/bg_singapore.jpg",
  "Istanbul": "/bg_istanbul.jpg"
};

const CITY_BGM = {
  "New York": "/bgm_ny.mp3",
  "Tokyo": "/bgm_tokyo.mp3",
  "Berlin": "/bgm_berlin.mp3",
  "Rio": "/bgm_pulse.mp3",
  "Seoul": "/bgm_pulse.mp3",
  "London": "/bgm_midnight.mp3",
  "Paris": "/bgm_midnight.mp3",
  "Dubai": "/bgm_lux.mp3",
  "Singapore": "/bgm_lux.mp3",
  "Istanbul": "/bgm_lux.mp3"
};

// ---------------- FEEL TUNING ----------------
const HIT_WINDOW = 34;
const PERFECT_WINDOW = 18;
const BAD_TAP_PENALTY = 20;
const MISS_PENALTY = 35;
const SPAWN_INTERVAL = 0.72;

// ---------------- GLOBAL TOUCH / ZOOM LOCK ----------------
(function lockMobileZoomAndGestures() {
  let lastTouchEnd = 0;

  document.addEventListener("touchstart", function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
    if (typeof e.scale === "number" && e.scale !== 1) e.preventDefault();
  }, { passive: false });

  document.addEventListener("touchend", function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 350) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener("dblclick", function (e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("gesturestart", function (e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("gesturechange", function (e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("gestureend", function (e) {
    e.preventDefault();
  }, { passive: false });
})();

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

function loadCityScores() {
  try {
    const j = localStorage.getItem("neon99_city_scores");
    return j ? JSON.parse(j) : {};
  } catch {
    return {};
  }
}

function saveCityScore(city, score) {
  try {
    const data = loadCityScores();
    if (!data[city] || score > data[city]) data[city] = score;
    localStorage.setItem("neon99_city_scores", JSON.stringify(data));
  } catch {}
}

function getCityScore(city) {
  const data = loadCityScores();
  return Number(data[city] || 0);
}

function getMode() {
  return localStorage.getItem("neon99_mode") || "free";
}

function getWallet() {
  try {
    return localStorage.getItem("neon99_wallet") || "";
  } catch {
    return "";
  }
}

function getCountry() {
  try {
    return localStorage.getItem("neon99_country") || "unknown";
  } catch {
    return "unknown";
  }
}

function setCountry(country) {
  try {
    localStorage.setItem("neon99_country", String(country || "unknown"));
  } catch {}
}

function getCityRegion() {
  try {
    return localStorage.getItem("neon99_geo_city") || "unknown";
  } catch {
    return "unknown";
  }
}

function setCityRegion(city) {
  try {
    localStorage.setItem("neon99_geo_city", String(city || "unknown"));
  } catch {}
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

// ---------------- HELPERS ----------------
function cityUnlocked(city) {
  if (city === "New York") return true;

  const index = CITY_ORDER.indexOf(city);
  if (index <= 0) return false;

  const prev = CITY_ORDER[index - 1];
  return getCityScore(prev) >= CITY_REQUIRE[city];
}

function getAccent(city) {
  return (CITY_DIFF[city] || CITY_DIFF["New York"]).accent;
}

function getBg(city) {
  return CITY_BG[city] || CITY_BG["New York"];
}

function getMusic(city) {
  return CITY_BGM[city] || CITY_BGM["New York"];
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function shortWallet(w) {
  const s = String(w || "");
  if (!s) return "N/A";
  if (s.length <= 12) return s;
  return s.slice(0, 4) + "..." + s.slice(-4);
}

function applyBackground(city) {
  document.body.style.margin = "0";
  document.body.style.backgroundColor = "#000";
  document.body.style.backgroundImage = `url("${getBg(city)}")`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
  document.body.style.overscrollBehavior = "none";
}

async function detectGeoInfo() {
  const existingCountry = String(getCountry() || "").trim();
  const existingCity = String(getCityRegion() || "").trim();

  if (existingCountry && existingCountry !== "unknown" && existingCity && existingCity !== "unknown") {
    return { country: existingCountry, city: existingCity };
  }

  try {
    const r = await fetch("https://ipapi.co/json/");
    const j = await r.json();

    const country = String(j.country_code || j.country || j.country_name || "unknown").trim() || "unknown";
    const city = String(j.city || "unknown").trim() || "unknown";

    setCountry(country);
    setCityRegion(city);

    return { country, city };
  } catch {
    return {
      country: existingCountry || "unknown",
      city: existingCity || "unknown"
    };
  }
}

// ---------------- MUSIC ----------------
let bgm = null;
let bgmStarted = false;

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

function startMusicGesture(city) {
  if (bgmStarted) return;

  try {
    stopMusic();
    bgm = new Audio(getMusic(city));
    bgm.loop = true;
    bgm.volume = 0.38;
    const p = bgm.play();
    bgmStarted = true;
    if (p && p.catch) p.catch(() => { bgmStarted = false; });
  } catch {
    bgmStarted = false;
  }
}

// ---------------- RANKED ACCESS ----------------
async function fetchRankedPassFromServer() {
  const wallet = getWallet();

  if (!wallet) {
    return {
      ok: false,
      pass: false,
      pass_until: getLocalPassUntil()
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

  const serverPassUntil = Number(data.pass_until || 0);
  const localPassUntil = getLocalPassUntil();
  const finalPassUntil = Math.max(serverPassUntil, localPassUntil);

  setLocalPassUntil(finalPassUntil);

  return {
    ok: true,
    pass: finalPassUntil > Date.now(),
    pass_until: finalPassUntil
  };
}

async function ensureRankedAccess() {
  if (getMode() !== "ranked") return true;

  const localPassUntil = getLocalPassUntil();
  if (localPassUntil > Date.now()) return true;

  const wallet = getWallet();
  if (!wallet) return false;

  try {
    const passInfo = await fetchRankedPassFromServer();
    return Number(passInfo.pass_until || 0) > Date.now();
  } catch {
    return Number(getLocalPassUntil() || 0) > Date.now();
  }
}

// ---------------- RUN TOKEN ----------------
let currentRunToken = "";
let currentRunSeed = "";
let runStartedAt = 0;

// ---------------- GLOBALS ----------------
let currentCity = localStorage.getItem("neon99_city") || "";
let bestScore = 0;

// ---------------- CHALLENGE STATE ----------------
let lastCreatedChallengeUrl = "";
let lastFinalScore = 0;

async function createRunToken(cityName) {
  const modeNow = getMode();
  const wallet = (modeNow === "ranked" ? (getWallet() || "") : "") || "guest";
  const geo = await detectGeoInfo();

  const res = await fetch("/api/start-run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      wallet,
      mode: modeNow,
      city: cityName,
      country: geo.country
    })
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok || !data.ok || !data.run_token) {
    throw new Error(data.error || "Failed to start run");
  }

  currentRunToken = String(data.run_token);
  currentRunSeed = String(data.run_seed || "");
  runStartedAt = Number(data.created_at || Date.now());

  return currentRunToken;
}

// ---------------- VIRAL SHARE ----------------
async function fetchWeeklyShareData() {
  try {
    const r = await fetch("/api/weekly-winner");
    const j = await r.json();

    if (!r.ok || !j.ok) {
      return { jackpot: "live jackpot", leader: "current leader" };
    }

    return {
      jackpot: `${Number(j.jackpot_sol || 0).toFixed(3)} SOL`,
      leader: `${shortWallet(j.leader_wallet || "")} / ${Number(j.leader_score || 0)}`
    };
  } catch {
    return { jackpot: "live jackpot", leader: "current leader" };
  }
}

async function buildShareText(finalScore) {
  const weekly = await fetchWeeklyShareData();
  const mode = getMode();
  const geo = await detectGeoInfo();

  if (finalScore < 1000) {
    return [
      `Can you beat me in Neon World '99?`,
      `Stage: ${currentCity}`,
      `Weekly Jackpot: ${weekly.jackpot}`,
      "",
      `Play now: ${SITE_URL}`
    ].join("\n");
  }

  return [
    `I scored ${finalScore} in Neon World '99 🎮`,
    `Stage: ${currentCity}`,
    `Region: ${geo.city}, ${geo.country}`,
    mode === "ranked" ? "Ranked mode live on Solana." : "Retro rhythm arcade on Solana.",
    `Weekly Jackpot: ${weekly.jackpot}`,
    `Current Leader: ${weekly.leader}`,
    "",
    `Can you beat me?`,
    `Play now: ${SITE_URL}`
  ].join("\n");
}

async function buildChallengeShareText(challengeUrl, finalScore) {
  return [
    `🔥 Neon World '99 Challenge`,
    ``,
    `Score to beat: ${finalScore}`,
    `Stage: ${currentCity}`,
    ``,
    `Think you can beat me?`,
    ``,
    challengeUrl
  ].join("\n");
}

async function shareScore(finalScore) {
  const text = await buildShareText(finalScore);

  if (navigator.share) {
    try {
      await navigator.share({ title: "Neon World '99", text });
      return;
    } catch {}
  }

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  location.href = xUrl;
}

async function shareChallengeLink(challengeUrl, finalScore) {
  const text = await buildChallengeShareText(challengeUrl, finalScore);

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Neon World '99 Challenge",
        text
      });
      return;
    } catch {}
  }

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  location.href = xUrl;
}

async function createChallenge(finalScore) {
  const wallet = getWallet();
  if (!wallet) {
    throw new Error("Wallet required for challenge creation");
  }

  const geo = await detectGeoInfo();

  const res = await fetch("/api/challenge?action=create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      wallet,
      city: currentCity,
      country: geo.country,
      score: Number(finalScore),
      bounty_sol: 0
    })
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Failed to create challenge");
  }

  return String(data.challenge_url || "");
}

// ---------------- BOOT ----------------
async function bootGame() {
  const app = document.getElementById("app");
  if (!app) return;

  await detectGeoInfo();

  if (!currentCity) {
    location.href = "/city.html";
    return;
  }

  if (!CITY_ORDER.includes(currentCity)) {
    localStorage.removeItem("neon99_city");
    location.href = "/city.html";
    return;
  }

  if (!cityUnlocked(currentCity)) {
    alert("Selected city is locked.");
    location.href = "/city.html";
    return;
  }

  if (getMode() === "ranked") {
    const hasAccess = await ensureRankedAccess();
    if (!hasAccess) {
      alert("RANKED locked.\nConnect + Pay 0.01 SOL first.");
      location.href = "/ranked.html";
      return;
    }
  }

  try {
    await createRunToken(currentCity);
  } catch (e) {
    alert("Could not start run:\n" + String(e.message || e));
    location.href = "/city.html";
    return;
  }

  bestScore = getCityScore(currentCity);
  startGame();
}

// ---------------- GAME UI ----------------
function startGame() {
  applyBackground(currentCity);
  stopMusic();
  lastCreatedChallengeUrl = "";
  lastFinalScore = 0;

  const accent = getAccent(currentCity);
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="text-align:center;color:white;font-family:monospace;padding:16px;min-height:100vh;box-sizing:border-box;background:rgba(0,0,0,.34)">
      <h1 style="color:${accent};margin:10px 0;text-shadow:0 0 12px ${accent}">NEON WORLD '99</h1>

      <div style="font-size:13px;margin-bottom:10px">
        CITY: <b>${escapeHtml(currentCity)}</b>
      </div>

      <div style="margin:10px 0;font-size:13px;display:flex;justify-content:center;gap:14px;flex-wrap:wrap">
        <div>TIME <b id="t">60</b></div>
        <div>SCORE <b id="s">0</b></div>
        <div>COMBO <b id="c">0</b></div>
        <div>BEST <b id="b">${bestScore}</b></div>
      </div>

      <canvas id="cv"
        width="390"
        height="600"
        style="width:100%;max-width:420px;border:1px solid rgba(255,255,255,.25);border-radius:12px;background:rgba(0,0,0,.45);touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;">
      </canvas>

      <div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.78)">
        TAP = HIT · SWIPE = TEMPO
      </div>

      <div style="margin-top:8px;font-size:12px;color:rgba(255,255,255,.58)">
        Wider hit zone • smoother rhythm • one-thumb friendly
      </div>

      <div style="margin-top:12px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
        <button id="backBtn" style="padding:10px 14px;border:none;border-radius:10px;background:${accent};color:#000;font-family:monospace;font-weight:bold">
          BACK TO CITIES
        </button>
        <button id="homeBtn" style="padding:10px 14px;border:none;border-radius:10px;background:#222;color:#ddd;border:1px solid #444;font-family:monospace;font-weight:bold">
          HOME
        </button>
      </div>
    </div>
  `;

  document.getElementById("backBtn").onclick = () => {
    stopMusic();
    location.href = "/city.html";
  };

  document.getElementById("homeBtn").onclick = () => {
    stopMusic();
    location.href = "/index.html";
  };

  runGame();
}

// ---------------- GAME LOOP ----------------
function runGame() {
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const diff = CITY_DIFF[currentCity] || CITY_DIFF["New York"];
  const accent = diff.accent;

  let time = GAME_SECONDS;
  let score = 0;
  let combo = 0;
  let hitCount = 0;
  let missCount = 0;
  let maxCombo = 0;
  let bpm = diff.bpm;

  const notes = [];
  let spawnTimer = 0;
  let last = performance.now();
  let pulse = 0;

  let lastTouchEnd = 0;
  cv.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 350) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  function spawn() {
    const laneOffset = (Math.random() * 24) - 12;
    notes.push({
      y: -20,
      x: (cv.width / 2) + laneOffset,
      speed: diff.note * (0.96 + Math.random() * 0.08)
    });
  }

  function hit(e) {
    if (e && e.cancelable) e.preventDefault();

    startMusicGesture(currentCity);

    const hitY = cv.height * 0.78;
    let bestIndex = -1;
    let bestDistance = Infinity;

    for (let i = 0; i < notes.length; i++) {
      const d = Math.abs(notes[i].y - hitY);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0 && bestDistance <= HIT_WINDOW) {
      notes.splice(bestIndex, 1);

      combo++;
      hitCount++;
      if (combo > maxCombo) maxCombo = combo;

      if (bestDistance <= PERFECT_WINDOW) {
        score += 140 + combo * 8;
      } else {
        score += 110 + combo * 6;
      }

      pulse = 1;
    } else {
      combo = 0;
      missCount++;
      score = Math.max(0, score - BAD_TAP_PENALTY);
      pulse = -0.7;
    }
  }

  cv.addEventListener("pointerdown", hit, { passive: false });

  let sx = null;

  cv.addEventListener("touchstart", (e) => {
    if (e.cancelable) e.preventDefault();
    if (!e.touches || !e.touches[0]) return;
    sx = e.touches[0].clientX;
  }, { passive: false });

  cv.addEventListener("touchmove", (e) => {
    if (e.cancelable) e.preventDefault();
    if (sx == null) return;
    if (!e.touches || !e.touches[0]) return;

    const x = e.touches[0].clientX;
    const dx = x - sx;

    if (Math.abs(dx) > 30) {
      bpm += dx > 0 ? 5 : -5;
      bpm = Math.max(diff.bpm - 18, Math.min(diff.bpm + 18, bpm));
      sx = x;
    }
  }, { passive: false });

  cv.addEventListener("touchend", (e) => {
    if (e.cancelable) e.preventDefault();
    sx = null;
  }, { passive: false });

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    time -= dt;
    spawnTimer += dt * diff.spawn * (bpm / diff.bpm);
    pulse *= 0.9;

    if (spawnTimer > SPAWN_INTERVAL) {
      spawnTimer = 0;
      spawn();
    }

    for (let i = 0; i < notes.length; i++) {
      notes[i].y += notes[i].speed * dt;
    }

    const hitY = cv.height * 0.78;

    for (let i = notes.length - 1; i >= 0; i--) {
      if (notes[i].y > hitY + HIT_WINDOW + 26) {
        notes.splice(i, 1);
        combo = 0;
        missCount++;
        score = Math.max(0, score - MISS_PENALTY);
        pulse = -0.5;
      }
    }

    ctx.clearRect(0, 0, cv.width, cv.height);

    ctx.fillStyle = "rgba(0,0,0,0.26)";
    ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let y = 0; y < cv.height; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cv.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, hitY - HIT_WINDOW, cv.width, HIT_WINDOW * 2);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2 + Math.max(0, pulse * 2);
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(cv.width, hitY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(0, hitY - HIT_WINDOW);
    ctx.lineTo(cv.width, hitY - HIT_WINDOW);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, hitY + HIT_WINDOW);
    ctx.lineTo(cv.width, hitY + HIT_WINDOW);
    ctx.stroke();

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const w = 76;
      const h = 16;
      const x = note.x - (w / 2);

      ctx.fillStyle = "#ff2d6b";
      ctx.fillRect(x, note.y, w, h);
      ctx.strokeStyle = "rgba(255,255,255,.24)";
      ctx.strokeRect(x, note.y, w, h);
    }

    document.getElementById("t").textContent = String(Math.ceil(time));
    document.getElementById("s").textContent = String(score | 0);
    document.getElementById("c").textContent = String(combo);

    if (time <= 0) {
      endGame(score | 0, {
        hitCount,
        missCount,
        maxCombo
      });
      return;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

// ---------------- GAME END ----------------
async function endGame(finalScore, stats = {}) {
  stopMusic();

  saveCityScore(currentCity, finalScore);
  bestScore = getCityScore(currentCity);
  lastFinalScore = finalScore;
  lastCreatedChallengeUrl = "";

  let submitState = "NOT SENT";

  try {
    const modeNow = getMode();
    const wallet = (modeNow === "ranked" ? (getWallet() || "") : "") || "guest";
    const durationMs = Math.max(0, Date.now() - Number(runStartedAt || Date.now()));
    const geo = await detectGeoInfo();

    const res = await fetch("/api/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet,
        run_token: currentRunToken,
        score: Number(finalScore),
        city: currentCity,
        country: geo.country,
        mode: modeNow,
        hit_count: Number(stats.hitCount || 0),
        miss_count: Number(stats.missCount || 0),
        max_combo: Number(stats.maxCombo || 0),
        duration_ms: Number(durationMs || 0),
        run_seed: currentRunSeed
      })
    });

    let data = {};
    try {
      data = await res.json();
    } catch {}

    if (res.ok && data.ok) {
      submitState = data.verified ? "VERIFIED" : "FLAGGED";
    } else {
      submitState = "FAILED";
    }
  } catch {
    submitState = "FAILED";
  }

  showEndScreen(finalScore, submitState);
}

function showEndScreen(finalScore, submitState = "UNKNOWN") {
  const accent = getAccent(currentCity);
  const app = document.getElementById("app");

  const index = CITY_ORDER.indexOf(currentCity);
  const next = CITY_ORDER[index + 1];

  const nextText = next
    ? `NEXT CITY: ${next} | NEED: ${CITY_REQUIRE[next]} | STATUS: ${cityUnlocked(next) ? "UNLOCKED" : "LOCKED"}`
    : "ALL CITIES CLEARED";

  const canCreateChallenge =
    getMode() === "ranked" &&
    !!getWallet() &&
    submitState === "VERIFIED";

  const modeLine =
    submitState === "FLAGGED" && getMode() === "free"
      ? "MODE: PRACTICE"
      : `RANKED STATUS: ${escapeHtml(submitState)}`;

  app.innerHTML = `
    <div style="text-align:center;color:white;font-family:monospace;padding:24px 16px;min-height:100vh;box-sizing:border-box;background:rgba(0,0,0,.42)">
      <div style="font-size:12px;color:rgba(255,255,255,.72)">STAGE CLEAR</div>
      <h1 style="color:${accent};margin:10px 0 14px;text-shadow:0 0 12px ${accent}">RUN COMPLETE</h1>

      <div style="max-width:420px;margin:0 auto;border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:18px;background:rgba(255,255,255,.04);line-height:1.8">
        <div>CITY: <b>${escapeHtml(currentCity)}</b></div>
        <div>SCORE: <b>${finalScore}</b></div>
        <div>${modeLine}</div>
        <div>CITY BEST: <b>${getCityScore(currentCity)}</b></div>
        <div style="margin-top:8px;font-size:12px;color:#aaa">${nextText}</div>
      </div>

      <div id="challengeInfo" style="max-width:420px;margin:12px auto 0;font-size:12px;color:#aaa;line-height:1.6;"></div>

      <div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;align-items:center">
        <button id="shareBtn" style="width:100%;max-width:420px;padding:14px;border:none;border-radius:12px;background:${accent};color:#000;font-family:monospace;font-weight:bold">
          SHARE SCORE
        </button>

        ${canCreateChallenge ? `
          <button id="challengeBtn" style="width:100%;max-width:420px;padding:14px;border:none;border-radius:12px;background:#00d4ff;color:#000;font-family:monospace;font-weight:bold">
            CREATE CHALLENGE
          </button>
          <button id="shareChallengeBtn" style="width:100%;max-width:420px;padding:14px;border:none;border-radius:12px;background:#222;color:#ddd;border:1px solid #444;font-family:monospace;font-weight:bold">
            SHARE CHALLENGE
          </button>
        ` : ""}

        <button id="againBtn" style="width:100%;max-width:420px;padding:14px;border:none;border-radius:12px;background:#222;color:#ddd;border:1px solid #444;font-family:monospace;font-weight:bold">
          PLAY AGAIN
        </button>
        <button id="citiesBtn" style="width:100%;max-width:420px;padding:14px;border:none;border-radius:12px;background:#222;color:#ddd;border:1px solid #444;font-family:monospace;font-weight:bold">
          CHANGE CITY
        </button>
        <button id="homeBtn" style="width:100%;max-width:420px;padding:14px;border:none;border-radius:12px;background:#222;color:#ddd;border:1px solid #444;font-family:monospace;font-weight:bold">
          HOME
        </button>
      </div>
    </div>
  `;

  const challengeInfo = document.getElementById("challengeInfo");

  document.getElementById("shareBtn").onclick = async () => {
    await shareScore(finalScore);
  };

  if (canCreateChallenge) {
    const challengeBtn = document.getElementById("challengeBtn");
    const shareChallengeBtn = document.getElementById("shareChallengeBtn");

    challengeBtn.onclick = async () => {
      try {
        challengeBtn.disabled = true;
        challengeBtn.textContent = "CREATING CHALLENGE...";

        const url = await createChallenge(finalScore);
        lastCreatedChallengeUrl = url;

        challengeInfo.innerHTML =
          `Challenge created.<br><span style="color:#00d4ff">${escapeHtml(url)}</span>`;

        challengeBtn.textContent = "CHALLENGE CREATED";
      } catch (e) {
        challengeInfo.textContent = "Challenge creation failed: " + String(e.message || e);
        challengeBtn.disabled = false;
        challengeBtn.textContent = "CREATE CHALLENGE";
      }
    };

    shareChallengeBtn.onclick = async () => {
      try {
        if (!lastCreatedChallengeUrl) {
          const url = await createChallenge(finalScore);
          lastCreatedChallengeUrl = url;
          challengeInfo.innerHTML =
            `Challenge created.<br><span style="color:#00d4ff">${escapeHtml(url)}</span>`;
        }

        await shareChallengeLink(lastCreatedChallengeUrl, finalScore);
      } catch (e) {
        challengeInfo.textContent = "Challenge share failed: " + String(e.message || e);
      }
    };
  }

  document.getElementById("againBtn").onclick = async () => {
    try {
      await createRunToken(currentCity);
    } catch (e) {
      alert("Could not restart run:\n" + String(e.message || e));
      location.href = "/city.html";
      return;
    }
    startGame();
  };

  document.getElementById("citiesBtn").onclick = () => {
    location.href = "/city.html";
  };

  document.getElementById("homeBtn").onclick = () => {
    location.href = "/index.html";
  };
}

if (document.getElementById("app")) {
  bootGame();
}
