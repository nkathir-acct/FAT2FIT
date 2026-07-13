/* ==========================================================================
   FAT2FIT — APPLICATION LOGIC
   ==========================================================================
   Sections:
     1. Timer utility (timestamp-based, supports pause/resume)
     2. DOM references
     3. Workout step sequence (single source of truth for navigation)
     4. Screen rendering (one renderer per step type)
     5. Step navigation (forward / back / jump)
     6. Pause overlay
     7. Voice guidance (Speech Synthesis)
     8. Screen Wake Lock (keeps the display on during an active workout)
     9. Service worker registration (installable / instant repeat loads)
    10. Event wiring
   ========================================================================== */

/* --------------------------------------------------------------------
   1. TIMER UTILITY
   Timestamp-based so pause/resume is always exact, even if the browser
   throttles background tabs. mode 'up' counts up indefinitely (active
   set). mode 'down' counts down from `duration` seconds and fires
   onComplete when it reaches zero (rest, warm-up, cool-down).
   -------------------------------------------------------------------- */
class Timer {
  constructor({ mode, duration = 0, onTick, onComplete }) {
    this.mode = mode;
    this.duration = duration;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.elapsedSeconds = 0;
    this.running = false;
    this.intervalId = null;
    this.lastTimestamp = null;
  }

  start() {
    this.elapsedSeconds = 0;
    this.running = true;
    this.lastTimestamp = Date.now();
    this._emit();
    this.intervalId = setInterval(() => this._tick(), 200);
  }

  pause() {
    if (!this.running) return;
    this._advanceElapsed();
    this.running = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = Date.now();
    this.intervalId = setInterval(() => this._tick(), 200);
  }

  stop() {
    this.running = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  _advanceElapsed() {
    const now = Date.now();
    this.elapsedSeconds += (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
  }

  _tick() {
    if (!this.running) return;
    this._advanceElapsed();
    this._emit();
  }

  _emit() {
    if (this.mode === "up") {
      this.onTick(Math.floor(this.elapsedSeconds));
      return;
    }
    const remaining = Math.max(0, this.duration - this.elapsedSeconds);
    this.onTick(Math.ceil(remaining));
    if (remaining <= 0) {
      this.stop();
      if (this.onComplete) this.onComplete();
    }
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Formats the reps value from data.js ("8" or "10 each side") into a
// readable rep target string ("8 reps" / "10 reps each side").
function formatRepTarget(reps) {
  if (reps.includes("each side")) {
    const count = reps.replace(" each side", "");
    return `${count} reps each side`;
  }
  return `${reps} reps`;
}

// Formats the workout progress label, e.g. "Exercise 2 of 4".
function formatExerciseProgress(exerciseIndex) {
  const total = getWorkout().exercises.length;
  return `Exercise ${exerciseIndex + 1} of ${total}`;
}

/* --------------------------------------------------------------------
   2. DOM REFERENCES
   -------------------------------------------------------------------- */
const screens = {
  home: document.getElementById("screen-home"),
  warmup: document.getElementById("screen-warmup"),
  exercise: document.getElementById("screen-exercise"),
  active: document.getElementById("screen-active"),
  rest: document.getElementById("screen-rest"),
  cooldown: document.getElementById("screen-cooldown"),
  complete: document.getElementById("screen-complete")
};

const el = {
  voiceToggle: document.getElementById("btn-voice-toggle"),

  warmupMovement: document.getElementById("warmup-movement"),
  warmupTimer: document.getElementById("warmup-timer"),
  btnNextWarmup: document.getElementById("btn-next-warmup"),
  btnFinishWarmup: document.getElementById("btn-finish-warmup"),

  exerciseProgress: document.getElementById("exercise-progress"),
  exerciseVideo: document.getElementById("exercise-video"),
  exerciseMuscle: document.getElementById("exercise-muscle"),
  exerciseName: document.getElementById("exercise-name"),
  exerciseSetInfo: document.getElementById("exercise-set-info"),
  exerciseReps: document.getElementById("exercise-reps"),
  exerciseDescription: document.getElementById("exercise-description"),
  exerciseCue: document.getElementById("exercise-cue"),
  btnStartSet: document.getElementById("btn-start-set"),

  activeVideo: document.getElementById("active-video"),
  activeName: document.getElementById("active-name"),
  activeSetInfo: document.getElementById("active-set-info"),
  activeReps: document.getElementById("active-reps"),
  activeTimerDisplay: document.getElementById("active-timer"),
  btnPauseActive: document.getElementById("btn-pause-active"),
  btnCompleteSet: document.getElementById("btn-complete-set"),

  restTimerDisplay: document.getElementById("rest-timer"),
  restMessage: document.getElementById("rest-message"),
  restProgress: document.getElementById("rest-progress"),
  restVideo: document.getElementById("rest-video"),
  restMuscle: document.getElementById("rest-muscle"),
  restNextName: document.getElementById("rest-next-name"),
  restDescription: document.getElementById("rest-description"),
  restCue: document.getElementById("rest-cue"),
  btnPauseRest: document.getElementById("btn-pause-rest"),
  btnSkipRest: document.getElementById("btn-skip-rest"),

  cooldownMovement: document.getElementById("cooldown-movement"),
  cooldownTimer: document.getElementById("cooldown-timer"),
  btnNextCooldown: document.getElementById("btn-next-cooldown"),
  btnFinishCooldown: document.getElementById("btn-finish-cooldown"),

  btnHome: document.getElementById("btn-home"),

  pauseOverlay: document.getElementById("pause-overlay"),
  btnResume: document.getElementById("btn-resume")
};

const backButtons = document.querySelectorAll(".back-btn");

/* --------------------------------------------------------------------
   3. WORKOUT STEP SEQUENCE
   The entire workout — warm-up through cool-down — is precomputed as a
   flat, ordered list of "steps" as soon as a workout is chosen. A single
   pointer (stepIndex) tracks where the user is in that list. Moving
   forward means incrementing the pointer; Back means decrementing it;
   both simply re-render whatever step the pointer lands on. This is
   what makes Back navigation exact and state-preserving: there is only
   ever one source of truth for "where am I right now."

   Step shapes:
     { type: "warmup",   movementIndex }
     { type: "exercise", exerciseIndex, setNumber }
     { type: "active",   exerciseIndex, setNumber }
     { type: "rest",     exerciseIndex, setNumber }   (the set just finished)
     { type: "cooldown", movementIndex }
     { type: "complete" }

   Rest is intentionally omitted after the very last set of the very
   last exercise, exactly matching the existing "no rest before
   cool-down" rule — so forward/backward navigation both honor it
   automatically, with no special-casing elsewhere in the code.
   -------------------------------------------------------------------- */
const state = {
  workoutKey: null
};

let steps = [];
let stepIndex = 0;

// The timer currently running on screen. Tracked globally so the pause
// overlay (and step navigation) can stop/pause it generically.
let currentTimer = null;

// The <video> element currently playing on screen, so pause/resume and
// step navigation can control it generically.
let currentVideoEl = null;

function getWorkout() {
  return WORKOUTS[state.workoutKey];
}

function getExerciseEntry(index) {
  return getWorkout().exercises[index];
}

function getExerciseData(slug) {
  return EXERCISES[slug];
}

// Returns the workout-entry (sets/reps/slug) and exercise-library data
// (name/description/cue) for a given exercise index in one call.
function getExerciseContext(index) {
  const entry = getExerciseEntry(index);
  return { entry, data: getExerciseData(entry.slug) };
}

// The exercise index that follows a given exercise/set — either another
// set of the same exercise, or the next exercise.
function getNextExerciseIndex(exerciseIndex, setNumber) {
  const entry = getExerciseEntry(exerciseIndex);
  return setNumber >= entry.sets ? exerciseIndex + 1 : exerciseIndex;
}

function buildSteps(workoutKey) {
  const workout = WORKOUTS[workoutKey];
  const built = [];

  WARMUP_MOVEMENTS.forEach((_, movementIndex) => {
    built.push({ type: "warmup", movementIndex });
  });

  workout.exercises.forEach((entry, exerciseIndex) => {
    for (let setNumber = 1; setNumber <= entry.sets; setNumber++) {
      built.push({ type: "exercise", exerciseIndex, setNumber });
      built.push({ type: "active", exerciseIndex, setNumber });

      const isVeryLastSet = exerciseIndex === workout.exercises.length - 1 && setNumber === entry.sets;
      if (!isVeryLastSet) {
        built.push({ type: "rest", exerciseIndex, setNumber });
      }
    }
  });

  COOLDOWN_MOVEMENTS.forEach((_, movementIndex) => {
    built.push({ type: "cooldown", movementIndex });
  });

  built.push({ type: "complete" });

  return built;
}

/* --------------------------------------------------------------------
   4. SCREEN RENDERING
   One function per step type. Each is responsible for populating its
   screen's content and starting whatever timer/video that screen needs.
   -------------------------------------------------------------------- */
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function loadVideo(videoEl, slug) {
  videoEl.src = getVideoPath(slug);
  videoEl.load();
  videoEl.play().catch(() => {
    /* Autoplay may be blocked until the user interacts; this is expected
       and harmless — playback will begin once the browser allows it. */
  });
}

// Loads the muscle reference image for an exercise. If the file hasn't
// been supplied yet (or fails to load for any reason), the thumbnail is
// hidden rather than showing a broken-image icon — the app degrades
// gracefully with missing media.
function loadMuscleImage(imgEl, slug, exerciseName) {
  imgEl.alt = `${exerciseName} muscle diagram`;
  imgEl.onerror = () => {
    imgEl.style.visibility = "hidden";
  };
  imgEl.onload = () => {
    imgEl.style.visibility = "visible";
  };
  imgEl.src = getMusclePath(slug);
}

function renderStep() {
  const step = steps[stepIndex];

  switch (step.type) {
    case "warmup":
      renderPrepStep({
        movements: WARMUP_MOVEMENTS,
        movementIndex: step.movementIndex,
        screenName: "warmup",
        movementEl: el.warmupMovement,
        timerEl: el.warmupTimer
      });
      break;
    case "exercise":
      renderExerciseStep(step);
      break;
    case "active":
      renderActiveStep(step);
      break;
    case "rest":
      renderRestStep(step);
      break;
    case "cooldown":
      renderPrepStep({
        movements: COOLDOWN_MOVEMENTS,
        movementIndex: step.movementIndex,
        screenName: "cooldown",
        movementEl: el.cooldownMovement,
        timerEl: el.cooldownTimer
      });
      break;
    case "complete":
      releaseWakeLock();
      showScreen("complete");
      break;
  }
}

// Shared renderer for warm-up and cool-down movements: shows the
// movement name and runs its countdown, auto-advancing when it ends.
function renderPrepStep({ movements, movementIndex, screenName, movementEl, timerEl }) {
  const movement = movements[movementIndex];
  movementEl.textContent = movement.name;
  currentVideoEl = null;
  showScreen(screenName);

  currentTimer = new Timer({
    mode: "down",
    duration: movement.seconds,
    onTick: (remaining) => {
      timerEl.textContent = formatTime(remaining);
    },
    onComplete: () => goToNextStep()
  });
  currentTimer.start();
}

function renderExerciseStep(step) {
  const { entry, data } = getExerciseContext(step.exerciseIndex);

  // Voice guidance: the very first exercise has no preceding rest to
  // introduce it, so it's announced here instead.
  if (step.exerciseIndex === 0 && step.setNumber === 1) {
    announceExercise(step.exerciseIndex);
  }

  el.exerciseProgress.textContent = formatExerciseProgress(step.exerciseIndex);
  el.exerciseName.textContent = data.name;
  el.exerciseSetInfo.textContent = `Set ${step.setNumber} of ${entry.sets}`;
  el.exerciseReps.textContent = formatRepTarget(entry.reps);
  el.exerciseDescription.textContent = data.description;
  el.exerciseCue.textContent = data.cue;
  loadMuscleImage(el.exerciseMuscle, entry.slug, data.name);
  loadVideo(el.exerciseVideo, entry.slug);

  currentVideoEl = null; // no Pause control on this screen
  showScreen("exercise");
}

function renderActiveStep(step) {
  const { entry, data } = getExerciseContext(step.exerciseIndex);

  el.activeName.textContent = data.name;
  el.activeSetInfo.textContent = `Set ${step.setNumber} of ${entry.sets}`;
  el.activeReps.textContent = formatRepTarget(entry.reps);
  el.activeTimerDisplay.textContent = formatTime(0);
  loadVideo(el.activeVideo, entry.slug);

  showScreen("active");

  currentVideoEl = el.activeVideo;
  currentTimer = new Timer({
    mode: "up",
    onTick: (elapsed) => {
      el.activeTimerDisplay.textContent = formatTime(elapsed);
    }
  });
  currentTimer.start();
}

// Renders the rest screen for the set just finished, previewing
// whichever exercise/set is coming up next.
function renderRestStep(step) {
  const { entry: currentEntry, data: currentData } = getExerciseContext(step.exerciseIndex);
  const restSeconds = REST_SECONDS[currentData.category];
  const nextIndex = getNextExerciseIndex(step.exerciseIndex, step.setNumber);
  const { entry: nextEntry, data: nextData } = getExerciseContext(nextIndex);

  // Voice guidance: if what's coming up is a NEW exercise, this rest
  // period is our one chance to introduce it before it begins.
  if (nextIndex !== step.exerciseIndex) {
    announceExercise(nextIndex);
  }

  el.restProgress.textContent = formatExerciseProgress(nextIndex);
  el.restNextName.textContent = nextData.name;
  el.restDescription.textContent = nextData.description;
  el.restCue.textContent = nextData.cue;
  loadMuscleImage(el.restMuscle, nextEntry.slug, nextData.name);
  el.restMessage.textContent = "";
  loadVideo(el.restVideo, nextEntry.slug);

  showScreen("rest");

  currentVideoEl = el.restVideo;
  currentTimer = new Timer({
    mode: "down",
    duration: restSeconds,
    onTick: (remaining) => {
      el.restTimerDisplay.textContent = formatTime(remaining);

      if (remaining <= 3 && remaining > 0) {
        el.restMessage.textContent = String(remaining);
      } else if (remaining <= 10 && remaining > 3) {
        el.restMessage.textContent = "Get into position.";
      }
    },
    onComplete: () => {
      el.restMessage.textContent = "START";
      setTimeout(() => goToNextStep(), 500);
    }
  });
  currentTimer.start();
}

/* --------------------------------------------------------------------
   5. STEP NAVIGATION
   -------------------------------------------------------------------- */
function leaveCurrentStep() {
  if (currentTimer) currentTimer.stop();
  if (currentVideoEl) currentVideoEl.pause();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function startWorkout(workoutKey) {
  state.workoutKey = workoutKey;
  steps = buildSteps(workoutKey);
  stepIndex = 0;
  requestWakeLock();
  renderStep();
}

function goToNextStep() {
  leaveCurrentStep();
  stepIndex = Math.min(stepIndex + 1, steps.length - 1);
  renderStep();
}

// Moves back exactly one step, preserving all workout progress. If
// already on the very first step (the first warm-up movement), there is
// nothing to go back to within the workout, so this returns Home.
function goToPreviousStep() {
  leaveCurrentStep();
  if (stepIndex === 0) {
    returnHome();
    return;
  }
  stepIndex -= 1;
  renderStep();
}

function jumpToFirstExercise() {
  leaveCurrentStep();
  stepIndex = steps.findIndex((s) => s.type === "exercise");
  renderStep();
}

function jumpToComplete() {
  leaveCurrentStep();
  stepIndex = steps.length - 1;
  renderStep();
}

function returnHome() {
  if (currentTimer) currentTimer.stop();
  currentTimer = null;
  currentVideoEl = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  state.workoutKey = null;
  steps = [];
  stepIndex = 0;
  releaseWakeLock();
  showScreen("home");
}

/* --------------------------------------------------------------------
   6. PAUSE OVERLAY
   Pauses the current timer and the current video. Resume continues
   both from exactly where they stopped. Focus moves to the Resume
   button while paused, and back to whatever was focused beforehand
   once resumed, for keyboard and screen-reader users.
   -------------------------------------------------------------------- */
let elementFocusedBeforePause = null;

function openPauseOverlay() {
  if (currentTimer) currentTimer.pause();
  if (currentVideoEl) currentVideoEl.pause();
  elementFocusedBeforePause = document.activeElement;
  el.pauseOverlay.classList.add("active");
  el.btnResume.focus();
}

function closePauseOverlay() {
  el.pauseOverlay.classList.remove("active");
  if (currentTimer) currentTimer.resume();
  if (currentVideoEl) currentVideoEl.play().catch(() => {});
  if (elementFocusedBeforePause) elementFocusedBeforePause.focus();
}

/* --------------------------------------------------------------------
   7. VOICE GUIDANCE
   Announces each new exercise once, using the Speech Synthesis API:
   name, sets, reps, and coaching cue — nothing else. Silent during
   active sets and for repeat sets of the same exercise. Optional,
   defaults to on, and remembered across sessions via localStorage.
   -------------------------------------------------------------------- */
const VOICE_STORAGE_KEY = "fat2fit:voice-enabled";
let voiceEnabled = true;

try {
  const storedPreference = localStorage.getItem(VOICE_STORAGE_KEY);
  if (storedPreference !== null) voiceEnabled = storedPreference === "true";
} catch (err) {
  // localStorage can be unavailable (e.g. private browsing) — default stands.
}

let cachedVoices = [];

function refreshVoiceList() {
  cachedVoices = "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
}

if ("speechSynthesis" in window) {
  refreshVoiceList();
  window.speechSynthesis.onvoiceschanged = refreshVoiceList;
}

// Prefers a local (on-device) English voice, which tends to sound most
// natural; falls back to any English voice, then to the browser's
// default voice (leaving utterance.voice unset) if none is found.
function pickPreferredVoice() {
  const localEnglish = cachedVoices.find((v) => v.lang && v.lang.startsWith("en") && v.localService);
  const anyEnglish = cachedVoices.find((v) => v.lang && v.lang.startsWith("en"));
  return localEnglish || anyEnglish || null;
}

function speak(text) {
  if (!voiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickPreferredVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function announceExercise(exerciseIndex) {
  const { entry, data } = getExerciseContext(exerciseIndex);
  speak(`${data.name}. ${entry.sets} sets of ${formatRepTarget(entry.reps)}. ${data.cue}`);
}

function updateVoiceToggleUI() {
  el.voiceToggle.textContent = voiceEnabled ? "🔊" : "🔇";
  el.voiceToggle.setAttribute("aria-pressed", String(voiceEnabled));
  el.voiceToggle.setAttribute("aria-label", voiceEnabled ? "Voice guidance on" : "Voice guidance off");
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, String(voiceEnabled));
  } catch (err) {
    // Preference simply won't persist if storage is unavailable.
  }
  if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  updateVoiceToggleUI();
}

updateVoiceToggleUI();

/* --------------------------------------------------------------------
   8. SCREEN WAKE LOCK
   Keeps the display awake for the duration of a workout (warm-up
   through cool-down). Unsupported browsers simply skip this — the
   workout still functions normally without it. iOS releases the lock
   whenever the tab is backgrounded, so it's re-requested automatically
   when the page becomes visible again mid-workout.
   -------------------------------------------------------------------- */
let wakeLock = null;

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (err) {
    // Can be denied (e.g. low battery, browser policy) — fail gracefully.
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (!wakeLock) return;
  wakeLock.release().catch(() => {});
  wakeLock = null;
}

document.addEventListener("visibilitychange", () => {
  const workoutInProgress = state.workoutKey !== null;
  if (document.visibilityState === "visible" && workoutInProgress && !wakeLock) {
    requestWakeLock();
  }
});

/* --------------------------------------------------------------------
   9. SERVICE WORKER REGISTRATION
   Enables the installed app to load instantly and keep working with a
   poor or absent connection. Skipped silently if unsupported.
   -------------------------------------------------------------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      /* Registration failures (e.g. unsupported context) are non-fatal —
         the app works fully without the service worker. */
    });
  });
}

/* --------------------------------------------------------------------
   10. EVENT WIRING
   -------------------------------------------------------------------- */
document.querySelectorAll(".workout-btn").forEach((btn) => {
  btn.addEventListener("click", () => startWorkout(btn.dataset.workout));
});

backButtons.forEach((btn) => btn.addEventListener("click", goToPreviousStep));

el.btnStartSet.addEventListener("click", goToNextStep);
el.btnCompleteSet.addEventListener("click", goToNextStep);
el.btnSkipRest.addEventListener("click", goToNextStep);
el.btnHome.addEventListener("click", returnHome);

el.btnNextWarmup.addEventListener("click", goToNextStep);
el.btnFinishWarmup.addEventListener("click", jumpToFirstExercise);
el.btnNextCooldown.addEventListener("click", goToNextStep);
el.btnFinishCooldown.addEventListener("click", jumpToComplete);

el.btnPauseActive.addEventListener("click", openPauseOverlay);
el.btnPauseRest.addEventListener("click", openPauseOverlay);
el.btnResume.addEventListener("click", closePauseOverlay);

el.voiceToggle.addEventListener("click", toggleVoice);
