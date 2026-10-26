// Pixel Card Club - core engine: canvas, scaling, input, drawing, bitmap text, audio, storage
(function () {
  'use strict';
  const W = 640, H = 360;
  const G = (window.G = { W, H });

  // ---------- Palette (Sweetie-16 based, plus felt tones) ----------
  G.P = {
    ink: '#1a1c2c', plum: '#5d275d', red: '#b13e53', orange: '#ef7d57',
    gold: '#ffcd75', lime: '#a7f070', green: '#38b764', teal: '#257179',
    navy: '#29366f', blue: '#3b5dc9', sky: '#41a6f6', cyan: '#73eff7',
    white: '#f4f4f4', silver: '#94b0c2', slate: '#566c86', dusk: '#333c57',
    felt0: '#173f2b', felt1: '#1d4d34', felt2: '#235c3e', felt3: '#2c6e4a', felt4: '#3a8259',
    wood0: '#3b1f17', wood1: '#5a3222', wood2: '#7a4a2e', wood3: '#9c6a3c',
    black: '#000000'
  };

  // ---------- Canvas ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  G.canvas = canvas; G.ctx = ctx;
  G.settings = { sound: true, back: 0, pixelPerfect: false, fitV: 2, drawThree: false, fishOpponents: 2, fishLevel: 1, bjDecks: 4, surface: 0, cardColour: 0 };

  // touch devices (iPhone / iPad / tablets): fill the screen, hide keyboard hints, show tap wording
  G.touch = !window.cardclubNative && (('ontouchstart' in window) || navigator.maxTouchPoints > 1) && matchMedia('(pointer: coarse)').matches;
  G.standalone = !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
  if (G.touch) document.documentElement.classList.add('touch');
  // The game is laid out on a 640x360 stage. On touch screens whose shape is not 16:9 (iPad is 4:3),
  // the canvas grows to fill the screen and the stage sits in the middle (offset G.ox, G.oy); the felt,
  // top bar, bottom panels and dim overlays stretch into the extra space so there are no black bars.
  G.ox = 0; G.oy = 0; G.SW = W; G.SH = H; G.sizeKey = W + 'x' + H;
  // while the on-screen keyboard is up, the screen size is frozen (so the game does not shrink) and the
  // canvas slides up just enough to keep the name box above the keyboard
  let frozen = null, lift = 0;
  // On touch screens a sudden big drop in height (same width) is a keyboard - the game's own, or the browser's
  // address bar - so the game keeps its full size instead of shrinking behind it.
  let kbWidth = 0, fullH = 0;
  const viewSize = () => {
    const w = window.visualViewport ? visualViewport.width : innerWidth;
    let h = window.visualViewport ? visualViewport.height : innerHeight;
    if (G.touch) {
      const wk = Math.round(w);
      if (wk !== kbWidth) { kbWidth = wk; fullH = h; }
      else if (h > fullH) fullH = h;
      else if (h < fullH * 0.8) h = fullH; // small changes (toolbars showing / hiding) are used as they are
    }
    return [w, h];
  };
  function liftForKeyboard() {
    let want = 0;
    const z = G.typer && G.typer.zone;
    if (frozen && z && window.visualViewport) {
      const r = canvas.getBoundingClientRect(), s = G.screenScale || 1;
      const baseTop = r.top - lift;
      const boxBottom = baseTop + (z.y + z.h + G.oy + 10) * s;
      const visibleBottom = visualViewport.offsetTop + visualViewport.height;
      want = Math.min(0, Math.round(visibleBottom - boxBottom));
    }
    if (want !== lift) { lift = want; canvas.style.transform = lift ? 'translateY(' + lift + 'px)' : ''; }
  }
  G.freezeView = (on) => {
    if (on) { if (!frozen) { const [w, h] = viewSize(); frozen = { vw: w, vh: h }; } return; }
    frozen = null; lift = 0; canvas.style.transform = '';
    try { window.scrollTo(0, 0); } catch (_) {}
    // the browser reports the full size again a moment after the keyboard closes
    for (const ms of [0, 120, 350, 700, 1200]) setTimeout(resize, ms);
  };
  function resize() {
    let [vw, vh] = viewSize();
    if (frozen) { vw = frozen.vw; vh = frozen.vh; }
    const r = Math.min(innerWidth / W, innerHeight / H);
    // FILL WINDOW (default, and always on touch screens): smooth scaling + the stage stretches to fill the window.
    // PIXEL PERFECT: whole-number scaling only (crispest pixels), with a border around the game.
    const fill = G.touch || !G.settings.pixelPerfect;
    let s = fill ? Math.min(vw / W, vh / H) : (r >= 1 ? Math.floor(r) : r);
    let cw = W, ch = H;
    if (fill && vw > 0 && vh > 0) { cw = Math.max(W, Math.min(Math.round(W * 1.5), Math.floor(vw / s))); ch = Math.max(H, Math.min(Math.round(H * 1.5), Math.floor(vh / s))); }
    if (cw !== G.SW || ch !== G.SH) {
      G.SW = cw; G.SH = ch; G.ox = Math.floor((cw - W) / 2); G.oy = Math.floor((ch - H) / 2); G.sizeKey = cw + 'x' + ch;
      canvas.width = cw; canvas.height = ch; ctx.imageSmoothingEnabled = false;
    }
    canvas.style.width = Math.floor(cw * s) + 'px';
    canvas.style.height = Math.floor(ch * s) + 'px';
    G.screenScale = s;
    liftForKeyboard();
  }
  // start each frame: clear the whole canvas, then draw the 640x360 stage at its offset
  G.beginFrame = () => {
    if (frozen) { if (!G.typer.el || document.activeElement !== G.typer.el) G.freezeView(false); else liftForKeyboard(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, G.SW, G.SH);
    ctx.setTransform(1, 0, 0, 1, G.ox, G.oy);
  };
  G.resize = resize;
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 250));
  if (window.visualViewport) { visualViewport.addEventListener('resize', resize); visualViewport.addEventListener('scroll', resize); }
  addEventListener('focus', () => setTimeout(resize, 100));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(resize, 100); });
  resize();

  // ---------- Helpers ----------
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.rand = (n) => Math.floor(Math.random() * n);
  G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  G.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  };
  G.inRect = (px, py, x, y, w, h) => px >= x && py >= y && px < x + w && py < y + h;
  G.makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };

  // ---------- Input ----------
  const input = (G.input = { x: -1, y: -1, down: false, pressed: false, released: false, rpressed: false, keys: {}, keyPressed: {}, wheel: 0, downX: 0, downY: 0, moved: false });
  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    input.x = Math.floor(((e.clientX - r.left) / r.width) * G.SW) - G.ox;
    input.y = Math.floor(((e.clientY - r.top) / r.height) * G.SH) - G.oy;
  }
  canvas.addEventListener('pointermove', (e) => { toLocal(e); if (input.down && (Math.abs(input.x - input.downX) > 2 || Math.abs(input.y - input.downY) > 2)) input.moved = true; });
  let touchClear = false;
  canvas.addEventListener('pointerdown', (e) => {
    toLocal(e); G.audio.unlock(); touchClear = false;
    if (e.button === 2) { input.rpressed = true; return; }
    input.down = true; input.pressed = true; input.downX = input.x; input.downY = input.y; input.moved = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  addEventListener('pointerup', (e) => {
    if (e.button === 2) return; toLocal(e); G.audio.unlock(); if (input.down) input.released = true; input.down = false;
    // a finger has no hover: forget the position once this tap has been handled
    if (e.pointerType === 'touch') touchClear = true;
    const z = G.typer.zone;
    if (z && performance.now() - z.t < 250 && G.inRect(input.x, input.y, z.x, z.y, z.w, z.h)) G.typer.open(z.value(), z.set);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // stop the browser's follow-up mouse/click/focus after a tap (it would steal focus from the on-screen keyboard box)
  canvas.addEventListener('touchend', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && !input.down) { input.x = -1; input.y = -1; } });
  addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'typer') return; // on-screen keyboard text box handles its own keys
    G.audio.unlock();
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!input.keys[k]) input.keyPressed[k] = true;
    input.keys[k] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; input.keys[k] = false; });
  G.endInputFrame = () => {
    input.pressed = false; input.released = false; input.rpressed = false; input.keyPressed = {};
    if (touchClear && !input.down) { input.x = -1; input.y = -1; touchClear = false; }
  };
  // ---------- On-screen keyboard (touch devices): a hidden text box that feeds a callback ----------
  G.typer = {
    el: null, zone: null,
    open(value, onChange, max = 10) {
      let el = this.el;
      if (!el) {
        el = this.el = document.createElement('input');
        el.id = 'typer'; el.type = 'text'; el.autocomplete = 'off'; el.spellcheck = false;
        el.setAttribute('autocapitalize', 'characters'); el.setAttribute('autocorrect', 'off');
        el.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0;';
        el.setAttribute('name', 'pcc-player-tag'); el.setAttribute('enterkeyhint', 'done');
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
        el.addEventListener('blur', () => G.freezeView(false));
        document.body.appendChild(el);
      }
      el.maxLength = max; el.value = value || '';
      el.oninput = () => onChange(el.value);
      G.freezeView(true);
      el.focus();
      try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {}
    },
    close() { this.zone = null; if (this.el) { this.el.oninput = null; this.el.blur(); } },
    get active() { return !!this.el && document.activeElement === this.el; }
  };
  G.key = (k) => !!input.keyPressed[k];

  // ---------- Drawing primitives ----------
  G.rect = (x, y, w, h, c) => {
    // on a stretched screen, bars and backdrops that span the stage also fill the extra space beside it
    if (G.ctx === ctx && (G.ox || G.oy)) {
      const fullW = x <= 0 && x + w >= W, fullH = y <= 0 && y + h >= H;
      if (fullW || fullH) {
        if (fullW || x <= 0) { w += x + G.ox; x = -G.ox; }
        if (fullW || x + w >= W) w = W + G.ox - x;
        if (fullH || y <= 0) { h += y + G.oy; y = -G.oy; }
        if (fullH || y + h >= H) h = H + G.oy - y;
      }
    }
    G.ctx.fillStyle = c; G.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  G.outline = (x, y, w, h, c, t = 1) => {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    G.ctx.fillStyle = c;
    G.ctx.fillRect(x, y, w, t); G.ctx.fillRect(x, y + h - t, w, t); G.ctx.fillRect(x, y, t, h); G.ctx.fillRect(x + w - t, y, t, h);
  };
  // 16-bit style bevelled panel
  G.panel = (x, y, w, h, opt = {}) => {
    const fill = opt.fill || G.P.ink, hi = opt.hi || G.P.dusk, lo = opt.lo || G.P.black, border = opt.border || G.P.black;
    x = Math.round(x); y = Math.round(y);
    G.rect(x + 1, y, w - 2, h, border); G.rect(x, y + 1, w, h - 2, border);
    G.rect(x + 1, y + 1, w - 2, h - 2, fill);
    G.rect(x + 2, y + 1, w - 4, 1, hi); G.rect(x + 1, y + 2, 1, h - 4, hi);
    G.rect(x + 2, y + h - 2, w - 4, 1, lo); G.rect(x + w - 2, y + 2, 1, h - 4, lo);
    if (opt.accent) { G.rect(x + 3, y + 3, w - 6, 1, opt.accent); }
  };
  G.alpha = (a, fn) => { const c = G.ctx, prev = c.globalAlpha; c.globalAlpha = prev * a; fn(); c.globalAlpha = prev; };
  // run drawing code against another canvas context (used for rulebook pages)
  G.withCtx = (c, fn) => { const prev = G.ctx; G.ctx = c; try { fn(); } finally { G.ctx = prev; } };

  // ---------- Bitmap text ----------
  const fonts = {};
  for (const name of Object.keys(window.FONT_DATA)) {
    const fd = window.FONT_DATA[name];
    const glyphs = {}; let ax = 0;
    for (const ch of Object.keys(fd.g)) { const [adv, rows] = fd.g[ch]; glyphs[ch] = { adv, rows, ax }; ax += adv + 4; }
    fonts[name] = { h: fd.h, glyphs, atlasW: ax, cache: {} };
  }
  // Silkscreen glyphs have a few empty leading rows; record visual top offset
  function atlas(font, color) {
    if (font.cache[color]) return font.cache[color];
    const [c, x] = G.makeCanvas(font.atlasW, font.h);
    x.fillStyle = color;
    for (const ch in font.glyphs) {
      const g = font.glyphs[ch];
      g.rows.forEach((row, yy) => { for (let xx = 0; xx < g.adv + 4; xx++) if ((row >> xx) & 1) x.fillRect(g.ax + xx, yy, 1, 1); });
    }
    font.cache[color] = c; return c;
  }
  const spacing = { big: 0, small: 0 };
  G.textWidth = (str, f = 'small', s = 1) => {
    const font = fonts[f]; let w = 0; str = String(str);
    for (const ch of str) { const g = font.glyphs[ch] || font.glyphs['?']; w += g.adv + spacing[f]; }
    return w * s;
  };
  G.fontH = (f = 'small') => (f === 'big' ? 7 : 5);
  G.textTop = { big: 0, small: 3 }; // empty rows above cap height
  // draw text; y = top of cap height. align: 'left' | 'center' | 'right'
  G.text = (str, x, y, color = G.P.white, f = 'small', align = 'left', s = 1, shadow = null) => {
    str = String(str);
    const font = fonts[f]; const w = G.textWidth(str, f, s);
    let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
    const cy = Math.round(y - G.textTop[f] * s);
    if (shadow) G.text(str, (align === 'center' ? x : align === 'right' ? x : x) + s, y + s, shadow, f, align, s, null);
    const a = atlas(font, color);
    for (const ch of str) {
      const g = font.glyphs[ch] || font.glyphs['?'];
      G.ctx.drawImage(a, g.ax, 0, g.adv + 1, font.h, cx, cy, (g.adv + 1) * s, font.h * s);
      cx += (g.adv + spacing[f]) * s;
    }
    return w;
  };
  // Word-wrap text into lines that fit width
  G.wrap = (str, maxW, f = 'small') => {
    const words = String(str).split(' '); const lines = []; let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (G.textWidth(t, f) > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };

  // ---------- Audio (chiptune synth, no files needed) ----------
  const audio = (G.audio = { ctx: null });
  audio.unlock = () => {
    if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
    try { audio.ctx = new (window.AudioContext || window.webkitAudioContext)(); audio.master = audio.ctx.createGain(); audio.master.gain.value = 0.22; audio.master.connect(audio.ctx.destination); } catch (_) {}
  };
  function tone(freq, dur, type = 'square', vol = 1, delay = 0, slide = 0) {
    const a = audio.ctx; if (!a || !G.settings.sound) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.5, delay = 0, hp = 1800) {
    const a = audio.ctx; if (!a || !G.settings.sound) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(audio.master); s.start(a.currentTime + delay);
  }
  let lastDeal = 0;
  audio.sfx = (name) => {
    if (!audio.ctx) return;
    switch (name) {
      case 'deal': { const n = performance.now(); if (n - lastDeal < 45) return; lastDeal = n; noise(0.05, 0.35, 0, 2500); break; }
      case 'flip': noise(0.04, 0.3, 0, 4000); tone(900, 0.03, 'triangle', 0.25); break;
      case 'place': noise(0.05, 0.35, 0, 1200); tone(220, 0.05, 'triangle', 0.3); break;
      case 'click': tone(660, 0.04, 'square', 0.25); break;
      case 'hover': tone(1200, 0.015, 'square', 0.08); break;
      case 'chip': tone(1500, 0.03, 'square', 0.2); tone(2100, 0.04, 'square', 0.15, 0.03); break;
      case 'error': tone(160, 0.12, 'square', 0.3, 0, -60); break;
      case 'good': [523, 659, 784].forEach((f, i) => tone(f, 0.09, 'square', 0.3, i * 0.06)); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.3, i * 0.08)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.16, 'triangle', 0.4, i * 0.11)); break;
      case 'book': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.08, 'square', 0.25, i * 0.05)); break;
      case 'fish': tone(300, 0.25, 'sine', 0.4, 0, 500); noise(0.18, 0.15, 0.05, 600); break;
      case 'page': noise(0.18, 0.22, 0, 900); noise(0.1, 0.12, 0.08, 2400); break;
      case 'shuffle': for (let i = 0; i < 10; i++) noise(0.03, 0.25, i * 0.035, 2000 + i * 150); break;
    }
  };

  // ---------- Storage: native file in desktop build, browser storage on the web / phones, memory as a last resort ----------
  const memStore = {};
  let ls = null;
  try { ls = window.localStorage; ls.setItem('pcc_test', '1'); ls.removeItem('pcc_test'); } catch (_) { ls = null; }
  G.store = {
    get(key, def) {
      if (window.cardclubNative) { const v = window.cardclubNative.load(key); return v === undefined || v === null ? def : v; }
      if (ls) { try { const raw = ls.getItem('pcc_' + key); if (raw !== null) { const v = JSON.parse(raw); return v === null ? def : v; } } catch (_) {} return def; }
      return memStore[key] === undefined || memStore[key] === null ? def : memStore[key];
    },
    set(key, val) {
      if (window.cardclubNative) window.cardclubNative.save(key, val);
      else if (ls) { try { ls.setItem('pcc_' + key, JSON.stringify(val)); } catch (_) { memStore[key] = val; } }
      else memStore[key] = val;
    }
  };

  // ---------- Tweened floating text (for payouts, etc.) ----------
  G.floaters = [];
  // rise = how many pixels the text drifts up; keep it inside clear felt so it never crosses a plate or panel
  G.floatText = (str, x, y, color = G.P.gold, f = 'big', rise = 18) => G.floaters.push({ str, x, y, color, f, rise, t: 0 });
  G.drawFloaters = (dt) => {
    for (const fl of G.floaters) {
      fl.t += dt;
      const yy = fl.y - Math.min(fl.rise, fl.t * 30);
      if (fl.t < 1.6 && (fl.t < 1.2 || Math.floor(fl.t * 20) % 2 === 0)) G.text(fl.str, fl.x, yy, fl.color, fl.f, 'center', 1, G.P.ink);
    }
    G.floaters = G.floaters.filter((f) => f.t < 1.6);
  };
})();
