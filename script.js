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

const difficultyConfig = {
  EASY: {
    label: "EASY",
    speed: 1.0,
    interval: 850,
    noteCount: 36,
    judgeWindow: { perfect: 60, great: 120, good: 170 },
    musicTempo: 120,
  },
  NORMAL: {
    label: "NORMAL",
    speed: 1.25,
    interval: 660,
    noteCount: 46,
    judgeWindow: { perfect: 60, great: 110, good: 155 },
    musicTempo: 140,
  },
  HARD: {
    label: "HARD",
    speed: 1.5,
    interval: 510,
    noteCount: 58,
    judgeWindow: { perfect: 55, great: 100, good: 145 },
    musicTempo: 160,
  },
  EXTREME: {
    label: "EXTREME",
    speed: 1.8,
    interval: 430,
    noteCount: 72,
    judgeWindow: { perfect: 50, great: 95, good: 135 },
    musicTempo: 180,
  },
};

const state = {
  difficulty: "NORMAL",
  playing: false,
  notes: [],
  noteQueueIndex: 0,
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
  currentPattern: [],
  startAt: 0,
};

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");
const noteField = document.getElementById("noteField");

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

function updateHud() {
  scoreEl.textContent = String(state.score);
  comboEl.textContent = String(state.combo);
  accuracyEl.textContent = `${state.accuracy.toFixed(1)}%`;
}

function getRank() {
  const acc = state.accuracy;
  if (acc >= 98) return "S";
  if (acc >= 95) return "A";
  if (acc >= 90) return "B";
  if (acc >= 80) return "C";
  return "D";
}

function judgeNote(direction) {
  if (!state.playing) return;

  const laneNotes = state.notes.filter((note) => !note.judged && note.direction === direction);
  if (!laneNotes.length) {
    handleMissByInput(direction);
    return;
  }

  const target = laneNotes.reduce((best, note) => {
    const delta = Math.abs(note.time - state.currentTime);
    if (!best || delta < best.delta) return { note, delta };
    return best;
  }, null);

  if (!target) {
    handleMissByInput(direction);
    return;
  }

  const delta = target.delta;
  const windowCfg = difficultyConfig[state.difficulty].judgeWindow;

  let judgement = "MISS";
  if (delta <= windowCfg.perfect) judgement = "PERFECT";
  else if (delta <= windowCfg.great) judgement = "GREAT";
  else if (delta <= windowCfg.good) judgement = "GOOD";

  if (judgement === "MISS") {
    handleMissByInput(direction);
    return;
  }

  target.note.judged = true;
  target.note.element.classList.add("hit");
  target.note.element.style.filter = "brightness(1.5)";

  const scoreMap = { PERFECT: 1000, GREAT: 700, GOOD: 400 };
  const comboBonus = Math.min(state.combo * 25, 500);
  const award = scoreMap[judgement] + comboBonus;
  state.score += award;

  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.totalJudged += 1;
  state.hitScoreTotal += judgement === "PERFECT" ? 100 : judgement === "GREAT" ? 90 : 70;

  if (judgement === "PERFECT") state.perfect += 1;
  if (judgement === "GREAT") state.great += 1;
  if (judgement === "GOOD") state.good += 1;

  showJudgementPopup(judgement);
  updateAccuracy();
  updateHud();

  setTimeout(() => {
    if (target.note.element && target.note.element.parentElement) {
      target.note.element.remove();
    }
  }, 90);
}

function handleMissByInput(direction) {
  state.combo = 0;
  state.totalJudged += 1;
  state.miss += 1;
  showJudgementPopup("MISS");
  updateAccuracy();
  updateHud();
}

function updateAccuracy() {
  const denominator = Math.max(1, state.totalJudged);
  const accuracy = ((state.hitScoreTotal / (denominator * 100)) * 100);
  state.accuracy = Number.isFinite(accuracy) ? Math.min(100, accuracy) : 100;
}

function showJudgementPopup(text) {
  const popup = document.createElement("div");
  popup.className = "hit-popup";
  popup.textContent = text;
  popup.style.color = getJudgementColor(text);
  popup.style.left = "50%";
  popup.style.top = "46%";
  noteField.appendChild(popup);

  setTimeout(() => popup.remove(), 660);
}

function getJudgementColor(text) {
  if (text === "PERFECT") return "#7ef7bf";
  if (text === "GREAT") return "#63f5ff";
  if (text === "GOOD") return "#ffe36b";
  return "#ff637d";
}

function normalizePattern(pattern) {
  return pattern.filter((item) => NOTE_KEYS.includes(item));
}

function generatePattern(difficulty) {
  const cfg = difficultyConfig[difficulty];
  const basePatterns = [
    ["left", "up", "down", "right"],
    ["left", "left", "right", "right"],
    ["up", "down", "up", "down"],
    ["left", "up", "right", "down"],
    ["left", "up", "up", "right"],
    ["down", "right", "left", "down"],
    ["left", "left", "up", "right"],
    ["right", "down", "left", "up"],
  ];

  const sequence = [];
  const noteCount = cfg.noteCount;

  for (let i = 0; i < noteCount; i++) {
    const pattern = basePatterns[Math.floor(Math.random() * basePatterns.length)];
    const cycleCount = i % 3 === 0 ? 2 : 1;
    for (let c = 0; c < cycleCount; c++) {
      const lane = pattern[Math.floor(Math.random() * pattern.length)];
      sequence.push(lane);
    }
  }

  return sequence.slice(0, noteCount);
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

  const noteData = {
    direction,
    time,
    judged: false,
    element: note,
  };

  state.notes.push(noteData);
  return noteData;
}

function spawnNotes() {
  const cfg = difficultyConfig[state.difficulty];
  const pattern = generatePattern(state.difficulty);
  state.currentPattern = pattern;

  let spawnTime = 900;
  pattern.forEach((lane) => {
    createNote(lane, spawnTime);
    spawnTime += cfg.interval;
  });

  state.notes.sort((a, b) => a.time - b.time);
}

function resetGameState() {
  state.notes = [];
  state.noteQueueIndex = 0;
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
  state.startAt = 0;
  noteField.innerHTML = "";
  updateHud();
}

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
      updateAccuracy();
      updateHud();
      return;
    }

    note.element.style.top = `${Math.max(0, y)}px`;
  });
}

function gameLoop(timestamp) {
  if (!state.playing) return;

  if (!state.lastTimestamp) state.lastTimestamp = timestamp;
  const delta = timestamp - state.lastTimestamp;
  state.lastTimestamp = timestamp;
  state.currentTime += delta;

  animateNotes();

  if (state.currentTime > state.notes.at(-1)?.time + 4000) {
    finishGame();
    return;
  }

  state.animationId = requestAnimationFrame(gameLoop);
}

function finishGame() {
  state.playing = false;
  cancelAnimationFrame(state.animationId);
  stopMusic();
  saveBestScore();

  finalScoreEl.textContent = String(state.score);
  finalAccuracyEl.textContent = `${state.accuracy.toFixed(1)}%`;
  finalMaxComboEl.textContent = String(state.maxCombo);
  finalRankEl.textContent = getRank();
  countPerfectEl.textContent = String(state.perfect);
  countGreatEl.textContent = String(state.great);
  countGoodEl.textContent = String(state.good);
  countMissEl.textContent = String(state.miss);

  showScreen(resultScreen);
}

function startGame() {
  resetGameState();
  spawnNotes();
  showScreen(gameScreen);
  state.playing = true;
  startMusic();
  state.animationId = requestAnimationFrame(gameLoop);
}

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
  const key = event.key.toLowerCase();
  const normalized = KEY_TO_LANE[event.key] || KEY_TO_LANE[key] || null;
  if (!normalized) return;

  event.preventDefault();
  flashLane(normalized);
  judgeNote(normalized);
}

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
}

function playMusicStep() {
  const config = difficultyConfig[state.difficulty];
  const pattern = [
    [220, 330, 440, 330],
    [277, 415, 554, 415],
    [164.81, 246.94, 329.63, 246.94],
    [196, 293.66, 392, 293.66],
  ];

  const row = pattern[state.beatIndex % pattern.length];
  row.forEach((freq, idx) => {
    const delay = idx * 0.03;
    setTimeout(() => {
      playTone(freq, 0.12, 0.05 + idx * 0.007, idx % 2 ? "triangle" : "square");
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

  if (state.musicInterval) clearInterval(state.musicInterval);
  const tickMs = 220 * (1.0 / Math.max(0.75, difficultyConfig[state.difficulty].speed * 0.8));
  state.musicInterval = setInterval(playMusicStep, tickMs);
}

function stopMusic() {
  if (state.musicInterval) {
    clearInterval(state.musicInterval);
    state.musicInterval = null;
  }
}

function showTitleScreen() {
  updateBestDisplay();
  showScreen(startScreen);
}

startBtn.addEventListener("click", startGame);
retryBtn.addEventListener("click", startGame);
menuBtn.addEventListener("click", () => {
  stopMusic();
  showTitleScreen();
});

difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => setDifficulty(btn.dataset.difficulty));
});

document.addEventListener("keydown", handleKeyPress);

setDifficulty(state.difficulty);
showTitleScreen();
