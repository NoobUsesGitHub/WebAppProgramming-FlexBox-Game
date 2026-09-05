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

  // Front-facing puppy (looking at the player). Paws, ears, tail and body carry
  // classes so CSS can animate a little waddle while the dog is moving.
  function svgDog(color) {
    // color = { main, dark }
    return (
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
        // back paws (behind body)
        '<ellipse class="paw paw-b" cx="22" cy="53" rx="4.6" ry="3.6" fill="' + color.dark + '"/>' +
        '<ellipse class="paw paw-a" cx="42" cy="53" rx="4.6" ry="3.6" fill="' + color.dark + '"/>' +
        // tail (peeks out behind the body)
        '<path class="tail" d="M43 41 q10 -2 9 -11 q-1 6 -9 5 z" fill="' + color.dark + '"/>' +
        // body
        '<ellipse cx="32" cy="43" rx="13.5" ry="11.5" fill="' + color.main + '"/>' +
        // belly highlight
        '<ellipse cx="32" cy="46" rx="8" ry="7.5" fill="rgba(255,255,255,.5)"/>' +
        // front paws
        '<ellipse class="paw paw-a" cx="25" cy="54.5" rx="4.9" ry="3.9" fill="' + color.main + '"/>' +
        '<ellipse class="paw paw-b" cx="39" cy="54.5" rx="4.9" ry="3.9" fill="' + color.main + '"/>' +
        // ears
        '<path class="ear ear-l" d="M19 11 q-9 4 -7 17 q7 -2 11 -9 z" fill="' + color.dark + '"/>' +
        '<path class="ear ear-r" d="M45 11 q9 4 7 17 q-7 -2 -11 -9 z" fill="' + color.dark + '"/>' +
        // head
        '<circle cx="32" cy="24" r="15" fill="' + color.main + '"/>' +
        // muzzle
        '<ellipse cx="32" cy="30" rx="8.2" ry="6.2" fill="rgba(255,255,255,.82)"/>' +
        // eyes
        '<circle cx="25.6" cy="22" r="2.7" fill="' + FACE + '"/>' +
        '<circle cx="38.4" cy="22" r="2.7" fill="' + FACE + '"/>' +
        '<circle cx="26.6" cy="21.1" r=".9" fill="#fff"/>' +
        '<circle cx="39.4" cy="21.1" r=".9" fill="#fff"/>' +
        // nose + mouth
        '<ellipse cx="32" cy="27.6" rx="2.8" ry="2.1" fill="' + FACE + '"/>' +
        '<path d="M32 29.7 v2.4 M32 32.1 q-2.6 2 -5 .3 M32 32.1 q2.6 2 5 .3" ' +
          'stroke="' + FACE + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
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
  const MUTE_KEY = "puppypark.muted";

  /* ------------------------------ Audio --------------------------------- */
  // Procedural sound effects via the native Web Audio API — no files, no
  // library. The context is created lazily and resumed on a user gesture.
  const audio = (function () {
    let ctx = null;
    let muted = false;
    try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) {}

    function ready() {
      if (muted) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { ctx = null; return null; }
      }
      if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }

    // One short enveloped tone.
    function tone(freq, startAt, dur, type, peak) {
      const c = ready();
      if (!c) return;
      const t0 = c.currentTime + (startAt || 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak || 0.12, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.03);
    }

    return {
      isMuted: function () { return muted; },
      unlock: function () { ready(); },
      toggle: function () {
        muted = !muted;
        try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {}
        if (!muted) { ready(); tone(320, 0, 0.06, "triangle", 0.06); }
        return muted;
      },
      tick:    function () { tone(200, 0, 0.04, "square", 0.03); },
      click:   function () { tone(320, 0, 0.06, "triangle", 0.06); },
      error:   function () { tone(190, 0, 0.12, "sawtooth", 0.06); tone(140, 0.09, 0.16, "sawtooth", 0.06); },
      success: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.24, "triangle", 0.08); }); },
      bark:    function () { tone(430, 0.02, 0.09, "square", 0.09); tone(300, 0.11, 0.12, "square", 0.08); },
      chime:   function () { tone(784, 0, 0.16, "sine", 0.07); tone(1047, 0.08, 0.2, "sine", 0.06); },
    };
  })();

  /* ------------------------------ State --------------------------------- */
  const LEVELS = window.LEVELS || [];
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
    feedback: document.getElementById("feedback"),
    checkBtn: document.getElementById("check-btn"),
    resetBtn: document.getElementById("reset-btn"),
    hintBtn: document.getElementById("hint-btn"),
    nextBtn: document.getElementById("next-btn"),
    hintBox: document.getElementById("hint-box"),
    progressCount: document.getElementById("progress-count"),
    winOverlay: document.getElementById("win-overlay"),
    restartBtn: document.getElementById("restart-btn"),
    muteBtn: document.getElementById("mute-btn"),
  };

  /* ------------------------------ Icons --------------------------------- */
  var SPEAKER_ON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>';
  var SPEAKER_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/></svg>';

  function starSvg(on) {
    return (
      '<svg class="star' + (on ? " is-on" : "") + '" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>'
    );
  }
  function starRow(n) {
    var s = "";
    for (var i = 0; i < 3; i++) {
      s += '<span class="star-wrap" style="animation-delay:' + (i * 0.1) + 's">' + starSvg(i < n) + "</span>";
    }
    return s;
  }

  /* --------------------------- Persistence ------------------------------ */
  function saveProgress() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ current: current, completed: Array.from(completed), stars: starsById })
      );
    } catch (e) { /* storage may be unavailable; game still works in-session */ }
  }

  function loadProgress() {
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
  }

  /* --------------------------- Layer styling ---------------------------- */
  // Apply flex values to a layer. Two passes so nothing stale leaks between
  // levels or from invalid typed input: first reset all four to BASE, then
  // apply the overrides. An invalid CSS value is ignored by the browser, so
  // that property simply falls back to its BASE value until a valid one is typed.
  function applyLayerStyles(layerEl, overrides) {
    for (const prop in BASE) {
      layerEl.style[PROP_TO_CAMEL[prop]] = BASE[prop];
    }
    for (const prop in overrides) {
      if (overrides[prop]) layerEl.style[PROP_TO_CAMEL[prop]] = overrides[prop];
    }
  }

  // Read what the player has typed into the text inputs (trimmed, lowercased).
  // Empty inputs are omitted so the layer falls back to BASE for them.
  function readInputs() {
    const values = {};
    const inputs = el.controls.querySelectorAll("input");
    inputs.forEach(function (input) {
      const v = input.value.trim().toLowerCase();
      if (v) values[input.dataset.property] = v;
    });
    return values;
  }

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { /* no matchMedia */ }

  // Push the player's typed values onto the dogs layer. When `animate` is true,
  // the dogs walk to their new spots using a FLIP transition (measure First,
  // apply Last, invert, then play), with a walk-cycle class while in motion.
  function updatePlayerLayer(animate) {
    const dogs = Array.prototype.slice.call(el.player.children);
    if (animate && REDUCED) animate = false;

    const firsts = animate
      ? dogs.map(function (d) { return d.getBoundingClientRect(); })
      : null;

    applyLayerStyles(el.player, readInputs());
    if (!animate) return;

    dogs.forEach(function (d, i) {
      const last = d.getBoundingClientRect();
      const dx = firsts[i].left - last.left;
      const dy = firsts[i].top - last.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      d.classList.add("walking");
      d.style.transition = "none";
      d.style.transform = "translate(" + dx + "px, " + dy + "px)";

      // Next frame: release to the real position so it transitions (walks) there.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          d.style.transition = "transform .55s cubic-bezier(.34, 1.12, .64, 1)";
          d.style.transform = "";
        });
      });

      window.clearTimeout(d._walkTimer);
      d._walkTimer = window.setTimeout(function () {
        d.classList.remove("walking");
        d.style.transition = "";
        d.style.transform = "";
      }, 600);
    });
  }

  /* ---------------------------- Rendering ------------------------------- */
  var CHECK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  var LOCK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  // Progress bar of level nodes. A level is playable only if it's already
  // completed or is the current level; every unsolved future level is disabled.
  function renderStrip() {
    el.strip.innerHTML = "";
    const bar = document.createElement("div");
    bar.className = "progress-bar";

    LEVELS.forEach(function (lvl, i) {
      const done = completed.has(lvl.id);
      const active = i === current;
      const locked = !done && !active;

      const node = document.createElement("button");
      node.type = "button";
      node.className = "pnode";
      if (done) node.classList.add("is-complete");
      if (active) node.classList.add("is-active");
      if (locked) node.classList.add("is-locked");

      node.disabled = locked;
      node.innerHTML = done ? CHECK_SVG : locked ? LOCK_SVG : String(lvl.id);
      const state = done ? " — הושלם" : active ? " — נוכחי" : " — נעול";
      const starNote = starsById[lvl.id] ? " · " + starsById[lvl.id] + "/3 ★" : "";
      node.setAttribute("aria-label", "שלב " + lvl.id + state);
      node.title = "שלב " + lvl.id + " · " + lvl.title + state + starNote;   // hover tooltip
      if (active) node.setAttribute("aria-current", "step");

      node.addEventListener("click", function () {
        if (!locked && i !== current) loadLevel(i);
      });
      bar.appendChild(node);

      if (i < LEVELS.length - 1) {
        const conn = document.createElement("div");
        conn.className = "pconnector" + (done ? " is-filled" : "");
        bar.appendChild(conn);
      }
    });

    el.strip.appendChild(bar);
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
      const pup = document.createElement("div");
      pup.className = "pup";
      pup.innerHTML = svgDog(PALETTE[i % PALETTE.length]);
      dog.appendChild(pup);
      el.player.appendChild(dog);
    }
  }

  // Render the controls as a mini CSS "file": the player fills in the values
  // inside a real-looking rule (.puppy-yard { display: flex; ... }).
  function renderControls(level) {
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

    function addLine(html, indent) {
      const l = document.createElement("div");
      l.className = "code-line" + (indent ? " code-indent" : "");
      l.innerHTML = html;
      body.appendChild(l);
      return l;
    }

    // Selector + the fixed flex declaration.
    addLine('<span class="tok-sel">.puppy-yard</span> <span class="tok-punc">{</span>');
    addLine(
      '<span class="tok-prop">display</span><span class="tok-punc">:</span> ' +
      '<span class="tok-val">flex</span><span class="tok-punc">;</span>',
      true
    );

    // One editable declaration per control.
    level.controls.forEach(function (ctrl) {
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

      input.addEventListener("input", function () {
        audio.tick();
        updatePlayerLayer(true);
        clearFeedback();
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); check(); }
      });

      const semi = document.createElement("span");
      semi.className = "tok-punc";
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
  }

  /* --------------------------- Load a level ----------------------------- */
  function loadLevel(index) {
    current = index;
    solvedThisLevel = completed.has(LEVELS[index].id);
    hintUsed = false;
    wrongAttempts = 0;
    const level = LEVELS[index];

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
    const values = readInputs();
    let correct = true;
    for (const prop in level.solution) {
      if (values[prop] !== level.solution[prop]) { correct = false; break; }
    }

    if (correct) {
      onSolved(level);
    } else {
      wrongAttempts++;
      audio.error();
      const msg = WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
      showFeedback(msg, "err");
      el.board.classList.remove("shake");
      void el.board.offsetWidth;
      el.board.classList.add("shake");
    }
  }

  // 3 stars = solved first try with no hint; each of (hint used) / (any wrong
  // attempt) costs a star, floored at 1.
  function computeStars() {
    let s = 3;
    if (hintUsed) s -= 1;
    if (wrongAttempts > 0) s -= 1;
    return Math.max(1, s);
  }

  // Little "Woof!" speech bubbles above the dogs when the level is solved.
  function popWoofs() {
    const dogs = Array.prototype.slice.call(el.player.children);
    dogs.forEach(function (d, i) {
      const bubble = document.createElement("div");
      bubble.className = "woof";
      bubble.textContent = "Woof!";
      bubble.style.animationDelay = (i * 0.08) + "s";
      d.appendChild(bubble);
      window.setTimeout(function () { bubble.remove(); }, 1500 + i * 80);
    });
  }

  function onSolved(level) {
    const stars = computeStars();

    // Star row + message (aria-live announces the sr-only summary).
    el.feedback.classList.remove("is-err");
    el.feedback.classList.add("is-ok");
    el.feedback.innerHTML =
      '<span class="stars" aria-hidden="true">' + starRow(stars) + "</span>" +
      '<span class="feedback-msg">כל הכבוד! הכלבים הגיעו הביתה.</span>' +
      '<span class="sr-only">קיבלת ' + stars + " מתוך 3 כוכבים</span>";
    el.feedback.hidden = false;

    el.board.classList.add("solved");
    launchConfetti();
    popWoofs();
    audio.success();
    window.setTimeout(function () { audio.bark(); }, 230);

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
      window.setTimeout(showWin, 700);
    } else if (!isLast) {
      el.nextBtn.classList.remove("hidden");
      el.nextBtn.focus();
    }
  }

  /* ------------------------------ Actions ------------------------------- */
  function resetLevel() {
    audio.click();
    // Clear the typed values so the player starts the level over (fresh attempt).
    const inputs = el.controls.querySelectorAll("input");
    inputs.forEach(function (input) { input.value = ""; });
    hintUsed = false;
    wrongAttempts = 0;
    updatePlayerLayer(true);
    clearFeedback();
    el.board.classList.remove("solved");
    el.nextBtn.classList.add("hidden");
    if (inputs.length) inputs[0].focus();
  }

  function nextLevel() {
    if (current < LEVELS.length - 1) { audio.chime(); loadLevel(current + 1); }
  }

  function toggleHint() {
    audio.click();
    if (el.hintBox.classList.contains("hidden")) showHint();
    else hideHint();
  }

  function showHint() {
    hintUsed = true;
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
    audio.click();
    completed = new Set();
    current = 0;
    saveProgress();
    el.winOverlay.classList.add("hidden");
    loadLevel(0);
  }

  /* ------------------------------ Mute ---------------------------------- */
  function renderMute() {
    const muted = audio.isMuted();
    el.muteBtn.innerHTML = muted ? SPEAKER_OFF : SPEAKER_ON;
    el.muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    el.muteBtn.classList.toggle("is-muted", muted);
  }

  function toggleMute() {
    audio.toggle();
    renderMute();
  }

  /* ---------------------------- Confetti -------------------------------- */
  function launchConfetti() {
    const colors = PALETTE.map(function (c) { return c.main; }).concat(["#2aa7e0", "#15803d"]);
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
    el.muteBtn.addEventListener("click", toggleMute);
    renderMute();

    // Unlock the AudioContext on the first user gesture (browser autoplay policy).
    function unlockOnce() {
      audio.unlock();
      document.removeEventListener("pointerdown", unlockOnce);
      document.removeEventListener("keydown", unlockOnce);
    }
    document.addEventListener("pointerdown", unlockOnce);
    document.addEventListener("keydown", unlockOnce);

    loadLevel(current);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
