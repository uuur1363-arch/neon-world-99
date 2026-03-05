// NEON WORLD '99 — FINAL CLEAN (Game + Ranked Lock + City BGM + Score Submit)
// Requires: /bgm_ny.mp3 /bgm_tokyo.mp3 /bgm_berlin.mp3 in project root

// ----- config -----
const GAME_SECONDS = 60;

const UNLOCKS = [
  { name: "New York", need: 0 },
  { name: "Tokyo", need: 10000 },
  { name: "Berlin", need: 25000 },
  { name: "Rio", need: 50000 },
  { name: "Seoul", need: 80000 },
];

// ----- state -----
let currentCity = "New York";

// ----- best score local -----
function loadBest() {
  try {
    const v = localStorage.getItem("neon99_best");
    return v ? parseInt(v, 10) : 0;
  } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem("neon99_best", String(v)); } catch {}
}
let bestScore = loadBest();

// ----- country (flag) -----
function getCountry() {
  // user sets once from leaderboard page or you can set it manually
  return localStorage.getItem("neon99_country") || "US";
}

// ----- music (mobile-safe) -----
let bgm = new Audio();
bgm.loop = true;
bgm.volume = 0.35;

let musicStarted = false;

function bgmSrc(city) {
  if (city === "Tokyo") return "/bgm_tokyo.mp3";
  if (city === "Berlin") return "/bgm_berlin.mp3";
  return "/bgm_ny.mp3";
}

// Must be called inside user gesture
function startMusicFromGesture() {
  if (musicStarted) return;
  try {
    const src = bgmSrc(currentCity);
    if (!bgm.src.includes(src)) bgm.src = src;
    bgm.play().catch((e)=>{ console.log("BGM play error:", e); });
    musicStarted = true;
  } catch (e) {
    console.log("BGM error:", e);
  }
}

function stopMusic() {
  try {
    bgm.pause();
    bgm.currentTime = 0;
  } catch {}
  musicStarted = false;
}

// ----- ranked lock -----
function isRankedLocked() {
  const mode = localStorage.getItem("neon99_mode") || "free";
  if (mode !== "ranked") return false;
  const pu = parseInt(localStorage.getItem("neon99_pass_until") || "0", 10);
  return Date.now() > pu;
}

// ----- navigation helpers -----
function backToCities() {
  stopMusic();
  location.href = "/city.html";
}

// ----- called from city.html buttons: onclick="city('Tokyo')" -----
window.city = function (name) {
  // ranked lock check
  if (isRankedLocked()) {
    alert("RANKED locked.\nConnect + Pay 0.01 SOL first.");
    return;
  }

  // unlock check
  const cityData = UNLOCKS.find(c => c.name === name);
  if (!cityData) { alert("Unknown city"); return; }
  if (bestScore < cityData.need) {
    alert("LOCKED\nYou need " + cityData.need + " score");
    return;
  }

  currentCity = name;
  startGame();
};

// ----- GAME UI -----
function startGame() {
  document.body.innerHTML = `
  <div style="text-align:center; padding:16px; color:#fff; font-family:monospace;">
    <h1 style="color:#00d4ff; margin:10px 0;">NEON WORLD '99</h1>
    <div style="color:rgba(255,255,255,.75); font-size:12px;">
      CITY: <b>${escapeHtml(currentCity)}</b> · TAP to hit
    </div>

    <div style="display:flex; justify-content:center; gap:14px; margin:10px 0; flex-wrap:wrap;">
      <div style="color:rgba(255,255,255,.75); font-size:12px;">TIME <b id="t">${GAME_SECONDS}</b></div>
      <div style="color:rgba(255,255,255,.75); font-size:12px;">SCORE <b id="s">0</b></div>
      <div style="color:rgba(255,255,255,.75); font-size:12px;">COMBO <b id="c">x0</b></div>
      <div style="color:rgba(255,255,255,.75); font-size:12px;">BEST <b id="b">${bestScore}</b></div>
    </div>

    <canvas id="cv" width="390" height="600"
      style="width:100%; max-width:420px; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:rgba(0,0,0,.35);"></canvas>

    <div style="margin-top:10px; display:flex; gap:10px; justify-content:center;">
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
  runMiniGame();
}

function runMiniGame() {
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const W = cv.width;
  const H = cv.height;

  // ✅ Music must start INSIDE gesture
  const musicOnce = () => startMusicFromGesture();
  cv.addEventListener("touchstart", musicOnce, { passive: true });
  cv.addEventListener("mousedown", musicOnce);
  cv.addEventListener("click", musicOnce);

  let tLeft = GAME_SECONDS;
  let score = 0;
  let combo = 0;

  let bpm = 120;
  let reverse = false;

  const notes = [];
  let spawnAcc = 0;

  // swipe BPM
  let sx = null;
  cv.addEventListener("touchstart", (e)=>{ sx = e.touches[0].clientX; }, { passive:true });
  cv.addEventListener("touchmove", (e)=>{
    if (sx == null) return;
    const x = e.touches[0].clientX;
    const dx = x - sx;
    if (Math.abs(dx) > 30) {
      bpm = clamp(bpm + (dx > 0 ? 6 : -6), 80, 170);
      sx = x;
    }
  }, { passive:true });
  cv.addEventListener("touchend", ()=>{ sx = null; }, { passive:true });

  // tap hit
  cv.addEventListener("click", onTap);

  // hold reverse
  let holdTimer = null;
  cv.addEventListener("mousedown", ()=>{
    holdTimer = setTimeout(()=>{ reverse = true; flash("REVERSE"); }, 220);
  });
  const holdEnd = ()=>{
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    reverse = false;
  };
  cv.addEventListener("mouseup", holdEnd);
  cv.addEventListener("mouseleave", holdEnd);

  // flash text
  let msg = "";
  let msgT = 0;
  function flash(s){ msg = s; msgT = 0.8; }

  function onTap() {
    const hitY = H * 0.78;
    const idx = notes.findIndex(n => Math.abs(n.y - hitY) < 18);
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
  function loop(now){
    const dt = Math.min(0.033, (now - last)/1000);
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

  function end(finalScore){
    stopMusic();

    bestScore = Math.max(bestScore, finalScore);
    saveBest(bestScore);

    // submit score
    try {
      const modeNow = localStorage.getItem("neon99_mode") || "free";
      const wallet =
        (modeNow === "ranked" ? (localStorage.getItem("neon99_wallet") || "") : "") ||
        "guest";

      const country = getCountry();

      fetch("/api/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  wallet,
  score: Number(finalScore),
  city: currentCity,
  country: localStorage.getItem("neon99_country") || "TR"
})
      }).catch(()=>{});
    } catch(e){}

    const unlocked = UNLOCKS.filter(u => bestScore >= u.need).map(u=>u.name);
    alert(`SCORE: ${finalScore}\nBEST: ${bestScore}\nUNLOCKED: ${unlocked.join(", ")}`);
    backToCities();
  }
}

// ----- draw -----
function draw(ctx, W, H, bpm, reverse, notes, msg, msgT) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let y = 0; y < H; y += 6) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const laneX = W * 0.5;
  ctx.fillStyle = "rgba(0,212,255,0.08)";
  ctx.fillRect(laneX - 70, 0, 140, H);

  const hitY = H * 0.78;
  ctx.strokeStyle = "rgba(168,255,62,0.6)";
  ctx.beginPath(); ctx.moveTo(laneX - 90, hitY); ctx.lineTo(laneX + 90, hitY); ctx.stroke();

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

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
