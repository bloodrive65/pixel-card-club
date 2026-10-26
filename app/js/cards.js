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
  // 1.7.2: shaded, full-length double-headed courts (28 x 54, drawn pixel by pixel; '.' = paper, '0' = outline)
  const COURT_PAL = ["#2a1a26", "#ffffff", "#8c8c9c", "#e8e4ee", "#86c2f0", "#2c4892", "#c4bccc", "#4a7fd0", "#6a3e22", "#f0f0f6", "#ffe48c", "#cc861e", "#e0623a", "#f4b73a", "#c8823a", "#6a3a1e", "#fbdcb8", "#d08a62", "#3a1e12", "#9a5a2a", "#f8a8c4", "#7e2430", "#f0b88a", "#b8382e", "#9a5844", "#1e6a6a", "#6ccab0", "#2f9a8a", "#4a1a28", "#123c44", "#8a4c16", "#b88050", "#96603a", "#3e2214", "#2a1e36", "#5e4566", "#43304e", "#e0709a", "#4a2236", "#94404e", "#6e2e42", "#1a2452", "#c4c4d0", "#a8a2b2", "#6e6878", "#f2f0f6", "#d4d0dc"];
  const COURT_KEY = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const COURT_ART = {
    11: [
      ".....010.00000000......020..",
      "....01300444444450.....02000",
      "...0336047777777550....08099",
      "...06006555555555550.0008990",
      "....0..0aaaabcaaddb009208990",
      ".......0bbbbbbbbbbb002208990",
      ".......0efgghgghhi0..0208990",
      ".......0efghighihjf0..008290",
      "......0ejfg10gh0hjf0...08090",
      "......0efhkgghhlhji0..0bbb02",
      "......0ffhgmhlngof0....080.0",
      ".......0ffhhhhhhhf0....080..",
      ".......011111111360....080..",
      "......06666666666660...080..",
      "....00cclllllppppppp00.080..",
      "..00plnl61616166666nnl0080..",
      ".0qprqcnl666666q6rpncl0080..",
      ".0pdqplnnccclaqrrppslll080..",
      ".0qprplnnnnnlqrrppptnlub80..",
      ".0pdqrpllllllpppppptllbgmh0.",
      "..0pppvvvvv8aabvwwwwww8mhh0.",
      ".0aabp888888bxb8v888888mhh0.",
      ".0bbbccclccclpqpw88rtp0hho0.",
      ".0gghcnnlnnnlaqp8d8rtp0080..",
      ".0gmhcnnlnnnlqrp888rtp0080..",
      ".0hhhcnnlnnnlprrrrrptp0080..",
      ".0dabllllllllapppppptp0080..",
      "..0800ptppppppallllllllbad0.",
      "..0800ptprrrrrplnnnlnnchhh0.",
      "..0800ptr888prqlnnnlnnchmg0.",
      "..0800ptr8d8pqalnnnlnnchgg0.",
      ".0ohh0ptr88wpqplccclcccbbb0.",
      ".0hhm888888v8bxb888888pbaa0.",
      ".0hhm8wwwwwwvbaa8vvvvvppp0..",
      ".0hmgblltppppppllllllprqdp0.",
      "..08bulntppprrqlnnnnnlprpq0.",
      "..080lllspprrqalcccnnlpqdp0.",
      "..0800lcnpr6q666666lncqrpq0.",
      "..0800lnn66666161616lnlp00..",
      "..080.00ppppppplllllcc00....",
      "..080...06666666666660......",
      "..080....063111111110.......",
      "..080....0fhhhhhhhff0.......",
      "0.080....0fognlhmghff0......",
      "20bbb0..0ijhlhhggkhfe0......",
      "09080...0fjh0hg01gfje0......",
      "092800..0fjhihgihgfe0.......",
      "0998020..0ihhgghggfe0.......",
      "099802200bbbbbbbbbbb0.......",
      "099802900bddaacbaaaa0..0....",
      "0998000.05555555555560060...",
      "99080....0557777777406330...",
      "00020.....05444444400310....",
      "..020......00000000.010.....",
    ],
    12: [
      ".........0.0ab0.0...........",
      "........0a00bb00b0..........",
      "........0bcb41bcb0..........",
      ".......0ybbbbbbbby0.........",
      "......0zAAAggghAAyy0........",
      "......0zAAggmmhghAy0........",
      "......0zygh0gh0ghAy0........",
      ".....0zAygg7gh7hhAyy0.......",
      ".....0zAyhkghhhBoAyy0.......",
      ".....0zAyhghnclghAyy0.......",
      ".....0zAyyhmggghhyyy0.......",
      ".....0yy116ghhhh36yy0.......",
      ".....0613331111166660.......",
      "....00l63333641366l60.......",
      "...0ccnd6666666666ncn0......",
      "..0cnclCddddddddddnlll0.....",
      "..0ccnnl44445b4474nlll0000..",
      ".0clnnnl57774a5755llllggmh0.",
      ".0l0lnnlC4775b4754Cllumhhh0.",
      ".0070csDC4774a575ECClbmhhh0.",
      ".07a7lDEC4775b475ECCEChhhh0.",
      ".0a7aDCCC5554a555CCCCCC000..",
      ".07a7CclabababababanlEC0....",
      ".0F7FCcnlcccccclnnsllEC0....",
      ".0ggghcnlnnncnnlllsllEC0....",
      ".0gmmhcnlnnncnnlllsllEC0....",
      ".0hhhhlnlnnncnnlllsllCC000..",
      "..000CCllslllnncnnnlnlhhhh0.",
      "....0CEllslllnncnnnlnchmmg0.",
      "....0CEllslllnncnnnlnchggg0.",
      "....0CEllsnnlcccccclncCF7F0.",
      "....0CElnabababababalcC7a70.",
      "..000CCCCCC555a4555CCCDa7a0.",
      ".0hhhhCECCE574b5774CEDl7a70.",
      ".0hhhmblCCE575a4774CDsc0700.",
      ".0hhhmullC4574b5774Clnnl0l0.",
      ".0hmggllll5575a47775lnnnlc0.",
      "..0000llln4744b54444lnncc0..",
      ".....0lllnddddddddddClcnc0..",
      "......0ncn6666666666dncc0...",
      ".......06l66314633336l00....",
      ".......0666611111333160.....",
      ".......0yy63hhhhg611yy0.....",
      ".......0yyyhhgggmhyyAz0.....",
      ".......0yyAhglcnhghyAz0.....",
      ".......0yyAoBhhhgkhyAz0.....",
      ".......0yyAhh7hg7ggyAz0.....",
      "........0yAhg0hg0hgyz0......",
      "........0yAhghmmggAAz0......",
      "........0yyAAhgggAAAz0......",
      ".........0ybbbbbbbby0.......",
      "..........0bcb14bcb0........",
      "..........0b00bb00a0........",
      "...........0.0ba0.0.........",
    ],
    13: [
      ".......0a0.00a00.0b0...000..",
      ".......0b00b0b0b00b0..029G0.",
      ".......0aaaaaaaaaab0..029G0.",
      ".......0abcab4abcdb0..029G0.",
      ".......0bbbbbbbbbbb0..029G0.",
      ".......0HggggghhmhH0..029G0.",
      ".......0HhIIghIImhH0..029G0.",
      ".......0Hgh0gmh0hoH0..029G0.",
      ".......0HhhhhhohhhH0..029G0.",
      ".......0JKJJJoJJJKH0..029G0.",
      "......00HKKKHsJKHK00..029G0.",
      ".....0616HHKKJKKH6660.029G0.",
      "....00l605JKHKHH5l0l00029G0.",
      "...0Cccl66HHKKHH6nnlnl029G0.",
      "..0DCcnnl660HH506lllll029G0.",
      ".0DECcnsla665516lanlll029G00",
      ".0DCcnnlnla6116lanllcldbnddb",
      "0DEECcnlnnla66lallllllbbbbbu",
      "0DEECcnsnlb5dab5bnlldbggmh00",
      "0DEC0lnlnlb45a45bnlsdbmhmh0.",
      "0DC0a0llnlb44575bnlsdbmhhh0.",
      "0C00a00snlb45a45bnlsbbhhhh0.",
      "00aadd0lnlb54555bnlsnl00w0..",
      "00n4nnn0llabbcbbbnllll0adb0.",
      "00ddddbgmlb44445bnllll0bbb0.",
      "0C0bbu0hmlb44775bnllll0000..",
      "0CC000mhhlb54775blllll00000.",
      ".00000lllllb57745blhhm000CC0",
      "..0000llllnb57744blmh0ubb0C0",
      ".0bbb0llllnb54444blmgbdddd00",
      ".0bda0llllnbbbcbball0nnn4n00",
      "..0w00lnslnb55545blnl0ddaa00",
      ".0hhhhbbslnb54a54blns00a00C0",
      ".0hhhmbdslnb57544blnll0a0CD0",
      ".0hmhmbdslnb54a54blnlnl0CED0",
      "00hmggbdllnb5bad5blnsncCEED0",
      "ubbbbbllllllal66alnnlncCEED0",
      "bddnbdlcllnal6116alnlnncCD0.",
      "00G920lllnal615566alsncCED0.",
      ".0G920lllll605HH066lnncCD0..",
      ".0G920lnlnn6HHKKHH66lccC0...",
      ".0G92000l0l5HHKHKJ506l00....",
      ".0G920.0666HKKJKKHH6160.....",
      ".0G920..00KHKJsHKKKH00......",
      ".0G920..0HKJJJoJJJKJ0.......",
      ".0G920..0HhhhohhhhhH0.......",
      ".0G920..0Hoh0hmg0hgH0.......",
      ".0G920..0HhmIIhgIIhH0.......",
      ".0G920..0HhmhhgggggH0.......",
      ".0G920..0bbbbbbbbbbb0.......",
      ".0G920..0bdcba4bacba0.......",
      ".0G920..0baaaaaaaaaa0.......",
      ".0G920..0b00b0b0b00b0.......",
      "..000...0b0.00a00.0a0.......",
    ],
  };
  const suitCol = (ink, suit) => (ink.suit ? ink.suit[suit] : G.isRed(suit) ? ink.red : ink.black);
  G.suitColour = (suit) => suitCol(G.cardInk || {}, suit) || (G.isRed(suit) ? P.red : P.ink);
  // full-length, double-headed figure: the top half is drawn, the bottom half is the same turned upside down
  function drawCourt(x, suit, rank, ink) {
    const art = COURT_ART[rank], X0 = 8, Y0 = 4;
    for (let ry = 0; ry < art.length; ry++) {
      const row = art[ry];
      for (let cx = 0; cx < row.length; cx++) {
        const ch = row[cx];
        if (ch === '.') continue;
        x.fillStyle = ch === '0' && ink.courtLine ? ink.courtLine : COURT_PAL[COURT_KEY.indexOf(ch)];
        x.fillRect(X0 + cx, Y0 + ry, 1, 1);
      }
    }
  }

  // ---------- Aces: one clean, centred suit ----------
  function drawAce(x, suit, ink) {
    const col = suitCol(ink, suit);
    blit(x, BIG[SUITS[suit]], Math.floor(CW / 2 - 10.5), Math.floor(CH / 2 - 10.5), col, 3);
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
