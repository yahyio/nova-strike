const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const waveBanner = document.getElementById("wave-banner");
const menu = document.getElementById("menu");
const gameoverScreen = document.getElementById("gameover");
const finalScore = document.getElementById("final-score");

let W, H;
function resize() {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

const keys = {};
addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space") e.preventDefault();
  if (e.code === "KeyP" && state.running) state.paused = !state.paused;
});
addEventListener("keyup", (e) => (keys[e.code] = false));

const state = {
  running: false,
  paused: false,
  score: 0,
  best: Number(localStorage.getItem("novaStrikeBest")) || 0,
  wave: 0,
  lives: 3,
  shake: 0,
};
bestEl.textContent = state.best;

const stars = Array.from({ length: 140 }, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  z: Math.random() * 0.8 + 0.2,
}));

const player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  angle: -Math.PI / 2,
  radius: 14,
  cooldown: 0,
  invuln: 0,
};

let bullets = [];
let enemies = [];
let particles = [];
let lastTime = 0;
let waveTimer = 0;

function resetPlayer() {
  player.x = W / 2;
  player.y = H * 0.72;
  player.vx = 0;
  player.vy = 0;
  player.invuln = 2;
}

function startGame() {
  state.score = 0;
  state.wave = 0;
  state.lives = 3;
  bullets = [];
  enemies = [];
  particles = [];
  resetPlayer();
  updateHud();
  menu.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  state.running = true;
  state.paused = false;
  nextWave();
}

function endGame() {
  state.running = false;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("novaStrikeBest", state.best);
    bestEl.textContent = state.best;
    finalScore.textContent = `${state.score} — new record`;
  } else {
    finalScore.textContent = `${state.score} points`;
  }
  gameoverScreen.classList.remove("hidden");
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.innerHTML = "<i></i>".repeat(Math.max(0, state.lives));
}

function showBanner(text) {
  waveBanner.textContent = text;
  waveBanner.classList.add("show");
  setTimeout(() => waveBanner.classList.remove("show"), 1600);
}

function nextWave() {
  state.wave++;
  showBanner(`WAVE ${state.wave}`);
  const count = 3 + state.wave * 2;
  for (let i = 0; i < count; i++) {
    setTimeout(() => spawnEnemy(), i * 420);
  }
}

function spawnEnemy() {
  if (!state.running) return;
  const roll = Math.random();
  const x = Math.random() * (W - 120) + 60;
  const speedUp = 1 + state.wave * 0.07;

  if (roll < 0.55) {
    enemies.push({
      type: "drifter",
      x,
      y: -40,
      vy: (60 + Math.random() * 50) * speedUp,
      phase: Math.random() * Math.PI * 2,
      amp: 40 + Math.random() * 60,
      radius: 16,
      hp: 1,
      color: "#ff5e7a",
    });
  } else if (roll < 0.85) {
    enemies.push({
      type: "chaser",
      x,
      y: -40,
      vx: 0,
      vy: 0,
      speed: (90 + Math.random() * 40) * speedUp,
      radius: 13,
      hp: 1,
      color: "#ffb02e",
    });
  } else {
    enemies.push({
      type: "tank",
      x,
      y: -60,
      vy: 38 * speedUp,
      radius: 26,
      hp: 4,
      color: "#b07aff",
    });
  }
}

function shoot() {
  bullets.push({
    x: player.x + Math.cos(player.angle) * 18,
    y: player.y + Math.sin(player.angle) * 18,
    vx: Math.cos(player.angle) * 620,
    vy: Math.sin(player.angle) * 620,
  });
  player.cooldown = 0.16;
}

function burst(x, y, color, amount, force) {
  for (let i = 0; i < amount; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * force + 40;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: Math.random() * 0.6 + 0.3,
      maxLife: 0.9,
      color,
      size: Math.random() * 3 + 1.5,
    });
  }
}

function thrustParticles() {
  particles.push({
    x: player.x - Math.cos(player.angle) * 16 + (Math.random() - 0.5) * 6,
    y: player.y - Math.sin(player.angle) * 16 + (Math.random() - 0.5) * 6,
    vx: -Math.cos(player.angle) * 120 + (Math.random() - 0.5) * 40,
    vy: -Math.sin(player.angle) * 120 + (Math.random() - 0.5) * 40,
    life: 0.25,
    maxLife: 0.25,
    color: "#7df9ff",
    size: 2.2,
  });
}

function hitPlayer() {
  if (player.invuln > 0) return;
  state.lives--;
  state.shake = 0.5;
  burst(player.x, player.y, "#7df9ff", 36, 260);
  updateHud();
  if (state.lives <= 0) {
    endGame();
  } else {
    resetPlayer();
  }
}

function update(dt) {
  const accel = 720;
  let ax = 0;
  let ay = 0;
  if (keys.KeyW || keys.ArrowUp) ay -= 1;
  if (keys.KeyS || keys.ArrowDown) ay += 1;
  if (keys.KeyA || keys.ArrowLeft) ax -= 1;
  if (keys.KeyD || keys.ArrowRight) ax += 1;

  if (ax || ay) {
    const len = Math.hypot(ax, ay);
    player.vx += (ax / len) * accel * dt;
    player.vy += (ay / len) * accel * dt;
    player.angle = Math.atan2(player.vy, player.vx);
    if (Math.random() < 0.8) thrustParticles();
  }

  player.vx *= Math.pow(0.0008, dt);
  player.vy *= Math.pow(0.0008, dt);
  player.x = Math.max(20, Math.min(W - 20, player.x + player.vx * dt));
  player.y = Math.max(20, Math.min(H - 20, player.y + player.vy * dt));

  player.cooldown -= dt;
  player.invuln -= dt;
  if (keys.Space && player.cooldown <= 0) shoot();

  bullets = bullets.filter((b) => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    return b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20;
  });

  enemies.forEach((e) => {
    if (e.type === "drifter") {
      e.phase += dt * 2.4;
      e.y += e.vy * dt;
      e.x += Math.cos(e.phase) * e.amp * dt;
    } else if (e.type === "chaser") {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.vx += (dx / d) * 260 * dt;
      e.vy += (dy / d) * 260 * dt;
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > e.speed) {
        e.vx = (e.vx / sp) * e.speed;
        e.vy = (e.vy / sp) * e.speed;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    } else {
      e.y += e.vy * dt;
    }
  });

  enemies = enemies.filter((e) => {
    if (e.y > H + 80) return false;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 4) {
        bullets.splice(i, 1);
        e.hp--;
        burst(b.x, b.y, e.color, 6, 120);
        if (e.hp <= 0) {
          burst(e.x, e.y, e.color, 26, 220);
          state.score += e.type === "tank" ? 50 : 15;
          state.shake = Math.max(state.shake, 0.18);
          updateHud();
          return false;
        }
      }
    }

    if (Math.hypot(player.x - e.x, player.y - e.y) < e.radius + player.radius - 4) {
      hitPlayer();
      burst(e.x, e.y, e.color, 20, 200);
      return false;
    }
    return true;
  });

  particles = particles.filter((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.985;
    p.vy *= 0.985;
    return p.life > 0;
  });

  stars.forEach((s) => {
    s.y += s.z * 26 * dt;
    if (s.y > H) {
      s.y = 0;
      s.x = Math.random() * W;
    }
  });

  state.shake = Math.max(0, state.shake - dt);

  if (state.running && enemies.length === 0) {
    waveTimer += dt;
    if (waveTimer > 1.2) {
      waveTimer = 0;
      nextWave();
    }
  }
}

function drawShip() {
  if (player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);

  ctx.shadowColor = "#7df9ff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#7df9ff";
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(11, 12);
  ctx.lineTo(0, 6);
  ctx.lineTo(-11, 12);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = e.color;

  if (e.type === "tank") {
    ctx.rotate(performance.now() / 900);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#05060c";
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === "chaser") {
    const a = Math.atan2(player.y - e.y, player.x - e.x) + Math.PI / 2;
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -e.radius);
    ctx.lineTo(e.radius * 0.8, e.radius);
    ctx.lineTo(-e.radius * 0.8, e.radius);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.rotate(e.phase);
    ctx.fillRect(-e.radius * 0.7, -e.radius * 0.7, e.radius * 1.4, e.radius * 1.4);
  }

  ctx.restore();
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake * 18, (Math.random() - 0.5) * state.shake * 18);
  }

  ctx.fillStyle = "#05060c";
  ctx.fillRect(-20, -20, W + 40, H + 40);

  stars.forEach((s) => {
    ctx.globalAlpha = s.z;
    ctx.fillStyle = "#cfe9ff";
    ctx.fillRect(s.x, s.y, s.z * 2, s.z * 2);
  });
  ctx.globalAlpha = 1;

  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;

  ctx.shadowColor = "#e8f4ff";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#e8f4ff";
  bullets.forEach((b) => {
    ctx.fillRect(b.x - 2, b.y - 6, 4, 12);
  });
  ctx.shadowBlur = 0;

  enemies.forEach(drawEnemy);

  if (state.running) drawShip();

  if (state.paused) {
    ctx.fillStyle = "rgba(5,6,12,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7df9ff";
    ctx.font = "700 28px Orbitron";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", W / 2, H / 2);
  }

  ctx.restore();
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (state.running && !state.paused) update(dt);
  draw();

  requestAnimationFrame(loop);
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("retry-btn").addEventListener("click", startGame);

requestAnimationFrame(loop);
