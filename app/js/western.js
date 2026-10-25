// Pixel Card Club - the Western Deck: worn 1890s playing cards, drawn in code
// Yellowed card stock, coffee stains, foxing, faded ink, nicked edges and creases.
// Court cards are frontier characters in wanted-poster frames.
(function () {
  'use strict';
  const CW = G.CW, CH = G.CH;
  const { blit, BIG, SMALL, SUITS, PIPS, drawTextOn, cardBase } = G._cardKit;

  const W = {
    line: '#3b2a1d', paper: '#e8d5a8', paperD: '#d3b981', frame: '#dcc391', frameD: '#c4a56e',
    red: '#983326', black: '#2b221c', skin: '#d9b285', brass: '#b8913f'
  };
  const INK = { paper: W.paper, edge: W.paperD, line: W.line, red: W.red, black: W.black };

  // small seeded random generator so every card has the same wear every time
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const SEPIA = [92, 60, 30], PAPER = rgb(W.paper), LINE = rgb(W.line);

  // age a finished card: darken edges and bottom, add stains, foxing, a crease, faded ink and nicks
  function weather(c, seed, back) {
    const x = c.getContext('2d');
    const img = x.getImageData(0, 0, CW, CH), d = img.data, R = rng(seed);
    const blots = [];
    const nb = 1 + Math.floor(R() * (back ? 2 : 3));
    for (let i = 0; i < nb; i++) blots.push({ x: R() * CW, y: R() * CH, r: 3 + R() * 9, ring: R() < 0.35, k: 0.05 + R() * 0.07 });
    const crease = R() < (back ? 0.5 : 0.35) ? { a: R() * Math.PI, px: 8 + R() * 28, py: 10 + R() * 42 } : null;
    for (let y = 0; y < CH; y++) for (let xx = 0; xx < CW; xx++) {
      const i = (y * CW + xx) * 4;
      if (d[i + 3] === 0) continue;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      const isLine = r === LINE[0] && g === LINE[1] && b === LINE[2];
      if (isLine) continue;
      let k = 0;
      const edge = Math.min(xx, y, CW - 1 - xx, CH - 1 - y);
      if (edge < 5) k += (5 - edge) * 0.035;
      k += (y / CH) * 0.05;
      for (const bl of blots) {
        const dd = Math.hypot(xx - bl.x, y - bl.y) + (R() - 0.5) * 1.6;
        if (bl.ring) { if (Math.abs(dd - bl.r) < 1.1) k += 0.16; else if (dd < bl.r) k += 0.03; }
        else if (dd < bl.r) k += bl.k * (1 - dd / bl.r) + 0.03;
      }
      if (R() < 0.012) k += 0.22 + R() * 0.2; // foxing spots
      if (back && R() < 0.035) { r = G.lerp(r, PAPER[0], 0.45); g = G.lerp(g, PAPER[1], 0.45); b = G.lerp(b, PAPER[2], 0.45); } // scuffs
      if (!back && lum < 150 && R() < 0.1) { r = G.lerp(r, PAPER[0], 0.5); g = G.lerp(g, PAPER[1], 0.5); b = G.lerp(b, PAPER[2], 0.5); } // faded ink
      if (crease) {
        const dist = Math.abs(Math.sin(crease.a) * (xx - crease.px) - Math.cos(crease.a) * (y - crease.py));
        if (dist < 0.55) { r += 18; g += 16; b += 12; } else if (dist < 1.4) k += 0.09;
      }
      k = Math.min(k, 0.45);
      d[i] = G.clamp(r * (1 - k) + SEPIA[0] * k, 0, 255);
      d[i + 1] = G.clamp(g * (1 - k) + SEPIA[1] * k, 0, 255);
      d[i + 2] = G.clamp(b * (1 - k) + SEPIA[2] * k, 0, 255);
    }
    // nicks along the edge: knock out an outline pixel and push the edge inward
    const set = (px, py, col) => { const i = (py * CW + px) * 4; if (col) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; } else d[i + 3] = 0; };
    const nicks = 4 + Math.floor(R() * 5);
    for (let n = 0; n < nicks; n++) {
      const side = Math.floor(R() * 4), t = 3 + Math.floor(R() * ((side < 2 ? CW : CH) - 6)), len = 1 + Math.floor(R() * 2);
      for (let k = 0; k < len; k++) {
        const u = t + k;
        if (side === 0) { set(u, 0); set(u, 1, LINE); }
        else if (side === 1) { set(u, CH - 1); set(u, CH - 2, LINE); }
        else if (side === 2) { set(0, u); set(1, u, LINE); }
        else { set(CW - 1, u); set(CW - 2, u, LINE); }
      }
    }
    // dog-eared corners: round one or two corners a little more
    const corners = [[1, 1, 1, 1], [CW - 2, 1, -1, 1], [1, CH - 2, 1, -1], [CW - 2, CH - 2, -1, -1]];
    for (const [cx, cy, sx, sy] of corners) if (R() < 0.45) { set(cx, cy); set(cx + sx, cy); set(cx, cy + sy); set(cx + sx, cy + sy, LINE); set(cx + 2 * sx, cy, LINE); set(cx, cy + 2 * sy, LINE); }
    x.putImageData(img, 0, 0);
  }

  function corner(x, suit, rank, color) {
    drawTextOn(x, G.RANK_LABEL[rank], 3, 3, color);
    blit(x, SMALL[SUITS[suit]], 3, 12, color);
  }

  // ---------- court cards: cattle-baron King, saloon Queen, outlaw Jack ----------
  function court(x, suit, rank, col) {
    const cx = 22, R0 = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); }, R = (c, a, b, w, h) => { const l = Math.max(a, 14), r = Math.min(a + w, 31); if (r > l) R0(c, l, b, r - l, h); }, R1 = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    // wanted-poster frame with nail heads
    R0(col, 12, 7, 21, 48);
    R0(W.frame, 13, 8, 19, 46);
    R0(W.frameD, 14, 9, 17, 1); R0(W.frameD, 14, 52, 17, 1);
    R0(W.line, 13, 8, 1, 1); R0(W.line, 31, 8, 1, 1); R0(W.line, 13, 53, 1, 1); R0(W.line, 31, 53, 1, 1);
    // coat and shoulders
    R(col, cx - 9, 35, 18, 17); R(col, cx - 7, 33, 14, 2);
    R(W.skin, cx - 2, 30, 4, 4); // neck
    // shirt collar
    R(W.frame, cx - 2, 33, 4, 2); R(W.frame, cx - 1, 35, 2, 3);
    // face
    R(W.skin, cx - 5, 20, 10, 10); R(W.skin, cx - 4, 30, 8, 1);
    R(W.black, cx - 3, 23, 2, 1); R(W.black, cx + 1, 23, 2, 1);
    if (rank === 13) {
      // ten-gallon hat with a brass band
      R(col, cx - 5, 11, 10, 8); R(col, cx - 4, 10, 8, 1);
      R(W.brass, cx - 5, 17, 10, 1);
      R(col, cx - 9, 19, 18, 2); R(col, cx - 10, 18, 1, 2); R(col, cx + 9, 18, 1, 2);
      // handlebar moustache and grey sideburns
      R(W.black, cx - 4, 26, 8, 1); R(W.black, cx - 5, 25, 1, 1); R(W.black, cx + 4, 25, 1, 1);
      R('#8a7a66', cx - 5, 21, 1, 5); R('#8a7a66', cx + 4, 21, 1, 5);
      // bolo tie
      R(W.black, cx - 1, 35, 1, 6); R(W.black, cx, 35, 1, 6); R(W.brass, cx - 1, 36, 2, 2);
    } else if (rank === 12) {
      // curls
      R(col, cx - 7, 20, 2, 11); R(col, cx + 5, 20, 2, 11); R(col, cx - 6, 31, 1, 2); R(col, cx + 5, 31, 1, 2);
      // wide hat with a plume
      R(col, cx - 5, 13, 10, 5); R(col, cx - 10, 18, 20, 2);
      R(W.brass, cx - 5, 17, 10, 1);
      R(col, cx + 3, 11, 2, 2); R(col, cx + 5, 10, 2, 2); R(col, cx + 7, 11, 1, 2); R(W.frame, cx + 5, 11, 1, 1);
      // lips, beauty mark, choker
      R(W.red, cx - 1, 27, 2, 1); R(W.black, cx + 3, 26, 1, 1);
      R(W.black, cx - 2, 31, 4, 1); R(W.brass, cx - 1, 32, 2, 1);
      // low neckline
      R(W.skin, cx - 4, 33, 8, 2); R(W.skin, cx - 2, 35, 4, 2);
    } else {
      // flat-brim hat
      R(col, cx - 5, 13, 10, 5); R(col, cx - 9, 18, 18, 2);
      R(W.frameD, cx - 5, 17, 10, 1);
      // bandana over the lower face
      R(col, cx - 5, 25, 10, 4); R(col, cx - 3, 29, 6, 1); R(col, cx - 1, 30, 2, 1);
      R(W.frame, cx - 3, 26, 1, 1); R(W.frame, cx + 1, 27, 1, 1); R(W.frame, cx + 3, 26, 1, 1);
      // gun belt
      R(W.black, cx - 9, 46, 18, 2); R(W.brass, cx - 1, 46, 2, 2);
    }
    // suit badge on the coat
    blit(x, SMALL[SUITS[suit]], cx + 2, 39, W.frame);
  }

  function makeFace(suit, rank) {
    const [c, x] = G.makeCanvas(CW, CH);
    cardBase(x, W.paper, W.paperD, W.line);
    const col = G.isRed(suit) ? W.red : W.black, s = SUITS[suit];
    if (rank >= 11) court(x, suit, rank, col);
    else if (rank === 1) {
      if (suit === 0) {
        // the maker's ace of spades: dotted ring and a date stamp
        for (let a = 0; a < 28; a++) { const t = (a / 28) * Math.PI * 2; x.fillStyle = col; x.fillRect(Math.round(22 + Math.cos(t) * 15), Math.round(30 + Math.sin(t) * 15), 1, 1); }
        blit(x, BIG[s], 12, 19, col, 3);
        G.withCtx(x, () => G.text('1890', 17, 48, col, 'small', 'center'));
      } else blit(x, BIG[s], CW / 2 - 10.5 | 0, CH / 2 - 10.5 | 0, col, 3);
    } else {
      const x0 = 13, x1 = 29, y0 = 14, y1 = 48;
      for (const [u, v] of PIPS[rank]) blit(x, BIG[s], Math.round(G.lerp(x0, x1, u)) - 3, Math.round(G.lerp(y0, y1, v)) - 3, col, 1, v > 0.5);
    }
    corner(x, suit, rank, col);
    const [c2, x2] = G.makeCanvas(CW, CH);
    corner(x2, suit, rank, col);
    x.save(); x.translate(CW, CH); x.rotate(Math.PI); x.drawImage(c2, 0, 0, 20, 20, 0, 0, 20, 20); x.restore();
    weather(c, 1000 + suit * 13 + rank, false);
    return c;
  }

  // ---------- backs: woven pattern, double rule and a sheriff star ----------
  const BACKS = [
    { name: 'Oxblood', a: '#7c3229', b: '#4f1e19', c: '#c9a35a' },
    { name: 'Prussian', a: '#3d5170', b: '#232f46', c: '#c9b07a' },
    { name: 'Sage', a: '#617147', b: '#39442b', c: '#d8c48a' },
    { name: 'Tobacco', a: '#80592f', b: '#4b331d', c: '#e0c088' }
  ];
  const STAR = ['....#....', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '.#.....#.'];
  function makeBack(b, k) {
    const [c, x] = G.makeCanvas(CW, CH);
    cardBase(x, W.paper, null, W.line);
    x.fillStyle = b.b; x.fillRect(3, 3, CW - 6, CH - 6);
    for (let yy = 3; yy < CH - 3; yy++) for (let xx = 3; xx < CW - 3; xx++) {
      const u = (xx + yy) % 4, v = (xx - yy + 64) % 4;
      if ((u === 0 && (yy >> 1) % 2 === 0) || (v === 0 && (yy >> 1) % 2 === 1)) { x.fillStyle = b.a; x.fillRect(xx, yy, 1, 1); }
    }
    x.fillStyle = b.c;
    x.fillRect(5, 5, CW - 10, 1); x.fillRect(5, CH - 6, CW - 10, 1); x.fillRect(5, 5, 1, CH - 10); x.fillRect(CW - 6, 5, 1, CH - 10);
    x.fillRect(7, 7, CW - 14, 1); x.fillRect(7, CH - 8, CW - 14, 1); x.fillRect(7, 7, 1, CH - 14); x.fillRect(CW - 8, 7, 1, CH - 14);
    // medallion
    const mx = 22, my = 31;
    x.fillStyle = W.line; x.fillRect(mx - 8, my - 9, 16, 18); x.fillRect(mx - 9, my - 7, 18, 14);
    x.fillStyle = b.c; x.fillRect(mx - 7, my - 8, 14, 16); x.fillRect(mx - 8, my - 6, 16, 12);
    x.fillStyle = b.b; x.fillRect(mx - 6, my - 7, 12, 14); x.fillRect(mx - 7, my - 5, 14, 10);
    blit(x, STAR, mx - 4, my - 4, b.c);
    // corner studs
    for (const [px, py] of [[9, 9], [CW - 10, 9], [9, CH - 10], [CW - 10, CH - 10]]) { x.fillStyle = b.c; x.fillRect(px, py, 1, 1); }
    weather(c, 5000 + k * 97, true);
    return c;
  }

  G.DECKS.push({ name: 'WESTERN', ink: INK, backs: BACKS, face: makeFace, back: makeBack });
})();
