/*
 * Puppy Park — Controller & Engine
 * --------------------------------
 * Reads the LEVELS data layer (fetched from js/levels.json) and runs the whole game:
 *   - builds the DOM for each level (instruction, dropdowns, dogs, kennels)
 *   - live preview: dropdown changes update the player layer's inline CSS
 *   - validation: compares the player's values to the level's solution
 *   - right / wrong feedback, hints, per-level reset
 *   - progress persistence via localStorage
 *
 */

(() => {
  "use strict";

  /* --------------------------- Shared utilities -------------------------- */
  // svgDog, svgKennel, starSvg/starRow, icon SVGs, PALETTE/BASE/PROP_TO_CAMEL,
  // STORAGE_KEY/MUTE_KEY and the audio module all live in utils.js (loaded
  // before this file) as they carry no game state and are reused as-is.
  const {
    svgDog,
    svgKennel,
    starSvg,
    starRow,
    SPEAKER_ON,
    SPEAKER_OFF,
    CHECK_SVG,
    LOCK_SVG,
    X_SVG,
    PALETTE,
    BASE,
    PROP_TO_CAMEL,
    STORAGE_KEY,
    audio,
  } = window.PuppyParkUtils;

  /* ------------------------------ State --------------------------------- */
  let LEVELS = [];                 // filled from js/levels.json on init: full level objects
  let current = 0;                 // active level index
  let completed = new Set();       // completed level ids
  let solvedThisLevel = false;     // guards double-completing
  let hintUsed = false;            // did the player open the hint this attempt?
  let wrongAttempts = 0;           // wrong checks on the current attempt
  let starsById = {};              // best stars earned per level id (1–3)

  /* ---------------------------- DOM refs -------------------------------- */
  const el = {
    strip: document.getElementById("level-strip"),
    board: document.getElementById("board"),
    target: document.getElementById("target-layer"),
    player: document.getElementById("player-layer"),
    title: document.getElementById("level-title"),
    instruction: document.getElementById("instruction"),
    controls: document.getElementById("controls"),
    toast: document.getElementById("toast"),
    checkBtn: document.getElementById("check-btn"),
    resetBtn: document.getElementById("reset-btn"),
    hintBtn: document.getElementById("hint-btn"),
    nextBtn: document.getElementById("next-btn"),
    hintBox: document.getElementById("hint-box"),
    progressCount: document.getElementById("progress-count"),
    winOverlay: document.getElementById("win-overlay"),
    winStars: document.getElementById("win-stars"),
    restartBtn: document.getElementById("restart-btn"),
    muteBtn: document.getElementById("mute-btn"),
  };

  /* --------------------------- Persistence ------------------------------ */
  const saveProgress = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ current: current, completed: Array.from(completed), stars: starsById })
      );
    } catch (e) { /* storage may be unavailable; game still works in-session */ }
  };

  const loadProgress = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.completed)) completed = new Set(data.completed);
      if (data.stars && typeof data.stars === "object") starsById = data.stars;
      if (typeof data.current === "number" && data.current >= 0 && data.current < LEVELS.length) {
        current = data.current;
      }
    } catch (e) { /* ignore corrupt storage */ }
  };

  /* --------------------------- Layer styling ---------------------------- */
  // Apply flex values to a layer. Two passes so nothing stale leaks between
  // levels or from invalid typed input: first reset all four to BASE, then
  // apply the overrides. An invalid CSS value is ignored by the browser, so
  // that property simply falls back to its BASE value until a valid one is typed.
  const applyLayerStyles = (layerEl, overrides) => {
    for (const prop in BASE) {
      layerEl.style[PROP_TO_CAMEL[prop]] = BASE[prop];
    }
    for (const prop in overrides) {
      const value = Array.isArray(overrides[prop]) ? overrides[prop][0] : overrides[prop];
      if (value) layerEl.style[PROP_TO_CAMEL[prop]] = value;
    }
  };

  // Read what the player has typed into the text inputs (trimmed, lowercased).
  // Empty inputs are omitted so the layer falls back to BASE for them.
  const readInputs = () => {
    const values = {};
    const inputs = el.controls.querySelectorAll("input");
    inputs.forEach((input) => {
      const v = input.value.trim().toLowerCase();
      if (v) values[input.dataset.property] = v;
    });
    return values;
  };

  // Values that drive the dogs. Start from the level's control defaults so an
  // empty box renders at its default position — falling back to BASE instead
  // would rest the dogs on the grass, which on some levels is the answer and
  // would look already solved — then apply whatever the player has typed.
  // Validation still uses readInputs(), so an empty box never counts as solved.
  const playerValues = () => {
    const level = LEVELS[current];
    const values = {};
    if (level && level.controls) {
      level.controls.forEach((c) => {
        if (c.default != null) values[c.property] = c.default;
      });
    }
    return Object.assign(values, readInputs());
  };

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { /* no matchMedia */ }

  /* ---------------------------- Board scaling ---------------------------- */
  // The board's own width/height (--board-size in style.css) never changes
  // with screen size, so a level's Flexbox solution is identical on every
  // device. On screens too narrow to fit it, we shrink the whole board as
  // one visual unit with a transform (its box model stays fixed) instead of
  // resizing it — must stay in sync with the stacked-layout breakpoint below.
  const BOARD_STACK_BREAKPOINT = 767;

  const fitBoard = () => {
    const boardSize = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--board-size")
    ) || 440;
    const viewport = document.documentElement.clientWidth;

    let scale = 1;
    if (viewport <= BOARD_STACK_BREAKPOINT) {
      const appPadding = parseFloat(getComputedStyle(el.board.closest(".app")).paddingLeft) || 0;
      const available = viewport - appPadding * 2;
      scale = Math.min(1, available / boardSize);
    }

    el.board.style.transform = scale < 1 ? "scale(" + scale + ")" : "";
    const wrap = el.board.parentElement;
    const displayed = boardSize * scale;
    wrap.style.width = displayed + "px";
    wrap.style.height = displayed + "px";
  };

  // Push the player's typed values onto the dogs layer. When `animate` is true,
  // the dogs walk to their new spots using a FLIP transition (measure First,
  // apply Last, invert, then play), with a walk-cycle class while in motion.
  const updatePlayerLayer = (animate) => {
    const dogs = Array.prototype.slice.call(el.player.children);
    if (animate && REDUCED) animate = false;

    const firsts = animate
      ? dogs.map((d) => d.getBoundingClientRect())
      : null;

    applyLayerStyles(el.player, playerValues());
    if (!animate) return;

    dogs.forEach((d, i) => {
      const last = d.getBoundingClientRect();
      const dx = firsts[i].left - last.left;
      const dy = firsts[i].top - last.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      d.classList.add("walking");
      d.style.transition = "none";
      d.style.transform = "translate(" + dx + "px, " + dy + "px)";

      // Next frame: release to the real position so it transitions (walks) there.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          d.style.transition = "transform .55s cubic-bezier(.34, 1.12, .64, 1)";
          d.style.transform = "";
        });
      });

      window.clearTimeout(d._walkTimer);
      d._walkTimer = window.setTimeout(() => {
        d.classList.remove("walking");
        d.style.transition = "";
        d.style.transform = "";
      }, 600);
    });
  };

  /* ---------------------------- Rendering ------------------------------- */
  // Progress bar of level nodes. A level is playable only if it's already
  // completed or is the current level; every unsolved future level is disabled.
  const renderStrip = () => {
    el.strip.innerHTML = "";
    const bar = document.createElement("div");
    bar.className = "progress-bar";

    // The "frontier" is the first not-yet-completed level: it and every
    // completed level are always unlocked. This stays fixed while browsing
    // back, so returning to an earlier level never relocks the level the
    // player was actually up to.
    let frontier = LEVELS.length;
    for (let i = 0; i < LEVELS.length; i++) {
      if (!completed.has(LEVELS[i].id)) { frontier = i; break; }
    }

    // Single continuous track behind the nodes, with a filled overlay
    // reaching up to the frontier's position — see the CSS comment on
    // .progress-track for why this replaced the old per-segment connectors.
    const track = document.createElement("div");
    track.className = "progress-track";
    bar.appendChild(track);

    const fill = document.createElement("div");
    fill.className = "progress-fill";
    const filledSteps = Math.min(frontier, LEVELS.length - 1);
    const frac = LEVELS.length > 1 ? filledSteps / (LEVELS.length - 1) : 0;
    fill.style.width = "calc((100% - 36px) * " + frac + ")";
    bar.appendChild(fill);

    LEVELS.forEach((lvl, i) => {
      const done = completed.has(lvl.id);
      const active = i === current;
      const locked = !done && !active && i !== frontier;

      const node = document.createElement("button");
      node.type = "button";
      node.className = "pnode";
      if (done) node.classList.add("is-complete");
      if (active) node.classList.add("is-active");
      if (locked) node.classList.add("is-locked");

      node.disabled = locked;
      node.innerHTML = locked ? LOCK_SVG : String(lvl.id);
      if (done) {
        const badge = document.createElement("span");
        badge.className = "pnode-badge";
        badge.innerHTML = CHECK_SVG;
        node.appendChild(badge);
      }
      const state = done ? " — הושלם" : active ? " — נוכחי" : locked ? " — נעול" : " — זמין";
      const starNote = starsById[lvl.id] ? " · " + starsById[lvl.id] + "/3 ★" : "";
      node.setAttribute("aria-label", "שלב " + lvl.id + state);
      node.title = "שלב " + lvl.id + " · " + lvl.title + state + starNote;   // hover tooltip
      if (active) node.setAttribute("aria-current", "step");

      node.addEventListener("click", () => {
        if (!locked && i !== current) loadLevel(i);
      });
      bar.appendChild(node);
    });

    el.strip.appendChild(bar);
  };

  const renderProgress = () => {
    el.progressCount.textContent = completed.size + " / " + LEVELS.length;
  };

  const renderItems = (level) => {
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
      const pup = document.createElement("div");
      pup.className = "pup";
      pup.innerHTML = svgDog(PALETTE[i % PALETTE.length]);
      dog.appendChild(pup);
      el.player.appendChild(dog);
    }
  };

  // Render the controls as a mini CSS "file": the player fills in the values
  // inside a real-looking rule (.puppy-yard { display: flex; ... }).
  const renderControls = (level) => {
    el.controls.innerHTML = "";

    const editor = document.createElement("div");
    editor.className = "code-editor";
    editor.setAttribute("role", "group");
    editor.setAttribute("aria-label", "עורך CSS");

    // Title bar (window dots + filename) to sell the "css file" feel.
    const bar = document.createElement("div");
    bar.className = "code-titlebar";
    bar.innerHTML =
      '<span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="code-filename">puppy-park.css</span>';
    editor.appendChild(bar);

    const body = document.createElement("div");
    body.className = "code-body";

    const addLine = (html, indent) => {
      const l = document.createElement("div");
      l.className = "code-line" + (indent ? " code-indent" : "");
      l.innerHTML = html;
      body.appendChild(l);
      return l;
    };

    // Selector + the fixed flex declaration.
    addLine('<span class="tok-sel">.puppy-yard</span> <span class="tok-punc">{</span>');
    addLine(
      '<span class="tok-prop">display</span><span class="tok-punc">:</span> ' +
      '<span class="tok-val">flex</span><span class="tok-punc">;</span>',
      true
    );

    // One editable declaration per control.
    level.controls.forEach((ctrl) => {
      const propId = "inp-" + ctrl.property;
      const l = document.createElement("div");
      l.className = "code-line code-indent";

      const label = document.createElement("label");
      label.className = "tok-prop";
      label.setAttribute("for", propId);
      label.textContent = ctrl.label;

      const colon = document.createElement("span");
      colon.className = "tok-punc";
      colon.textContent = ": ";

      const input = document.createElement("input");
      input.type = "text";
      input.id = propId;
      input.className = "code-input";
      input.dataset.property = ctrl.property;
      input.setAttribute("placeholder", "הקלידו ערך");
      input.setAttribute("autocomplete", "off");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("dir", "ltr");
      input.setAttribute("aria-label", ctrl.label);

      input.addEventListener("input", () => {
        updatePlayerLayer(true);
        clearFeedback();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); check(); }
      });

      const semi = document.createElement("span");
      semi.className = "tok-punc tok-semi";
      semi.textContent = ";";

      l.appendChild(label);
      l.appendChild(colon);
      l.appendChild(input);
      l.appendChild(semi);
      body.appendChild(l);
    });

    // Closing brace.
    addLine('<span class="tok-punc">}</span>');

    editor.appendChild(body);
    el.controls.appendChild(editor);
  };

  /* --------------------------- Load a level ----------------------------- */
  const loadLevel = (index) => {
    const levelData = LEVELS[index];
    if (!levelData) {
      showFeedback("שגיאה בטעינת השלב, נסו לרענן את הדף", "err");
      return;
    }
    current = index;
    solvedThisLevel = completed.has(index+1);
    hintUsed = false;
    wrongAttempts = 0;
    const level = levelData;

    el.title.textContent = level.title;
    el.instruction.textContent = level.instruction;

    renderControls(level);
    renderItems(level);

    // If the player already solved this level, pre-fill the inputs with the
    // solution so revisiting a completed level shows the answer (and the dogs
    // already home) instead of empty boxes. For a property that accepts several
    // values (e.g. flex-end / end) we show the first, canonical one.
    if (completed.has(level.id)) {
      el.controls.querySelectorAll("input").forEach((input) => {
        const sol = level.solution[input.dataset.property];
        if (sol != null) input.value = Array.isArray(sol) ? sol[0] : sol;
      });
    }

    // Target layer laid out with the kennelParameters; player layer with the defaults.
    applyLayerStyles(el.target, level.kennelParameters);
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
  };

  /* ------------------------- Feedback (popup toast) --------------------- */
  let toastTimer = null;
  // Success toast lifetime, and how long its fade-out transition takes (see
  // .toast's opacity/transform transition in style.css) — the win overlay
  // waits for both before it appears, so it never shows on top of the toast.
  const TOAST_OK_MS = 1800;
  const TOAST_HIDE_ANIM_MS = 320;

  const clearFeedback = () => {
    window.clearTimeout(toastTimer);
    el.toast.classList.remove("show");
  };

  // Show the success/error message as a centered popup. The toast element is
  // always in the DOM (invisible via opacity), so toggling the "show" class
  // animates it in/out reliably. `isHtml` carries the icon + star row.
  const showFeedback = (content, kind, isHtml) => {
    if (isHtml) el.toast.innerHTML = content;
    else el.toast.textContent = content;
    el.toast.classList.remove("is-ok", "is-err");
    el.toast.classList.add(kind === "ok" ? "is-ok" : "is-err");
    el.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(clearFeedback, kind === "ok" ? TOAST_OK_MS : 2000);
  };

  // Build the centered white popup: icon (✓ / ✕), stars (success only), message.
  const showResult = (kind, msg, stars) => {
    const icon =
      '<span class="toast-icon ' + kind + '">' + (kind === "ok" ? CHECK_SVG : X_SVG) + "</span>";
    const starsHtml =
      kind === "ok" ? '<span class="stars" aria-hidden="true">' + starRow(stars) + "</span>" : "";
    const sr =
      kind === "ok" ? '<span class="sr-only">קיבלת ' + stars + " מתוך 3 כוכבים</span>" : "";
    showFeedback(icon + starsHtml + '<span class="toast-msg">' + msg + "</span>" + sr, kind, true);
  };

  const WRONG_MESSAGES = [
    "הכלבים עוד לא בבית — נסו ערך אחר.",
    "כמעט! זה עדיין לא המיקום הנכון. בדקו שוב.",
    "לא בדיוק. שנו את הערך ונסו שוב — אתם קרובים!",
  ];

  /* ---------------------------- Validation ------------------------------ */
  // Compares the player's typed values to the level's solution. A solution
  // value may be a single string, or an array of accepted alternatives
  // (e.g. justify-content: "end" vs the legacy "flex-end").
  const check = () => {
    const solution = LEVELS[current].solution;
    const values = readInputs();

    let correct = true;
    for (const prop in solution) {
      if (Array.isArray(solution[prop])) {
        if (!solution[prop].includes(values[prop])) { correct = false; break; }
      } else if (values[prop] !== solution[prop]) {
        correct = false; break;
      }
    }

    if (correct) {
      onSolved(LEVELS[current]);
    } else {
      wrongAttempts++;
      audio.error();
      const msg = WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
      showResult("err", msg);
      const wrap = el.board.parentElement;
      wrap.classList.remove("shake");
      void wrap.offsetWidth;
      wrap.classList.add("shake");
    }
  };

  // 3 stars = solved first try with no hint; each of (hint used) / (any wrong
  // attempt) costs a star, floored at 1.
  const computeStars = () => {
    let s = 3;
    if (hintUsed) s -= 1;
    if (wrongAttempts > 0) s -= 1;
    return Math.max(1, s);
  };

  // Little "Woof!" speech bubbles above the dogs when the level is solved.
  const popWoofs = () => {
    const dogs = Array.prototype.slice.call(el.player.children);
    dogs.forEach((d, i) => {
      const bubble = document.createElement("div");
      bubble.className = "woof";
      bubble.textContent = "Woof!";
      bubble.style.animationDelay = (i * 0.08) + "s";
      d.appendChild(bubble);
      window.setTimeout(() => { bubble.remove(); }, 1500 + i * 80);
    });
  };

  const onSolved = (level) => {
    const stars = computeStars();

    // Centered popup with the ✓ icon + star row + message.
    showResult("ok", "כל הכבוד! הכלבים הגיעו הביתה.", stars);

    el.board.classList.add("solved");
    launchConfetti();
    popWoofs();
    audio.success();
    window.setTimeout(() => { audio.bark(); }, 230);

    // Record best stars for this level.
    if (!starsById[level.id] || stars > starsById[level.id]) {
      starsById[level.id] = stars;
    }

    if (!completed.has(level.id)) {
      completed.add(level.id);
      renderProgress();
      renderStrip();
      saveProgress();
    } else {
      renderStrip();  // refresh tooltip stars on replay
      saveProgress();
    }
    solvedThisLevel = true;

    const isLast = current === LEVELS.length - 1;
    if (isLast && completed.size === LEVELS.length) {
      // Wait for the congrats toast to fully fade before showing the win
      // screen, so the two never overlap.
      window.setTimeout(showWin, TOAST_OK_MS + TOAST_HIDE_ANIM_MS);
    } else if (!isLast) {
      el.nextBtn.classList.remove("hidden");
      el.nextBtn.focus();
    }
  };

  /* ------------------------------ Actions ------------------------------- */
  const resetLevel = () => {
    audio.click();
    // Clear the typed values so the player starts the level over (fresh attempt).
    // An empty box renders as the control's default (see playerValues), so the
    // board returns to the level's unsolved starting layout.
    const inputs = el.controls.querySelectorAll("input");
    inputs.forEach((input) => { input.value = ""; });
    hintUsed = false;
    wrongAttempts = 0;
    updatePlayerLayer(true);
    clearFeedback();
    el.board.classList.remove("solved");
    el.nextBtn.classList.add("hidden");
    if (inputs.length) inputs[0].focus();
  };

  const nextLevel = () => {
    if (current < LEVELS.length - 1) { audio.chime(); loadLevel(current + 1); }
  };

  const toggleHint = () => {
    audio.click();
    if (el.hintBox.classList.contains("hidden")) showHint();
    else hideHint();
  };

  const showHint = () => {
    hintUsed = true;
    el.hintBox.textContent = (LEVELS[current] && LEVELS[current].hint) || "";
    el.hintBox.classList.remove("hidden");
    el.hintBtn.setAttribute("aria-expanded", "true");
  };

  const hideHint = () => {
    el.hintBox.classList.add("hidden");
    el.hintBtn.setAttribute("aria-expanded", "false");
  };

  /* ------------------------------ Win ----------------------------------- */
  const showWin = () => {
    const totalStars = Object.keys(starsById).reduce((sum, id) => sum + starsById[id], 0);
    const maxStars = LEVELS.length * 3;
    el.winStars.innerHTML = starSvg(true) + "<span>" + totalStars + " / " + maxStars + "</span>";
    el.winOverlay.classList.remove("hidden");
    launchConfetti();
  };

  const restart = () => {
    audio.click();
    completed = new Set();
    current = 0;
    saveProgress();
    el.winOverlay.classList.add("hidden");
    loadLevel(0);
  };

  /* ------------------------------ Mute ---------------------------------- */
  const renderMute = () => {
    const muted = audio.isMuted();
    el.muteBtn.innerHTML = muted ? SPEAKER_OFF : SPEAKER_ON;
    el.muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    el.muteBtn.classList.toggle("is-muted", muted);
  };

  const toggleMute = () => {
    audio.toggle();
    renderMute();
  };

  /* ---------------------------- Confetti -------------------------------- */
  const launchConfetti = () => {
    const colors = PALETTE.map((c) => c.main).concat(["#2aa7e0", "#15803d"]);
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
      window.setTimeout(() => { piece.remove(); }, (duration + delay) * 1000 + 100);
    }
  };

  /* ------------------------------ Wire up ------------------------------- */
  const init = async () => {
    try {
      const response = await fetch("js/levels.json", { method: "GET" });
      if (!response.ok) throw new Error("Error on levels list get");
      LEVELS = await response.json();
    } catch (err) {
      console.error("Failed to load levels list", err);
      return;
    }
    if (!LEVELS.length) return;
    loadProgress();

    el.checkBtn.addEventListener("click", check);
    el.resetBtn.addEventListener("click", resetLevel);
    el.hintBtn.addEventListener("click", toggleHint);
    el.nextBtn.addEventListener("click", nextLevel);
    el.restartBtn.addEventListener("click", restart);
    el.muteBtn.addEventListener("click", toggleMute);
    renderMute();

    // Unlock the AudioContext on the first user gesture (browser autoplay policy).
    const unlockOnce = () => {
      audio.unlock();
      document.removeEventListener("pointerdown", unlockOnce);
      document.removeEventListener("keydown", unlockOnce);
    };
    document.addEventListener("pointerdown", unlockOnce);
    document.addEventListener("keydown", unlockOnce);

    fitBoard();
    window.addEventListener("resize", fitBoard);

    loadLevel(current);
  };

  document.addEventListener("DOMContentLoaded", init);
})();
