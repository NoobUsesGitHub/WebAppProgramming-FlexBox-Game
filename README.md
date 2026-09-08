# Puppy Park 🐾 — a game to help you learn Flexbox!

**Puppy Park** is an interactive, single-page game for learning **CSS Flexbox**.
Pick the right Flexbox values from the dropdowns to guide the dogs into their kennels,
across **7 progressive levels** — from `justify-content` and `align-items` to
`flex-direction` and `flex-wrap`.

Built with **pure HTML, CSS and vanilla JavaScript** — no jQuery, no Bootstrap, no
frameworks, and no CSS Grid. Flexbox only.

## Play

- **Live site (GitHub Pages):** _added after first deploy_
- **Locally, static:** the game reads `public_files/js/levels.json` via `fetch`, which
  browsers block on the `file://` scheme — serve the folder instead of double-clicking
  `index.html`, e.g. `npx serve public_files` (or the VS Code "Live Server" extension).
- **Locally, via the Express dev server:**
  ```bash
  npm install
  npm start
  ```
  then open <http://localhost:3000>.

## How to play

1. Read the level instruction (always shown in the panel).
2. Change the CSS dropdown(s) — the dogs move **live** on the board.
3. Line the dogs up on the kennels, then press **בדוק פתרון** (Check).
4. Correct → celebration + **Next Level**. Wrong → a nudge and a shake, try again.
5. Stuck? Press **רמז** (Hint). Want to start the level over? Press **איפוס שלב** (Reset).

Your progress (current level + completed levels) is saved in `localStorage`, so it
survives a page refresh.

## Project structure

```
public_files/
├── index.html        # DOM skeleton (SPA) — header, level strip, board, controls, hint box
├── style.css         # all styling: board, layers, dogs/kennels, responsive, animations
├── js/
│   ├── levels.json   # Data Layer — the 7 levels (instructions, controls, solutions, hints)
│   ├── utils.js      # shared, state-free helpers: SVGs, palette, audio
│   └── app.js        # Controller/Engine — loadLevel, live preview, validation, hints, storage
└── Assets/           # reference SVGs (dog, kennel)
Server_files/         # optional Express dev server — not needed for GitHub Pages,
                       # everything the game needs is static under public_files/
```

Everything the game needs — level data, validation, hints — is loaded straight out of
`public_files/js/levels.json` in the browser, so `public_files/` on its own is a
complete static site (what GitHub Pages serves). `Server_files/` is a small optional
Express server kept for local dev convenience; it reads the same `levels.json` and
isn't part of the deployed site.

The game board is a fixed **380×380** area with two overlapping Flexbox layers: a
non-interactive **target** layer (kennels, laid out with the level's solution) and a
**player** layer (dogs, driven live by your dropdown choices). When your values match
the solution, the dogs land exactly on the kennels.

## Levels

| # | Focus | Solution |
|---|-------|----------|
| 1 | justify-content | `flex-end` |
| 2 | justify-content | `center` |
| 3 | justify-content | `space-between` |
| 4 | align-items | `flex-end` |
| 5 | justify-content + align-items | `center` + `center` |
| 6 | flex-direction + align-items | `column` + `flex-end` |
| 7 | flex-wrap + justify-content | `wrap` + `center` |
