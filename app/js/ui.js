// Pixel Card Club - immediate-mode UI widgets, HUD, overlays, table backgrounds
(function () {
  'use strict';
  const P = G.P, input = G.input;
  const ui = (G.ui = { rects: [], prev: [], lastHover: null, hoverId: null, modal: false });

  ui.begin = () => { ui.shieldPrev = ui.shield; ui.shield = false; ui.modal = false; ui.prev = ui.rects; ui.rects = []; const h = ui.hoverId; ui.hoverId = null; ui._prevHover = h; };
  ui.end = () => { if (!input.down) ui.armed = null; if (ui.hoverId && ui.hoverId !== ui._prevHover) G.audio.sfx('hover'); G.canvas.style.cursor = ui.hoverId || ui.cursorHand ? 'pointer' : 'default'; ui.cursorHand = false; };
  // true if the pointer is over a UI element drawn last frame (cards underneath should ignore it)
  // ---------- table talk (phone held upright) ----------
  // a slim strip with the last two lines; tap it to read the whole conversation over the table
  const talkLines = (log, w) => {
    const out = [];
    for (const l of log) for (const t of G.wrap(l.text.toUpperCase(), w, 'small')) out.push({ t, color: l.color });
    return out;
  };
  ui.talkStrip = (owner, L, log) => {
    const { x, y, w } = L, h = L.h || 30;
    const hover = !ui.modal && !ui.shieldPrev && G.inRect(input.x, input.y, x, y, w, h);
    G.panel(x, y, w, h, { fill: hover ? P.navy : P.ink, hi: P.dusk });
    ui.block(x, y, w, h);
    const box = h > 44;
    G.text(box ? 'TABLE TALK' : 'TALK', x + 5, y + 5, P.gold, 'small');
    G.text(box ? 'TAP FOR MORE' : 'MORE', x + w - 6, box ? y + 5 : y + h - 10, P.slate, 'small', 'right');
    if (!box) { G.rect(x + w - 15, y + 5, 7, 1, P.slate); G.rect(x + w - 14, y + 6, 5, 1, P.slate); G.rect(x + w - 13, y + 7, 3, 1, P.slate); G.rect(x + w - 12, y + 8, 1, 1, P.slate); }
    if (box) {
      // a taller box beside the table: the latest lines under a header
      const rows = Math.max(1, Math.floor((h - 20) / 9));
      talkLines(log, w - 12).slice(-rows).forEach((l, i) => G.text(l.t, x + 6, y + 17 + i * 9, l.color, 'small'));
    } else {
      const rows = Math.max(1, Math.floor((h - 8) / 10));
      talkLines(log, w - 64).slice(-rows).forEach((l, i) => G.text(l.t, x + 30, y + 5 + i * 10, l.color, 'small'));
    }
    if (hover) { ui.hoverId = 'talk'; ui.cursorHand = true; }
    if (hover && input.pressed) { input.pressed = false; owner._logOpen = true; G.audio.sfx('click'); }
  };
  // full-screen conversation, drawn last so it sits over the table; any tap closes it
  ui.talkOverlay = (owner, log) => {
    if (owner._logOpen && (owner.over || owner.setup || owner.paused)) owner._logOpen = false;
    if (!owner._logOpen) return false;
    if (!G.portrait) { owner._logOpen = false; return false; }
    ui.shield = true;
    const top = ui.TOP ? ui.TOP() : 33;
    G.alpha(0.6, () => G.rect(-G.ox, 0, G.W + G.ox * 2, G.H, P.ink));
    ui.block(-G.ox, 0, G.W + G.ox * 2, G.H);
    const x = 8, y = top + 6, w = G.W - 16, h = G.H - y - 8;
    G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
    G.text('TABLE TALK', x + 8, y + 8, P.gold, 'big');
    const rows = Math.floor((h - 50) / 10);
    talkLines(log, w - 16).slice(-rows).forEach((l, i) => G.text(l.t, x + 8, y + 26 + i * 10, l.color, 'small'));
    G.text('TAP ANYWHERE TO CLOSE', G.W / 2, y + h - 14, P.silver, 'small', 'center');
    if (input.pressed || G.key('Escape')) { input.pressed = false; delete input.keyPressed.Escape; owner._logOpen = false; ui.armed = null; }
    return true;
  };
  ui.blocked = () => ui.prev.some((r) => G.inRect(input.x, input.y, r[0], r[1], r[2], r[3]));
  ui.block = (x, y, w, h) => ui.rects.push([x, y, w, h]);

  const THEMES = {
    gold: { face: '#e8a33a', hi: P.gold, lo: '#a0581e', text: P.ink },
    green: { face: P.green, hi: P.lime, lo: P.teal, text: P.ink },
    red: { face: P.red, hi: P.orange, lo: '#6e1f3a', text: P.white },
    blue: { face: P.blue, hi: P.sky, lo: P.navy, text: P.white },
    dark: { face: P.dusk, hi: P.slate, lo: P.ink, text: P.white },
    light: { face: P.silver, hi: P.white, lo: P.slate, text: P.ink }
  };
  ui.THEMES = THEMES;

  // Returns true when clicked (or hotkey pressed). opt: {key, keyLabel, enabled, theme, font, selected}
  ui.button = (label, x, y, w, h, opt = {}) => {
    const enabled = opt.enabled !== false;
    const th = THEMES[opt.theme || 'gold'];
    const id = opt.id || label + '@' + x + ',' + y;
    ui.rects.push([x, y, w, h]);
    const hover = enabled && !(ui.modal && !opt.modal) && !(ui.shieldPrev && !opt.shield) && G.inRect(input.x, input.y, x, y, w, h);
    if (hover) ui.hoverId = id;
    const pressedNow = hover && input.down && (!G.touch || ui.armed === id);
    const sel = opt.selected;
    // body
    const face = !enabled ? P.dusk : sel ? th.hi : hover ? th.hi : th.face;
    const dy = pressedNow ? 1 : 0;
    G.rect(x + 1, y + 1, w - 2, h, P.black); // shadow / outline bottom
    G.rect(x + 1, y + dy, w - 2, h - 1, P.black); G.rect(x, y + 1 + dy, w, h - 3, P.black);
    G.rect(x + 1, y + 1 + dy, w - 2, h - 3, face);
    if (enabled) {
      G.rect(x + 2, y + 1 + dy, w - 4, 1, hover || sel ? P.white : th.hi);
      G.rect(x + 2, y + h - 3 + dy, w - 4, 1, th.lo);
    }
    const f = opt.font || (h >= 18 ? 'big' : 'small');
    const tcol = !enabled ? P.slate : th.text;
    const keyLbl = opt.keyLabel || (opt.key ? String(opt.key).toUpperCase() : null);
    const th2 = G.fontH(f);
    let ty = y + Math.floor((h - 2 - th2) / 2) + dy + (f === 'small' ? 1 : 0);
    if (keyLbl && opt.showKey !== false && !G.touch && w >= G.textWidth(label, f) + G.textWidth(keyLbl, 'small') + 14) {
      G.text(label, x + w / 2 - 4, ty, tcol, f, 'center');
      G.text(keyLbl, x + w - 4, y + h - 9 + dy, !enabled ? P.slate : th.lo, 'small', 'right');
    } else G.text(label, x + w / 2, ty, tcol, f, 'center');
    // touch: a button arms when your finger lands on it and fires when you lift it still on the button,
    // so brushing past or sliding off a button never triggers it
    let clicked;
    if (G.touch) {
      if (hover && input.pressed) { ui.armed = id; input.pressed = false; }
      const slop = 6;
      clicked = enabled && ui.armed === id && input.released && !(ui.modal && !opt.modal) && G.inRect(input.x, input.y, x - slop, y - slop, w + slop * 2, h + slop * 2);
      if (clicked) ui.armed = null;
    } else clicked = hover && input.pressed;
    if (enabled && opt.key && !ui.modalBlocksKeys(opt) && [].concat(opt.key).some((k) => G.key(k))) { clicked = true; [].concat(opt.key).forEach((k) => delete input.keyPressed[k]); }
    if (clicked && enabled) { G.audio.sfx('click'); input.pressed = false; return true; }
    return false;
  };
  ui.modalBlocksKeys = (opt) => ui.modal && !opt.modal;

  // Small toggle/select group; returns new index
  ui.choice = (labels, idx, x, y, w, h, opt = {}) => {
    const n = labels.length, bw = Math.floor((w - (n - 1) * 3) / n);
    let out = idx;
    labels.forEach((l, i) => {
      if (ui.button(l, x + i * (bw + 3), y, bw, h, { theme: i === idx ? 'gold' : 'dark', selected: i === idx, modal: opt.modal, font: opt.font, id: (opt.id || 'ch') + l + i })) out = i;
    });
    return out;
  };

  // ---------- Felt background (pre-rendered, dithered) ----------
  let felt = null;
  // ---------- Table colours (Customize menu): five felt tones, darkest to lightest ----------
  G.TABLES = [
    { name: 'GREEN', f: ['#173f2b', '#1d4d34', '#235c3e', '#2c6e4a', '#3a8259'] },
    { name: 'BLUE', f: ['#14284a', '#19325a', '#1f3d6d', '#284c84', '#3a62a0'] },
    { name: 'RED', f: ['#4a1418', '#5a1a1f', '#6d2027', '#832a32', '#a03e46'] },
    { name: 'BROWN', f: ['#3a2616', '#47301c', '#573a22', '#6a482b', '#86603e'] },
    { name: 'ORANGE', f: ['#5a2a0c', '#6e3410', '#853f14', '#9c4e1c', '#bb6a32'] },
    { name: 'PINK', f: ['#5a1e3e', '#6c244b', '#822b5a', '#99366c', '#b84f88'] },
    { name: 'PURPLE', f: ['#2e1a4a', '#38205a', '#43276d', '#523184', '#6a46a6'] },
    { name: 'TEAL', f: ['#0f3a3e', '#13474c', '#18575c', '#1f696f', '#2e878d'] },
    { name: 'CHARCOAL', f: ['#15161c', '#1b1c24', '#22232d', '#2c2e3a', '#444858'] }
  ];
  G.applyTable = (i) => {
    const t = (G.settings.surface === 3) ? { f: ['#24160c', '#3a2414', '#4a2e1a', '#7a5434', '#c8a070'] } : G.TABLES[i] || G.TABLES[0];
    t.f.forEach((c, k) => (P['felt' + k] = c));
    felt = null;
  };
  // table surfaces (Customize > Table)
  G.SURFACES = ['FELT', 'PATTERN', 'WOOD RAIL', 'WOOD', 'CASINO'];
  G.applySurface = () => { G.applyTable(G.settings.table || 0); };
  const WOOD = ['#2e1c10', '#4a2e1a', '#5e3b22', '#74492a', '#8c5a34', '#a86f42'];
  function lattice(x, FW, FH) {
    // a subtle diamond weave printed in the felt
    for (let yy = 0; yy < FH; yy++) for (let xx = 0; xx < FW; xx++) {
      const u = (xx + yy) % 16, v = (xx - yy + 4096) % 16;
      if (u === 0 || v === 0) { x.fillStyle = P.felt1; x.fillRect(xx, yy, 1, 1); }
      else if (u === 8 && v === 8) { x.fillStyle = P.felt3; x.fillRect(xx, yy, 1, 1); }
    }
  }
  function woodPlanks(x, FW, FH) {
    const PH = 18;
    for (let py = 0; py * PH < FH; py++) {
      const y0 = py * PH, off = (py * 97) % 160;
      x.fillStyle = WOOD[2 + (py % 2)]; x.fillRect(0, y0, FW, PH);
      // grain lines
      for (let g = 0; g < 5; g++) {
        const gy = y0 + 2 + ((g * 7 + py * 3) % (PH - 4));
        x.fillStyle = g % 2 ? WOOD[1] : WOOD[4];
        for (let xx = 0; xx < FW; xx++) if (((xx + g * 31 + py * 13) % 23) < 17) x.fillRect(xx, gy + (Math.sin((xx + off) / 19 + g) > 0.7 ? 1 : 0), 1, 1);
      }
      // knots
      for (let k = 0; k < Math.ceil(FW / 260); k++) {
        if ((py * 7 + k * 3) % 4) continue;
        const kx = (off + k * 260 + py * 41) % FW, ky = y0 + PH / 2;
        x.fillStyle = WOOD[1]; x.fillRect(kx - 3, ky - 1, 6, 3); x.fillRect(kx - 2, ky - 2, 4, 5);
        x.fillStyle = WOOD[0]; x.fillRect(kx - 1, ky, 2, 1);
      }
      // plank seams and butt joints
      x.fillStyle = WOOD[0]; x.fillRect(0, y0, FW, 1);
      x.fillStyle = WOOD[5]; x.fillRect(0, y0 + 1, FW, 1);
      for (let j = off; j < FW; j += 160) { x.fillStyle = WOOD[0]; x.fillRect(j, y0, 1, PH); x.fillStyle = WOOD[4]; x.fillRect(j + 1, y0 + 1, 1, PH - 1); }
    }
  }
  function rail(x, FW, FH, T, gold) {
    // a bevelled wooden rail around the edge of the table
    const band = (i, c) => { x.fillStyle = c; x.fillRect(i, i, FW - i * 2, 1); x.fillRect(i, FH - 1 - i, FW - i * 2, 1); x.fillRect(i, i, 1, FH - i * 2); x.fillRect(FW - 1 - i, i, 1, FH - i * 2); };
    const shades = [WOOD[0], WOOD[3], WOOD[5], WOOD[4], WOOD[4], WOOD[3], WOOD[3], WOOD[2], WOOD[2], WOOD[1], WOOD[1], WOOD[0]];
    for (let i = 0; i < T; i++) band(i, shades[Math.min(shades.length - 1, Math.round(i * (shades.length - 1) / (T - 1)))]);
    // grain flecks on the rail
    for (let n = 0; n < (FW + FH) * 2; n++) {
      const t = G.rand(T - 3) + 1, side = G.rand(4);
      const px = side < 2 ? G.rand(FW) : side === 2 ? t : FW - 1 - t, py = side >= 2 ? G.rand(FH) : side === 0 ? t : FH - 1 - t;
      x.fillStyle = Math.random() < 0.5 ? WOOD[1] : WOOD[4]; x.fillRect(px, py, 2, 1);
    }
    // shadow cast on the felt
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(T, T, FW - T * 2, 2); x.fillRect(T, T, 2, FH - T * 2);
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(T, FH - T - 1, FW - T * 2, 1); x.fillRect(FW - T - 1, T, 1, FH - T * 2);
    if (gold) {
      x.fillStyle = P.gold;
      const g = T + 7;
      x.fillRect(g, g, FW - g * 2, 1); x.fillRect(g, FH - g - 1, FW - g * 2, 1); x.fillRect(g, g, 1, FH - g * 2); x.fillRect(FW - g - 1, g, 1, FH - g * 2);
      x.fillStyle = '#c98a2e';
      const h = g + 3;
      x.fillRect(h, h, FW - h * 2, 1); x.fillRect(h, FH - h - 1, FW - h * 2, 1); x.fillRect(h, h, 1, FH - h * 2); x.fillRect(FW - h - 1, h, 1, FH - h * 2);
    }
  }
  let feltKey = '';
  // the felt covers the whole screen (G.SW x G.SH); it is drawn at (-G.ox, -G.oy)
  ui.feltCanvas = () => {
    if (!felt || feltKey !== G.sizeKey) {
      feltKey = G.sizeKey;
      const FW = G.SW, FH = G.SH, surf = G.settings.surface || 0;
      const [c, x] = G.makeCanvas(FW, FH);
      if (surf === 3) {
        woodPlanks(x, FW, FH);
        // darken the edges a little so the middle of the table stands out
        const cx = FW / 2, cy = FH / 2;
        x.fillStyle = 'rgba(20,10,4,0.28)';
        for (let yy = 0; yy < FH; yy++) for (let xx = 0; xx < FW; xx++) {
          const d = Math.hypot((xx - cx) / (FW * 0.62), (yy - cy) / (FH * 0.66));
          const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(yy % 4) * 4 + (xx % 4)] / 16;
          if (d > 0.7 && (d - 0.7) * 3 > bayer) x.fillRect(xx, yy, 1, 1);
        }
        felt = c; return felt;
      }
      x.fillStyle = P.felt2; x.fillRect(0, 0, FW, FH);
      // sparse noise
      for (let i = 0; i < Math.round(2600 * FW * FH / (G.W * G.H)); i++) { x.fillStyle = Math.random() < 0.5 ? P.felt1 : P.felt3; x.fillRect(G.rand(FW), G.rand(FH), 1, 1); }
      // dithered vignette rings
      const cx = FW / 2, cy = FH / 2;
      for (let yy = 0; yy < FH; yy++) for (let xx = 0; xx < FW; xx++) {
        const d = Math.hypot((xx - cx) / (FW * 0.62), (yy - cy) / (FH * 0.66));
        const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(yy % 4) * 4 + (xx % 4)] / 16;
        if (d > 0.62 && (d - 0.62) * 4 > bayer) { x.fillStyle = P.felt1; x.fillRect(xx, yy, 1, 1); }
        if (d > 0.85 && (d - 0.85) * 4 > bayer) { x.fillStyle = P.felt0; x.fillRect(xx, yy, 1, 1); }
      }
      if (surf >= 1) lattice(x, FW, FH);
      if (surf === 2) rail(x, FW, FH, 9, false);
      if (surf === 4) rail(x, FW, FH, 9, true);
      felt = c;
    }
    return felt;
  };
  ui.felt = () => G.ctx.drawImage(ui.feltCanvas(), -G.ox, -G.oy);

  // ---------- HUD top bar ----------
  // stats: [{label, value, color}]
  // portrait: two rows (menu + title, then the stats spread across the screen), 33 px tall
  ui.TOP = () => (G.portrait ? 33 : 21);
  ui.topBar = (title, stats = []) => {
    const P2 = G.portrait, bh = P2 ? 32 : 20;
    G.rect(0, 0, G.W, bh, P.ink); G.rect(0, bh, G.W, 1, P.black); G.rect(0, bh - 1, G.W, 1, P.dusk);
    ui.block(0, 0, G.W, bh + 1);
    const menu = P2 ? ui.button('MENU', 4, 3, 58, 26, { key: 'Escape', theme: 'dark', showKey: false, id: 'topmenu' })
      : ui.button('MENU', 3, 2, 46, 15, { key: 'Escape', keyLabel: 'ESC', theme: 'dark', font: 'small', showKey: false });
    G.text(title, P2 ? 70 : 57, P2 ? 5 : 6, P.gold, 'big');
    if (P2) {
      // the stats share the second row, spread evenly across it
      const widthOf = (s) => G.textWidth(s.label, 'small') + 4 + G.textWidth(String(s.value), 'big');
      const rest = stats;
      if (rest.length) {
        const L = 70, R = G.W - 6, total = rest.reduce((a, s) => a + widthOf(s), 0), gap = Math.max(6, Math.min(20, (R - L - total) / Math.max(1, rest.length - 1)));
        let x = L;
        for (const s of rest) {
          G.text(s.label, x, 22, P.silver, 'small'); x += G.textWidth(s.label, 'small') + 4;
          G.text(String(s.value), x, 20, s.color || P.white, 'big'); x += G.textWidth(String(s.value), 'big') + gap;
        }
      }
      return menu;
    }
    let rx = G.W - 6;
    for (let i = stats.length - 1; i >= 0; i--) {
      const s = stats[i];
      const vw = G.textWidth(String(s.value), 'big');
      G.text(String(s.value), rx, 6, s.color || P.white, 'big', 'right');
      rx -= vw + 4;
      G.text(s.label, rx, 8, P.silver, 'small', 'right');
      rx -= G.textWidth(s.label, 'small') + 12;
    }
    return menu;
  };

  // ---------- Message banner ----------
  ui.banner = (str, y, color = P.white, bg = P.ink) => {
    const w = G.textWidth(str, 'big') + 20;
    if (w > G.W - 8 && G.portrait) { // too wide for a phone held upright: shrink to the small font
      const ws = G.textWidth(str, 'small') + 16, xs = Math.round(G.W / 2 - ws / 2);
      G.panel(xs, y, ws, 17, { fill: bg, hi: P.dusk }); G.text(str, G.W / 2, y + 6, color, 'small', 'center'); return;
    }
    const x = Math.round(G.W / 2 - w / 2);
    G.panel(x, y, w, 17, { fill: bg, hi: P.dusk });
    G.text(str, G.W / 2, y + 5, color, 'big', 'center');
  };
  // name/score tag (small)
  ui.tag = (str, x, y, color = P.white, bg = P.ink, align = 'center') => {
    const w = G.textWidth(str, 'small') + 8;
    const bx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
    G.rect(bx + 1, y, w - 2, 11, P.black); G.rect(bx, y + 1, w, 9, P.black);
    G.rect(bx + 1, y + 1, w - 2, 9, bg);
    G.text(str, bx + w / 2, y + 3, color, 'small', 'center');
    return w;
  };
  // speech bubble with tail pointing down/up
  ui.bubble = (str, x, y, up = false) => {
    const w = G.textWidth(str, 'small') + 10, h = 13;
    const bx = Math.round(G.clamp(x - w / 2, 2, G.W - w - 2));
    G.rect(bx + 1, y, w - 2, h, P.ink); G.rect(bx, y + 1, w, h - 2, P.ink);
    G.rect(bx + 1, y + 1, w - 2, h - 2, P.white);
    if (up) { G.rect(x - 2, y - 2, 4, 2, P.ink); G.rect(x - 1, y - 1, 2, 2, P.white); }
    else { G.rect(x - 3, y + h - 1, 6, 2, P.white); G.rect(x - 1, y + h + 1, 2, 2, P.white); G.rect(x - 4, y + h - 1, 1, 2, P.ink); G.rect(x + 3, y + h - 1, 1, 2, P.ink); G.rect(x - 2, y + h + 1, 1, 2, P.ink); G.rect(x + 1, y + h + 1, 1, 2, P.ink); G.rect(x - 1, y + h + 3, 2, 1, P.ink); }
    G.text(str, bx + w / 2, y + 4, P.ink, 'small', 'center');
  };

  // ---------- Pause / rules overlay shared by games ----------
  // Returns action string or null. state: {rules:[lines], page}
  ui.pauseMenu = (scene) => {
    ui.modal = true;
    G.alpha(0.7, () => G.rect(0, 0, G.W, G.H, P.ink));
    ui.block(0, 0, G.W, G.H);
    if (scene._showRules) return ui.rulesPanel(scene);
    const PT = G.portrait, bh = PT ? 38 : 20, pitch = PT ? 48 : 24;
    const w = PT ? 260 : 200, h = PT ? 36 + pitch * 4 + 6 : 150, x = G.W / 2 - w / 2, y = PT ? Math.round(G.H / 2 - h / 2) : 90;
    G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
    G.text('PAUSED', G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
    let act = null;
    const by = y + (PT ? 34 : 30);
    if (ui.button('RESUME', x + 20, by, w - 40, bh, { key: 'Escape', modal: true, theme: 'green', showKey: false })) act = 'resume';
    if (ui.button('HOW TO PLAY', x + 20, by + pitch, w - 40, bh, { modal: true, theme: 'blue' })) { if (G.Rulebook) G.Rulebook.open(scene.bookChapter, scene); else scene._showRules = true; }
    if (ui.button('NEW GAME', x + 20, by + pitch * 2, w - 40, bh, { modal: true, theme: 'gold' })) act = 'restart';
    if (ui.button('MAIN MENU', x + 20, by + pitch * 3, w - 40, bh, { modal: true, theme: 'red' })) act = 'menu';
    return act;
  };
  ui.rulesPanel = (scene) => {
    const w = Math.min(440, G.W - 16), h = G.portrait ? 440 : 290, x = G.W / 2 - w / 2, y = G.portrait ? Math.round(G.H / 2 - 220) : 40;
    G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
    G.text('HOW TO PLAY ' + scene.title, G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
    let yy = y + 32;
    for (const para of scene.rules) {
      const head = para.startsWith('#');
      const lines = G.wrap(head ? para.slice(1) : para, w - 36, 'small');
      for (const l of lines) { G.text(l, x + 18 + (head ? 0 : 6), yy, head ? P.cyan : P.white, 'small'); yy += 9; }
      yy += head ? 1 : 4;
    }
    if (ui.button('BACK', G.W / 2 - (G.portrait ? 60 : 40), y + h - (G.portrait ? 40 : 26), G.portrait ? 120 : 80, G.portrait ? 32 : 18, { key: ['Escape', 'Enter'], modal: true, theme: 'gold', showKey: false })) scene._showRules = false;
    return null;
  };

  // Results dialog: lines [{text,color}], buttons [{label, act, theme, key}]
  ui.dialog = (title, lines, buttons, opt = {}) => {
    ui.modal = true;
    G.alpha(opt.dim === undefined ? 0.55 : opt.dim, () => G.rect(0, 0, G.W, G.H, P.ink));
    ui.block(0, 0, G.W, G.H);
    const PT = G.portrait, w = Math.min(G.W - 12, opt.w || 260);
    // portrait: long lines wrap instead of running off the panel
    const rows = [];
    lines.forEach((l) => { const f = l.font || 'small'; const parts = PT ? G.wrap(String(l.text), w - 20, f) : [l.text]; parts.forEach((t) => rows.push({ ...l, text: t })); });
    const bh = PT ? 34 : 20, gap = PT ? 8 : 6;
    const h = 54 + rows.length * 12 + (PT ? 40 : 26), x = Math.round(G.W / 2 - w / 2), y = Math.round(opt.y || (G.H / 2 - h / 2));
    G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: opt.accent || P.gold });
    G.text(title, G.W / 2, y + 13, opt.titleColor || P.gold, 'big', 'center', 1, P.black);
    rows.forEach((l, i) => G.text(l.text, G.W / 2, y + 34 + i * 12, l.color || P.white, l.font || 'small', 'center'));
    let act = null;
    const bw = Math.min(PT ? 160 : 110, Math.floor((w - 20 - (buttons.length - 1) * gap) / buttons.length));
    const total = buttons.length * bw + (buttons.length - 1) * gap;
    buttons.forEach((b, i) => {
      if (ui.button(b.label, G.W / 2 - total / 2 + i * (bw + gap), y + h - bh - 8, bw, bh, { modal: true, theme: b.theme || 'gold', key: b.key, showKey: false })) act = b.act;
    });
    return act;
  };
})();
