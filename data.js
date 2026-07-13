/* ==========================================================================
   FAT2FIT — DATA
   ==========================================================================
   This file contains all workout content: exercises, sets/reps, rest
   durations, descriptions, coaching cues, and warm-up/cool-down movements.

   To change workout content, edit this file only. No other file needs to
   change. Media files are located automatically by "slug" — see README.md
   for the asset naming convention.
   ========================================================================== */

// Rest duration (in seconds) by exercise category.
const REST_SECONDS = {
  main: 120,
  accessory: 90,
  core: 60
};

// Length of each warm-up / cool-down movement, in seconds.
const PREP_MOVEMENT_SECONDS = 60;

// ---------------------------------------------------------------------------
// EXERCISE LIBRARY
// Each exercise is defined once here and referenced by slug inside a
// workout. This avoids duplicating description/cue text for exercises that
// appear in more than one workout (e.g. Barbell Glute Bridge).
// ---------------------------------------------------------------------------
const EXERCISES = {
  "goblet-squat": {
    name: "Goblet Squat",
    category: "main",
    description: "Builds strength in your thighs, glutes and core.",
    cue: "Hold the kettlebell close to your chest."
  },
  "romanian-deadlift": {
    name: "Romanian Deadlift",
    category: "main",
    description: "Strengthens your hamstrings and lower back.",
    cue: "Keep the bar close to your legs."
  },
  "barbell-glute-bridge": {
    name: "Barbell Glute Bridge",
    category: "accessory",
    description: "Strengthens your glutes and lower back.",
    cue: "Squeeze your glutes at the top."
  },
  "weighted-dead-bug": {
    name: "Weighted Dead Bug",
    category: "core",
    description: "Builds core control and stability.",
    cue: "Keep your lower back flat on the floor."
  },
  "floor-dumbbell-chest-press": {
    name: "Floor Dumbbell Chest Press",
    category: "main",
    description: "Builds strength in your chest and arms.",
    cue: "Press the dumbbells straight up evenly."
  },
  "bent-over-row": {
    name: "Bent-over Row",
    category: "main",
    description: "Strengthens your back and improves posture.",
    cue: "Pull your elbows straight back."
  },
  "standing-overhead-press": {
    name: "Standing Overhead Press",
    category: "main",
    description: "Builds strength in your shoulders and arms.",
    cue: "Press straight up, not forward."
  },
  "lateral-raise": {
    name: "Lateral Raise",
    category: "accessory",
    description: "Shapes and strengthens your shoulder muscles.",
    cue: "Lift with slow, controlled movements."
  },
  "conventional-deadlift": {
    name: "Conventional Deadlift",
    category: "main",
    description: "Builds total-body strength, especially your back and legs.",
    cue: "Keep your back flat and chest up."
  },
  "sumo-goblet-squat": {
    name: "Sumo Goblet Squat",
    category: "main",
    description: "Strengthens your inner thighs, glutes and hips.",
    cue: "Push your knees out as you squat."
  },
  "biceps-curl": {
    name: "Biceps Curl",
    category: "accessory",
    description: "Builds strength and size in your upper arms.",
    cue: "Keep your elbows close to your body."
  },
  "overhead-triceps-extension": {
    name: "Overhead Triceps Extension",
    category: "accessory",
    description: "Strengthens the muscles at the back of your arm.",
    cue: "Keep your elbows pointing forward."
  }
};

// ---------------------------------------------------------------------------
// WORKOUTS
// Each entry lists the exercise slugs, in order, with the sets/reps for
// THIS workout (some exercises repeat across workouts with different
// sets/reps, so sets/reps live here rather than in the exercise library).
// ---------------------------------------------------------------------------
const WORKOUTS = {
  "lower-a": {
    label: "Lower A",
    exercises: [
      { slug: "goblet-squat", sets: 3, reps: "8" },
      { slug: "romanian-deadlift", sets: 3, reps: "8" },
      { slug: "barbell-glute-bridge", sets: 3, reps: "10" },
      { slug: "weighted-dead-bug", sets: 3, reps: "10 each side" }
    ]
  },
  "upper-a": {
    label: "Upper A",
    exercises: [
      { slug: "floor-dumbbell-chest-press", sets: 3, reps: "8" },
      { slug: "bent-over-row", sets: 3, reps: "8" },
      { slug: "standing-overhead-press", sets: 3, reps: "10" },
      { slug: "lateral-raise", sets: 3, reps: "12" }
    ]
  },
  "lower-b": {
    label: "Lower B",
    exercises: [
      { slug: "conventional-deadlift", sets: 3, reps: "6" },
      { slug: "sumo-goblet-squat", sets: 3, reps: "10" },
      { slug: "barbell-glute-bridge", sets: 3, reps: "12" },
      { slug: "weighted-dead-bug", sets: 3, reps: "10 each side" }
    ]
  },
  "upper-b": {
    label: "Upper B",
    exercises: [
      { slug: "bent-over-row", sets: 3, reps: "8" },
      { slug: "standing-overhead-press", sets: 3, reps: "8" },
      { slug: "floor-dumbbell-chest-press", sets: 3, reps: "10" },
      { slug: "biceps-curl", sets: 3, reps: "10" },
      { slug: "overhead-triceps-extension", sets: 3, reps: "10" }
    ]
  }
};

// ---------------------------------------------------------------------------
// WARM-UP / COOL-DOWN
// Simple timed movement lists. No video is required for these (per spec).
// ---------------------------------------------------------------------------
const WARMUP_MOVEMENTS = [
  { name: "Shoulder Rolls", seconds: PREP_MOVEMENT_SECONDS },
  { name: "Hip Circles", seconds: PREP_MOVEMENT_SECONDS },
  { name: "Bodyweight Squats", seconds: PREP_MOVEMENT_SECONDS },
  { name: "Glute Bridges", seconds: PREP_MOVEMENT_SECONDS },
  { name: "Arm Circles", seconds: PREP_MOVEMENT_SECONDS }
];

const COOLDOWN_MOVEMENTS = [
  { name: "Standing Quad Stretch", seconds: PREP_MOVEMENT_SECONDS },
  { name: "Hamstring Stretch", seconds: PREP_MOVEMENT_SECONDS },
  { name: "Chest Opener Stretch", seconds: PREP_MOVEMENT_SECONDS },
  { name: "Shoulder Stretch", seconds: PREP_MOVEMENT_SECONDS },
  { name: "Child's Pose", seconds: PREP_MOVEMENT_SECONDS }
];

// ---------------------------------------------------------------------------
// ASSET PATH HELPERS
// Media is located automatically from the exercise slug. Replacing files in
// /assets/videos and /assets/muscles never requires touching this file or
// any other application code.
// ---------------------------------------------------------------------------
function getVideoPath(slug) {
  return `assets/videos/${slug}.mp4`;
}

function getMusclePath(slug) {
  return `assets/muscles/${slug}.png`;
}
