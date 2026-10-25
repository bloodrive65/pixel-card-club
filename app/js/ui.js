// Pixel Card Club - immediate-mode UI widgets, HUD, overlays, table backgrounds
(function () {
  'use strict';
  const P = G.P, input = G.input;
  const ui = (G.ui = { rects: [], prev: [], lastHover: null, hoverId: null, modal: false });

  ui.begin = () => { ui.modal = false; ui.prev = ui.rects; ui.rects = []; const h = ui.hoverId; ui.hoverId = null; ui._prevHover = h; };
  ui.end = () => { if (ui.hoverId && ui.hoverId !== ui._prevHover) G.audio.sfx('hover'); G.canvas.style.cursor = ui.hoverId || ui.cursorHand ? 'pointer' : 'default'; ui.cursorHand = false; };
  // true if the pointer is over a UI element drawn last frame (cards underneath should ignore it)
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
    const hover = enabled && !(ui.modal && !opt.modal) && G.inRect(input.x, input.y, x, y, w, h);
    if (hover) ui.hoverId = id;
    const pressedNow = hover && input.down;
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
    if (keyLbl && opt.showKey !== false && w >= G.textWidth(label, f) + G.textWidth(keyLbl, 'small') + 14) {
      G.text(label, x + w / 2 - 4, ty, tcol, f, 'center');
      G.text(keyLbl, x + w - 4, y + h - 9 + dy, !enabled ? P.slate : th.lo, 'small', 'right');
    } else G.text(label, x + w / 2, ty, tcol, f, 'center');
    let clicked = hover && input.pressed;
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
    const t = G.TABLES[i] || G.TABLES[0];
    t.f.forEach((c, k) => (P['felt' + k] = c));
    felt = null;
  };
  ui.feltCanvas = () => {
    if (!felt) {
      const [c, x] = G.makeCanvas(G.W, G.H);
      x.fillStyle = P.felt2; x.fillRect(0, 0, G.W, G.H);
      // sparse noise
      for (let i = 0; i < 2600; i++) { x.fillStyle = Math.random() < 0.5 ? P.felt1 : P.felt3; x.fillRect(G.rand(G.W), G.rand(G.H), 1, 1); }
      // dithered vignette rings
      const cx = G.W / 2, cy = G.H / 2;
      for (let yy = 0; yy < G.H; yy++) for (let xx = 0; xx < G.W; xx++) {
        const d = Math.hypot((xx - cx) / (G.W * 0.62), (yy - cy) / (G.H * 0.66));
        const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(yy % 4) * 4 + (xx % 4)] / 16;
        if (d > 0.62 && (d - 0.62) * 4 > bayer) { x.fillStyle = P.felt1; x.fillRect(xx, yy, 1, 1); }
        if (d > 0.85 && (d - 0.85) * 4 > bayer) { x.fillStyle = P.felt0; x.fillRect(xx, yy, 1, 1); }
      }
      felt = c;
    }
    return felt;
  };
  ui.felt = () => G.ctx.drawImage(ui.feltCanvas(), 0, 0);

  // ---------- HUD top bar ----------
  // stats: [{label, value, color}]
  ui.topBar = (title, stats = []) => {
    G.rect(0, 0, G.W, 20, P.ink); G.rect(0, 20, G.W, 1, P.black); G.rect(0, 19, G.W, 1, P.dusk);
    ui.block(0, 0, G.W, 21);
    const menu = ui.button('MENU', 3, 2, 46, 15, { key: 'Escape', keyLabel: 'ESC', theme: 'dark', font: 'small', showKey: false });
    G.text(title, 57, 6, P.gold, 'big');
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
    const w = 200, h = 150, x = G.W / 2 - w / 2, y = 90;
    G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
    G.text('PAUSED', G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
    let act = null;
    if (ui.button('RESUME', x + 20, y + 30, w - 40, 20, { key: 'Escape', modal: true, theme: 'green', showKey: false })) act = 'resume';
    if (ui.button('HOW TO PLAY', x + 20, y + 54, w - 40, 20, { modal: true, theme: 'blue' })) { if (G.Rulebook) G.Rulebook.open(scene.bookChapter, scene); else scene._showRules = true; }
    if (ui.button('NEW GAME', x + 20, y + 78, w - 40, 20, { modal: true, theme: 'gold' })) act = 'restart';
    if (ui.button('MAIN MENU', x + 20, y + 102, w - 40, 20, { modal: true, theme: 'red' })) act = 'menu';
    return act;
  };
  ui.rulesPanel = (scene) => {
    const w = 440, h = 290, x = G.W / 2 - w / 2, y = 40;
    G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
    G.text('HOW TO PLAY ' + scene.title, G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
    let yy = y + 32;
    for (const para of scene.rules) {
      const head = para.startsWith('#');
      const lines = G.wrap(head ? para.slice(1) : para, w - 36, 'small');
      for (const l of lines) { G.text(l, x + 18 + (head ? 0 : 6), yy, head ? P.cyan : P.white, 'small'); yy += 9; }
      yy += head ? 1 : 4;
    }
    if (ui.button('BACK', G.W / 2 - 40, y + h - 26, 80, 18, { key: ['Escape', 'Enter'], modal: true, theme: 'gold', showKey: false })) scene._showRules = false;
    return null;
  };

  // Results dialog: lines [{text,color}], buttons [{label, act, theme, key}]
  ui.dialog = (title, lines, buttons, opt = {}) => {
    ui.modal = true;
    G.alpha(opt.dim === undefined ? 0.55 : opt.dim, () => G.rect(0, 0, G.W, G.H, P.ink));
    ui.block(0, 0, G.W, G.H);
    const w = opt.w || 260, h = 54 + lines.length * 12 + 26, x = Math.round(G.W / 2 - w / 2), y = Math.round(opt.y || (G.H / 2 - h / 2));
    G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: opt.accent || P.gold });
    G.text(title, G.W / 2, y + 13, opt.titleColor || P.gold, 'big', 'center', 1, P.black);
    lines.forEach((l, i) => G.text(l.text, G.W / 2, y + 34 + i * 12, l.color || P.white, l.font || 'small', 'center'));
    let act = null;
    const bw = Math.min(110, Math.floor((w - 20 - (buttons.length - 1) * 6) / buttons.length));
    const total = buttons.length * bw + (buttons.length - 1) * 6;
    buttons.forEach((b, i) => {
      if (ui.button(b.label, G.W / 2 - total / 2 + i * (bw + 6), y + h - 28, bw, 20, { modal: true, theme: b.theme || 'gold', key: b.key, showKey: false })) act = b.act;
    });
    return act;
  };
})();
