// NEON WORLD '99 — CLEAN SINGLE FILE (City Music + City Background + Game + Submit Score)
// REQUIRED in root: bgm_ny.mp3, bgm_tokyo.mp3, bgm_berlin.mp3
// OPTIONAL in root: bg_ny.jpg, bg_tokyo.jpg, bg_berlin.jpg

// ---------------- CONFIG ----------------
const GAME_SECONDS = 60;

const UNLOCKS = [
  { name: "New York", need: 0 },
  { name: "Tokyo", need: 10000 },
  { name: "Berlin", need: 25000 },
  { name: "Rio", need: 50000 },
  { name: "Seoul", need: 80000 },
];

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
  try { localStorage.setItem("neon99_best", String(v)); } catch {}
}
function getMode() {
  return localStorage.getItem("neon99_mode") || "free";
}
function getCountry() {
  return localStorage.getItem("neon99_country") || "TR";
}

// ---------------- STATE ----------------
let currentCity = "New York";
let bestScore = loadBest();

// ---------------- MUSIC + BACKGROUND ----------------
let audio = null;
let audioStarted = false;

function musicForCity(city) {
  if (city === "Tokyo") return "/bgm_tokyo.mp3";
  if (city === "Berlin") return "/bgm_berlin.mp3";
  return "/bgm_ny.mp3";
}

function bgForCity(city) {
  if (city === "Tokyo") return "/bg_tokyo.jpg";
  if (city === "Berlin") return "/bg_berlin.jpg";
  return "/bg_ny.jpg";
}

function applyBackground(city) {
  // If image doesn't exist, it will just stay black.
  const url = bgForCity(city);
  document.body.style.backgroundColor = "#000";
  document.body.style.backgroundImage = `url("${url}")`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
}

function stopCityMusic() {
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio = null;
    }
  } catch {}
  audioStarted = false;
}

// Must be called inside user gesture on mobile
function startCityMusicGesture() {
  if (audioStarted) return;
  try {
    stopCityMusic();
    audio = new Audio(musicForCity(currentCity));
    audio.loop = true;
    audio.volume = 0.4;
    const p = audio.play();
    audioStarted = true;
    if (p && p.catch) p.catch(() => { audioStarted = false; });
  } catch {
    audioStarted = false;
  }
}

function armMusicOnFirstTap() {
  // works on iOS: user taps once anywhere
  const once = () => startCityMusicGesture();
  document.addEventListener("click", once, { once: true });
  document.addEventListener("touchstart", once, { once: true, passive: true });
}

// ---------------- RANKED LOCK ----------------
function rankedLocked() {
  if (getMode() !== "ranked") return false;
  const pu = parseInt(localStorage.getItem("neon99_pass_until") || "0", 10);
  return Date.now() > pu;
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

// ---------------- CITY SELECT (called from city.html) ----------------
window.city = function (name) {
  if (rankedLocked()) {
    alert("RANKED locked.\nConnect + Pay 0.01 SOL first.");
    return;
  }

  const cityData = UNLOCKS.find(c => c.name === name);
  if (!cityData) { alert("Unknown city"); return; }

  if (bestScore < cityData.need) {
    alert("LOCKED\nYou need " + cityData.need + " score");
    return;
  }

  // stop any previous audio & set new city
  stopCityMusic();
  currentCity = name;

  startGame();
};

// ---------------- GAME UI ----------------
function startGame() {
  applyBackground(currentCity);

  document.body.innerHTML = `
    <div style="text-align:center; padding:16px; color:#fff; font-family:monospace; backdrop-filter: blur(2px);">
      <h1 style="color:#00d4ff; margin:10px 0;">NEON WORLD '99</h1>
      <div style="color:rgba(255,255,255,.85); font-size:12px;">
        CITY: <b>${escapeHtml(currentCity)}</b> · TAP to hit
      </div>

      <div style="display:flex; justify-content:center; gap:14px; margin:10px 0; flex-wrap:wrap;">
        <div style="color:rgba(255,255,255,.85); font-size:12px;">TIME <b id="t">${GAME_SECONDS}</b></div>
        <div style="color:rgba(255,255,255,.85); font-size:12px;">SCORE <b id="s">0</b></div>
        <div style="color:rgba(255,255,255,.85); font-size:12px;">COMBO <b id="c">x0</b></div>
        <div style="color:rgba(255,255,255,.85); font-size:12px;">BEST <b id="b">${bestScore}</b></div>
      </div>

      <canvas id="cv" width="390" height="600"
        style="width:100%; max-width:420px; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:rgba(0,0,0,.45);"></canvas>

      <div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
        <button id="exit"
          style="padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.25); background:rgba(0,0,0,.4); color:#fff;">
          BACK TO CITIES
        </button>
        <button id="playMusic"
          style="padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.25); background:rgba(0,0,0,.4); color:#fff;">
          PLAY MUSIC
        </button>
      </div>

      <div style="margin-top:10px; color:rgba(255,255,255,.8); font-size:12px;">
        Swipe L/R = tempo · Hold = reverse
      </div>
      <div style="margin-top:6px; color:rgba(255,255,255,.55); font-size:11px;">
        Mobile rule: music starts only after your tap
      </div>
    </div>
  `;

  document.getElementById("exit").onclick = () => {
    stopCityMusic();
    location.href = "/city.html";
  };

  // Guaranteed user-gesture play
  document.getElementById("playMusic").onclick = startCityMusicGesture;

  // Also arm music on first tap anywhere
  armMusicOnFirstTap();

  runMiniGame();
}

// ---------------- GAME LOOP ----------------
function runMiniGame() {
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const W = cv.width;
  const H = cv.height;

  let tLeft = GAME_SECONDS;
  let score = 0;
  let combo = 0;

  // tempo control
  let bpm = 120;
  let reverse = false;

  const notes = [];
  let spawnAcc = 0;

  // swipe for bpm
  let sx = null;
  cv.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  cv.addEventListener("touchmove", (e) => {
    if (sx == null) return;
    const x = e.touches[0].clientX;
    const dx = x - sx;
    if (Math.abs(dx) > 30) {
      bpm = clamp(bpm + (dx > 0 ? 6 : -6), 80, 170);
      sx = x;
    }
  }, { passive: true });
  cv.addEventListener("touchend", () => { sx = null; }, { passive: true });

  // tap = hit
  cv.addEventListener("click", onTap);

  // hold = reverse
  let holdTimer = null;
  cv.addEventListener("mousedown", () => {
    holdTimer = setTimeout(() => { reverse = true; flash("REVERSE"); }, 220);
  });
  const holdEnd = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    reverse = false;
  };
  cv.addEventListener("mouseup", holdEnd);
  cv.addEventListener("mouseleave", holdEnd);

  // message flash
  let msg = "";
  let msgT = 0;
  function flash(s) { msg = s; msgT = 0.8; }

  function onTap() {
    // also try start music on tap (safe)
    startCityMusicGesture();

    const hitY = H * 0.78;
    const idx = notes.findIndex((n) => Math.abs(n.y - hitY) < 18);
    if (idx >= 0) {
      notes.splice(idx, 1);
      combo++;
      score += 200 + combo * 10;
      flash("PERFECT");
    } else {
      combo = Math.max(0, combo - 2);
      score = Math.max(0, score - 80);
      flash("MISS");
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    tLeft -= dt;
    if (tLeft < 0) tLeft = 0;

    // spawn notes based on bpm
    const bps = bpm / 60;
    spawnAcc += bps * dt;
    if (spawnAcc >= 1) {
      spawnAcc -= 1;
      notes.push({ y: -20, speed: 180 + (bpm - 110) * 1.2 });
    }

    // update notes
    for (const n of notes) n.y += (reverse ? -1 : 1) * n.speed * dt;

    // miss notes
    const hitY = H * 0.78;
    for (let i = notes.length - 1; i >= 0; i--) {
      if (notes[i].y > hitY + 40) {
        notes.splice(i, 1);
        combo = Math.max(0, combo - 3);
        score = Math.max(0, score - 120);
      }
      if (notes[i] && notes[i].y < -80) notes.splice(i, 1);
    }

    // passive tempo bonus near 120
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
    stopCityMusic();

    bestScore = Math.max(bestScore, finalScore);
    saveBest(bestScore);

    // submit score
    try {
      const modeNow = getMode();
      const wallet =
        (modeNow === "ranked" ? (localStorage.getItem("neon99_wallet") || "") : "") || "guest";

      fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          score: Number(finalScore),
          city: currentCity,
          country: getCountry()
        })
      }).catch(() => {});
    } catch {}

    const unlocked = UNLOCKS.filter((u) => bestScore >= u.need).map((u) => u.name);
    alert(`SCORE: ${finalScore}\nBEST: ${bestScore}\nUNLOCKED: ${unlocked.join(", ")}`);

    location.href = "/city.html";
  }
}

// ---------------- DRAW ----------------
function draw(ctx, W, H, bpm, reverse, notes, msg, msgT) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);

  // scanlines
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

  // hit line
  const hitY = H * 0.78;
  ctx.strokeStyle = "rgba(168,255,62,0.6)";
  ctx.beginPath();
  ctx.moveTo(laneX - 90, hitY);
  ctx.lineTo(laneX + 90, hitY);
  ctx.stroke();

  // notes
  for (const n of notes) {
    ctx.fillStyle = "rgba(255,45,107,0.8)";
    ctx.fillRect(laneX - 36, n.y, 72, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(laneX - 36, n.y, 72, 16);
  }

  // bpm indicator
  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`BPM ${Math.round(bpm)}${reverse ? " (REV)" : ""}`, 12, 24);

  if (msgT > 0) {
    ctx.font = "22px monospace";
    ctx.fillStyle = `rgba(0,212,255,${Math.min(1, msgT)})`;
    ctx.fillText(msg, 12, 54);
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}
