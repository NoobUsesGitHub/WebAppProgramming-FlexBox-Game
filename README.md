# Puppy Park 🐾 — a game to help you learn Flexbox!

**Puppy Park** is an interactive, single-page game for learning **CSS Flexbox**.
Pick the right Flexbox values from the dropdowns to guide the dogs into their kennels,
across **7 progressive levels** — from `justify-content` and `align-items` to
`flex-direction` and `flex-wrap`.

Built with **pure HTML, CSS and vanilla JavaScript** — no jQuery, no Bootstrap, no
frameworks, and no CSS Grid. Flexbox only.

## Play

- **Live site (GitHub Pages):** _added after first deploy_
- **Locally, static:** open `public_files/index.html` in a browser.
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
├── index.html      # DOM skeleton (SPA) — header, level strip, board, controls, hint box
├── style.css       # all styling: board, layers, dogs/kennels, responsive, animations
├── js/
│   ├── levels.js   # Data Layer — the 7 levels (instructions, controls, solutions, hints)
│   └── app.js      # Controller/Engine — loadLevel, live preview, validation, hints, storage
└── assets/         # reference SVGs (dog, kennel)
server.js           # tiny Express server for local dev (serves public_files/)
```

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
