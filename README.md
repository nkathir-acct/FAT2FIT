# FAT2FIT

A guided workout player. Mobile-first, dark mode, no frameworks, no backend.
Installable as a Progressive Web App — add it to your iPhone Home Screen and
it launches full-screen, like a native app.

## Running locally

This is a static site — no build step, no npm install. Because the app
loads video/image files with JavaScript, open it through a local server
rather than double-clicking `index.html` (double-clicking works in most
browsers too, but a server avoids occasional file:// restrictions).

**Option A — Python (built into macOS/Linux):**

```
cd FAT2FIT
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

**Option B — VS Code:**

Install the "Live Server" extension, right-click `index.html`, and choose
"Open with Live Server."

## Publishing to GitHub Pages

1. Create a new GitHub repository and push the contents of this `FAT2FIT`
   folder to it (the folder contents go at the repo root, not nested
   inside another folder).
2. In the repository, go to **Settings → Pages**.
3. Under **Source**, select the branch (usually `main`) and folder `/root`.
4. Save. GitHub will publish the site at
   `https://<your-username>.github.io/<repo-name>/`.
5. Any time you push changes, the live site updates automatically within
   a minute or two.

GitHub Pages serves over HTTPS automatically, which is required for both
the Home Screen install and the Screen Wake Lock feature to work.

## Installing to your iPhone Home Screen

1. Open the published GitHub Pages link in **Safari** on your iPhone
   (installation must be done from Safari, not Chrome or another browser).
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

The FAT2FIT icon now appears on your Home Screen. Launching it from there
opens the app full-screen, with no Safari address bar or browser chrome.

## Changing the app icon

The Home Screen icon and browser tab icon are generic placeholders (a
simple "F2F" wordmark) so the app is installable out of the box. To
replace them with your own artwork, overwrite these three files — no
code changes needed:

- `assets/icons/icon-180.png` (180×180 — Home Screen icon)
- `assets/icons/icon-192.png` (192×192 — used in the web manifest)
- `assets/icons/icon-512.png` (512×512 — used in the web manifest)

Keep the same filenames and dimensions and everything else updates
automatically.

## Adding your own videos and muscle images

Every exercise loads its media automatically by matching a filename to
the exercise. **You never need to edit any code to change media** — just
add correctly named files to the folders below.

- `assets/videos/<exercise-slug>.mp4` — a short looping video of the exercise
- `assets/muscles/<exercise-slug>.png` — a muscle diagram image

The exact filenames the app expects:

| Exercise | Video file | Muscle image file |
|---|---|---|
| Goblet Squat | `assets/videos/goblet-squat.mp4` | `assets/muscles/goblet-squat.png` |
| Romanian Deadlift | `assets/videos/romanian-deadlift.mp4` | `assets/muscles/romanian-deadlift.png` |
| Barbell Glute Bridge | `assets/videos/barbell-glute-bridge.mp4` | `assets/muscles/barbell-glute-bridge.png` |
| Weighted Dead Bug | `assets/videos/weighted-dead-bug.mp4` | `assets/muscles/weighted-dead-bug.png` |
| Floor Dumbbell Chest Press | `assets/videos/floor-dumbbell-chest-press.mp4` | `assets/muscles/floor-dumbbell-chest-press.png` |
| Bent-over Row | `assets/videos/bent-over-row.mp4` | `assets/muscles/bent-over-row.png` |
| Standing Overhead Press | `assets/videos/standing-overhead-press.mp4` | `assets/muscles/standing-overhead-press.png` |
| Lateral Raise | `assets/videos/lateral-raise.mp4` | `assets/muscles/lateral-raise.png` |
| Conventional Deadlift | `assets/videos/conventional-deadlift.mp4` | `assets/muscles/conventional-deadlift.png` |
| Sumo Goblet Squat | `assets/videos/sumo-goblet-squat.mp4` | `assets/muscles/sumo-goblet-squat.png` |
| Biceps Curl | `assets/videos/biceps-curl.mp4` | `assets/muscles/biceps-curl.png` |
| Overhead Triceps Extension | `assets/videos/overhead-triceps-extension.mp4` | `assets/muscles/overhead-triceps-extension.png` |

If a file is missing, that exercise's video/image area will simply appear
empty — the app will not throw errors or block the workout.

The `assets/icons/` folder holds the app's Home Screen / browser icons —
see "Changing the app icon" above.

## Changing workout content

All workout content — exercises, sets, reps, rest durations, descriptions,
and coaching cues — lives in `data.js`. Edit that file to change content;
`script.js` (the app logic) never needs to change for content updates.

**After editing `data.js`, `index.html`, `styles.css`, or `script.js`,**
open `service-worker.js` and increment the version number in this line:

```js
const CACHE_NAME = "fat2fit-shell-v2";
```

The app is cached for instant/offline loading, so without this step,
people who already installed it may keep seeing the old cached version
for a while after you publish an update.

## Project structure

```
FAT2FIT/
  index.html         — screen markup
  styles.css          — all styling
  data.js             — workout content (edit this to change content)
  script.js           — app logic / state machine (edit this to change behavior)
  manifest.json        — PWA metadata (name, icons, colors, display mode)
  service-worker.js    — caches the app shell for instant/offline loads
  README.md
  assets/
    videos/           — one .mp4 per exercise
    muscles/           — one .png per exercise
    icons/             — Home Screen / browser icons
```

## What's included

- Home screen with the FAT2FIT title, the four workout buttons, and a voice guidance toggle
- Full workout flow: warm-up → exercise → active set → rest → ... → cool-down → complete
- **Back button** on every screen after Home (except Workout Complete), always returning exactly one step, preserving workout progress and pausing any running timer/video
- **Voice guidance**: announces each new exercise once (name, sets, reps, coaching cue) via the browser's Speech Synthesis API, timed to play during the rest before it (or immediately, for the very first exercise) — silent during active sets and for repeat sets of the same exercise
- **Voice toggle** (speaker icon, Home screen only) to turn voice guidance on/off; preference is remembered between sessions via `localStorage`
- **Warm-up/cool-down manual navigation**: "Next Movement"/"Next Stretch" to advance immediately, "Finish Warm-up"/"Finish Cool-down" to jump straight to Exercise 1 or the Workout Complete screen
- Upward-counting set timer and downward-counting rest/warm-up/cool-down timers, sized to be the most prominent element on their screens
- Pause/resume that stops and resumes timers and video exactly where they left off, with keyboard focus handled correctly
- Skip Rest
- Exercise/rest progress indicator ("Exercise 2 of 4")
- Placeholder media loading, with graceful handling of missing files (no code changes needed to swap files)
- Installable as a Home Screen PWA on iPhone, with a full-screen standalone launch and no browser chrome
- Keeps the screen awake during a workout (Screen Wake Lock, with graceful fallback where unsupported)
- Responsive, mobile-first dark layout tuned for iPhone 15 Pro portrait
- Touch targets sized to Apple's minimum recommendation for one-handed use
- Accessibility basics: labeled buttons, visible keyboard focus states, live-region announcements for changing cues, and meaningful alt text for muscle diagrams

## Voice guidance notes

- Voice guidance uses the device's built-in text-to-speech, so it works
  offline and requires no configuration.
- It prefers a natural, on-device English voice where the browser/OS
  provides one, and otherwise falls back to whatever default voice the
  system offers — this is handled automatically.
- The on/off preference is stored under the `localStorage` key
  `fat2fit:voice-enabled`. If browser storage is unavailable (e.g. private
  browsing), voice guidance simply defaults to on each session instead of
  erroring.
