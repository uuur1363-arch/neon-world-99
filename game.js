// NEON WORLD '99 — STABLE FINAL ENGINE

const GAME_SECONDS = 60;

// progression order
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

// unlock requirements:
// each city unlocks by reaching this score in the PREVIOUS city
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

// city difficulty
const CITY_DIFF = {
  "New York": { bpm: 110, note: 180, spawn: 1.00, accent: "#00d4ff" },
  "Tokyo": { bpm: 118, note: 195, spawn: 1.05, accent: "#ff4fd8" },
  "Berlin": { bpm: 122, note: 210, spawn: 1.10, accent: "#a8ff3e" },
  "Rio": { bpm: 126, note: 225, spawn: 1.15, accent: "#ffd166" },
  "Seoul": { bpm: 130, note: 240, spawn: 1.20, accent: "#7afcff" },
  "London": { bpm: 134, note: 255, spawn: 1.25, accent: "#c8b6ff" },
  "Paris": { bpm: 138, note: 270, spawn: 1.30, accent: "#ff99c8" },
  "Dubai": { bpm: 142, note: 285, spawn: 1.35, accent: "#f8e16c" },
  "Singapore": { bpm: 146, note: 300, spawn: 1.40, accent: "#8be9fd" },
  "Istanbul": { bpm: 150, note: 320, spawn: 1.50, accent: "#ffb703" }
};

// themes
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
    if (!data[city] || score > data[city]) {
      data[city] = score;
    }
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
    return localStorage.getItem("neon99_country") || "TR";
  } catch {
    return "TR";
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

// ---------------- HELPERS ----------------
function cityUnlocked(city) {
  if (city === "New York") return true;

  const index = CITY_ORDER.indexOf(city);
  if (index <= 0) return false;

  const prev = CITY_ORDER[index - 1];
  const prevScore = getCityScore(prev);

  return prevScore >= CITY_REQUIRE[city];
}

function getAccent(city) {
  return (CITY_DIFF[city] || CITY_DIFF["New York"]).accent;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

function applyBackground(city) {
  const bg = CITY_BG[city] || CITY_BG["New York"];
  document.body.style.margin = "0";
  document.body.style.backgroundColor = "#000";
  document.body.style.backgroundImage = `url("${bg}")`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
}

function shortWallet(w) {
  const s = String(w || "");
  if (!s) return "N/A";
  if (s.length <= 12) return s;
  return s.slice(0, 4) + "..." + s.slice(-4);
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
    const src = CITY_BGM[city] || CITY_BGM["New York"];
    bgm = new Audio(src);
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

// ---------------- RANKED ACCESS ----------------
async function fetchRankedPassFromServer() {
  const wallet = getWallet();

  if (!wallet) {
    return {
      ok: false,
      pass: false,
      pass_until: 0
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
    return Date.now() < getLocalPassUntil();
  }
}

// ---------------- ANTI-CHEAT RUN TOKEN ----------------
let currentRunToken = "";

async function createRunToken(cityName) {
  const modeNow = getMode();
  const wallet = (modeNow === "ranked" ? (getWallet() || "") : "") || "guest";

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

// ---------------- GLOBALS ----------------
let currentCity = localStorage.getItem("neon99_city") || "";
let bestScore = loadBest();

// ---------------- START ----------------
async function bootGame() {
  const app = document.getElementById("app");
  if (!app) return;

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

  startGame();
}

function startGame() {
  applyBackground(currentCity);

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
        style="width:100%;max-width:420px;border:1px solid rgba(255,255,255,.25);border-radius:12px;background:rgba(0,0,0,.45);touch-action:manipulation">
      </canvas>

      <div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.78)">
        TAP = HIT · SWIPE = TEMPO
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

function runGame() {
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const diff = CITY_DIFF[currentCity] || CITY_DIFF["New York"];
  const accent = diff.accent;

  let time = GAME_SECONDS;
  let score = 0;
  let combo = 0;
  let bpm = diff.bpm;

  const notes = [];
  let spawnTimer = 0;
  let last = performance.now();

  function spawn() {
    notes.push({
      y: -20,
      speed: diff.note
    });
  }

  function hit(e) {
    if (e && e.cancelable) e.preventDefault();

    startMusicGesture(currentCity);

    const hitY = cv.height * 0.78;
    const i = notes.findIndex((n) => Math.abs(n.y - hitY) < 20);

    if (i >= 0) {
      notes.splice(i, 1);
      combo++;
      score += 200 + combo * 10;
    } else {
      combo = 0;
      score = Math.max(0, score - 60);
    }
  }

  cv.addEventListener("pointerdown", hit, { passive: false });

  let sx = null;
  cv.addEventListener("touchstart", (e) => {
    sx = e.touches[0].clientX;
  }, { passive: true });

  cv.addEventListener("touchmove", (e) => {
    if (sx == null) return;
    const x = e.touches[0].clientX;
    const dx = x - sx;

    if (Math.abs(dx) > 30) {
      bpm += dx > 0 ? 6 : -6;
      bpm = Math.max(diff.bpm - 25, Math.min(diff.bpm + 25, bpm));
      sx = x;
    }
  }, { passive: true });

  cv.addEventListener("touchend", () => {
    sx = null;
  }, { passive: true });

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    time -= dt;
    spawnTimer += dt * diff.spawn * (bpm / diff.bpm);

    if (spawnTimer > 0.6) {
      spawnTimer = 0;
      spawn();
    }

    for (let i = 0; i < notes.length; i++) {
      notes[i].y += notes[i].speed * dt;
    }

    for (let i = notes.length - 1; i >= 0; i--) {
      if (notes[i].y > cv.height * 0.78 + 40) {
        notes.splice(i, 1);
        combo = 0;
        score = Math.max(0, score - 80);
      }
    }

    ctx.clearRect(0, 0, cv.width, cv.height);

    const hitY = cv.height * 0.78;

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let y = 0; y < cv.height; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cv.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(cv.width, hitY);
    ctx.stroke();

    for (let i = 0; i < notes.length; i++) {
      ctx.fillStyle = "#ff2d6b";
      ctx.fillRect(cv.width / 2 - 35, notes[i].y, 70, 14);
      ctx.strokeStyle = "rgba(255,255,255,.2)";
      ctx.strokeRect(cv.width / 2 - 35, notes[i].y, 70, 14);
    }

    document.getElementById("t").textContent = String(Math.ceil(time));
    document.getElementById("s").textContent = String(score | 0);
    document.getElementById("c").textContent = String(combo);

    if (time <= 0) {
      endGame(score | 0);
      return;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function endGame(finalScore) {
  stopMusic();

  bestScore = Math.max(loadBest(), finalScore);
  saveBest(bestScore);

  saveCityScore(currentCity, finalScore);

  try {
    const modeNow = getMode();
    const wallet = (modeNow === "ranked" ? (getWallet() || "") : "") || "guest";

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

  showEndScreen(finalScore);
}

function showEndScreen(finalScore) {
  const accent = getAccent(currentCity);
  const app = document.getElementById("app");

  const index = CITY_ORDER.indexOf(currentCity);
  const next = CITY_ORDER[index + 1];

  const nextText = next
    ? `NEXT CITY: ${next} | NEED: ${CITY_REQUIRE[next]} | STATUS: ${cityUnlocked(next) ? "UNLOCKED" : "LOCKED"}`
    : "ALL CITIES CLEARED";

  app.innerHTML = `
    <div style="text-align:center;color:white;font-family:monospace;padding:24px 16px;min-height:100vh;box-sizing:border-box;background:rgba(0,0,0,.42)">
      <div style="font-size:12px;color:rgba(255,255,255,.72)">STAGE CLEAR</div>
      <h1 style="color:${accent};margin:10px 0 14px;text-shadow:0 0 12px ${accent}">RUN COMPLETE</h1>

      <div style="max-width:420px;margin:0 auto;border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:18px;background:rgba(255,255,255,.04);line-height:1.8">
        <div>CITY: <b>${escapeHtml(currentCity)}</b></div>
        <div>SCORE: <b>${finalScore}</b></div>
        <div>CITY BEST: <b>${getCityScore(currentCity)}</b></div>
        <div>GLOBAL BEST: <b>${bestScore}</b></div>
        <div style="margin-top:8px;font-size:12px;color:#aaa">${nextText}</div>
      </div>

      <div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;align-items:center">
        <button id="againBtn" style="width:100%;max-width:420px;padding:14px;border:none;border-radius:12px;background:${accent};color:#000;font-family:monospace;font-weight:bold">
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

// boot only on game page
if (document.getElementById("app")) {
  bootGame();
}
