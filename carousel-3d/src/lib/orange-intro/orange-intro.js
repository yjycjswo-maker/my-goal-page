/*!
 * OrangeIntro — web recreation of the orange identity intro.
 *
 *   dot + ring → 12-spoke burst (clockwise sprout, shockwave)
 *   → spokes thicken & spin with overshoot, circular text ring writes on
 *   → inhale, then either
 *       · spin-collapse to a point → cream flood → orange flood      (background: true)
 *       · or the burst flies into a logo slot left of the title       (logo: true, background: false)
 *   → variable-width title rises letter by letter, width wave runs through it
 *     (the lockup stays fit to width, so it grows taller as letters condense)
 *   → italic serif subtitle, rule line + labels, HUD in the corners.
 *
 * Usage
 *   <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600&family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&display=swap" rel="stylesheet">
 *   <link rel="stylesheet" href="orange-intro.css">
 *   <div id="hero" style="width:100%;height:100vh"></div>
 *   <script src="orange-intro.js"></script>
 *   <script>
 *     const intro = new OrangeIntro(document.getElementById('hero'), { title: 'CLAUDE' });
 *     // logo lockup on a transparent background:
 *     //   { background: false, logo: true, colors: { title: '#fff', sub: '#fff' } }
 *     // intro.replay(); intro.seek(2.5); intro.pause(); intro.play(); intro.destroy();
 *     // intro.wave() runs one width wave now; intro.lockupRect() gives the logo + title bounds
 *   </script>
 *
 * Every frame is a pure function of time t (seconds), so seek() is exact.
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    title: "CLAUDE",
    subtitle: "motion designer", // "" for none
    ringText: "CLAUDE · MOTION DESIGN · SHOWREEL 2026 · ",
    labelLeft: "N° 01",
    labelRight: "SHOWREEL — 2026",
    background: true, // false: transparent — no dark fill, no cream/orange flood
    logo: false, // true: the asterisk becomes a logo mark left of the title
    rule: true, // thin rule line (+ labels) above the title
    hud: "auto", // true | false | "auto" (full HUD from 560px wide, corner brackets only below)
    hudBrand: "CLAUDE",
    hudTitle: "MOTION REEL — 2026",
    hudSection: "01 — IDENTITY",
    colors: {
      dark: "#080F0B",
      orange: "#F95933",
      cream: "#F2EFDD",
      ink: "#0E0A07",
      title: null, // default: ink
      sub: "#FEEDCC",
      logo: null, // default: ink on the orange card, orange when there is no background
      ring: "#A9B2AC"
    },
    fonts: {
      title: '"Roboto Flex", "Arial Black", sans-serif',
      serif: '"Instrument Serif", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, Menlo, monospace'
    },
    autoplay: true,
    speed: 1,
    idle: true, // after the intro, re-run the width wave every `idleEvery` seconds
    idleEvery: 4.5,
    loop: false, // restart the whole intro after `loopDelay` seconds of hold
    loopDelay: 3,
    reducedMotion: "auto", // "auto" follows prefers-reduced-motion; true/false forces it
    onComplete: null
  };

  // Timeline (seconds). Measured from the reference video.
  var T = {
    dot: 0.03,
    burst: 0.37,
    thick: 0.84,
    ring: 0.85,
    inhale: 1.34,
    collapse: 1.47,
    pin: 1.69,
    cream: 1.74,
    orange: 1.785,
    title: 1.79,
    logo: 1.82, // the flying burst lands in the logo slot
    rule: 1.85,
    labels: 2.35,
    wave: 2.365,
    sub: 2.6,
    end: 3.4
  };
  // Spoke lengths after the thicken (long / short alternating), in reference px.
  var SPOKE_LENS = [148, 111, 135, 107, 146, 119, 141, 110, 148, 115, 132, 110];
  var SPOKE_MAX = 148;
  // Logo lockup, measured from the reference end card (in cap heights / radius).
  var LOGO_D = 1.48; // visual logo diameter
  var LOGO_GAP = 0.36; // gap between logo and title
  var LOGO_W = 0.28; // spoke width / logo radius
  var W_EXT = 151; // Roboto Flex width axis: extended ...
  var W_COND = 25; // ... to compressed
  var TAU = Math.PI * 2;
  var UID = 0;

  // ---------------------------------------------------------------- math
  function clamp(x, a, b) {
    a = a === undefined ? 0 : a;
    b = b === undefined ? 1 : b;
    return x < a ? a : x > b ? b : x;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function prog(t, t0, t1) { return t1 <= t0 ? (t >= t0 ? 1 : 0) : clamp((t - t0) / (t1 - t0)); }
  function eOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function eInCubic(x) { return x * x * x; }
  function eInQuad(x) { return x * x; }
  function eInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eOutExpo(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function eOutBack(x, s) {
    s = s === undefined ? 1.70158 : s;
    var y = x - 1;
    return 1 + (s + 1) * y * y * y + s * y * y;
  }
  function wave(t, t0, dur, amp) {
    var x = (t - t0) / dur;
    if (x <= 0 || x >= 1) return 0;
    var s = Math.sin(Math.PI * x);
    return amp * s * s;
  }

  function hexRGB(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function mixC(a, b, t) {
    return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
  }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function merge(base, extra) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in extra) {
      if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k]) && base[k] && typeof base[k] === "object") {
        out[k] = merge(base[k], extra[k]);
      } else if (extra[k] !== undefined) {
        out[k] = extra[k];
      }
    }
    return out;
  }

  function loadFonts(f) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var specs = ["1000 100px " + f.title, "italic 400 64px " + f.serif, "600 12px " + f.mono, "400 12px " + f.mono];
    var all = Promise.all(specs.map(function (s) { return document.fonts.load(s).catch(function () {}); }));
    // Never hold the animation hostage to a slow font CDN.
    return Promise.race([all, new Promise(function (r) { setTimeout(r, 3000); })]);
  }

  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // 12 round-capped spokes from (x, y). k = px per spoke unit (lens / width are in spoke units).
  function drawStar(c, x, y, k, width, lens, rot, style) {
    if (k <= 0.0005) return;
    c.strokeStyle = style;
    c.lineWidth = width * k;
    c.lineCap = "round";
    c.beginPath();
    for (var i = 0; i < 12; i++) {
      var L = lens[i] * k;
      if (L < 0.5) continue;
      var a = ((-90 + 30 * i + rot) * Math.PI) / 180;
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    }
    c.stroke();
  }

  // ---------------------------------------------------------------- component
  function OrangeIntro(el, opts) {
    if (!(this instanceof OrangeIntro)) return new OrangeIntro(el, opts);
    var self = this;
    this.el = el;
    this.o = merge(DEFAULTS, opts || {});
    var oc = this.o.colors;
    this.col = {};
    for (var k in oc) if (oc[k]) this.col[k] = hexRGB(oc[k]);
    this.col.title = hexRGB(oc.title || oc.ink);
    this.col.logo = hexRGB(oc.logo || (this.o.background ? oc.ink : oc.orange));
    this.uid = ++UID;
    this.t = 0;
    this.playing = false;
    this._raf = 0;
    this._adv = {};
    this._completed = false;
    this._waves = []; // start times of on-demand width waves (wave())
    this._waveTurn = 0; // logo turn banked from finished on-demand waves
    this._build();
    this._resize();
    this.render(0);
    if (global.ResizeObserver) {
      this._ro = new ResizeObserver(function () {
        self._resize();
        self.render(self.t);
      });
      this._ro.observe(el);
    }
    this.ready = loadFonts(this.o.fonts).then(function () {
      if (self._destroyed) return self;
      self._adv = {};
      self._measureFonts();
      self._resize();
      if (self._reduced()) self.seek(T.end + 0.01);
      else if (self.o.autoplay) self.play(0);
      else self.render(self.t);
      return self;
    });
  }

  OrangeIntro.TIMELINE = T;
  OrangeIntro.DEFAULTS = DEFAULTS;
  var P = OrangeIntro.prototype;

  P._reduced = function () {
    var r = this.o.reducedMotion;
    if (r === true || r === false) return r;
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  P._build = function () {
    var el = this.el, o = this.o, id = "oi" + this.uid;
    el.classList.add("oi");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", o.subtitle ? o.title + " — " + o.subtitle : o.title);
    el.style.background = o.background ? o.colors.dark : "transparent";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "oi-canvas";
    this.ctx = this.canvas.getContext("2d");

    var svg = svgEl("svg", { "class": "oi-svg", "aria-hidden": "true", focusable: "false" });
    var defs = svgEl("defs", {});
    var cpT = svgEl("clipPath", { id: id + "-t" });
    var cpS = svgEl("clipPath", { id: id + "-s" });
    this.clipT = svgEl("rect", { x: 0, y: 0, width: 1, height: 1 });
    this.clipS = svgEl("rect", { x: 0, y: 0, width: 1, height: 1 });
    cpT.appendChild(this.clipT);
    cpS.appendChild(this.clipS);
    defs.appendChild(cpT);
    defs.appendChild(cpS);
    svg.appendChild(defs);

    var titleFill = rgba(this.col.title, 1);
    var gT = svgEl("g", { "clip-path": "url(#" + id + "-t)" });
    this.letters = o.title.split("").map(function (ch) {
      var t = svgEl("text", { "class": "oi-ch" });
      t.textContent = ch;
      t.style.fontFamily = o.fonts.title;
      t.style.fill = titleFill;
      gT.appendChild(t);
      return t;
    });
    var gS = svgEl("g", { "clip-path": "url(#" + id + "-s)" });
    this.words = (o.subtitle ? o.subtitle.split(" ") : []).map(function (w) {
      var t = svgEl("text", { "class": "oi-word" });
      t.textContent = w;
      t.style.fontFamily = o.fonts.serif;
      t.style.fill = o.colors.sub;
      gS.appendChild(t);
      return t;
    });
    // Invisible probe used to measure glyph advances at a given width axis value.
    this.probe = svgEl("text", { "class": "oi-probe", x: -9999, y: -9999 });
    this.probe.style.fontFamily = o.fonts.title;
    svg.appendChild(gT);
    svg.appendChild(gS);
    svg.appendChild(this.probe);
    this.svg = svg;

    el.appendChild(this.canvas);
    el.appendChild(svg);

    var chars = [];
    while (chars.length < 72) chars = chars.concat(o.ringText.split(""));
    this.ringChars = chars;
  };

  P._measureFonts = function () {
    var c = this.ctx, o = this.o;
    c.save();
    c.font = "1000 100px " + o.fonts.title;
    var m = c.measureText("H");
    this.capRatio = m.actualBoundingBoxAscent > 0 ? m.actualBoundingBoxAscent / 100 : 0.711;
    c.font = "italic 400 100px " + o.fonts.serif;
    var s = c.measureText("dg");
    this.serifAsc = s.actualBoundingBoxAscent > 0 ? s.actualBoundingBoxAscent / 100 : 0.72;
    this.serifDesc = s.actualBoundingBoxDescent > 0 ? s.actualBoundingBoxDescent / 100 : 0.25;
    c.restore();
  };

  // Advance width of a glyph at 100px for a width-axis value (memoised, linearly interpolated).
  P._advance = function (ch, wdth) {
    var lo = Math.floor(wdth), hi = Math.ceil(wdth);
    var a = this._advAt(ch, lo);
    if (hi === lo) return a;
    return lerp(a, this._advAt(ch, hi), wdth - lo);
  };
  P._advAt = function (ch, w) {
    var key = ch + "|" + w, v = this._adv[key];
    if (v !== undefined) return v;
    var p = this.probe;
    p.textContent = ch;
    p.style.fontSize = "100px";
    p.style.fontVariationSettings = '"wdth" ' + w + ', "wght" 1000, "opsz" 144';
    v = p.getComputedTextLength() || 60;
    this._adv[key] = v;
    return v;
  };

  // Font size so that [logo + gap +] title fills the target width.
  P._fitLockup = function (wdths) {
    var adv = [], sum = 0;
    for (var i = 0; i < this.letters.length; i++) {
      var a = this._advance(this.o.title[i], wdths[i]);
      adv.push(a);
      sum += a;
    }
    var lk = this.o.logo ? LOGO_D + LOGO_GAP : 0;
    var fs = this.targetW / Math.max(sum / 100 + lk * this.capRatio, 0.01);
    fs = Math.min(fs, this.maxCap / this.capRatio);
    var cap = fs * this.capRatio;
    var titleW = (sum * fs) / 100;
    return { fs: fs, cap: cap, adv: adv, titleW: titleW, lockW: titleW + lk * cap };
  };

  P._resize = function () {
    var r = this.el.getBoundingClientRect();
    var W = Math.max(1, r.width), H = Math.max(1, r.height);
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    this.S = Math.min(W / 720, H / 608); // radial graphics: 1 unit = 1px of the 1080x608 reference
    this.u = W / 1080; // HUD / small type
    this.compact = W < 560;
    if (!this.capRatio) this._measureFonts();
    // Rest layout: extended letters, lockup fit to 85% of the width, cap height capped by the frame height.
    this.targetW = 0.85 * W;
    this.maxCap = 0.3 * H;
    var rest = [];
    for (var i = 0; i < this.letters.length; i++) rest.push(W_EXT);
    this.cap0 = this._fitLockup(rest).cap;
    this.maxCap = Math.max(this.maxCap, this.cap0 * 1.6);
    this.cy = (this.words.length ? 0.475 : 0.5) * H; // without a subtitle the lockup sits dead centre
    this.ruleY = this.cy - 1.4 * this.cap0;
    this.subSize = 0.585 * this.cap0;
    this.subBase = this.cy + 1.65 * this.cap0;
    // subtitle word widths
    var ws = [], total = 0;
    for (var j = 0; j < this.words.length; j++) {
      this.words[j].style.fontSize = this.subSize + "px";
      var w = this.words[j].getComputedTextLength();
      ws.push(w);
      total += w;
    }
    this.subSpace = this.subSize * 0.26;
    this.wordW = ws;
    this.subWidth = total + this.subSpace * Math.max(this.words.length - 1, 0);
    this.clipT.setAttribute("width", W);
    this.clipS.setAttribute("width", W);
  };

  // ---------------------------------------------------------------- playback
  P.play = function (from) {
    var self = this;
    if (this._destroyed) return this;
    if (typeof from === "number") this.t = from;
    if (this.playing) return this;
    this.playing = true;
    var last = performance.now();
    var tick = function (now) {
      if (!self.playing) return;
      self.t += (Math.min(now - last, 100) / 1000) * self.o.speed;
      last = now;
      if (!self._completed && self.t >= T.end) {
        self._completed = true;
        if (typeof self.o.onComplete === "function") self.o.onComplete(self);
      }
      if (self.o.loop && self.t >= T.end + self.o.loopDelay) {
        self.t = 0;
        self._completed = false;
      }
      self.render(self.t);
      self._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
    return this;
  };
  P.pause = function () {
    this.playing = false;
    cancelAnimationFrame(this._raf);
    return this;
  };
  P.replay = function () {
    this.pause();
    this._completed = false;
    this._waves = [];
    this._waveTurn = 0;
    if (this._reduced()) return this.seek(T.end + 0.01);
    return this.play(0);
  };
  P.seek = function (t) {
    this.pause();
    this.t = t;
    this.render(t);
    return this;
  };
  // Run one width wave through the title now (e.g. on hover). Ignored while one is still running.
  P.wave = function () {
    var span = 0.11 * (this.letters.length - 1) + 0.62;
    var w = this._waves;
    while (w.length && this.t - w[0] > span) {
      w.shift();
      this._waveTurn += 60;
    }
    if (!w.length || this.t - w[w.length - 1] > span) w.push(this.t);
    return this;
  };

  // Bounds of the logo + title lockup at rest, in container px (e.g. to lay a click target over it).
  P.lockupRect = function () {
    var rest = [];
    for (var i = 0; i < this.letters.length; i++) rest.push(W_EXT);
    var f = this._fitLockup(rest);
    var h = (this.o.logo ? LOGO_D : 1) * f.cap;
    return { x: this.W / 2 - f.lockW / 2, y: this.cy - h / 2, width: f.lockW, height: h };
  };

  P.destroy = function () {
    this._destroyed = true;
    this.pause();
    if (this._ro) this._ro.disconnect();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    if (this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
    this.el.classList.remove("oi");
  };

  // ---------------------------------------------------------------- layout
  P._waveAmount = function (t, i) {
    var c = wave(t, T.wave + 0.11 * i, 0.62, 1);
    if (this.o.idle && t > T.end + 1) {
      var t0 = T.end + 1;
      var k = Math.floor((t - t0) / this.o.idleEvery);
      c = Math.max(c, wave(t, t0 + k * this.o.idleEvery + 0.11 * i, 0.62, 0.85));
    }
    for (var j = 0; j < this._waves.length; j++) c = Math.max(c, wave(t, this._waves[j] + 0.11 * i, 0.62, 0.85));
    return c;
  };

  // The logo ticks 60° with every width wave, so it moves with the type's rhythm.
  P._logoTurn = function (t) {
    var span = 0.11 * (this.letters.length - 1) + 0.62;
    var turn = 60 * eInOutCubic(prog(t, T.wave, T.wave + span));
    if (this.o.idle && t > T.end + 1) {
      var t0 = T.end + 1, e = this.o.idleEvery;
      var k = Math.floor((t - t0) / e);
      turn += 60 * k + 60 * eInOutCubic(prog(t, t0 + k * e, t0 + k * e + span));
    }
    turn += this._waveTurn;
    for (var j = 0; j < this._waves.length; j++) turn += 60 * eInOutCubic(prog(t, this._waves[j], this._waves[j] + span));
    return turn;
  };

  P._layoutAt = function (t) {
    var wd = [];
    for (var i = 0; i < this.letters.length; i++) wd.push(lerp(W_EXT, W_COND, this._waveAmount(t, i)));
    var f = this._fitLockup(wd);
    var x0 = this.W / 2 - f.lockW / 2;
    f.wd = wd;
    f.titleX = x0;
    f.logo = null;
    if (this.o.logo) {
      var d = LOGO_D * f.cap;
      f.titleX = x0 + d + LOGO_GAP * f.cap;
      // R = longest spoke; the round caps add LOGO_W/2 · R on each side of the visual diameter
      f.logo = { x: x0 + d / 2, y: this.cy, R: d / (2 + LOGO_W), turn: this._logoTurn(t) };
    }
    return f;
  };

  // ---------------------------------------------------------------- render
  P.render = function (t) {
    var L = this._layoutAt(t);
    this._renderCanvas(t, L);
    this._renderTitle(t, L);
    this._renderSub(t);
  };

  P._renderCanvas = function (t, L) {
    var c = this.ctx, W = this.W, H = this.H, col = this.col, o = this.o;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!o.background) {
      c.clearRect(0, 0, W, H);
      this._drawBurst(c, t, L);
    } else {
      var cx = W / 2, cy = H / 2;
      var halfDiag = Math.hypot(W, H) / 2;
      var oR = halfDiag * 1.06 * eOutCubic(prog(t, T.orange, T.orange + 0.25));
      var covered = oR >= halfDiag + 12 * this.S;
      c.fillStyle = covered ? o.colors.orange : o.colors.dark;
      c.fillRect(0, 0, W, H);
      if (!covered) {
        if (t < T.cream + 0.06) this._drawBurst(c, t, L);
        var cR = halfDiag * 1.2 * eOutExpo(prog(t, T.cream, T.cream + 0.35));
        if (cR > 0.5) softDisc(c, cx, cy, cR, col.cream, 22 * this.S, [178, 160, 255]);
        if (oR > 0.5) softDisc(c, cx, cy, oR, col.orange, 16 * this.S, null);
      }
      if (o.logo) {
        // on the orange card the logo pops in with the title
        var e = prog(t, T.title - 0.02, T.title + 0.34);
        if (e > 0) {
          var lg = L.logo;
          drawStar(c, lg.x, lg.y, (lg.R / SPOKE_MAX) * eOutBack(e, 2.2), LOGO_W * SPOKE_MAX, SPOKE_LENS,
            52 - 120 * (1 - eOutCubic(e)) + lg.turn, rgba(col.logo, 1));
        }
      }
    }
    if (o.rule && t >= T.rule) this._drawRule(c, t);
    if (o.hud !== false) this._drawHud(c, t);
  };

  function softDisc(c, x, y, r, rgb, soft, fringe) {
    var g = c.createRadialGradient(x, y, Math.max(r - soft, 0), x, y, r + soft);
    g.addColorStop(0, rgba(rgb, 1));
    if (fringe) {
      g.addColorStop(0.4, rgba(rgb, 1));
      g.addColorStop(0.62, rgba(fringe, 0.6));
      g.addColorStop(1, rgba(fringe, 0));
    } else {
      g.addColorStop(0.5, rgba(rgb, 1));
      g.addColorStop(1, rgba(rgb, 0));
    }
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r + soft, 0, TAU);
    c.fill();
  }

  function strokeCircle(c, r, w, style) {
    c.strokeStyle = style;
    c.lineWidth = w;
    c.beginPath();
    c.arc(0, 0, Math.max(r, 0), 0, TAU);
    c.stroke();
  }

  // Burst state is a pure function of time so motion-blur ghosts can sample the past.
  function spokeState(t, collapse) {
    var thick = eOutCubic(prog(t, T.thick, T.thick + 0.13));
    var inh = eInOutCubic(prog(t, T.inhale, T.collapse));
    var cp = collapse ? prog(t, T.collapse, T.collapse + 0.233) : 0;
    var rot = 45 * eOutBack(prog(t, T.thick, T.thick + 0.32), 2.6) + 7 * inh + 230 * eInCubic(cp);
    var lens = [];
    for (var k = 0; k < 12; k++) {
      var st = T.burst + 0.011 * k;
      var grow = eOutCubic(prog(t, st, st + 0.09));
      lens.push(lerp(138, SPOKE_LENS[k], thick) * (1 + 0.09 * inh) * grow);
    }
    return { rot: rot, width: lerp(5, 16.5, thick), lens: lens, scale: 1 - eInQuad(cp), inh: inh };
  }

  // Where and how the spokes are drawn: at the centre, or flying into the logo slot.
  P._starAt = function (t, L) {
    var fly = this.o.logo && !this.o.background;
    var st = spokeState(t, !fly);
    var s = { x: this.W / 2, y: this.H / 2, k: this.S * st.scale, width: st.width, rot: st.rot, lens: st.lens, color: this.col.orange };
    if (!fly || t < T.collapse) return s;
    var m = eInOutCubic(prog(t, T.collapse, T.logo));
    var lg = L.logo;
    var pop = 1 + 0.14 * Math.sin(Math.PI * prog(t, T.logo - 0.06, T.logo + 0.16));
    s.x = lerp(s.x, lg.x, m);
    s.y = lerp(s.y, lg.y, m);
    s.k = lerp(this.S, lg.R / SPOKE_MAX, m) * pop;
    s.width = lerp(st.width, LOGO_W * SPOKE_MAX, m);
    s.rot = st.rot + 180 * m + lg.turn;
    s.lens = SPOKE_LENS.map(function (l) { return l * (1 + 0.09 * st.inh * (1 - m)); });
    s.color = mixC(this.col.orange, this.col.logo, m);
    return s;
  };

  P._drawBurst = function (c, t, L) {
    var S = this.S, col = this.col, o = this.o;
    var cx = this.W / 2, cy = this.H / 2;
    c.save();
    c.translate(cx, cy);

    // inner ring around the seed dot
    if (t >= T.dot) {
      var ringR = lerp(30, 88, eOutExpo(prog(t, T.dot, T.dot + 0.22))) + 16 * eInOutCubic(prog(t, 0.25, 0.36));
      var ringA = 0.55 * clamp((t - T.dot) / 0.05) * (1 - prog(t, 0.4, 0.62));
      if (ringA > 0.005) strokeCircle(c, ringR * S, 1.4 * S, rgba(col.ring, ringA));
    }

    // shockwave: blurry and dim while fast, thin and faint once it slows down
    if (t >= T.burst && t < 1.25) {
      var e1 = eOutCubic(prog(t, T.burst, T.burst + 0.2));
      var r = t < T.burst + 0.2 ? lerp(104, 311, e1) : lerp(311, 370, eOutCubic(prog(t, T.burst + 0.2, 1.25)));
      var sharp = eOutCubic(prog(t, T.burst + 0.03, T.burst + 0.3));
      var a = lerp(0.22, 0.42, sharp) * (1 - prog(t, 0.75, 1.25));
      for (var b = 0; b < 3; b++) {
        var sw = lerp(14 - 4 * b, 1.3, sharp) * S;
        strokeCircle(c, r * S, sw, rgba(col.ring, a * (b === 2 ? 1 : 0.28)));
      }
    }

    // circular text ring + outer ring with orange arcs
    var vis = prog(t, T.ring, T.ring + 0.06) * (1 - prog(t, T.collapse, T.collapse + 0.09));
    if (vis > 0.001) {
      var n = this.ringChars.length;
      var reveal = prog(t, T.ring, T.ring + 0.22) * n;
      var spin = (-10 * (t - T.ring) * Math.PI) / 180;
      var rr = 170 * S;
      c.font = "600 " + 8.5 * S + "px " + o.fonts.mono;
      c.textAlign = "center";
      c.textBaseline = "middle";
      for (var i = 0; i < n && i < reveal; i++) {
        var ch = this.ringChars[i];
        if (ch === " ") continue;
        c.fillStyle = rgba([205, 211, 207], 0.82 * vis * clamp(reveal - i));
        c.save();
        c.rotate(spin + (i / n) * TAU);
        c.fillText(ch, 0, -rr);
        c.restore();
      }
      var ov = vis * prog(t, 0.95, 1.2);
      if (ov > 0.001) {
        strokeCircle(c, 242 * S, 1.1 * S, rgba(col.ring, 0.2 * ov));
        c.strokeStyle = rgba(col.orange, 0.62 * ov);
        c.lineWidth = 1.7 * S;
        c.lineCap = "butt";
        var base = ((45 + 22 * (t - T.ring)) * Math.PI) / 180;
        for (var q = 0; q < 2; q++) {
          c.beginPath();
          c.arc(0, 0, 242 * S, base + q * Math.PI, base + q * Math.PI + (26 * Math.PI) / 180);
          c.stroke();
        }
      }
    }
    c.restore();

    // spokes (with motion-blur ghosts while they really spin)
    if (t >= T.burst) {
      var now = this._starAt(t, L);
      var speed = Math.abs(now.rot - this._starAt(t - 1 / 60, L).rot) * 60; // deg/s
      var blur = clamp((speed - 120) / 900);
      if (blur > 0) {
        // ~1/4 frame of shutter at most: a hint of smear, not a fan
        for (var g = 5; g >= 1; g--) {
          var gs = this._starAt(t - g * 0.0024 * blur, L);
          drawStar(c, gs.x, gs.y, gs.k, gs.width, gs.lens, gs.rot, rgba(gs.color, 0.1 + 0.06 * blur));
        }
      }
      drawStar(c, now.x, now.y, now.k, now.width, now.lens, now.rot, rgba(now.color, 1));
    }

    c.save();
    c.translate(cx, cy);
    // seed dot: pop in, squeeze (anticipation), vanish into the burst
    var dr = 20 * Math.max(eOutBack(prog(t, T.dot, T.dot + 0.14), 2.2), 0);
    dr *= 1 - 0.2 * eInOutCubic(prog(t, 0.2, 0.34));
    dr *= 1 - eInCubic(prog(t, T.burst, T.burst + 0.08));
    if (dr > 0.2) {
      c.fillStyle = rgba(col.orange, 1);
      c.beginPath();
      c.arc(0, 0, dr * S, 0, TAU);
      c.fill();
    }
    // cream pin left behind by the collapse; the flood grows out of it
    if (o.background && t >= T.pin && t < T.cream + 0.06) {
      c.fillStyle = rgba(col.cream, 1);
      c.beginPath();
      c.arc(0, 0, 3.8 * S * eOutBack(prog(t, T.pin, T.pin + 0.03)), 0, TAU);
      c.fill();
    }
    c.restore();
  };

  P._drawRule = function (c, t) {
    var W = this.W, u = this.u, o = this.o;
    var lc = o.background ? this.col.ink : this.col.title;
    var la = o.background ? 0.6 : 0.35;
    var half = this.targetW / 2 + 0.012 * W;
    var e = eOutCubic(prog(t, T.rule, T.rule + 0.42));
    c.strokeStyle = rgba(lc, la);
    c.lineWidth = Math.max(1, 1.4 * u);
    c.beginPath();
    c.moveTo(W / 2 - half * e, this.ruleY);
    c.lineTo(W / 2 + half * e, this.ruleY);
    c.stroke();
    var lab = this.compact ? 0 : prog(t, T.labels, T.labels + 0.16);
    if (lab > 0) {
      c.font = "600 " + Math.max(7.5 * u, 7) + "px " + o.fonts.mono;
      c.fillStyle = rgba(lc, (la + 0.02) * lab);
      c.textBaseline = "alphabetic";
      if ("letterSpacing" in c) c.letterSpacing = Math.max(0.5 * u, 0.4) + "px";
      c.textAlign = "left";
      c.fillText(o.labelLeft, W / 2 - half, this.ruleY - Math.max(9 * u, 6));
      c.textAlign = "right";
      c.fillText(o.labelRight, W / 2 + half, this.ruleY - Math.max(9 * u, 6));
      if ("letterSpacing" in c) c.letterSpacing = "0px";
    }
  };

  P._drawHud = function (c, t) {
    var W = this.W, H = this.H, u = this.u, o = this.o;
    var a = eOutCubic(prog(t, 0, 0.35));
    if (a <= 0) return;
    // with a background the cream/orange floods arrive and the HUD flips from light to ink
    var k = o.background ? prog(t, 1.8, 1.86) : 0;
    var main = rgba(mixC(this.col.cream, this.col.ink, k), lerp(0.88, 0.8, k) * a);
    var dim = rgba(mixC(this.col.cream, this.col.ink, k), 0.45 * a);
    var fs = clamp(9 * u, 8, 13);
    var m = clamp(18 * u, 10, 30);
    var arm = clamp(10 * u, 7, 16);
    var pad = clamp(20 * u, 10, 32);
    c.strokeStyle = main;
    c.lineWidth = Math.max(1, 1.6 * u);
    c.lineCap = "butt";
    c.beginPath();
    c.moveTo(m + arm, m); c.lineTo(m, m); c.lineTo(m, m + arm);
    c.moveTo(W - m - arm, m); c.lineTo(W - m, m); c.lineTo(W - m, m + arm);
    c.moveTo(m, H - m - arm); c.lineTo(m, H - m); c.lineTo(m + arm, H - m);
    c.moveTo(W - m, H - m - arm); c.lineTo(W - m, H - m); c.lineTo(W - m - arm, H - m);
    c.stroke();
    if (o.hud === "auto" ? this.compact : o.hud !== true) return;

    var spacing = "letterSpacing" in c;
    if (spacing) c.letterSpacing = Math.max(0.6 * u, 0.5) + "px";
    c.textBaseline = "alphabetic";
    var top = m + pad + fs * 0.4;
    var bottom = H - m - pad + fs * 0.2;
    var x = m + pad;
    c.textAlign = "left";
    c.font = "600 " + fs + "px " + o.fonts.mono;
    c.fillStyle = main;
    c.fillText(o.hudBrand, x, top);
    var bw = c.measureText(o.hudBrand).width;
    c.font = "400 " + fs + "px " + o.fonts.mono;
    c.fillStyle = dim;
    c.fillText(o.hudTitle, x + bw + fs * 2.2, top);

    c.textAlign = "right";
    c.font = "600 " + fs + "px " + o.fonts.mono;
    c.fillStyle = main;
    c.fillText(o.hudSection, W - m - pad, top);

    // timecode (30 fps) + progress bar
    var fr = Math.max(0, Math.floor(t * 30));
    var tc = "00:00:" + pad2(Math.floor(fr / 30) % 60) + ":" + pad2(fr % 30);
    c.textAlign = "left";
    c.fillStyle = main;
    c.fillText(tc, x, bottom);
    var tw = c.measureText(tc).width;
    c.font = "400 " + fs + "px " + o.fonts.mono;
    c.fillStyle = dim;
    c.fillText("30 FPS", x + tw + fs * 2.2, bottom);
    c.strokeStyle = main;
    c.lineWidth = Math.max(1, 1.8 * u);
    var bar = Math.min(t * 0.063 * W, W - 2 * m);
    c.beginPath();
    c.moveTo(m, H - m * 0.45);
    c.lineTo(m + bar, H - m * 0.45);
    c.stroke();

    // 120 BPM beat squares + bar counter
    var beat = Math.floor(t * 2) % 4;
    var barN = (Math.floor(t / 2) % 8) + 1;
    c.textAlign = "right";
    c.fillStyle = dim;
    var rx = W - m - pad;
    var barTxt = "BAR " + barN + "/8";
    c.fillText(barTxt, rx, bottom);
    rx -= c.measureText(barTxt).width + fs * 1.2;
    var sq = fs * 0.72, gap = fs * 0.28;
    for (var i = 3; i >= 0; i--) {
      var sx = rx - sq;
      if (i === beat) {
        c.fillStyle = main;
        c.fillRect(sx, bottom - sq, sq, sq);
      } else {
        c.strokeStyle = dim;
        c.lineWidth = Math.max(1, u);
        c.strokeRect(sx + 0.5, bottom - sq + 0.5, sq - 1, sq - 1);
      }
      rx = sx - gap;
    }
    c.fillStyle = dim;
    c.fillText("120 BPM", rx - fs * 0.9, bottom);
    if (spacing) c.letterSpacing = "0px";
  };

  P._renderTitle = function (t, L) {
    var n = this.letters.length, i;
    var base = this.cy + L.cap / 2;
    this.clipT.setAttribute("y", -10);
    this.clipT.setAttribute("height", base + 10 + 0.5);
    var x = L.titleX;
    for (i = 0; i < n; i++) {
      var el = this.letters[i];
      var st = T.title + 0.035 * i;
      var e = eOutCubic(prog(t, st, st + 0.21));
      el.style.visibility = e > 0 ? "visible" : "hidden";
      el.setAttribute("x", x.toFixed(2));
      el.setAttribute("y", (base + (1 - e) * L.cap * 1.15).toFixed(2));
      el.style.fontSize = L.fs.toFixed(2) + "px";
      el.style.fontVariationSettings = '"wdth" ' + L.wd[i].toFixed(1) + ', "wght" 1000, "opsz" 144';
      x += (L.adv[i] * L.fs) / 100;
    }
  };

  P._renderSub = function (t) {
    if (!this.words.length) return;
    var fs = this.subSize, base = this.subBase;
    this.clipS.setAttribute("y", base - fs * (this.serifAsc + 0.25));
    this.clipS.setAttribute("height", fs * (this.serifAsc + this.serifDesc + 0.3));
    var x = this.W / 2 - this.subWidth / 2;
    for (var j = 0; j < this.words.length; j++) {
      var el = this.words[j];
      var st = T.sub + 0.07 * j;
      var e = eOutExpo(prog(t, st, st + 0.6));
      el.style.visibility = e > 0 ? "visible" : "hidden";
      el.style.fontSize = fs + "px";
      el.setAttribute("x", x.toFixed(2));
      el.setAttribute("y", (base + (1 - e) * fs * 1.25).toFixed(2));
      x += this.wordW[j] + this.subSpace;
    }
  };

  global.OrangeIntro = OrangeIntro;
  if (typeof module !== "undefined" && module.exports) module.exports = OrangeIntro;
})(typeof window !== "undefined" ? window : this);
