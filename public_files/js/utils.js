/*
 * Puppy Park — Utilities
 * ----------------------
 * Reusable, state-free building blocks shared by app.js:
 *   - inline SVG assets (dog, kennel, star, icons)
 *   - the color palette and base flex config
 *   - the procedural Web Audio sound effects module
 *
 * Exposed as window.PuppyParkUtils so app.js can consume it without a
 * bundler / ES modules.
 */

(() => {
  "use strict";

  /* ------------------------- SVG assets (inline) ------------------------- */
  // Kept inline so each dog can be colored on the fly. Source-equivalent
  // markup also lives in /assets for reference.

  const FACE = "#2b2118";

  // Front-facing puppy (looking at the player). Paws, ears, tail and body carry
  // classes so CSS can animate a little waddle while the dog is moving.
  const svgDog = (color) => {
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
  };

  const svgKennel = () => {
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
  };

  const starSvg = (on) => {
    return (
      '<svg class="star' + (on ? " is-on" : "") + '" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>'
    );
  };
  const starRow = (n) => {
    var s = "";
    for (var i = 0; i < 3; i++) {
      s += '<span class="star-wrap" style="animation-delay:' + (i * 0.1) + 's">' + starSvg(i < n) + "</span>";
    }
    return s;
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

  var CHECK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  var LOCK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  var X_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  /* ----------------------------- Config ----------------------------------*/

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
  const audio = (() => {
    let ctx = null;
    let muted = false;
    try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) {}

    const ready = () => {
      if (muted) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { ctx = null; return null; }
      }
      if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
      return ctx;
    };

    // One short enveloped tone.
    const tone = (freq, startAt, dur, type, peak) => {
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
    };

    // Short burst of filtered noise — adds a percussive "chuff" texture.
    const noiseBurst = (startAt, dur, filterFreq, peak) => {
      const c = ready();
      if (!c) return;
      const t0 = c.currentTime + (startAt || 0);
      const size = Math.max(1, Math.floor(c.sampleRate * dur));
      const buffer = c.createBuffer(1, size, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
      const noise = c.createBufferSource();
      noise.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(filterFreq, t0);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak || 0.12, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      noise.connect(filter); filter.connect(g); g.connect(c.destination);
      noise.start(t0); noise.stop(t0 + dur + 0.02);
    };

    // One "woof": a sawtooth that sweeps sharply down in pitch, tamed by a
    // falling lowpass filter, plus a noise chuff at the attack — closer to
    // the sound of a real bark than a flat beep.
    const woof = (startAt, peak, dur) => {
      const c = ready();
      if (!c) return;
      const t0 = c.currentTime + (startAt || 0);
      const d = dur || 0.16;
      const osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(550, t0);
      osc.frequency.exponentialRampToValueAtTime(160, t0 + d);
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(2200, t0);
      filter.frequency.exponentialRampToValueAtTime(350, t0 + d);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak || 0.16, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      osc.connect(filter); filter.connect(g); g.connect(c.destination);
      osc.start(t0); osc.stop(t0 + d + 0.03);
      noiseBurst(startAt, 0.035, 2400, (peak || 0.16) * 0.6);
    };

    return {
      isMuted: () => muted,
      unlock: () => { ready(); },
      toggle: () => {
        muted = !muted;
        try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {}
        if (!muted) { ready(); tone(320, 0, 0.06, "triangle", 0.06); }
        return muted;
      },
      tick:    () => tone(200, 0, 0.04, "square", 0.03),
      click:   () => tone(320, 0, 0.06, "triangle", 0.06),
      error:   () => { tone(190, 0, 0.12, "sawtooth", 0.06); tone(140, 0.09, 0.16, "sawtooth", 0.06); },
      success: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.24, "triangle", 0.08)); },
      bark:    () => { woof(0, 0.17, 0.15); woof(0.16, 0.13, 0.12); },
      chime:   () => { tone(784, 0, 0.16, "sine", 0.07); tone(1047, 0.08, 0.2, "sine", 0.06); },
    };
  })();

  /* ------------------------------ Export ---------------------------------*/
  window.PuppyParkUtils = {
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
    MUTE_KEY,
    audio,
  };
})();
