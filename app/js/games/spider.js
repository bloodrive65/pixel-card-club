// Pixel Card Club - Spider Solitaire: two decks, ten columns, 1, 2 or 4 suits, undo, hints, Windows-style scoring.
// Rules: Wikipedia "Spider (solitaire)" (54-card deal, 50-card stock dealt 10 at a time only when no column is empty,
// 500-point start, -1 per move, +100 per completed suit) and Bicycle "Spider Solitaire".
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui, input = G.input;
  const DOWN_OFF = 4;
  // wide (landscape) table by default; lay() swaps in the upright (portrait) layout:
  // ten overlapping columns across the screen, stock + completed runs above, buttons below
  let COLW, X0, TOP, STOCK, BOTTOM, RUNS;
  function lay() {
    if (G.portrait) { COLW = 35; X0 = 1; TOP = 118; STOCK = { x: 6, y: 40 }; BOTTOM = 92; RUNS = { x: 100, y: 52, pitch: 30 }; }
    else { COLW = 48; X0 = 146; TOP = 28; STOCK = { x: 14, y: 256 }; BOTTOM = 6; RUNS = null; }
  }
  lay();
  const colX = (i) => X0 + i * COLW;
  const FX = () => (G.portrait ? G.W / 2 : G.W / 2 + 70);
  const SUIT_OPTS = [1, 2, 4];

  const scene = (G.Spider = {
    title: 'SPIDER',
    bookChapter: 'spider',
    enter() { this.newGame(); },
    newGame() {
      const S = G.settings;
      this.suits = SUIT_OPTS.includes(S.spiderSuits) ? S.spiderSuits : 1;
      // two packs: in 1-suit play every card is a spade, in 2-suit play spades and hearts
      this.deck = G.shuffle(G.makeDeck(2));
      const map1 = [0, 0, 0, 0], map2 = [0, 1, 1, 0];
      this.deck.forEach((c) => {
        if (this.suits === 1) c.suit = map1[c.suit];
        if (this.suits === 2) c.suit = map2[c.suit];
        c.x = STOCK.x; c.y = STOCK.y; c.faceUp = false; c.shownFace = false; c.flip = 1; c._drag = false; c.hidden = false; c.lift = 0;
      });
      this.byId = {}; this.deck.forEach((c) => (this.byId[c.id] = c));
      this.tab = [...Array(10)].map((_, i) => ({ type: 'tab', i, cards: [] }));
      this.stock = { type: 'stock', cards: [] };
      this.done = { type: 'done', cards: [], runs: [] };
      this.piles = [this.stock, this.done, ...this.tab];
      const cards = this.deck.slice();
      // 54 cards: six in each of the first four columns, five in the rest
      let k = 0;
      for (let r = 0; r < 6; r++) for (let col = 0; col < 10; col++) {
        if (r === 5 && col >= 4) continue;
        const c = cards.pop(); this.tab[col].cards.push(c); c.delay = 0.15 + k++ * 0.018;
      }
      this.stock.cards = cards;
      this.dealT = 0.15 + k * 0.018 + 0.25;
      this.score = 500; this.moves = 0; this.time = 0; this.undoStack = []; this.hintShow = null; this.hintIdx = 0;
      this.won = false; this.paused = false; this.drag = null; this.started = false; this.celebrate = null;
      G.audio.sfx('shuffle');
      G.bump('spider_played');
    },
    top(p) { return p.cards[p.cards.length - 1]; },
    // a card can be picked up if it and everything on it is a same-suit descending run
    movableFrom(t, i) {
      const cs = t.cards;
      if (!cs[i] || !cs[i].faceUp) return false;
      for (let k = i; k < cs.length - 1; k++) if (cs[k + 1].suit !== cs[k].suit || cs[k + 1].rank !== cs[k].rank - 1) return false;
      return true;
    },
    // build down by rank regardless of suit, any card or run on an empty column
    canDrop(card, t) { const top = this.top(t); return !top || (top.faceUp && top.rank === card.rank + 1); },
    snapshot() { return { piles: this.piles.map((p) => p.cards.map((c) => [c.id, c.faceUp])), runs: this.done.runs.slice(), score: this.score }; },
    pushUndo() { this.undoStack.push(this.snapshot()); if (this.undoStack.length > 400) this.undoStack.shift(); },
    undo() {
      const s = this.undoStack.pop(); if (!s) { G.audio.sfx('error'); return; }
      this.piles.forEach((p, i) => { p.cards = s.piles[i].map(([id, fu]) => { const c = this.byId[id]; c.faceUp = fu; c.hidden = false; return c; }); });
      // Windows scoring: an undo counts as a move (-1); undoing a finished run takes back its 100
      this.score -= 1 + 100 * (this.done.runs.length - s.runs.length);
      this.done.runs = s.runs; this.moves++; this.hintShow = null;
      G.audio.sfx('place');
    },
    doMove(cards, from, dest) {
      this.pushUndo();
      from.cards.splice(from.cards.length - cards.length, cards.length);
      dest.cards.push(...cards);
      this.moves++; this.score--; this.started = true; this.hintShow = null;
      G.audio.sfx('place');
      this.afterChange([from, dest]);
    },
    afterChange(piles) {
      for (const t of piles) if (t.type === 'tab') this.checkRun(t);
      for (const t of this.tab) { const c = this.top(t); if (c && !c.faceUp) c.faceUp = true; }
      if (this.done.runs.length === 8 && !this.won) this.win();
    },
    // a full King-to-Ace run of one suit leaves the tableau
    checkRun(t) {
      const cs = t.cards; if (cs.length < 13) return;
      const s = cs.length - 13;
      if (cs[s].rank !== 13 || !this.movableFrom(t, s)) return;
      const run = cs.splice(s, 13);
      this.done.cards.push(...run); this.done.runs.push(run[0].suit);
      run.forEach((c, i) => { c.delay = (12 - i) * 0.03; });
      this.score += 100;
      G.audio.sfx('book');
      G.floatText('+100', colX(t.i) + CW / 2, TOP + 40, P.lime);
    },
    canDeal() { return this.stock.cards.length > 0 && this.tab.every((t) => t.cards.length); },
    deal() {
      if (!this.stock.cards.length) { G.audio.sfx('error'); return; }
      if (!this.canDeal()) { G.audio.sfx('error'); G.floatText('FILL EVERY COLUMN FIRST', FX(), 200, P.orange, 'small'); return; }
      this.pushUndo();
      this.tab.forEach((t, i) => { const c = this.stock.cards.pop(); c.faceUp = true; t.cards.push(c); c.delay = i * 0.05; });
      this.moves++; this.score--; this.started = true; this.hintShow = null;
      this.afterChange(this.tab);
    },
    // ---------- hints ----------
    allMoves() {
      const out = [];
      for (const s of this.tab) {
        for (let i = 0; i < s.cards.length; i++) {
          if (!this.movableFrom(s, i)) continue;
          const card = s.cards[i], below = s.cards[i - 1];
          for (const d of this.tab) {
            if (d === s || !this.canDrop(card, d)) continue;
            const dt = this.top(d);
            const reveals = below && !below.faceUp;
            const sameSuit = dt && dt.suit === card.suit;
            const breaks = below && below.faceUp && below.rank === card.rank + 1 && (below.suit === card.suit || !sameSuit);
            if (breaks) continue; // just shuffling a card between equal homes
            if (!dt && i === 0) continue; // whole column to an empty column
            let w = (sameSuit ? 30 : 0) + (reveals ? 20 : 0) + (dt ? 10 : 0) + (i === 0 ? 8 : 0) + (s.cards.length - i);
            out.push({ card, from: s, dest: d, cards: s.cards.slice(i), w });
          }
        }
      }
      return out.sort((a, b) => b.w - a.w);
    },
    bestDest(cards, from) {
      const lead = cards[0];
      const homes = this.tab.filter((t) => t !== from && t.cards.length && this.canDrop(lead, t));
      const same = homes.find((t) => this.top(t).suit === lead.suit);
      if (same) return same;
      if (homes.length) return homes[0];
      const base = from.cards.indexOf(lead) === 0;
      if (!base) { const e = this.tab.find((t) => !t.cards.length); if (e) return e; }
      return null;
    },
    hint() {
      const m = this.allMoves();
      if (m.length) { const h = m[this.hintIdx++ % m.length]; this.hintShow = { card: h.card, dest: h.dest, t: 1.6 }; return; }
      if (this.stock.cards.length) { this.hintShow = { stock: true, t: 1.6 }; return; }
      G.audio.sfx('error'); G.floatText('NO MOVES LEFT - TRY UNDO', FX(), 200, P.orange, 'small');
    },
    win() {
      this.won = true;
      G.bump('spider_won');
      const k = 'spider_best' + this.suits;
      const best = G.store.get(k, 0); this.newBest = this.score > best; if (this.newBest) G.store.set(k, this.score);
      G.audio.sfx('win');
      this.celebrate = { t: 0, items: [] };
      this.done.cards.forEach((c, i) => { c.hidden = true; this.celebrate.items.push({ c, x: STOCK.x, y: 140, vx: 40 + Math.random() * 160, vy: -80 - Math.random() * 160, d: i * 0.04 }); });
    },
    // ---------- layout ----------
    upOff(t) {
      const down = t.cards.filter((c) => !c.faceUp).length, up = t.cards.length - down;
      let off = G.portrait ? 18 : 13;
      const avail = G.H - BOTTOM - TOP - CH - down * DOWN_OFF;
      if (up > 1 && (up - 1) * off > avail) off = Math.max(5, Math.floor(avail / (up - 1)));
      return off;
    },
    layout() {
      const deals = Math.ceil(this.stock.cards.length / 10);
      this.stock.cards.forEach((c, i) => { const d = Math.floor(i / 10); G.place(c, STOCK.x + d * 8, STOCK.y, i, false); });
      this.done.cards.forEach((c, i) => { const r = Math.floor(i / 13); G.place(c, RUNS ? RUNS.x + r * RUNS.pitch - 8 : 8 + (r % 4) * 30 - 8, RUNS ? RUNS.y - 20 : 186, 500 + i, true); if (c.delay <= 0 && Math.abs(c.x - c.tx) < 2 && Math.abs(c.y - c.ty) < 2) c.hidden = true; });
      this.tab.forEach((t) => {
        const off = this.upOff(t); let y = TOP;
        t.cards.forEach((c, i) => { if (!c._drag) G.place(c, colX(t.i), y, 100 + i); y += c.faceUp ? off : DOWN_OFF; });
      });
      this.deals = deals;
    },
    pick(mx, my) {
      for (const t of this.tab) for (let i = t.cards.length - 1; i >= 0; i--) { const c = t.cards[i]; if (G.inRect(mx, my, c.tx, c.ty, CW, CH)) return { c, t, i }; }
      return null;
    },
    handleInput() {
      if (this.won || this.dealT > 0) return;
      if (input.pressed && !ui.blocked() && !ui.modal) {
        if (G.inRect(input.x, input.y, STOCK.x, STOCK.y, CW + 40, CH)) { this.deal(); input.pressed = false; return; }
        const hit = this.pick(input.x, input.y);
        if (!hit) return;
        if (!this.movableFrom(hit.t, hit.i)) { if (hit.c.faceUp) G.audio.sfx('error'); return; }
        const cards = hit.t.cards.slice(hit.i);
        this.drag = { cards, from: hit.t, ox: input.x - hit.c.tx, oy: input.y - hit.c.ty, gaps: cards.map((k) => k.ty - hit.c.ty) };
        cards.forEach((k) => (k._drag = true)); this.hintShow = null;
      }
      if (this.drag) {
        const d = this.drag;
        if (input.moved) d.cards.forEach((k, j) => { k.x = k.tx = input.x - d.ox; k.y = k.ty = input.y - d.oy + d.gaps[j]; k.z = 1000 + j; });
        if (!input.down) {
          d.cards.forEach((k) => (k._drag = false));
          this.drag = null;
          let dest = null;
          if (!input.moved) dest = this.bestDest(d.cards, d.from);
          else {
            const lead = d.cards[0]; let bestA = 0;
            for (const t of this.tab) {
              if (t === d.from || !this.canDrop(lead, t)) continue;
              const tp = this.top(t), px = colX(t.i), py = tp ? tp.ty : TOP;
              const a = Math.max(0, Math.min(lead.x + CW, px + CW) - Math.max(lead.x, px)) * Math.max(0, Math.min(lead.y + CH, py + CH) - Math.max(lead.y, py));
              if (a > bestA) { bestA = a; dest = t; }
            }
          }
          if (dest) this.doMove(d.cards, d.from, dest);
          else if (!input.moved) G.audio.sfx('error');
        }
      }
    },
    frame(dt) {
      lay();
      if (this.paused) ui.modal = true;
      if (!this.paused && !this.won && this.started) this.time += dt;
      if (this.dealT > 0) { this.dealT -= dt; if (this.dealT <= 0) this.tab.forEach((t) => (this.top(t).faceUp = true)); }
      if (!this.paused) this.handleInput();
      this.layout();
      G.updateCards(this.deck, dt, 16);

      ui.felt();
      this.tab.forEach((t, i) => G.drawSlot(colX(i), TOP, ''));
      const hs = this.hintShow;
      const blink = hs && hs.t > 0 && Math.floor(hs.t * 6) % 2 === 0;
      this.drawSide();
      G.drawCards(this.deck, (c) => (blink && hs.card === c ? { highlight: P.cyan } : null));
      if (hs && hs.t > 0) {
        hs.t -= dt;
        if (blink) {
          if (hs.dest) { const t = this.top(hs.dest); G.outline(colX(hs.dest.i) - 1, (t ? t.ty : TOP) - 1, CW + 2, CH + 2, P.gold, 2); }
          if (hs.stock) G.outline(STOCK.x - 1 + (this.deals - 1) * 8, STOCK.y - 1, CW + 2, CH + 2, P.gold, 2);
        }
      }
      if (this.celebrate) this.drawCelebration(dt);
      G.drawFloaters(dt);
      const mm = Math.floor(this.time / 60), ss = Math.floor(this.time % 60);
      const menu = ui.topBar('SPIDER', [
        { label: 'SUITS', value: this.suits, color: P.cyan },
        { label: 'MOVES', value: this.moves },
        { label: 'TIME', value: mm + ':' + String(ss).padStart(2, '0') },
        { label: 'SCORE', value: this.score, color: P.gold }
      ]);
      if (menu && !this.paused) { this.paused = true; ui.modal = true; }
      if (this.paused) {
        const act = ui.pauseMenu(this);
        if (act === 'resume') this.paused = false;
        if (act === 'restart') { this.paused = false; this.newGame(); }
        if (act === 'menu') { this.paused = false; G.go(G.Menu); }
      } else if (this.won && this.celebrate && (this.celebrate.t > 6 || (this.celebrate.t > 1 && input.pressed))) {
        input.pressed = false;
        const act = ui.dialog('YOU WIN', [
          { text: 'SCORE ' + this.score + (this.newBest ? '  - NEW BEST' : ''), color: this.newBest ? P.lime : P.gold, font: 'big' },
          { text: this.suits + (this.suits === 1 ? ' SUIT' : ' SUITS') + '   TIME ' + mm + ':' + String(ss).padStart(2, '0') + '   MOVES ' + this.moves, color: P.silver },
          { text: 'SPIDER WINS ' + G.store.get('spider_won', 0) + ' OF ' + G.store.get('spider_played', 0), color: P.silver }
        ], [{ label: 'DEAL AGAIN', act: 'new', theme: 'green', key: 'Enter' }, { label: 'MENU', act: 'menu', theme: 'red' }], { w: 320, dim: 0.3 });
        if (act === 'new') this.newGame();
        if (act === 'menu') G.go(G.Menu);
      }
    },
    drawCelebration(dt) {
      const cb = this.celebrate; cb.t += dt;
      for (const it of cb.items) {
        if (it.d > 0) { it.d -= dt; continue; }
        it.vy += 500 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.y > G.H - CH) { it.y = G.H - CH; it.vy *= -0.75; }
        if (it.x < G.W + 10) G.ctx.drawImage(G.faceImg(it.c), Math.round(it.x), Math.round(it.y));
      }
    },
    drawSidePortrait() {
      const n = Math.ceil(this.stock.cards.length / 10);
      G.text(n + (n === 1 ? ' DEAL LEFT' : ' DEALS LEFT'), STOCK.x, STOCK.y + CH + 4, this.canDeal() ? P.felt4 : P.orange, 'small');
      if (!this.stock.cards.length) G.drawSlot(STOCK.x, STOCK.y, 'EMPTY');
      const over = !ui.modal && G.inRect(input.x, input.y, STOCK.x, STOCK.y, CW + 40, CH) && this.stock.cards.length;
      if (over) { ui.cursorHand = true; G.outline(STOCK.x - 2, STOCK.y - 2, CW + 4 + (this.deals - 1) * 8, CH + 4, P.gold, 1); }
      G.text('COMPLETED ' + this.done.runs.length + '/8', RUNS.x, RUNS.y - 12, P.felt4, 'small');
      for (let i = 0; i < 8; i++) {
        const rx = RUNS.x + i * RUNS.pitch, ry = RUNS.y;
        if (i < this.done.runs.length) { G.alpha(0.35, () => G.rect(rx + 1, ry + 2, 14, 20, P.black)); G.ctx.drawImage(G.miniCard(13, this.done.runs[i]), rx, ry); G.ctx.drawImage(G.miniCard(1, this.done.runs[i]), rx + 8, ry + 2); }
        else { G.alpha(0.5, () => G.rect(rx, ry, 22, 22, P.felt0)); G.outline(rx, ry, 22, 22, P.felt4); }
      }
      G.text('WINS ' + G.store.get('spider_won', 0) + '/' + G.store.get('spider_played', 0) + '   BEST ' + G.store.get('spider_best' + this.suits, 0), RUNS.x, RUNS.y + 30, P.silver, 'small');
      // bottom: next-game suits, then the four buttons
      const y2 = G.H - 80, y1 = G.H - 44, X0b = -G.ox, BW = G.W + G.ox * 2;
      G.rect(X0b, y2 - 6, BW, G.H - (y2 - 6), P.ink); G.rect(X0b, y2 - 6, BW, 1, P.dusk); G.rect(X0b, y2 - 7, BW, 1, P.black);
      ui.block(X0b, y2 - 7, BW, G.H - y2 + 7);
      G.text('NEXT GAME SUITS', 8, y2 + 10, P.silver, 'small');
      const cur = SUIT_OPTS.indexOf(G.settings.spiderSuits || 1);
      const ch = ui.choice(['1', '2', '4'], cur < 0 ? 0 : cur, 100, y2, 252, 28, { id: 'suits' });
      if (SUIT_OPTS[ch] !== (G.settings.spiderSuits || 1)) { G.settings.spiderSuits = SUIT_OPTS[ch]; G.saveSettings(); }
      const bw = 84, bx = (i) => 6 + i * 88;
      if (ui.button('NEW', bx(0), y1, bw, 36, { key: 'n', theme: 'gold' })) { this.newGame(); return; }
      if (ui.button('UNDO', bx(1), y1, bw, 36, { key: 'z', theme: 'blue', enabled: this.undoStack.length > 0 && !this.won })) this.undo();
      if (ui.button('HINT', bx(2), y1, bw, 36, { key: 'h', theme: 'dark', enabled: !this.won })) this.hint();
      if (ui.button('DEAL ROW', bx(3), y1, bw, 36, { key: 'd', theme: 'green', enabled: this.stock.cards.length > 0 && !this.won })) this.deal();
    },
    drawSide() {
      if (G.portrait) return this.drawSidePortrait();
      const x = 10, w = 120;
      G.panel(x - 4, TOP - 4, w + 8, 150, { fill: P.ink, hi: P.dusk });
      ui.block(x - 4, TOP - 4, w + 8, 150);
      if (ui.button('NEW DEAL', x, TOP, w, 20, { key: 'n', theme: 'gold' })) { this.newGame(); return; }
      if (ui.button('UNDO', x, TOP + 24, w, 20, { key: 'z', theme: 'blue', enabled: this.undoStack.length > 0 && !this.won })) this.undo();
      if (ui.button('HINT', x, TOP + 48, w, 20, { key: 'h', theme: 'dark', enabled: !this.won })) this.hint();
      if (ui.button('DEAL ROW', x, TOP + 72, w, 20, { key: 'd', theme: 'green', enabled: this.stock.cards.length > 0 && !this.won })) this.deal();
      G.text('NEXT GAME SUITS', x + 2, TOP + 99, P.silver, 'small');
      const cur = SUIT_OPTS.indexOf(G.settings.spiderSuits || 1);
      const ch = ui.choice(['1', '2', '4'], cur < 0 ? 0 : cur, x, TOP + 108, w, 16, { id: 'suits' });
      if (SUIT_OPTS[ch] !== (G.settings.spiderSuits || 1)) { G.settings.spiderSuits = SUIT_OPTS[ch]; G.saveSettings(); }
      G.text('WINS ' + G.store.get('spider_won', 0) + '/' + G.store.get('spider_played', 0), x + 2, TOP + 130, P.silver, 'small');
      G.text('BEST ' + G.store.get('spider_best' + this.suits, 0), x + w - 2, TOP + 130, P.gold, 'small', 'right');
      // completed runs
      G.text('COMPLETED ' + this.done.runs.length + '/8', x, 176, P.felt4, 'small');
      for (let i = 0; i < 8; i++) {
        const rx = x + (i % 4) * 30, ry = 186 + Math.floor(i / 4) * 26;
        if (i < this.done.runs.length) { G.alpha(0.35, () => G.rect(rx + 1, ry + 2, 14, 20, P.black)); G.ctx.drawImage(G.miniCard(13, this.done.runs[i]), rx, ry); G.ctx.drawImage(G.miniCard(1, this.done.runs[i]), rx + 8, ry + 2); }
        else { G.alpha(0.5, () => G.rect(rx, ry, 22, 22, P.felt0)); G.outline(rx, ry, 22, 22, P.felt4); }
      }
      G.text('STOCK - ' + Math.ceil(this.stock.cards.length / 10) + ' DEALS LEFT', x, STOCK.y - 10, this.canDeal() ? P.felt4 : P.orange, 'small');
      if (!this.stock.cards.length) G.drawSlot(STOCK.x, STOCK.y, 'EMPTY');
      const over = !ui.modal && G.inRect(input.x, input.y, STOCK.x, STOCK.y, CW + 40, CH) && this.stock.cards.length;
      if (over) { ui.cursorHand = true; G.outline(STOCK.x - 2, STOCK.y - 2, CW + 4 + (this.deals - 1) * 8, CH + 4, P.gold, 1); }
    }
  });
})();
