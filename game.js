// NEON WORLD '99 — Clean Mobile Web MVP
// City select -> 60s rhythm mini game -> score -> unlock cities
// Global leaderboard via /api/submit-score + /api/score

// =====================
// AUDIO (CDN) — change URLs later if you want
// =====================
const AUDIO = {
  muted: false,
  unlocked: false,
  bgm: null,
  hit: null,
  miss: null,
};

// You can replace these with your own links later.
// (Keeping CDN avoids the "audio folder" trouble on mobile GitHub.)
const AUDIO_URLS = {
  bgm: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_6c6a4c7e7b.mp3",
  hit: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c3c8c8c8c5.mp3",
  miss: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_7c0d0a0a6c.mp3",
};

function audioInit() {
  if (AUDIO.bgm) return;
  AUDIO.bgm = new Audio(AUDIO_URLS.bgm);
  AUDIO.bgm.loop = true;
  AUDIO.bgm.volume = 0.35;

  AUDIO.hit = new Audio(AUDIO_URLS.hit);
  AUDIO.hit.volume = 0.85;

  AUDIO.miss = new Audio(AUDIO_URLS.miss);
  AUDIO.miss.volume = 0.85;
}

// must be called only after user gesture (tap/click)
async function audioUnlockAndStart() {
  if (AUDIO.muted) return;
  audioInit();
  if (AUDIO.unlocked) return;

  AUDIO.unlocked = true;
  try {
    await AUDIO.bgm.play();
  } catch (e) {
    // mobile may still block; we'll try again on next tap
  }
}

function audioStop() {
  try {
    if (AUDIO.bgm) {
      AUDIO.bgm.pause();
      AUDIO.bgm.currentTime = 0;
    }
  } catch (e) {}
}

function audioSfx(which) {
  if (AUDIO.muted) return;
  audioInit();
  const a = which === "hit" ? AUDIO.hit : AUDIO.miss;
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch (e) {}
}

function audioToggleMute() {
  AUDIO.muted = !AUDIO.muted;
  try {
    if (AUDIO.muted) AUDIO.bgm && AUDIO.bgm.pause();
    else audioUnlockAndStart();
  } catch (e) {}
  return AUDIO.muted;
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
// NAV (called from buttons)
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
  // Ranked lock check (pass_until)
  const mode = localStorage.getItem("neon99_mode") || "free";
  if (mode === "ranked") {
    const pu = parseInt(localStorage.getItem("neon99_pass_until") || "0", 10);
    if (Date.now() > pu) {
      alert("RANKED locked.\nConnect + Pay 0.01 SOL first.");
      return;
    }
  }

  const cityData = unlock.find((c) => c.name === name);
  if (!cityData) {
    alert("Unknown city");
    return;
  }

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
    </div>
  `;

  document.getElementById("exit").onclick = backToCities;
  document.getElementById("mute").onclick = () => {
    const m = audioToggleMute();
    document.getElementById("mute").textContent = m ? "UNMUTE" : "MUTE";
  };

  runMiniGame();
}

function backToCities() {
  audioStop();
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

  let tLeft = 60.0;
  let score = 0;
  let combo = 0;

  // tempo control
  let bpm = 120;
  let reverse = false;

  // notes
  const notes = [];
  let spawnAcc = 0;

  // swipe
  let sx = null;

  // 🔑 Audio unlock on first gesture
  const unlockAudioOnce = () => audioUnlockAndStart();
  cv.addEventListener("touchstart", unlockAudioOnce, { passive: true });
  cv.addEventListener("mousedown", unlockAudioOnce);

  const onTouchStart = (e) => {
    sx = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    if (sx == null) return;
    const x = e.touches[0].clientX;
    const dx = x - sx;
    if (Math.abs(dx) > 30) {
      bpm = clamp(bpm + (dx > 0 ? 6 : -6), 80, 170);
      sx = x;
    }
  };
  const onTouchEnd = () => {
    sx = null;
  };

  // tap = hit
  const onTap = () => {
    const hitY = H * 0.78;
    const idx = notes.findIndex((n) => Math.abs(n.y - hitY) < 18);
    if (idx >= 0) {
      notes.splice(idx, 1);
      combo++;
      score += 200 + combo * 10;
      flash("PERFECT");
      audioSfx("hit");
    } else {
      combo = Math.max(0, combo - 2);
      score = Math.max(0, score - 80);
      flash("MISS");
      audioSfx("miss");
    }
  };

  // hold = reverse
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

  // message flash
  let msg = "";
  let msgT = 0;
  function flash(s) {
    msg = s;
    msgT = 0.8;
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
    for (const n of notes) {
      n.y += (reverse ? -1 : 1) * n.speed * dt;
    }

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

    // hud
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
    audioStop();

    bestScore = Math.max(bestScore, finalScore);
    saveBest(bestScore);

    // ✅ submit score (FREE -> guest, RANKED -> wallet if exists else guest)
    try {
      const modeNow = localStorage.getItem("neon99_mode") || "free";
      const wallet =
        (modeNow === "ranked" ? localStorage.getItem("neon99_wallet") : null) ||
        "guest";

      fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          score: Number(finalScore),
          city: currentCity,
        }),
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

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}
