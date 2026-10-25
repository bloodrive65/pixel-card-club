// Pixel Card Club - card model, procedural 16-bit card art, animated card sprites
(function () {
  'use strict';
  const P = G.P;
  const CW = (G.CW = 44), CH = (G.CH = 62);
  const SUITS = (G.SUITS = ['S', 'H', 'D', 'C']);
  G.SUIT_NAMES = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
  G.RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  G.RANK_NAME = ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'];
  G.RANK_PLURAL = ['', 'Aces', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings'];
  G.isRed = (suit) => suit === 1 || suit === 2;

  // ---------- Suit bitmaps ----------
  const BIG = {
    S: ['...#...', '..###..', '.#####.', '#######', '#######', '.#.#.#.', '..###..'],
    H: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
    D: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
    C: ['..###..', '..###..', '##.#.##', '#######', '##.#.##', '...#...', '..###..']
  };
  const SMALL = {
    S: ['..#..', '.###.', '#####', '#.#.#', '..#..'],
    H: ['.#.#.', '#####', '#####', '.###.', '..#..'],
    D: ['..#..', '.###.', '#####', '.###.', '..#..'],
    C: ['.###.', '.###.', '#####', '#.#.#', '..#..']
  };
  function blit(x, bmp, px, py, color, scale = 1, flip = false) {
    x.fillStyle = color;
    const h = bmp.length;
    for (let r = 0; r < h; r++) {
      const row = bmp[flip ? h - 1 - r : r];
      for (let c = 0; c < row.length; c++) if (row[c] === '#') x.fillRect(px + c * scale, py + r * scale, scale, scale);
    }
  }
  G.drawSuit = (suitIdx, px, py, size = 'small', color) => {
    const s = SUITS[suitIdx];
    blit(G.ctx, size === 'small' ? SMALL[s] : BIG[s], Math.round(px), Math.round(py), color || (G.isRed(suitIdx) ? P.red : P.ink));
  };

  // Rounded card silhouette
  function cardBase(x, fill, edge, line) {
    x.fillStyle = line || P.ink;
    x.fillRect(2, 0, CW - 4, CH); x.fillRect(0, 2, CW, CH - 4); x.fillRect(1, 1, CW - 2, CH - 2);
    x.fillStyle = fill;
    x.fillRect(2, 1, CW - 4, CH - 2); x.fillRect(1, 2, CW - 2, CH - 4);
    if (edge) { x.fillStyle = edge; x.fillRect(2, CH - 2, CW - 4, 1); x.fillRect(CW - 2, 2, 1, CH - 4); }
  }

  // Pip layouts in normalised (col 0..1, row 0..1)
  const PIPS = {
    2: [[.5, 0], [.5, 1]],
    3: [[.5, 0], [.5, .5], [.5, 1]],
    4: [[0, 0], [1, 0], [0, 1], [1, 1]],
    5: [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]],
    6: [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]],
    7: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]],
    8: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]],
    9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [.5, .5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
    10: [[0, 0], [1, 0], [.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [.5, 5 / 6], [0, 1], [1, 1]]
  };

  function drawCorner(x, suit, rank, color) {
    const lbl = G.RANK_LABEL[rank];
    drawTextOn(x, lbl, 3, 3, color);
    blit(x, SMALL[SUITS[suit]], 3, 12, color);
  }
  // draw big-font text onto an offscreen card canvas
  function drawTextOn(x, str, px, py, color) {
    const w = G.textWidth(str, 'big') + 2;
    const [c, cx] = G.makeCanvas(w, 10);
    const fd = window.FONT_DATA.big;
    let ox = 0;
    cx.fillStyle = color;
    for (const ch of str) {
      const [adv, rows] = fd.g[ch];
      rows.forEach((row, yy) => { for (let xx = 0; xx < adv + 2; xx++) if ((row >> xx) & 1) cx.fillRect(ox + xx, yy, 1, 1); });
      ox += adv;
    }
    // squeeze "10" so it fits nicely
    if (str === '10') {
      x.drawImage(c, 0, 0, 8, 8, px - 1, py, 8, 8);
      x.drawImage(c, 8, 0, 8, 8, px + 5, py, 8, 8);
    } else x.drawImage(c, px, py);
  }

  // Face-card portrait (J / Q / K)
  function drawCourt(x, suit, rank) {
    const red = G.isRed(suit);
    const robe = [P.blue, P.red, P.plum, P.teal][suit];
    const trim = P.gold;
    // frame
    x.fillStyle = red ? P.red : P.ink; x.fillRect(11, 8, 22, 46);
    x.fillStyle = '#e8dcc0'; x.fillRect(12, 9, 20, 44);
    const cx = 22;
    // headwear
    x.fillStyle = trim;
    if (rank === 13) { // crown
      x.fillRect(cx - 6, 15, 12, 4); x.fillRect(cx - 6, 12, 2, 3); x.fillRect(cx - 1, 11, 2, 4); x.fillRect(cx + 4, 12, 2, 3);
      x.fillStyle = P.red; x.fillRect(cx - 1, 16, 2, 2);
    } else if (rank === 12) { // tiara + hair
      x.fillStyle = red ? P.orange : P.wood2; x.fillRect(cx - 7, 15, 14, 15);
      x.fillStyle = trim; x.fillRect(cx - 5, 14, 10, 2); x.fillRect(cx - 1, 12, 2, 2);
      x.fillStyle = P.cyan; x.fillRect(cx - 1, 14, 2, 1);
    } else { // jack hat with feather
      x.fillStyle = robe; x.fillRect(cx - 7, 15, 14, 4); x.fillRect(cx - 5, 13, 10, 2);
      x.fillStyle = trim; x.fillRect(cx - 7, 18, 14, 1);
      x.fillStyle = P.lime; x.fillRect(cx + 4, 10, 2, 5); x.fillRect(cx + 6, 9, 1, 3);
    }
    // face
    x.fillStyle = '#f2c79a'; x.fillRect(cx - 5, 19, 10, 9);
    x.fillStyle = P.ink; x.fillRect(cx - 3, 22, 2, 2); x.fillRect(cx + 1, 22, 2, 2);
    x.fillStyle = '#d0866a'; x.fillRect(cx - 2, 26, 4, 1);
    if (rank === 13) { // beard
      x.fillStyle = P.silver; x.fillRect(cx - 5, 26, 10, 4); x.fillRect(cx - 3, 30, 6, 2);
      x.fillStyle = '#d0866a'; x.fillRect(cx - 2, 26, 4, 1);
    }
    // body / robe
    x.fillStyle = robe; x.fillRect(cx - 8, 31, 16, 22); x.fillRect(cx - 6, 29, 12, 2);
    x.fillStyle = trim; x.fillRect(cx - 1, 29, 2, 24); x.fillRect(cx - 8, 31, 16, 1);
    // suit emblem on chest
    blit(x, SMALL[SUITS[suit]], cx - 7, 37, red ? P.white : P.gold);
    // held item: K sword, Q flower, J staff
    x.fillStyle = P.silver;
    if (rank === 13) { x.fillRect(cx + 5, 33, 1, 16); x.fillStyle = trim; x.fillRect(cx + 3, 46, 5, 1); }
    else if (rank === 12) { x.fillStyle = P.green; x.fillRect(cx + 5, 38, 1, 10); x.fillStyle = P.red; x.fillRect(cx + 4, 36, 3, 3); }
    else { x.fillStyle = P.wood2; x.fillRect(cx + 5, 30, 1, 21); x.fillStyle = trim; x.fillRect(cx + 4, 29, 3, 2); }
  }

  function makeFace(suit, rank) {
    const [c, x] = G.makeCanvas(CW, CH);
    cardBase(x, P.white, '#d4dde6');
    const color = G.isRed(suit) ? P.red : P.ink;
    const s = SUITS[suit];
    if (rank >= 11) drawCourt(x, suit, rank);
    else if (rank === 1) {
      blit(x, BIG[s], CW / 2 - 10.5 | 0, CH / 2 - 10.5 | 0, color, 3);
      if (suit === 0) { x.fillStyle = P.gold; x.fillRect(CW / 2 - 1 | 0, CH / 2 - 2 | 0, 2, 2); }
    } else {
      const x0 = 13, x1 = 29, y0 = 14, y1 = 48;
      for (const [u, v] of PIPS[rank]) {
        const px = Math.round(G.lerp(x0, x1, u)) - 3, py = Math.round(G.lerp(y0, y1, v)) - 3;
        blit(x, BIG[s], px, py, color, 1, v > 0.5);
      }
    }
    drawCorner(x, suit, rank, color);
    // mirrored corner, bottom-right
    const [c2, x2] = G.makeCanvas(CW, CH);
    drawCorner(x2, suit, rank, color);
    x.save(); x.translate(CW, CH); x.rotate(Math.PI); x.drawImage(c2, 0, 0, 20, 20, 0, 0, 20, 20); x.restore();
    return c;
  }

  // ---------- Card backs ----------
  const BACKS = (G.BACKS = [
    { name: 'Crimson', a: P.red, b: '#7d2440', c: P.gold },
    { name: 'Cobalt', a: P.blue, b: P.navy, c: P.cyan },
    { name: 'Forest', a: P.green, b: P.teal, c: P.lime },
    { name: 'Royal', a: P.plum, b: '#3a1a40', c: P.gold }
  ]);
  function makeBack(b) {
    const [c, x] = G.makeCanvas(CW, CH);
    cardBase(x, P.white);
    x.fillStyle = b.b; x.fillRect(4, 4, CW - 8, CH - 8);
    // diamond lattice
    for (let yy = 4; yy < CH - 4; yy++) for (let xx = 4; xx < CW - 4; xx++) {
      const u = (xx + yy) % 8, v = (xx - yy + 64) % 8;
      if (u === 0 || v === 0) { x.fillStyle = b.a; x.fillRect(xx, yy, 1, 1); }
      else if ((u === 4 && v === 4)) { x.fillStyle = b.c; x.fillRect(xx, yy, 1, 1); }
    }
    x.fillStyle = b.c; x.fillRect(4, 4, CW - 8, 1); x.fillRect(4, CH - 5, CW - 8, 1); x.fillRect(4, 4, 1, CH - 8); x.fillRect(CW - 5, 4, 1, CH - 8);
    // centre medallion
    const mx = CW / 2, my = CH / 2;
    x.fillStyle = P.ink; x.fillRect(mx - 8, my - 6, 16, 12); x.fillRect(mx - 6, my - 8, 12, 16);
    x.fillStyle = b.c; x.fillRect(mx - 7, my - 5, 14, 10); x.fillRect(mx - 5, my - 7, 10, 14);
    x.fillStyle = b.b; x.fillRect(mx - 6, my - 4, 12, 8); x.fillRect(mx - 4, my - 6, 8, 12);
    blit(x, SMALL.S, mx - 5, my - 5, b.c); blit(x, SMALL.H, mx, my - 5, b.c);
    blit(x, SMALL.D, mx - 5, my, b.c); blit(x, SMALL.C, mx, my, b.c);
    return c;
  }

  // ---------- Custom art support (assets/cards/deck.js) ----------
  // A custom deck can supply a sprite sheet. See docs/CUSTOM_CARDS.md.
  G.cardArt = { faces: {}, backs: [], custom: false };
  // shared drawing kit for other deck styles (js/western.js)
  G._cardKit = { blit, BIG, SMALL, SUITS, PIPS, drawTextOn, cardBase };
  // deck styles: each builds 52 faces and 4 backs. The Classic deck is drawn here.
  const CLASSIC_INK = { paper: P.white, edge: '#d4dde6', line: P.ink, red: P.red, black: P.ink };
  G.DECKS = [{ name: 'CLASSIC', ink: CLASSIC_INK, backs: BACKS, face: makeFace, back: makeBack }];
  G.cardInk = CLASSIC_INK;
  G.backNames = () => (G.DECKS[G.deckIndex || 0].backs || BACKS).map((b) => b.name);
  function buildDefault() {
    const i = G.clamp(G.settings.deck || 0, 0, G.DECKS.length - 1), d = G.DECKS[i];
    G.deckIndex = i; G.cardInk = d.ink;
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) G.cardArt.faces[s + '_' + r] = d.face(s, r);
    G.cardArt.backs = d.backs.map((b, k) => d.back(b, k));
    if (G.clearMiniCards) G.clearMiniCards();
  }
  // switch deck style at run time (Customize menu). A custom sprite sheet always wins.
  G.applyDeck = (i) => {
    G.settings.deck = i;
    if (G.cardArt.custom) return;
    buildDefault();
  };
  function tryCustom(done) {
    const cfg = window.CUSTOM_DECK;
    if (!cfg) return done();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const fw = cfg.cardWidth, fh = cfg.cardHeight, ox = cfg.offsetX || 0, oy = cfg.offsetY || 0, gx = cfg.gapX || 0, gy = cfg.gapY || 0;
        const cell = (col, row) => {
          const [c, x] = G.makeCanvas(CW, CH);
          // scale to the game's card size using nearest neighbour (crisp pixels)
          x.drawImage(img, ox + col * (fw + gx), oy + row * (fh + gy), fw, fh, 0, 0, CW, CH);
          return c;
        };
        const suitRow = cfg.suitOrder || ['S', 'H', 'D', 'C'];
        const rankOrder = cfg.rankOrder || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        suitRow.forEach((sl, row) => {
          const s = SUITS.indexOf(sl);
          rankOrder.forEach((r, col) => { G.cardArt.faces[s + '_' + r] = cfg.layout === 'columns' ? cell(row, col) : cell(col, row); });
        });
        if (cfg.backs) cfg.backs.forEach((b, i) => { G.cardArt.backs[i] = cell(b[0], b[1]); });
        G.cardArt.custom = true;
      } catch (e) { console.warn('Custom deck failed, using built-in art', e); }
      done();
    };
    img.onerror = () => { console.warn('Custom deck image missing:', cfg.image); done(); };
    img.src = cfg.image;
  }
  G.initCardArt = (done) => { buildDefault(); tryCustom(done); };
  G.faceImg = (card) => G.cardArt.faces[card.suit + '_' + card.rank];
  G.backImg = () => G.cardArt.backs[G.settings.back % G.cardArt.backs.length];

  // ---------- Card objects ----------
  let nextId = 1;
  G.makeDeck = (decks = 1) => {
    const out = [];
    for (let d = 0; d < decks; d++) for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++)
      out.push({ id: nextId++, suit: s, rank: r, faceUp: false, x: G.W / 2 - CW / 2, y: -CH - 10, tx: 0, ty: 0, z: 0, delay: 0, flip: 1, shownFace: false, lift: 0 });
    return out;
  };
  G.cardName = (c) => G.RANK_NAME[c.rank] + ' of ' + G.SUIT_NAMES[c.suit];
  G.cardShort = (c) => G.RANK_LABEL[c.rank] + ['S', 'H', 'D', 'C'][c.suit];

  // Place a card at a target; it animates there
  G.place = (c, x, y, z, faceUp, delay) => {
    c.tx = Math.round(x); c.ty = Math.round(y); c.z = z;
    if (faceUp !== undefined) c.faceUp = faceUp;
    if (delay !== undefined) c.delay = Math.max(c.delay, delay);
  };
  G.snap = (c) => { c.x = c.tx; c.y = c.ty; c.shownFace = c.faceUp; c.flip = 1; };

  // Update positions; returns true while anything is moving
  G.updateCards = (cards, dt, speed = 14) => {
    let moving = false;
    for (const c of cards) {
      if (c.delay > 0) { c.delay -= dt; moving = true; if (c.delay <= 0) { c.delay = 0; c._started = true; G.audio.sfx('deal'); } continue; }
      const dx = c.tx - c.x, dy = c.ty - c.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        const k = 1 - Math.exp(-speed * dt);
        c.x += dx * k; c.y += dy * k;
        if (Math.abs(c.tx - c.x) < 0.5) c.x = c.tx;
        if (Math.abs(c.ty - c.y) < 0.5) c.y = c.ty;
        moving = true;
      }
      // flip animation
      if (c.shownFace !== c.faceUp) {
        c.flip -= dt * 9;
        if (c.flip <= 0) { c.flip = 0; c.shownFace = c.faceUp; G.audio.sfx('flip'); }
        moving = true;
      } else if (c.flip < 1) { c.flip = Math.min(1, c.flip + dt * 9); moving = true; }
    }
    return moving;
  };

  G.drawCard = (c, opt = {}) => {
    const x = Math.round(c.x), y = Math.round(c.y - (c.lift || 0));
    const img = c.shownFace ? G.faceImg(c) : G.backImg();
    const w = Math.max(1, Math.round(CW * c.flip));
    const ox = Math.round((CW - w) / 2);
    const ctx = G.ctx;
    // drop shadow
    const sh = opt.dragging ? 4 : (c.lift ? 2 + Math.round(c.lift / 3) : 1);
    ctx.globalAlpha = 0.35; G.rect(x + ox + sh, y + sh + 1, w - 1, CH - 2, P.black); ctx.globalAlpha = 1;
    ctx.drawImage(img, x + ox, y, w, CH);
    if (opt.dim) { ctx.globalAlpha = 0.45; G.rect(x + ox + 1, y + 1, w - 2, CH - 2, P.ink); ctx.globalAlpha = 1; }
    if (opt.highlight) {
      const col = opt.highlight === true ? P.gold : opt.highlight;
      G.outline(x - 1, y - 1, CW + 2, CH + 2, col, 2);
    }
  };

  // Draw a set of cards: stationary ones by z, moving ones on top
  G.drawCards = (cards, optFn) => {
    const list = cards.slice().sort((a, b) => {
      const am = a._drag ? 2 : (a.delay > 0 ? -1 : (Math.abs(a.tx - a.x) + Math.abs(a.ty - a.y) > 3 ? 1 : 0));
      const bm = b._drag ? 2 : (b.delay > 0 ? -1 : (Math.abs(b.tx - b.x) + Math.abs(b.ty - b.y) > 3 ? 1 : 0));
      return am - bm || a.z - b.z;
    });
    for (const c of list) { if (c.hidden) continue; G.drawCard(c, optFn ? optFn(c) || {} : {}); }
  };

  // empty pile slot outline
  G.drawSlot = (x, y, label, suitIdx) => {
    x = Math.round(x); y = Math.round(y);
    G.ctx.globalAlpha = 0.5;
    G.rect(x + 2, y + 1, CW - 4, CH - 2, P.felt0); G.rect(x + 1, y + 2, CW - 2, CH - 4, P.felt0);
    G.ctx.globalAlpha = 1;
    G.outline(x + 2, y + 2, CW - 4, CH - 4, P.felt4, 1);
    if (suitIdx !== undefined) {
      const bmp = BIG[SUITS[suitIdx]];
      blit(G.ctx, bmp, x + CW / 2 - 7, y + CH / 2 - 7, P.felt4, 2);
    } else if (label) G.text(label, x + CW / 2, y + CH / 2 - 2, P.felt4, 'small', 'center');
  };
})();
