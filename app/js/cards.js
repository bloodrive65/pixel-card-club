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

  // ---------- Court cards (J / Q / K): double-headed portraits, like a real deck ----------
  // 20 x 22 top-half portraits (mirrored for the bottom half). Palette keys are swapped per suit:
  // k outline, s/S skin, g/G gold, r/R main robe, b/B second robe, w white fur, h hair, e emblem cloth, p steel, . frame paper
  const COURT_J = [
    '....rrrrrrrrr.......',
    '...rrRRRRRRRrr...ww.',
    '...gggggggggggg.wpw.',
    '..krhhhhhhhhhrk..p..',
    '..khhsssssssshk..p..',
    '...khskssskshk...p..',
    '...khssssssshk...p..',
    '...khsssSssshk...p..',
    '...khhsssssshk...p..',
    '....khSSSSShk....p..',
    '....kkhhhhhkk...gpg.',
    '.....kwwwwwk....sss.',
    '..bbbbwwgwwbbbb.sss.',
    '.bBbbbbwgwbbbbBbbp..',
    'bBbrrbbbgbbbrrbBbp..',
    'bBrrrrbbgbbrrrrBbp..',
    'bBrrrrbbgbbrrrrBbp..',
    'bBbrrbbbgbbbrrbBbp..',
    'bBggggggggggggggBp..',
    'bBbbeeebbgbbbbbbBp..',
    'bBbbeeebbgbbbbbbBp..',
    'bBbbbebbbgbbbbbbBp..'
  ];
  const COURT_Q = [
    '.....g..g..g........',
    '.....ggggggg........',
    '....gbgggggbg.......',
    '...hhhhhhhhhhh......',
    '..hhhssssssshhh.....',
    '..hhskssssskshh.....',
    '..hhssssssssshh.....',
    '..hhssssSsssshh.....',
    '..hhhssSSSsshhh..w..',
    '..hhhhsssssshhh.wpw.',
    '..hhhhhkkkkhhhh..w..',
    '.wwhhhhwwwwhhhhww.G.',
    'wwkwhhwwgwwwhhwkw.G.',
    'wkwwwwwwgwwwwwwwwwG.',
    'bbbwwrrrgrrrwwbbbsss',
    'bBbbrrrrgrrrrbbBbsss',
    'bBbbrrwrgrwrrbbBb.G.',
    'bBbbrrrrgrrrrbbBb.G.',
    'bBggggggggggggggB.G.',
    'bBbreeebbgbbbbrbB.G.',
    'bBbreeebbgbbbbrbB.G.',
    'bBbbrebbbgbbbbrbB...'
  ];
  const COURT_K = [
    '....g...gg...g......',
    '....gg..gg..gg...w..',
    '....gggggggggg...p..',
    '....gRggbbggRg...p..',
    '...kGGGGGGGGGGk..p..',
    '...khhssssssshhk.p..',
    '...khskssssskshk.p..',
    '...khssssssssshk.p..',
    '...khhsssSssshhk.p..',
    '...khhhSsssShhhk.p..',
    '...khhhhhhhhhhhk.p..',
    '..wkkhhhhhhhhhkkwp..',
    '.wwwrkhhhhhhhkrwwg..',
    'wwkwrrkkhhhkkrrwgGg.',
    'wkwwrrrrkkkrrrrwwgw.',
    'wwwrrbbrrgrrbbrrwsw.',
    'rrrrbbbbrgrbbbbrrsr.',
    'rRrrbbbbrgrbbbbrrRr.',
    'rRrrrbbrrgrrbbrrrRr.',
    'rRggggggggggggggrRr.',
    'rRreeerrrgrrrrrrrRr.',
    'rRreeerrrgrrbbrrrRr.'
  ];
  const COURTS = { 11: COURT_J, 12: COURT_Q, 13: COURT_K };
  // robe colours per suit: [main, second, queen hair]
  const COURT_SUIT = [
    ['#3b5dc9', '#29366f', '#e8ecf4'], // spades
    ['#b13e53', '#3b5dc9', '#ef7d57'], // hearts
    ['#ef7d57', '#5d275d', '#ffcd75'], // diamonds
    ['#38b764', '#b13e53', '#6a482b']  // clubs
  ];
  const suitCol = (ink, suit) => (ink.suit ? ink.suit[suit] : G.isRed(suit) ? ink.red : ink.black);
  G.suitColour = (suit) => suitCol(G.cardInk || {}, suit) || (G.isRed(suit) ? P.red : P.ink);
  function drawCourt(x, suit, rank, ink) {
    const art = COURTS[rank], [main, second, qhair] = COURT_SUIT[suit];
    const frameInk = suitCol(ink, suit), bg = ink.frame || '#f3e9cf';
    const pal = { '.': bg, k: '#1a1c2c', s: '#f2c79a', S: '#d0866a', g: '#ffcd75', G: '#c98a2e', r: main, R: '#1a1c2c', b: second, B: '#1a1c2c',
      w: '#f4f4f4', h: rank === 13 ? '#e8ecf4' : rank === 12 ? qhair : '#86603e', e: main, p: '#94b0c2' };
    const X0 = 12, Y0 = 9, AW = 20, AH = 22;
    x.fillStyle = frameInk; x.fillRect(X0 - 1, Y0 - 1, AW + 2, AH * 2 + 3);
    x.fillStyle = bg; x.fillRect(X0, Y0, AW, AH * 2 + 1);
    for (let ry = 0; ry < AH; ry++) {
      const row = art[ry];
      for (let cx = 0; cx < AW; cx++) {
        const ch = row[cx];
        if (ch === '.' || ch === undefined) continue;
        x.fillStyle = pal[ch];
        x.fillRect(X0 + cx, Y0 + ry, 1, 1);
        x.fillRect(X0 + AW - 1 - cx, Y0 + AH * 2 - ry, 1, 1); // the same figure, upside down
      }
    }
    // gold divider through the middle, and the suit on each half
    x.fillStyle = frameInk; x.fillRect(X0, Y0 + AH, AW, 1);
    x.fillStyle = '#ffcd75'; x.fillRect(X0 + 2, Y0 + AH, AW - 4, 1);
    blit(x, SMALL[SUITS[suit]], X0 + 2, Y0 + AH - 6, frameInk);
    blit(x, SMALL[SUITS[suit]], X0 + AW - 7, Y0 + AH + 2, frameInk, 1, true);
  }

  // ---------- Aces: an ornate medallion (the Ace of Spades gets the fanciest one) ----------
  function drawAce(x, suit, ink) {
    const col = suitCol(ink, suit), s = SUITS[suit];
    const cx = CW / 2, cy = CH / 2;
    const ring = (r, c, t = 1) => { x.fillStyle = c; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const d = Math.hypot(xx + 0.5, yy + 0.5); if (d <= r && d > r - t) x.fillRect(cx + xx, cy + yy, 1, 1); } };
    const disc = (r, c) => { x.fillStyle = c; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (Math.hypot(xx + 0.5, yy + 0.5) <= r) x.fillRect(cx + xx, cy + yy, 1, 1); };
    if (suit === 0) {
      // sunburst rays, a gold ring and a big spade with gold filigree
      x.fillStyle = '#ffcd75';
      for (let a = 0; a < 16; a++) { const an = a * Math.PI / 8; for (let r = 14; r < 19; r++) x.fillRect(Math.round(cx + Math.cos(an) * r - 0.5), Math.round(cy + Math.sin(an) * r * 1.15 - 0.5), 1, 1); }
      disc(14, ink.frame || '#f3e9cf'); ring(14, col, 1); ring(13, '#ffcd75', 1); ring(11, '#c98a2e', 1);
      blit(x, BIG[s], cx - 10.5 | 0, cy - 11 | 0, col, 3);
      x.fillStyle = '#ffcd75'; x.fillRect(cx - 1, cy - 6, 2, 8); x.fillRect(cx - 3, cy - 3, 6, 2);
      x.fillStyle = col; x.fillRect(cx - 1, cy - 4, 2, 1);
    } else {
      disc(13, ink.frame || '#f3e9cf'); ring(13, col, 1); ring(11, '#ffcd75', 1);
      for (const [dx, dy] of [[0, -12], [0, 12], [-12, 0], [12, 0]]) { x.fillStyle = '#ffcd75'; x.fillRect(cx + dx - 1, cy + dy - 1, 2, 2); }
      blit(x, BIG[s], cx - 7, cy - 7, col, 2);
      x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(cx - 4, cy - 4, 2, 2);
    }
  }

  // build one face for a deck ink (paper / edge / line / suit colours)
  function makeFace(suit, rank, ink = CLASSIC_INK) {
    const [c, x] = G.makeCanvas(CW, CH);
    cardBase(x, ink.paper, ink.edge, ink.line);
    const color = suitCol(ink, suit);
    const s = SUITS[suit];
    if (rank >= 11) drawCourt(x, suit, rank, ink);
    else if (rank === 1) drawAce(x, suit, ink);
    else {
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
    { name: 'Royal', a: P.plum, b: '#3a1a40', c: P.gold },
    // 1.7: more colours and patterns
    { name: 'Gold', a: '#e0a33a', b: '#8a5a1c', c: '#fff1c4', pat: 'sun' },
    { name: 'Ocean', a: '#41a6f6', b: '#1f3d6d', c: '#c8f0ff', pat: 'waves' },
    { name: 'Ember', a: '#ef7d57', b: '#5a1e2a', c: '#ffcd75', pat: 'checks' },
    { name: 'Shadow', a: '#566c86', b: '#15161c', c: '#c8ccd8', pat: 'stripes' }
  ]);
  function backPattern(x, b, x0, y0, x1, y1) {
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      let on = 0;
      if (b.pat === 'stripes') on = (xx + yy) % 6 < 2 ? 1 : 0;
      else if (b.pat === 'checks') { const q = ((xx >> 2) + (yy >> 2)) % 2; on = q ? 1 : 0; if (!q && (xx % 4 === 1) && (yy % 4 === 1)) on = 2; }
      else if (b.pat === 'waves') { const w = Math.round(Math.sin(xx / 2.2) * 1.5); on = ((yy + w) % 6 === 0) ? 1 : ((yy + w) % 6 === 3 && xx % 4 === 0) ? 2 : 0; }
      else if (b.pat === 'sun') { const d = Math.hypot(xx - CW / 2, (yy - CH / 2) * 0.8), an = Math.atan2(yy - CH / 2, xx - CW / 2); on = Math.floor(an / (Math.PI / 10) + 20) % 2 ? 1 : 0; if (Math.round(d) % 7 === 0) on = 2; }
      else { const u = (xx + yy) % 8, v = (xx - yy + 64) % 8; on = (u === 0 || v === 0) ? 1 : (u === 4 && v === 4) ? 2 : 0; }
      if (on) { x.fillStyle = on === 1 ? b.a : b.c; x.fillRect(xx, yy, 1, 1); }
    }
  }
  function makeBack(b, k, ink) {
    const [c, x] = G.makeCanvas(CW, CH);
    cardBase(x, (ink && ink.backBorder) || P.white, null, ink && ink.line);
    x.fillStyle = b.b; x.fillRect(4, 4, CW - 8, CH - 8);
    backPattern(x, b, 4, 4, CW - 4, CH - 4);
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
  const CLASSIC_INK = { paper: P.white, edge: '#d4dde6', line: P.ink, red: P.red, black: P.ink, frame: '#f3e9cf' };
  // card colours (Customize > Cards): the paper of the Classic and Four Colour decks
  G.CARD_COLOURS = [
    { name: 'WHITE', paper: '#f4f4f4', edge: '#d4dde6', frame: '#f3e9cf' },
    { name: 'IVORY', paper: '#f3ead2', edge: '#d8c9a4', frame: '#fbf4e2' },
    { name: 'MINT', paper: '#dcf1e1', edge: '#b3d6bd', frame: '#f1faf2' },
    { name: 'SKY', paper: '#dbe8f7', edge: '#b0c4de', frame: '#f1f6fc' },
    { name: 'ROSE', paper: '#f6dde3', edge: '#dbb4bf', frame: '#fcf0f3' },
    { name: 'GOLD', paper: '#f6e3a8', edge: '#d8bb6c', frame: '#fbf1d2' }
  ];
  G.DECKS = [{ name: 'CLASSIC', ink: CLASSIC_INK, tint: true, backs: BACKS, face: makeFace, back: makeBack }];
  G.cardInk = CLASSIC_INK;
  G.backNames = () => (G.DECKS[G.deckIndex || 0].backs || BACKS).map((b) => b.name);
  G.deckTintable = () => !!(G.DECKS[G.deckIndex || 0] || {}).tint;
  function buildDefault() {
    const i = G.clamp(G.settings.deck || 0, 0, G.DECKS.length - 1), d = G.DECKS[i];
    let ink = d.ink;
    if (d.tint) { const cc = G.CARD_COLOURS[G.settings.cardColour || 0] || G.CARD_COLOURS[0]; ink = Object.assign({}, d.ink, { paper: cc.paper, edge: cc.edge, frame: cc.frame }); }
    G.deckIndex = i; G.cardInk = ink;
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) G.cardArt.faces[s + '_' + r] = d.face(s, r, ink);
    G.cardArt.backs = d.backs.map((b, k) => d.back(b, k, ink));
    if (G.clearMiniCards) G.clearMiniCards();
  }
  G.rebuildDeck = () => { if (!G.cardArt.custom) buildDefault(); };
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
