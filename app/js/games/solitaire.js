// Pixel Card Club - Klondike Solitaire (draw 1 or draw 3, drag & drop, click-to-move, undo, hints, auto-finish)
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui, input = G.input;
  const DOWN_OFF = 4;
  // wide (landscape) table by default; lay() swaps in the upright (portrait) layout with the buttons along the bottom
  let COLW, X0, TOP, TAB_Y, BOTTOM;
  function lay() {
    if (G.portrait) { COLW = 51; X0 = 5; TOP = 42; TAB_Y = 118; BOTTOM = 56; }
    else { COLW = 56; X0 = 150; TOP = 32; TAB_Y = 106; BOTTOM = 6; }
  }
  lay();
  const colX = (i) => X0 + i * COLW;

  const scene = (G.Solitaire = {
    title: 'SOLITAIRE',
    bookChapter: 'solitaire',
    rules: [
      '#GOAL',
      'Move all 52 cards onto the four foundations (top right), building each suit up from Ace to King.',
      '#TABLEAU',
      'The seven columns build DOWN in alternating colours (red 9 on black 10). You can move a face-up run as a group. Only a King can fill an empty column.',
      '#STOCK',
      'Click the stock (top left) to turn cards onto the waste pile: 1 at a time or 3 at a time, chosen in the menu. When the stock runs out, click it to recycle the waste.',
      '#CONTROLS',
      'Drag cards to move them, or just click a card to send it to the best legal spot. UNDO (Z) takes back a move, HINT (H) shows a move, AUTO (A) finishes once every card is face up.',
      '#SCORING',
      'Waste to tableau +5, to foundation +10, turning a card +5, foundation back to tableau -15, recycling the stock in draw-1 -100. Faster wins earn a time bonus.'
    ],
    enter() { this.newGame(); },
    newGame() {
      this.drawN = G.settings.drawThree ? 3 : 1;
      this.deck = G.shuffle(G.makeDeck(1));
      this.stock = { type: 'stock', cards: [] }; this.waste = { type: 'waste', cards: [] };
      this.found = [0, 1, 2, 3].map((i) => ({ type: 'found', i, cards: [] }));
      this.tab = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ type: 'tab', i, cards: [] }));
      this.piles = [this.stock, this.waste, ...this.found, ...this.tab];
      this.byId = {}; this.deck.forEach((c) => (this.byId[c.id] = c));
      this.score = 0; this.moves = 0; this.time = 0; this.undoStack = []; this.hintShow = null;
      this.won = false; this.celebrate = null; this.paused = false; this.auto = false; this.autoT = 0; this.drag = null; this.started = false;
      // deal: card i in row r
      const order = [];
      for (let r = 0; r < 7; r++) for (let c = r; c < 7; c++) order.push(c);
      let k = 0;
      for (const c of this.deck) { c.x = colX(0); c.y = TOP; c.faceUp = false; c.shownFace = false; c.flip = 1; c._drag = false; }
      const cards = this.deck.slice();
      order.forEach((col, i) => { const card = cards.pop(); this.tab[col].cards.push(card); card.delay = 0.15 + i * 0.035; });
      this.tab.forEach((t) => (t.cards[t.cards.length - 1]._flipLater = true));
      this.stock.cards = cards;
      this.dealT = 0.15 + order.length * 0.035 + 0.2;
      G.audio.sfx('shuffle');
      G.store.set('sol_played', G.store.get('sol_played', 0) + 1);
    },
    // ---------- rules ----------
    top(p) { return p.cards[p.cards.length - 1]; },
    canFound(card, f) {
      const t = this.top(f);
      return t ? t.suit === card.suit && card.rank === t.rank + 1 : card.rank === 1;
    },
    canTab(card, t) {
      const top = this.top(t);
      if (!top) return card.rank === 13;
      return top.faceUp && G.isRed(top.suit) !== G.isRed(card.suit) && card.rank === top.rank - 1;
    },
    legal(cards, dest) {
      if (dest.type === 'found') return cards.length === 1 && this.canFound(cards[0], dest);
      if (dest.type === 'tab') return this.canTab(cards[0], dest);
      return false;
    },
    snapshot() {
      return { piles: this.piles.map((p) => p.cards.map((c) => [c.id, c.faceUp])), score: this.score, moves: this.moves };
    },
    pushUndo() { this.undoStack.push(this.snapshot()); if (this.undoStack.length > 300) this.undoStack.shift(); },
    undo() {
      const s = this.undoStack.pop(); if (!s) { G.audio.sfx('error'); return; }
      this.piles.forEach((p, i) => { p.cards = s.piles[i].map(([id, fu]) => { const c = this.byId[id]; c.faceUp = fu; return c; }); });
      this.score = s.score; this.moves = s.moves + 1; this.hintShow = null; this.auto = false;
      G.audio.sfx('place');
    },
    doMove(cards, from, dest, silent) {
      this.pushUndo();
      from.cards.splice(from.cards.length - cards.length, cards.length);
      dest.cards.push(...cards);
      this.moves++; this.started = true; this.hintShow = null;
      if (from.type === 'waste' && dest.type === 'tab') this.score += 5;
      if (dest.type === 'found' && from.type !== 'found') this.score += 10;
      if (from.type === 'found' && dest.type === 'tab') this.score = Math.max(0, this.score - 15);
      // flip newly exposed tableau card
      const t = this.top(from);
      if (from.type === 'tab' && t && !t.faceUp) { t.faceUp = true; this.score += 5; }
      if (!silent) G.audio.sfx('place');
      if (this.found.every((f) => f.cards.length === 13)) this.win();
    },
    clickStock() {
      this.hintShow = null;
      if (this.stock.cards.length) {
        this.pushUndo();
        const n = Math.min(this.drawN, this.stock.cards.length);
        for (let i = 0; i < n; i++) { const c = this.stock.cards.pop(); c.faceUp = true; this.waste.cards.push(c); c.delay = i * 0.06; }
        this.moves++; this.started = true;
        G.audio.sfx('deal');
      } else if (this.waste.cards.length) {
        this.pushUndo();
        this.stock.cards = this.waste.cards.reverse(); this.waste.cards = [];
        this.stock.cards.forEach((c) => (c.faceUp = false));
        if (this.drawN === 1) this.score = Math.max(0, this.score - 100);
        this.moves++; G.audio.sfx('shuffle');
      }
    },
    // best destination for click-to-move
    bestDest(cards, from) {
      if (cards.length === 1) for (const f of this.found) if (f !== from && this.canFound(cards[0], f)) return f;
      const tabs = this.tab.filter((t) => t !== from && t.cards.length && this.canTab(cards[0], t));
      if (tabs.length) return tabs[0];
      const isBase = from.type === 'tab' && from.cards.indexOf(cards[0]) === 0;
      if (cards[0].rank === 13 && !isBase) { const e = this.tab.find((t) => t !== from && !t.cards.length); if (e) return e; }
      return null;
    },
    findHint() {
      // 1. anything to a foundation
      const sources = [this.waste, ...this.tab];
      for (const s of sources) { const t = this.top(s); if (t && t.faceUp) for (const f of this.found) if (this.canFound(t, f)) return { card: t, dest: f }; }
      // 2. tableau runs that reveal a card or move a king off a pile
      for (const s of this.tab) {
        const fi = s.cards.findIndex((c) => c.faceUp); if (fi < 0) continue;
        const card = s.cards[fi];
        for (const d of this.tab) {
          if (d === s) continue;
          if (!d.cards.length && (fi === 0 || card.rank !== 13)) continue;
          if (this.canTab(card, d)) return { card, dest: d };
        }
      }
      // 3. waste to tableau
      const w = this.top(this.waste);
      if (w) for (const d of this.tab) if (this.canTab(w, d)) return { card: w, dest: d };
      // 4. draw
      if (this.stock.cards.length || this.waste.cards.length) return { stock: true };
      return null;
    },
    canAutoFinish() { return !this.won && !this.stock.cards.length && !this.waste.cards.length && this.tab.every((t) => t.cards.every((c) => c.faceUp)) && this.found.some((f) => f.cards.length < 13); },
    autoStep() {
      let best = null;
      for (const s of [this.waste, ...this.tab]) { const t = this.top(s); if (!t) continue; for (const f of this.found) if (this.canFound(t, f) && (!best || t.rank < best.card.rank)) best = { card: t, from: s, dest: f }; }
      if (best) this.doMove([best.card], best.from, best.dest); else this.auto = false;
    },
    win() {
      this.won = true; this.auto = false;
      const bonus = this.time > 30 ? Math.floor(700000 / this.time) : 0;
      this.bonus = bonus; this.score += bonus;
      G.store.set('sol_won', G.store.get('sol_won', 0) + 1);
      const best = G.store.get('sol_best', 0); this.newBest = this.score > best; if (this.newBest) G.store.set('sol_best', this.score);
      G.audio.sfx('win');
      this.startCelebration();
    },
    // ---------- classic bouncing-card celebration ----------
    startCelebration() {
      const [c, x] = G.makeCanvas(G.W, G.H);
      this.celebrate = { canvas: c, ctx: x, items: [], next: 0, t: 0, order: [] };
      for (let r = 13; r >= 1; r--) for (let f = 0; f < 4; f++) this.celebrate.order.push({ f, r });
    },
    updateCelebration(dt) {
      const cb = this.celebrate; cb.t += dt;
      cb.next -= dt;
      if (cb.next <= 0 && cb.order.length) {
        const o = cb.order.shift(); const card = this.found[o.f].cards[o.r - 1];
        cb.items.push({ card, x: colX(3 + o.f), y: TOP, vx: (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 120), vy: -Math.random() * 120 });
        cb.next = 0.32;
      }
      for (const it of cb.items) {
        if (it.dead) continue;
        for (let s = 0; s < 3; s++) {
          const h = dt / 3;
          it.vy += 600 * h; it.x += it.vx * h; it.y += it.vy * h;
          if (it.y > G.H - CH) { it.y = G.H - CH; it.vy *= -0.78; }
          cb.ctx.drawImage(G.faceImg(it.card), Math.round(it.x), Math.round(it.y));
        }
        if (it.x < -CW || it.x > G.W) it.dead = true;
      }
      G.ctx.drawImage(cb.canvas, 0, 0);
    },
    // ---------- layout ----------
    pileXY(p) {
      if (p.type === 'stock') return [colX(0), TOP];
      if (p.type === 'waste') return [colX(1), TOP];
      if (p.type === 'found') return [colX(3 + p.i), TOP];
      return [colX(p.i), TAB_Y];
    },
    tabOffsets(t) {
      const down = t.cards.filter((c) => !c.faceUp).length, up = t.cards.length - down;
      let upOff = G.portrait ? 18 : 13;
      const avail = G.H - BOTTOM - TAB_Y - CH - down * DOWN_OFF;
      if (up > 1 && (up - 1) * upOff > avail) upOff = Math.max(6, Math.floor(avail / (up - 1)));
      return upOff;
    },
    layout() {
      let z = 0;
      const [sx, sy] = this.pileXY(this.stock);
      this.stock.cards.forEach((c, i) => G.place(c, sx - Math.min(3, Math.floor(i / 8)), sy - Math.min(3, Math.floor(i / 8)), z++, false));
      const [wx, wy] = this.pileXY(this.waste);
      const wn = this.waste.cards.length;
      this.waste.cards.forEach((c, i) => {
        const fanIdx = this.drawN === 3 ? Math.max(0, i - (wn - 3)) : 0;
        if (!c._drag) G.place(c, wx + fanIdx * 13, wy, 100 + i, true);
      });
      this.found.forEach((f) => { const [fx, fy] = this.pileXY(f); f.cards.forEach((c, i) => { if (!c._drag) G.place(c, fx, fy, 200 + i, true); }); });
      this.tab.forEach((t) => {
        const [tx, ty] = this.pileXY(t); const upOff = this.tabOffsets(t);
        let y = ty;
        t.cards.forEach((c, i) => { if (!c._drag) G.place(c, tx, y, 300 + i); y += c.faceUp ? upOff : DOWN_OFF; });
      });
    },
    // card under pointer (topmost)
    pick(mx, my) {
      const cand = [];
      for (const p of this.piles) p.cards.forEach((c, i) => { if (G.inRect(mx, my, c.tx, c.ty, CW, CH)) cand.push({ c, p, i }); });
      if (!cand.length) return null;
      cand.sort((a, b) => b.c.z - a.c.z);
      return cand[0];
    },
    pileAt(mx, my) {
      for (const p of this.piles) { const [x, y] = this.pileXY(p); const h = p.type === 'tab' ? Math.max(CH, (this.top(p) ? this.top(p).ty - y + CH : CH)) : CH; if (G.inRect(mx, my, x, y, p.type === 'waste' ? CW + 26 : CW, h)) return p; }
      return null;
    },
    handleInput() {
      if (this.won || this.auto || this.dealT > 0) return;
      if (input.pressed && !ui.blocked() && !ui.modal) {
        const hit = this.pick(input.x, input.y);
        const pile = hit ? hit.p : this.pileAt(input.x, input.y);
        if (pile === this.stock) { this.clickStock(); return; }
        if (!hit) return;
        const { c, p, i } = hit;
        if (!c.faceUp) return;
        if (p.type === 'waste' && i !== p.cards.length - 1) return;
        if (p.type === 'found' && i !== p.cards.length - 1) return;
        const cards = p.type === 'tab' ? p.cards.slice(i) : [c];
        this.drag = { cards, from: p, ox: input.x - c.tx, oy: input.y - c.ty, gaps: cards.map((k) => k.ty - c.ty) };
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
            // pile with most overlap that accepts the cards
            const lead = d.cards[0]; let bestA = 0;
            for (const p of [...this.found, ...this.tab]) {
              if (p === d.from) continue;
              const [px, py0] = this.pileXY(p); const t = this.top(p); const py = t ? t.ty : py0;
              const ox = Math.max(0, Math.min(lead.x + CW, px + CW) - Math.max(lead.x, px));
              const oy = Math.max(0, Math.min(lead.y + CH, py + CH) - Math.max(lead.y, py));
              const a = ox * oy;
              if (a > bestA && this.legal(d.cards, p)) { bestA = a; dest = p; }
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
      if (this.dealT > 0) {
        this.dealT -= dt;
        if (this.dealT <= 0) this.tab.forEach((t) => { const c = this.top(t); c.faceUp = true; });
      }
      if (!this.paused) this.handleInput();
      if (this.auto && !this.paused) { this.autoT -= dt; if (this.autoT <= 0) { this.autoT = 0.09; this.autoStep(); } }
      this.layout();
      G.updateCards(this.deck, dt, this.auto ? 18 : 16);

      ui.felt();
      // slots
      G.drawSlot(colX(0), TOP, this.waste.cards.length ? 'RECYCLE' : '');
      G.drawSlot(colX(1), TOP, '');
      this.found.forEach((f, i) => G.drawSlot(colX(3 + i), TOP, 'A'));
      this.tab.forEach((t, i) => G.drawSlot(colX(i), TAB_Y, 'K'));
      // hint highlight
      const hs = this.hintShow;
      G.drawCards(this.deck, (c) => {
        if (hs && hs.t > 0 && Math.floor(hs.t * 6) % 2 === 0 && hs.card === c) return { highlight: P.cyan };
        return null;
      });
      if (hs && hs.t > 0) {
        hs.t -= dt;
        if (Math.floor(hs.t * 6) % 2 === 0) {
          if (hs.dest) { const [x, y0] = this.pileXY(hs.dest); const t = this.top(hs.dest); G.outline(x - 1, (t ? t.ty : y0) - 1, CW + 2, CH + 2, P.gold, 2); }
          if (hs.stock) { const n = this.stock.cards.length, off = n ? Math.min(3, Math.floor((n - 1) / 8)) : 0; G.outline(colX(0) - off - 1, TOP - off - 1, CW + 2, CH + 2, P.gold, 2); }
        }
      }
      if (this.celebrate) this.updateCelebration(dt);
      this.drawSide();
      const mm = Math.floor(this.time / 60), ss = Math.floor(this.time % 60);
      const menu = ui.topBar('SOLITAIRE', [
        { label: 'DRAW', value: this.drawN, color: P.cyan },
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
      } else if (this.won && this.celebrate && (this.celebrate.t > 9 || (this.celebrate.t > 1 && input.pressed))) {
        input.pressed = false;
        const act = ui.dialog('YOU WIN', [
          { text: 'SCORE ' + this.score + (this.newBest ? '  - NEW BEST' : ''), color: this.newBest ? P.lime : P.gold, font: 'big' },
          { text: 'TIME ' + mm + ':' + String(ss).padStart(2, '0') + '   MOVES ' + this.moves + '   TIME BONUS ' + this.bonus, color: P.silver },
          { text: 'GAMES WON ' + G.store.get('sol_won', 0) + ' OF ' + G.store.get('sol_played', 0), color: P.silver }
        ], [{ label: 'DEAL AGAIN', act: 'new', theme: 'green', key: 'Enter' }, { label: 'MENU', act: 'menu', theme: 'red' }], { w: 320, dim: 0.3 });
        this._winDialog = true;
        if (act === 'new') this.newGame();
        if (act === 'menu') G.go(G.Menu);
      }
    },
    drawSidePortrait() {
      const y2 = G.H - 48, y1 = G.H - 26;
      G.rect(0, y2 - 8, G.W, G.H - (y2 - 8), P.ink); G.rect(0, y2 - 8, G.W, 1, P.dusk); G.rect(0, y2 - 8 - 1, G.W, 1, P.black);
      ui.block(0, y2 - 8, G.W, G.H - y2 + 8);
      const stats = [['STOCK', String(this.stock.cards.length), P.white], ['FOUND', this.found.reduce((a, f) => a + f.cards.length, 0) + '/52', P.white], ['WINS', G.store.get('sol_won', 0) + '/' + G.store.get('sol_played', 0), P.white], ['BEST', String(G.store.get('sol_best', 0)), P.gold]];
      stats.forEach(([l, v, c], i) => { const x = 8 + i * 88; G.text(l, x, y2 + 2, P.silver, 'small'); G.text(v, x + G.textWidth(l, 'small') + 4, y2 + 2, c, 'small'); });
      const bw = 84, bx = (i) => 6 + i * 88;
      if (ui.button('NEW', bx(0), y1, bw, 20, { key: 'n', theme: 'gold' })) { this.newGame(); return; }
      if (ui.button('UNDO', bx(1), y1, bw, 20, { key: 'z', theme: 'blue', enabled: this.undoStack.length > 0 && !this.won && !this.auto })) this.undo();
      if (ui.button('HINT', bx(2), y1, bw, 20, { key: 'h', theme: 'dark', enabled: !this.won && !this.auto })) {
        const h = this.findHint();
        if (h) this.hintShow = { ...h, t: 1.6 }; else { G.audio.sfx('error'); G.floatText('NO MOVES LEFT', G.W / 2, 180, P.orange); }
      }
      const canAuto = this.canAutoFinish();
      if (ui.button('AUTO', bx(3), y1, bw, 20, { key: 'a', theme: 'green', enabled: canAuto && !this.auto })) { this.auto = true; this.autoT = 0; }
    },
    drawSide() {
      if (G.portrait) return this.drawSidePortrait();
      // left side panel with buttons
      const x = 10, w = 120;
      G.panel(x - 4, TOP - 4, w + 8, 162, { fill: P.ink, hi: P.dusk });
      ui.block(x - 4, TOP - 4, w + 8, 162);
      if (ui.button('NEW DEAL', x, TOP, w, 20, { key: 'n', theme: 'gold' })) { this.newGame(); return; }
      if (ui.button('UNDO', x, TOP + 24, w, 20, { key: 'z', theme: 'blue', enabled: this.undoStack.length > 0 && !this.won && !this.auto })) this.undo();
      if (ui.button('HINT', x, TOP + 48, w, 20, { key: 'h', theme: 'dark', enabled: !this.won && !this.auto })) {
        const h = this.findHint();
        if (h) this.hintShow = { ...h, t: 1.6 }; else { G.audio.sfx('error'); G.floatText('NO MOVES LEFT', G.W / 2, 180, P.orange); }
      }
      const canAuto = this.canAutoFinish();
      if (ui.button('AUTO', x, TOP + 72, w, 20, { key: 'a', theme: 'green', enabled: canAuto && !this.auto })) { this.auto = true; this.autoT = 0; }
      G.text('STOCK', x + 2, TOP + 102, P.silver, 'small'); G.text(String(this.stock.cards.length), x + w - 2, TOP + 102, P.white, 'small', 'right');
      G.text('FOUNDATIONS', x + 2, TOP + 114, P.silver, 'small'); G.text(this.found.reduce((a, f) => a + f.cards.length, 0) + '/52', x + w - 2, TOP + 114, P.white, 'small', 'right');
      G.text('WINS', x + 2, TOP + 126, P.silver, 'small'); G.text(G.store.get('sol_won', 0) + '/' + G.store.get('sol_played', 0), x + w - 2, TOP + 126, P.white, 'small', 'right');
      G.text('BEST', x + 2, TOP + 138, P.silver, 'small'); G.text(String(G.store.get('sol_best', 0)), x + w - 2, TOP + 138, P.gold, 'small', 'right');
      if (canAuto && !this.auto && !G.touch && Math.floor(performance.now() / 500) % 2) G.text('PRESS A', x + w / 2, TOP + 166, P.lime, 'small', 'center');
    }
  });
})();
