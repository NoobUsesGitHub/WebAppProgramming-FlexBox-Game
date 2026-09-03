/*
 * Puppy Park — Controller & Engine
 * --------------------------------
 * Reads the LEVELS data layer (levels.js) and runs the whole game:
 *   - builds the DOM for each level (instruction, dropdowns, dogs, kennels)
 *   - live preview: dropdown changes update the player layer's inline CSS
 *   - validation: compares the player's values to the level's solution
 *   - right / wrong feedback, hints, per-level reset
 *   - progress persistence via localStorage
 *
 * No frameworks, no libraries, Flexbox only.
 */

(function () {
  "use strict";

  /* ------------------------- SVG assets (inline) ------------------------- */
  // Kept inline so each dog can be colored on the fly. Source-equivalent
  // markup also lives in /assets for reference.

  const FACE = "#2b2118";

  function svgDog(color) {
    // color = { main, dark }
    return (
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
        // tail
        '<path d="M50 40 q10 -2 9 -11 q-1 6 -9 6 z" fill="' + color.dark + '"/>' +
        // ears
        '<ellipse cx="17" cy="26" rx="8" ry="13" fill="' + color.dark + '"/>' +
        '<ellipse cx="47" cy="26" rx="8" ry="13" fill="' + color.dark + '"/>' +
        // head
        '<circle cx="32" cy="34" r="18" fill="' + color.main + '"/>' +
        // muzzle
        '<ellipse cx="32" cy="41" rx="10" ry="8" fill="rgba(255,255,255,.78)"/>' +
        // eyes
        '<circle cx="25.5" cy="31" r="2.7" fill="' + FACE + '"/>' +
        '<circle cx="38.5" cy="31" r="2.7" fill="' + FACE + '"/>' +
        '<circle cx="26.4" cy="30.1" r=".9" fill="#fff"/>' +
        '<circle cx="39.4" cy="30.1" r=".9" fill="#fff"/>' +
        // nose + mouth
        '<ellipse cx="32" cy="37.5" rx="3" ry="2.2" fill="' + FACE + '"/>' +
        '<path d="M32 39.7 v2.6 M32 42.3 q-3 2.2 -5.6 .2 M32 42.3 q3 2.2 5.6 .2" ' +
          'stroke="' + FACE + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      "</svg>"
    );
  }

  function svgKennel() {
    return (
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
        // body
        '<path d="M12 28 L32 12 L52 28 V53 a1 1 0 0 1 -1 1 H13 a1 1 0 0 1 -1 -1 Z" ' +
          'fill="#efe9e0" stroke="#a8a29e" stroke-width="2" stroke-linejoin="round"/>' +
        // roof
        '<path d="M32 8 L57 29 H50 L32 14.5 L14 29 H7 Z" ' +
          'fill="#a8a29e" stroke="#a8a29e" stroke-width="1" stroke-linejoin="round"/>' +
        // door
        '<path d="M24 54 V40 a8 9 0 0 1 16 0 V54 Z" fill="#8a827a"/>' +
      "</svg>"
    );
  }

  // >= 6 distinct dog colors (level 7 needs 6).
  const PALETTE = [
    { main: "#f59e0b", dark: "#b45309" }, // amber
    { main: "#60a5fa", dark: "#2563eb" }, // blue
    { main: "#34d399", dark: "#059669" }, // green
    { main: "#fb7185", dark: "#e11d48" }, // rose
    { main: "#a78bfa", dark: "#7c3aed" }, // violet
    { main: "#c68a5b", dark: "#8b5a2b" }, // brown
    { main: "#2dd4bf", dark: "#0d9488" }, // teal
  ];

  // Base flex values so both layers share identical box metrics; each level
  // overrides only the properties it controls.
  const BASE = {
    "flex-direction": "row",
    "flex-wrap": "nowrap",
    "justify-content": "flex-start",
    "align-items": "flex-start",
  };

  const PROP_TO_CAMEL = {
    "flex-direction": "flexDirection",
    "flex-wrap": "flexWrap",
    "justify-content": "justifyContent",
    "align-items": "alignItems",
  };

  const STORAGE_KEY = "puppypark.progress";

  /* ------------------------------ State --------------------------------- */
  const LEVELS = window.LEVELS || [];
  let current = 0;                 // active level index
  let completed = new Set();       // completed level ids
  let solvedThisLevel = false;     // guards double-completing

  /* ---------------------------- DOM refs -------------------------------- */
  const el = {
    strip: document.getElementById("level-strip"),
    board: document.getElementById("board"),
    target: document.getElementById("target-layer"),
    player: document.getElementById("player-layer"),
    badge: document.getElementById("level-badge"),
    title: document.getElementById("level-title"),
    instruction: document.getElementById("instruction"),
    controls: document.getElementById("controls"),
    feedback: document.getElementById("feedback"),
    checkBtn: document.getElementById("check-btn"),
    resetBtn: document.getElementById("reset-btn"),
    hintBtn: document.getElementById("hint-btn"),
    nextBtn: document.getElementById("next-btn"),
    hintBox: document.getElementById("hint-box"),
    progressCount: document.getElementById("progress-count"),
    winOverlay: document.getElementById("win-overlay"),
    restartBtn: document.getElementById("restart-btn"),
  };

  /* --------------------------- Persistence ------------------------------ */
  function saveProgress() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ current: current, completed: Array.from(completed) })
      );
    } catch (e) { /* storage may be unavailable; game still works in-session */ }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.completed)) completed = new Set(data.completed);
      if (typeof data.current === "number" && data.current >= 0 && data.current < LEVELS.length) {
        current = data.current;
      }
    } catch (e) { /* ignore corrupt storage */ }
  }

  /* --------------------------- Layer styling ---------------------------- */
  // Apply a full set of flex values to a layer (always all four, so no stale
  // property leaks between levels).
  function applyLayerStyles(layerEl, values) {
    const merged = Object.assign({}, BASE, values);
    for (const prop in merged) {
      layerEl.style[PROP_TO_CAMEL[prop]] = merged[prop];
    }
  }

  // Read the player's current dropdown selections.
  function readSelections() {
    const values = {};
    const selects = el.controls.querySelectorAll("select");
    selects.forEach(function (s) { values[s.dataset.property] = s.value; });
    return values;
  }

  // Push the player's current selections onto the player (dogs) layer.
  function updatePlayerLayer() {
    applyLayerStyles(el.player, readSelections());
  }

  /* ---------------------------- Rendering ------------------------------- */
  function renderStrip() {
    el.strip.innerHTML = "";
    let highestCompleted = -1;
    LEVELS.forEach(function (lvl, i) {
      if (completed.has(lvl.id)) highestCompleted = Math.max(highestCompleted, i);
    });
    const unlockedUpTo = Math.min(highestCompleted + 1, LEVELS.length - 1);

    LEVELS.forEach(function (lvl, i) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "level-chip";
      chip.textContent = "שלב " + lvl.id;
      if (completed.has(lvl.id)) chip.classList.add("is-complete");
      if (i === current) chip.classList.add("is-active");

      const reachable = i <= Math.max(unlockedUpTo, current);
      chip.disabled = !reachable;
      chip.setAttribute("aria-current", i === current ? "true" : "false");

      chip.addEventListener("click", function () {
        if (i !== current) loadLevel(i);
      });
      el.strip.appendChild(chip);
    });
  }

  function renderProgress() {
    el.progressCount.textContent = completed.size + " / " + LEVELS.length;
  }

  function renderItems(level) {
    // Kennels (target layer) and dogs (player layer), same count & sizing.
    el.target.innerHTML = "";
    el.player.innerHTML = "";
    for (let i = 0; i < level.itemCount; i++) {
      const kennel = document.createElement("div");
      kennel.className = "kennel";
      kennel.innerHTML = svgKennel();
      el.target.appendChild(kennel);

      const dog = document.createElement("div");
      dog.className = "dog";
      dog.innerHTML = svgDog(PALETTE[i % PALETTE.length]);
      el.player.appendChild(dog);
    }
  }

  function renderControls(level) {
    el.controls.innerHTML = "";
    level.controls.forEach(function (ctrl) {
      const wrap = document.createElement("div");
      wrap.className = "control";

      const label = document.createElement("label");
      label.className = "control-label";
      label.textContent = ctrl.label;
      const selectId = "sel-" + ctrl.property;
      label.setAttribute("for", selectId);

      const selWrap = document.createElement("div");
      selWrap.className = "select-wrap";

      const select = document.createElement("select");
      select.id = selectId;
      select.dataset.property = ctrl.property;
      ctrl.options.forEach(function (opt) {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      select.value = ctrl.default;

      // Live preview + clear any stale feedback on change.
      select.addEventListener("change", function () {
        updatePlayerLayer();
        clearFeedback();
      });

      selWrap.appendChild(select);
      wrap.appendChild(label);
      wrap.appendChild(selWrap);
      el.controls.appendChild(wrap);
    });
  }

  /* --------------------------- Load a level ----------------------------- */
  function loadLevel(index) {
    current = index;
    solvedThisLevel = completed.has(LEVELS[index].id);
    const level = LEVELS[index];

    el.badge.innerHTML =
      "שלב " + '<bdi dir="ltr">' + level.id + " / " + LEVELS.length + "</bdi>";
    el.title.textContent = level.title;
    el.instruction.textContent = level.instruction;

    renderControls(level);
    renderItems(level);

    // Target layer laid out with the SOLUTION; player layer with the defaults.
    applyLayerStyles(el.target, level.solution);
    updatePlayerLayer();

    // Reset transient UI.
    clearFeedback();
    el.board.classList.remove("solved");
    hideHint();
    el.nextBtn.classList.add("hidden");

    // Entrance animation.
    el.instruction.parentElement.classList.remove("panel-enter");
    void el.instruction.parentElement.offsetWidth; // reflow to restart anim
    el.instruction.parentElement.classList.add("panel-enter");

    renderStrip();
    renderProgress();
    saveProgress();
  }

  /* ---------------------------- Feedback -------------------------------- */
  function clearFeedback() {
    el.feedback.hidden = true;
    el.feedback.textContent = "";
    el.feedback.classList.remove("is-ok", "is-err");
  }

  function showFeedback(message, kind) {
    el.feedback.textContent = message;
    el.feedback.classList.remove("is-ok", "is-err");
    el.feedback.classList.add(kind === "ok" ? "is-ok" : "is-err");
    el.feedback.hidden = false;
  }

  const WRONG_MESSAGES = [
    "הכלבים עוד לא בבית — נסו ערך אחר.",
    "כמעט! זה עדיין לא המיקום הנכון. בדקו שוב.",
    "לא בדיוק. שנו את הערך ונסו שוב — אתם קרובים!",
  ];

  /* ---------------------------- Validation ------------------------------ */
  function check() {
    const level = LEVELS[current];
    const values = readSelections();
    let correct = true;
    for (const prop in level.solution) {
      if (values[prop] !== level.solution[prop]) { correct = false; break; }
    }

    if (correct) {
      onSolved(level);
    } else {
      const msg = WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
      showFeedback(msg, "err");
      el.board.classList.remove("shake");
      void el.board.offsetWidth;
      el.board.classList.add("shake");
    }
  }

  function onSolved(level) {
    showFeedback("כל הכבוד! הכלבים הגיעו הביתה.", "ok");
    el.board.classList.add("solved");
    launchConfetti();

    if (!completed.has(level.id)) {
      completed.add(level.id);
      renderProgress();
      renderStrip();
      saveProgress();
    }
    solvedThisLevel = true;

    const isLast = current === LEVELS.length - 1;
    if (isLast && completed.size === LEVELS.length) {
      window.setTimeout(showWin, 700);
    } else if (!isLast) {
      el.nextBtn.classList.remove("hidden");
      el.nextBtn.focus();
    }
  }

  /* ------------------------------ Actions ------------------------------- */
  function resetLevel() {
    const level = LEVELS[current];
    const selects = el.controls.querySelectorAll("select");
    selects.forEach(function (s) {
      const ctrl = level.controls.find(function (c) { return c.property === s.dataset.property; });
      if (ctrl) s.value = ctrl.default;
    });
    updatePlayerLayer();
    clearFeedback();
    el.board.classList.remove("solved");
    el.nextBtn.classList.add("hidden");
  }

  function nextLevel() {
    if (current < LEVELS.length - 1) loadLevel(current + 1);
  }

  function toggleHint() {
    if (el.hintBox.classList.contains("hidden")) showHint();
    else hideHint();
  }

  function showHint() {
    el.hintBox.textContent = LEVELS[current].hint;
    el.hintBox.classList.remove("hidden");
    el.hintBtn.setAttribute("aria-expanded", "true");
  }

  function hideHint() {
    el.hintBox.classList.add("hidden");
    el.hintBtn.setAttribute("aria-expanded", "false");
  }

  /* ------------------------------ Win ----------------------------------- */
  function showWin() {
    el.winOverlay.classList.remove("hidden");
    launchConfetti();
  }

  function restart() {
    completed = new Set();
    current = 0;
    saveProgress();
    el.winOverlay.classList.add("hidden");
    loadLevel(0);
  }

  /* ---------------------------- Confetti -------------------------------- */
  function launchConfetti() {
    const colors = PALETTE.map(function (c) { return c.main; }).concat(["#b45309", "#15803d"]);
    const count = 28;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[i % colors.length];
      const duration = 1.6 + Math.random() * 1.2;
      const delay = Math.random() * 0.25;
      piece.style.animation = "confetti-fall " + duration + "s ease-in " + delay + "s forwards";
      piece.style.transform = "translateY(0) rotate(" + (Math.random() * 360) + "deg)";
      document.body.appendChild(piece);
      window.setTimeout(function () { piece.remove(); }, (duration + delay) * 1000 + 100);
    }
  }

  /* ------------------------------ Wire up ------------------------------- */
  function init() {
    if (!LEVELS.length) return;
    loadProgress();

    el.checkBtn.addEventListener("click", check);
    el.resetBtn.addEventListener("click", resetLevel);
    el.hintBtn.addEventListener("click", toggleHint);
    el.nextBtn.addEventListener("click", nextLevel);
    el.restartBtn.addEventListener("click", restart);

    loadLevel(current);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
