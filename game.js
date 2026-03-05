// MUSIC SYSTEM
let bgm = new Audio("/bgm_ny.mp3");
bgm.loop = true;
bgm.volume = 0.35;
let musicStarted = false;

function startMusic() {
  if (musicStarted) return;

  if (currentCity === "Tokyo") {
    bgm.src = "/bgm_tokyo.mp3";
  } else if (currentCity === "Berlin") {
    bgm.src = "/bgm_berlin.mp3";
  } else {
    bgm.src = "/bgm_ny.mp3";
  }

  bgm.play().catch(()=>{});
  musicStarted = true;
}

function stopMusic() {
  bgm.pause();
  bgm.currentTime = 0;
  musicStarted = false;
}
// NEON WORLD '99 — CLEAN BUILD (Remote City Music + Leaderboard)
// Works on mobile: music starts on first user gesture (tap)

// =====================
// CITY MUSIC (REMOTE MP3) — replace URLs if needed
// =====================
const MUSIC_BY_CITY = {
  "New York": "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/8bit_Dungeon_Level/Kevin_MacLeod_-_Pixelland.mp3",
  "Tokyo":    "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/8bit_Dungeon_Level/Kevin_MacLeod_-_Bit_Shift.mp3",
  "Berlin":   "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/8bit_Dungeon_Level/Kevin_MacLeod_-_Cipher.mp3",
  "Rio":      "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/8bit_Dungeon_Level/Kevin_MacLeod_-_Pixel_Peeker_Polka.mp3",
  "Seoul":    "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Kevin_MacLeod/8bit_Dungeon_Level/Kevin_MacLeod_-_8bit_Dungeon_Level.mp3",
};

// Simple SFX (remote). You can replace later.
const SFX = {
  hit:  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c3c8c8c8c5.mp3",
  miss: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_7c0d0a0a6c.mp3",
};

let bgm = new Audio();
bgm.loop = true;
bgm.volume = 0.35;
bgm.preload = "auto";

let hitSound = new Audio(SFX.hit);
let missSound = new Audio(SFX.miss);
hitSound.volume = 0.9;
missSound.volume = 0.9;

let muted = false;
let musicStarted = false;

function setBgmForCity(city) {
  const url = MUSIC_BY_CITY[city] || MUSIC_BY_CITY["New York"];
  if (!url) return;
  if (bgm.src !== url) bgm.src = url;
}

// MUST be called inside a user gesture event on mobile
function startMusicFromGesture(city) {
  if (muted) return;
  try {
    setBgmForCity(city);
    bgm.play(); // no await (mobile-friendly)
    musicStarted = true;
  } catch (e) {}
}

function stopMusic() {
  try {
    bgm.pause();
    bgm.currentTime = 0;
  } catch (e) {}
}

function sfx(which) {
  if (muted) return;
  try {
    const a = which === "hit" ? hitSound : missSound;
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch (e) {}
}

function toggleMute() {
  muted = !muted;
  if (muted) stopMusic();
  return muted;
}

// =====================
// STORAGE
// =====================
function loadBest() {
  try {
    const v = localStorage.getItem("neon99_best");
    return v ? parseInt(v, 10) : 0;
  } catch (e) {
    return 0;
  }
}
function saveBest(v) {
  try {
    localStorage.setItem("neon99_best", String(v));
  } catch (e) {}
}

// =====================
// STATE
// =====================
let currentCity = "New York";
let bestScore = loadBest();

const unlock = [
  { name: "New York", need: 0 },
  { name: "Tokyo", need: 10000 },
  { name: "Berlin", need: 25000 },
  { name: "Rio", need: 50000 },
  { name: "Seoul", need: 80000 },
];

// =====================
// NAV helpers (buttons in html can call these)
// =====================
function goFree() {
  localStorage.setItem("neon99_mode", "free");
  location.href = "/city.html";
}
function goRanked() {
  localStorage.setItem("neon99_mode", "ranked");
  location.href = "/city.html";
}
function goBoard() {
  location.href = "/board.html";
}

// =====================
// CITY SELECT (called from city.html onclick="city('Tokyo')")
// =====================
function city(name) {
  // Ranked lock check
  const mode = localStorage.getItem("neon99_mode") || "free";
  if (mode === "ranked") {
    const pu = parseInt(localStorage.getItem("neon99_pass_until") || "0", 10);
    if (Date.now() > pu) {
      alert("RANKED locked.\nConnect + Pay 0.01 SOL first.");
      return;
    }
  }

  const cityData = unlock.find((c) => c.name === name);
  if (!cityData) return alert("Unknown city");

  if (bestScore < cityData.need) {
    alert("LOCKED\nYou need " + cityData.need + " score");
    return;
  }

  currentCity = name;
  startGame();
}

function startGame() {
  document.body.innerHTML = `
    <div style="text-align:center; padding:16px; color:#fff; font-family:monospace;">
      <h1 style="color:#00d4ff; margin:10px 0;">NEON WORLD '99</h1>
      <div style="color:rgba(255,255,255,.75); font-size:12px;">
        CITY: <b>${escapeHtml(currentCity)}</b> · TAP to hit
      </div>

      <div style="display:flex; justify-content:center; gap:14px; margin:10px 0; flex-wrap:wrap;">
        <div style="color:rgba(255,255,255,.75); font-size:12px;">TIME <b id="t">60</b></div>
        <div style="color:rgba(255,255,255,.75); font-size:12px;">SCORE <b id="s">0</b></div>
        <div style="color:rgba(255,255,255,.75); font-size:12px;">COMBO <b id="c">x0</b></div>
        <div style="color:rgba(255,255,255,.75); font-size:12px;">BEST <b id="b">${bestScore}</b></div>
      </div>

      <canvas id="cv" width="390" height="600"
        style="width:100%; max-width:420px; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:rgba(0,0,0,.35);"></canvas>

      <div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
        <button id="mute"
          style="padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.2); background:transparent; color:#fff;">
          MUTE
        </button>
        <button id="exit"
          style="padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.2); background:transparent; color:#fff;">
          BACK TO CITIES
        </button>
      </div>

      <div style="margin-top:10px; color:rgba(255,255,255,.7); font-size:12px;">
        Swipe L/R = tempo · Hold = reverse
      </div>
      <div style="margin-top:6px; color:rgba(255,255,255,.5); font-size:11px;">
        Music starts on first tap (mobile rule)
      </div>
    </div>
  `;

  document.getElementById("exit").onclick = backToCities;
  document.getElementById("mute").onclick = () => {
    const m = toggleMute();
    document.getElementById("mute").textContent = m ? "UNMUTE" : "MUTE";
    if (!m && musicStarted) {
      // try resume if user already started once
      try { bgm.play(); } catch(e) {}
    }
  };

  runMiniGame();
}

function backToCities() {
  stopMusic();
  location.reload();
}

// =====================
// GAME LOOP
// =====================
function runMiniGame() {
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const W = cv.width;
  const H = cv.height;

  // Start music on first user gesture
  const startOnce = () => {
    if (musicStarted) return;
    startMusicFromGesture(currentCity);
  };
  cv.addEventListener("touchstart", startOnce, { passive: true });
  cv.addEventListener("mousedown", startOnce);
  cv.addEventListener("click", startOnce);

  let tLeft = 60.0;
  let score = 0;
  let combo = 0;

  let bpm = 120;
  let reverse = false;

  const notes = [];
  let spawnAcc = 0;

  let sx = null;
  const onTouchStart = (e) => { sx = e.touches[0].clientX; };
  const onTouchMove = (e) => {
    if (sx == null) return;
    const x = e.touches[0].clientX;
    const dx = x - sx;
    if (Math.abs(dx) > 30) {
      bpm = clamp(bpm + (dx > 0 ? 6 : -6), 80, 170);
      sx = x;
    }
  };
  const onTouchEnd = () => { sx = null; };

  const onTap = () => {
    const hitY = H * 0.78;
    const idx = notes.findIndex((n) => Math.abs(n.y - hitY) < 18);
    if (idx >= 0) {
      notes.splice(idx, 1);
      combo++;
      score += 200 + combo * 10;
      flash("PERFECT");
      sfx("hit");
    } else {
      combo = Math.max(0, combo - 2);
      score = Math.max(0, score - 80);
      flash("MISS");
      sfx("miss");
    }
  };

  let holdTimer = null;
  const onHoldStart = () => {
    holdTimer = setTimeout(() => {
      reverse = true;
      flash("REVERSE");
    }, 220);
  };
  const onHoldEnd = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    reverse = false;
  };

  cv.addEventListener("touchstart", onTouchStart, { passive: true });
  cv.addEventListener("touchmove", onTouchMove, { passive: true });
  cv.addEventListener("touchend", onTouchEnd, { passive: true });
  cv.addEventListener("click", onTap);
  cv.addEventListener("mousedown", onHoldStart);
  cv.addEventListener("mouseup", onHoldEnd);
  cv.addEventListener("mouseleave", onHoldEnd);

  let msg = "";
  let msgT = 0;
  function flash(s) { msg = s; msgT = 0.8; }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    tLeft -= dt;
    if (tLeft < 0) tLeft = 0;

    const bps = bpm / 60;
    spawnAcc += bps * dt;
    if (spawnAcc >= 1) {
      spawnAcc -= 1;
      notes.push({ y: -20, speed: 180 + (bpm - 110) * 1.2 });
    }

    for (const n of notes) n.y += (reverse ? -1 : 1) * n.speed * dt;

    const hitY = H * 0.78;
    for (let i = notes.length - 1; i >= 0; i--) {
      if (notes[i].y > hitY + 40) {
        notes.splice(i, 1);
        combo = Math.max(0, combo - 3);
        score = Math.max(0, score - 120);
      }
      if (notes[i] && notes[i].y < -80) notes.splice(i, 1);
    }

    const tempoBonus = Math.max(0, 1 - Math.abs(120 - bpm) / 40);
    score += tempoBonus * 10 * dt * (1 + combo / 30);

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

    bestScore = Math.max(bestScore, finalScore);
    saveBest(bestScore);

    // submit score to backend
    try {
      const modeNow = localStorage.getItem("neon99_mode") || "free";
      const wallet =
        (modeNow === "ranked" ? localStorage.getItem("neon99_wallet") : null) ||
        "guest";

      fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, score: Number(finalScore), city: currentCity }),
      }).catch(() => {});
    } catch (e) {}

    const unlocked = unlock.filter((u) => bestScore >= u.need).map((u) => u.name);
    alert(`SCORE: ${finalScore}\nBEST: ${bestScore}\nUNLOCKED: ${unlocked.join(", ")}`);
    backToCities();
  }
}

// =====================
// RENDER
// =====================
function draw(ctx, W, H, bpm, reverse, notes, msg, msgT) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let y = 0; y < H; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const laneX = W * 0.5;
  ctx.fillStyle = "rgba(0,212,255,0.08)";
  ctx.fillRect(laneX - 70, 0, 140, H);

  const hitY = H * 0.78;
  ctx.strokeStyle = "rgba(168,255,62,0.6)";
  ctx.beginPath();
  ctx.moveTo(laneX - 90, hitY);
  ctx.lineTo(laneX + 90, hitY);
  ctx.stroke();

  for (const n of notes) {
    ctx.fillStyle = "rgba(255,45,107,0.8)";
    ctx.fillRect(laneX - 36, n.y, 72, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(laneX - 36, n.y, 72, 16);
  }

  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`BPM ${Math.round(bpm)}${reverse ? " (REV)" : ""}`, 12, 24);

  if (msgT > 0) {
    ctx.font = "22px monospace";
    ctx.fillStyle = `rgba(0,212,255,${Math.min(1, msgT)})`;
    ctx.fillText(msg, 12, 54);
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}
