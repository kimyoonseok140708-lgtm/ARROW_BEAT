const NOTE_KEYS = ["left", "up", "down", "right"];
const KEY_TO_LANE = {
  ArrowLeft: "left",
  a: "left",
  ArrowUp: "up",
  w: "up",
  ArrowDown: "down",
  s: "down",
  ArrowRight: "right",
  d: "right",
};

const TRACK_SEQUENCE = ["NEON RUSH", "MIDNIGHT DRIVE", "CYBER DUSK"];

const difficultyConfig = {
  EASY: {
    label: "EASY",
    speed: 1.0,
    interval: 850,
    noteCount: 36,
    judgeWindow: { perfect: 60, great: 120, good: 170 },
    musicTempo: 120,
    description: "Beginner Level",
  },
  NORMAL: {
    label: "NORMAL",
    speed: 1.25,
    interval: 660,
    noteCount: 46,
    judgeWindow: { perfect: 60, great: 110, good: 155 },
    musicTempo: 140,
    description: "Standard Level",
  },
  HARD: {
    label: "HARD",
    speed: 1.5,
    interval: 510,
    noteCount: 58,
    judgeWindow: { perfect: 55, great: 100, good: 145 },
    musicTempo: 160,
    description: "Advanced Level",
  },
  EXTREME: {
    label: "EXTREME",
    speed: 1.8,
    interval: 430,
    noteCount: 72,
    judgeWindow: { perfect: 50, great: 95, good: 135 },
    musicTempo: 180,
    description: "Expert Level",
  },
};

const state = {
  difficulty: "NORMAL",
  playing: false,
  paused: false,
  notes: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  accuracy: 100,
  totalJudged: 0,
  hitScoreTotal: 0,
  perfect: 0,
  great: 0,
  good: 0,
  miss: 0,
  currentTime: 0,
  lastTimestamp: 0,
  animationId: null,
  audioCtx: null,
  musicInterval: null,
  beatIndex: 0,
  performanceHistory: [],
  particleCanvas: null,
  particles: [],
  currentTrack: "NEON RUSH",
  trackIndex: 0,
};

const trackMap = {
  "NEON RUSH": { tempo: 124, theme: [220, 330, 440, 330, 277, 415, 554, 415], artist: "Synth Wave" },
  "MIDNIGHT DRIVE": { tempo: 138, theme: [164.81, 246.94, 329.63, 246.94, 196, 293.66, 392, 293.66], artist: "Cyber Pulse" },
  "CYBER DUSK": { tempo: 152, theme: [196, 293.66, 392, 293.66, 246.94, 369.99, 493.88, 369.99], artist: "Digital Dream" },
};

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");
const pauseOverlay = document.getElementById("pauseOverlay");
const noteField = document.getElementById("noteField");
const chartCanvas = document.getElementById("performanceChart");
const chartCtx = chartCanvas.getContext("2d");
const songNameEl = document.getElementById("songName");
const menuSongNameEl = document.getElementById("menuSongName");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const accuracyEl = document.getElementById("accuracy");
const bestScoreDisplay = document.getElementById("bestScoreDisplay");
const finalScoreEl = document.getElementById("finalScore");
const finalAccuracyEl = document.getElementById("finalAccuracy");
const finalMaxComboEl = document.getElementById("finalMaxCombo");
const finalRankEl = document.getElementById("finalRank");
const countPerfectEl = document.getElementById("countPerfect");
const countGreatEl = document.getElementById("countGreat");
const countGoodEl = document.getElementById("countGood");
const countMissEl = document.getElementById("countMiss");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const menuBtn = document.getElementById("menuBtn");
const chartStatusEl = document.getElementById("chartStatus");

// ============== STATE INITIALIZATION ==============
function initializeState() {
  state.difficulty = "NORMAL";
  state.playing = false;
  state.paused = false;
  state.currentTrack = TRACK_SEQUENCE[0];
  state.trackIndex = 0;
  setDifficulty(state.difficulty);
  updateBestDisplay();
  menuSongNameEl.textContent = `${state.currentTrack} // BGM LOOP`;
}

// ============== UI MANAGEMENT ==============
function setDifficulty(name) {
  state.difficulty = name;
  difficultyButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.difficulty === name);
  });
}

function showScreen(target) {
  [startScreen, gameScreen, resultScreen].forEach((screen) => {
    screen.classList.toggle("active", screen === target);
  });
}

function updateChartStatus(text) {
  if (chartStatusEl) {
    chartStatusEl.textContent = text;
  }
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  comboEl.textContent = String(state.combo);
  accuracyEl.textContent = `${state.accuracy.toFixed(1)}%`;
  updatePerformanceChart();
}

// ============== SCORE & ACCURACY ==============
function getBestScore() {
  return Number(localStorage.getItem("arrowBeatBestScore") || 0);
}

function saveBestScore() {
  const best = getBestScore();
  if (state.score > best) {
    localStorage.setItem("arrowBeatBestScore", String(state.score));
  }
  bestScoreDisplay.textContent = String(getBestScore());
}

function updateBestDisplay() {
  bestScoreDisplay.textContent = String(getBestScore());
}

function getRank() {
  const acc = state.accuracy;
  if (acc >= 98) return "S";
  if (acc >= 95) return "A";
  if (acc >= 90) return "B";
  if (acc >= 80) return "C";
  return "D";
}

function updateAccuracy() {
  const denominator = Math.max(1, state.totalJudged);
  const value = (state.hitScoreTotal / (denominator * 100)) * 100;
  state.accuracy = Number.isFinite(value) ? Math.min(100, value) : 100;
}

// ============== TRACK MANAGEMENT ==============
function getNextTrack() {
  state.trackIndex = (state.trackIndex + 1) % TRACK_SEQUENCE.length;
  state.currentTrack = TRACK_SEQUENCE[state.trackIndex];
  return state.currentTrack;
}

// ============== NOTE GENERATION ==============
function generatePattern() {
  const cfg = difficultyConfig[state.difficulty];
  const patterns = [
    ["left", "up", "down", "right"],
    ["left", "left", "right", "right"],
    ["up", "down", "up", "down"],
    ["left", "up", "right", "down"],
    ["left", "up", "up", "right"],
    ["down", "right", "left", "down"],
    ["left", "left", "up", "right"],
    ["right", "down", "left", "up"],
    ["left", "down", "right", "up", "left"],
    ["up", "left", "up", "right", "down"],
    ["left", "right", "left", "up", "down", "right"],
    ["up", "left", "right", "down", "up", "left"],
  ];

  const sequence = [];
  const baseIndex = Math.floor(state.beatIndex / 2) % patterns.length;

  for (let i = 0; i < cfg.noteCount; i++) {
    const pattern = patterns[(baseIndex + i) % patterns.length];
    const pick = pattern[Math.floor(Math.random() * pattern.length)];
    sequence.push(pick);

    if (i % 4 === 0 && Math.random() > 0.45) {
      sequence.push(pattern[(Math.floor(Math.random() * pattern.length) + 1) % pattern.length]);
    }
  }

  return sequence.slice(0, cfg.noteCount);
}

function createNote(direction, time) {
  const note = document.createElement("div");
  note.className = `note ${direction}`;
  note.dataset.direction = direction;

  const laneIndex = NOTE_KEYS.indexOf(direction);
  const leftStyle = ((laneIndex + 0.5) / NOTE_KEYS.length) * 100;
  note.style.left = `${leftStyle}%`;
  note.style.top = "-20px";

  noteField.appendChild(note);

  state.notes.push({
    direction,
    time,
    judged: false,
    element: note,
  });
}

function spawnNotes() {
  const cfg = difficultyConfig[state.difficulty];
  const pattern = generatePattern();
  let spawnTime = 1200;

  pattern.forEach((lane) => {
    createNote(lane, spawnTime);
    spawnTime += cfg.interval;
  });

  state.notes.sort((a, b) => a.time - b.time);
}

// ============== GAME STATE RESET ==============
function resetGameState() {
  state.notes = [];
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.accuracy = 100;
  state.totalJudged = 0;
  state.hitScoreTotal = 0;
  state.perfect = 0;
  state.great = 0;
  state.good = 0;
  state.miss = 0;
  state.currentTime = 0;
  state.lastTimestamp = 0;
  state.beatIndex = 0;
  state.paused = false;
  state.performanceHistory = [];
  noteField.innerHTML = "";
  pauseOverlay.classList.add("hidden");
  pauseBtn.textContent = "PAUSE";
  updateChartStatus("LIVE");
  updateHud();
  updatePerformanceChart();
}

function cleanupGame() {
  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
  stopMusic();
  state.playing = false;
  state.paused = false;
}

// ============== JUDGMENT & SCORING ==============
function showJudgementPopup(text) {
  const popup = document.createElement("div");
  popup.className = "hit-popup";
  popup.textContent = text;
  popup.style.color = text === "PERFECT" ? "#7ef7bf" : text === "GREAT" ? "#63f5ff" : text === "GOOD" ? "#ffe36b" : "#ff637d";
  noteField.appendChild(popup);
  setTimeout(() => popup.remove(), 660);
}

function judgeNote(direction) {
  if (!state.playing || state.paused) return;

  const laneNotes = state.notes.filter((note) => !note.judged && note.direction === direction);
  if (!laneNotes.length) {
    handleMissByInput();
    return;
  }

  const target = laneNotes.reduce((best, note) => {
    const delta = Math.abs(note.time - state.currentTime);
    if (!best || delta < best.delta) return { note, delta };
    return best;
  }, null);

  if (!target) {
    handleMissByInput();
    return;
  }

  const delta = target.delta;
  const windowCfg = difficultyConfig[state.difficulty].judgeWindow;

  let judgement = "MISS";
  if (delta <= windowCfg.perfect) judgement = "PERFECT";
  else if (delta <= windowCfg.great) judgement = "GREAT";
  else if (delta <= windowCfg.good) judgement = "GOOD";

  if (judgement === "MISS") {
    handleMissByInput();
    return;
  }

  target.note.judged = true;
  target.note.element.classList.add("hit");

  const scoreMap = { PERFECT: 1000, GREAT: 700, GOOD: 400 };
  const comboBonus = Math.min(state.combo * 25, 500);
  const award = scoreMap[judgement] + comboBonus;
  state.score += award;

  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.totalJudged += 1;

  if (judgement === "PERFECT") {
    state.perfect += 1;
    state.hitScoreTotal += 100;
  } else if (judgement === "GREAT") {
    state.great += 1;
    state.hitScoreTotal += 90;
  } else {
    state.good += 1;
    state.hitScoreTotal += 70;
  }

  showJudgementPopup(judgement);
  updateAccuracy();
  pushPerformanceSample();
  updateHud();

  setTimeout(() => {
    if (target.note.element && target.note.element.parentElement) {
      target.note.element.remove();
    }
  }, 90);
}

function handleMissByInput() {
  state.combo = 0;
  state.totalJudged += 1;
  state.miss += 1;
  showJudgementPopup("MISS");
  updateAccuracy();
  pushPerformanceSample();
  updateHud();
}

// ============== ANIMATION & CHART ==============
function animateNotes() {
  const cfg = difficultyConfig[state.difficulty];
  const travelDuration = 1900 / cfg.speed;

  state.notes.forEach((note) => {
    if (note.judged) return;

    const progress = (state.currentTime - note.time) / travelDuration;
    const y = -20 + progress * 500;

    if (y > 540) {
      note.judged = true;
      note.element.remove();
      state.combo = 0;
      state.totalJudged += 1;
      state.miss += 1;
      showJudgementPopup("MISS");
      updateAccuracy();
      pushPerformanceSample();
      updateHud();
      return;
    }

    note.element.style.top = `${Math.max(0, y)}px`;
  });
}

function updatePerformanceChart() {
  if (!chartCanvas || !chartCtx) return;

  const width = chartCanvas.width;
  const height = chartCanvas.height;
  chartCtx.clearRect(0, 0, width, height);

  chartCtx.strokeStyle = "rgba(255,255,255,0.08)";
  chartCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i;
    chartCtx.beginPath();
    chartCtx.moveTo(0, y);
    chartCtx.lineTo(width, y);
    chartCtx.stroke();
  }

  const samples = state.performanceHistory.length ? state.performanceHistory : [{ score: 0, accuracy: 100 }];
  const maxScore = Math.max(...samples.map((s) => s.score), 1000);

  chartCtx.strokeStyle = "rgba(99,245,255,0.9)";
  chartCtx.lineWidth = 2;
  chartCtx.beginPath();

  samples.forEach((sample, index) => {
    const x = (index / Math.max(1, samples.length - 1)) * width;
    const y = height - (sample.score / maxScore) * (height - 12) - 6;
    if (index === 0) chartCtx.moveTo(x, y);
    else chartCtx.lineTo(x, y);
  });
  chartCtx.stroke();

  chartCtx.strokeStyle = "rgba(255,227,107,0.9)";
  chartCtx.beginPath();
  samples.forEach((sample, index) => {
    const x = (index / Math.max(1, samples.length - 1)) * width;
    const y = height - ((sample.accuracy || 100) / 100) * (height - 12) - 6;
    if (index === 0) chartCtx.moveTo(x, y);
    else chartCtx.lineTo(x, y);
  });
  chartCtx.stroke();
}

function pushPerformanceSample() {
  state.performanceHistory.push({
    score: state.score,
    accuracy: state.accuracy,
  });

  if (state.performanceHistory.length > 18) {
    state.performanceHistory.shift();
  }

  updatePerformanceChart();
}

// ============== GAME FLOW ==============
function finishGame() {
  if (!state.playing) return;

  cleanupGame();
  saveBestScore();

  finalScoreEl.textContent = String(state.score);
  finalAccuracyEl.textContent = `${state.accuracy.toFixed(1)}%`;
  finalMaxComboEl.textContent = String(state.maxCombo);
  finalRankEl.textContent = getRank();
  countPerfectEl.textContent = String(state.perfect);
  countGreatEl.textContent = String(state.great);
  countGoodEl.textContent = String(state.good);
  countMissEl.textContent = String(state.miss);

  updateChartStatus("RESULT");
  showScreen(resultScreen);
}

function startGame() {
  cleanupGame();
  resetGameState();
  
  const track = getNextTrack();
  state.currentTrack = track;
  const trackInfo = trackMap[track];
  songNameEl.textContent = `${track} // ${state.difficulty}`;
  menuSongNameEl.textContent = `${track} // BGM LOOP`;
  
  spawnNotes();
  showScreen(gameScreen);
  state.playing = true;
  state.paused = false;
  startMusic();
  updateChartStatus("LIVE");
  state.animationId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (!state.playing) return;
  if (state.paused) return;

  if (!state.lastTimestamp) state.lastTimestamp = timestamp;
  const delta = timestamp - state.lastTimestamp;
  state.lastTimestamp = timestamp;
  state.currentTime += delta;

  animateNotes();

  const lastNote = state.notes[state.notes.length - 1];
  if (lastNote && state.currentTime > lastNote.time + 4000) {
    finishGame();
    return;
  }

  state.animationId = requestAnimationFrame(gameLoop);
}

// ============== INPUT HANDLING ==============
function getActiveLaneElement(direction) {
  return document.querySelector(`.lane[data-key="${direction}"]`);
}

function flashLane(direction) {
  const lane = getActiveLaneElement(direction);
  const guide = document.querySelector(`.guide-key[data-key="${direction}"]`);
  
  if (lane) lane.style.filter = "brightness(1.45)";
  if (guide) guide.classList.add("active");

  setTimeout(() => {
    if (lane) lane.style.filter = "";
    if (guide) guide.classList.remove("active");
  }, 120);
}

function handleKeyPress(event) {
  if (event.repeat && event.key.toLowerCase() !== "p") return;

  const key = event.key.toLowerCase();
  const normalized = KEY_TO_LANE[event.key] || KEY_TO_LANE[key] || null;
  
  if (event.key === "p" || event.key === "P") {
    togglePause();
    return;
  }

  if (!normalized) return;
  event.preventDefault();
  flashLane(normalized);
  judgeNote(normalized);
}

function handleLanePointer(direction) {
  if (!state.playing || state.paused) return;
  flashLane(direction);
  judgeNote(direction);
}

function bindTouchInputs() {
  document.querySelectorAll(".lane, .guide-key").forEach((element) => {
    const direction = element.dataset.key;
    if (!direction) return;

    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handleLanePointer(direction);
    });
  });
}

// ============== AUDIO ==============
function initAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!state.audioCtx) {
    state.audioCtx = new AudioCtx();
  }

  return state.audioCtx;
}

function playTone(frequency, duration = 0.12, volume = 0.06, type = "square") {
  const audioCtx = initAudio();
  if (!audioCtx) return;

  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback error:", e);
  }
}

function playMusicStep() {
  const track = trackMap[state.currentTrack] || trackMap["NEON RUSH"];
  if (!track) return;
  
  const row = track.theme;
  row.forEach((freq, idx) => {
    const delay = idx * 0.03;
    setTimeout(() => {
      playTone(freq, 0.12, 0.05 + idx * 0.008, idx % 3 === 0 ? "triangle" : "square");
    }, delay * 1000);
  });

  state.beatIndex += 1;
}

function startMusic() {
  const audioCtx = initAudio();
  if (!audioCtx) return;

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  stopMusic();
  const track = trackMap[state.currentTrack] || trackMap["NEON RUSH"];
  if (!track) return;
  
  const tickMs = (60000 / track.tempo) * 0.52;
  state.musicInterval = setInterval(playMusicStep, tickMs);
}

function stopMusic() {
  if (state.musicInterval) {
    clearInterval(state.musicInterval);
    state.musicInterval = null;
  }
}

// ============== PAUSE/RESUME ==============
function togglePause() {
  if (!state.playing) return;

  state.paused = !state.paused;
  pauseOverlay.classList.toggle("hidden", !state.paused);
  pauseBtn.textContent = state.paused ? "RESUME" : "PAUSE";

  if (state.paused) {
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
    updateChartStatus("PAUSED");
    return;
  }

  updateChartStatus("LIVE");
  state.lastTimestamp = 0;
  state.animationId = requestAnimationFrame(gameLoop);
}

// ============== PARTICLES ==============
function initParticles() {
  const canvas = document.getElementById("bgParticles");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  state.particleCanvas = canvas;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function makeParticles() {
    const total = 50;
    state.particles = Array.from({ length: total }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.4 + 0.8,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.8 + 0.2,
    }));
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of state.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.fillStyle = `rgba(99,245,255,${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(drawParticles);
  }

  resize();
  makeParticles();
  drawParticles();
  window.addEventListener("resize", resize);
}

// ============== INITIALIZATION ==============
function showTitleScreen() {
  updateBestDisplay();
  menuSongNameEl.textContent = `${state.currentTrack} // BGM LOOP`;
  updateChartStatus("READY");
  showScreen(startScreen);
}

// ============== EVENT LISTENERS ==============
startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
menuBtn.addEventListener("click", () => {
  cleanupGame();
  showTitleScreen();
});
pauseBtn.addEventListener("click", () => togglePause());
resumeBtn.addEventListener("click", () => togglePause());

difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => setDifficulty(btn.dataset.difficulty));
});

document.addEventListener("keydown", handleKeyPress);

// ============== START APPLICATION ==============
initializeState();
initParticles();
bindTouchInputs();
showTitleScreen();
