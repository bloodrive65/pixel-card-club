// Pixel Card Club - Blackjack (player vs dealer, dealer stands on all 17s, blackjack pays 3:2)
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui;
  const SHOE = { x: 566, y: 30 }, DISCARD = { x: 30, y: 30 };
  const DEALER_Y = 40, PLAYER_Y = 186, FAN = 15;
  const CHIP_VALUES = [5, 25, 100, 500];
  const CHIP_COLORS = { 5: [P.red, P.white], 25: [P.green, P.white], 100: [P.navy, P.sky], 500: [P.plum, P.gold] };
  const START_CHIPS = 1000;

  // ---------- helpers ----------
  const cardValue = (c) => (c.rank === 1 ? 11 : Math.min(10, c.rank));
  function handTotal(cards) {
    let t = 0, aces = 0;
    for (const c of cards) { t += cardValue(c); if (c.rank === 1) aces++; }
    while (t > 21 && aces) { t -= 10; aces--; }
    return { total: t, soft: aces > 0 };
  }
  const isNatural = (cards) => cards.length === 2 && handTotal(cards).total === 21;

  // Basic strategy for multi-deck, dealer stands on soft 17, double after split allowed
  function basicStrategy(hand, up, canDouble, canSplit) {
    const d = up.rank === 1 ? 11 : Math.min(10, up.rank);
    const cards = hand.cards;
    const { total, soft } = handTotal(cards);
    const D = (cond, alt = 'HIT') => (cond && canDouble ? 'DOUBLE' : alt);
    if (canSplit && cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1])) {
      const v = cardValue(cards[0]);
      if (v === 11 || v === 8) return 'SPLIT';
      if (v === 9 && ((d >= 2 && d <= 6) || d === 8 || d === 9)) return 'SPLIT';
      if (v === 7 && d <= 7) return 'SPLIT';
      if (v === 6 && d <= 6) return 'SPLIT';
      if (v === 4 && (d === 5 || d === 6)) return 'SPLIT';
      if ((v === 2 || v === 3) && d <= 7) return 'SPLIT';
    }
    if (soft && cards.length >= 2) {
      if (total >= 19) return 'STAND';
      if (total === 18) { if (d >= 3 && d <= 6) return D(true, 'STAND'); if (d <= 8) return 'STAND'; return 'HIT'; }
      if (total === 17) return D(d >= 3 && d <= 6);
      if (total >= 15) return D(d >= 4 && d <= 6);
      return D(d === 5 || d === 6);
    }
    if (total >= 17) return 'STAND';
    if (total >= 13) return d <= 6 ? 'STAND' : 'HIT';
    if (total === 12) return d >= 4 && d <= 6 ? 'STAND' : 'HIT';
    if (total === 11) return D(d <= 10);
    if (total === 10) return D(d <= 9);
    if (total === 9) return D(d >= 3 && d <= 6);
    return 'HIT';
  }

  // pixel chip sprite
  const chipCache = {};
  function chipSprite(v) {
    if (chipCache[v]) return chipCache[v];
    const [c, x] = G.makeCanvas(16, 16);
    const [a, b] = CHIP_COLORS[v];
    for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) {
      const d = Math.hypot(xx - 7.5, yy - 7.5);
      if (d > 7.6) continue;
      let col = d > 6.6 ? P.black : a;
      const ang = Math.atan2(yy - 7.5, xx - 7.5);
      if (d > 4.6 && d <= 6.6 && Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8) % 2 === 0) col = b;
      if (d <= 4.6 && d > 3.6) col = b;
      x.fillStyle = col; x.fillRect(xx, yy, 1, 1);
    }
    chipCache[v] = c; return c;
  }
  function breakChips(amount) {
    const out = [];
    for (const v of [500, 100, 25, 5]) while (amount >= v && out.length < 14) { out.push(v); amount -= v; }
    return out;
  }
  function drawChipStack(amount, cx, cy) {
    const chips = breakChips(amount);
    chips.forEach((v, i) => G.ctx.drawImage(chipSprite(v), Math.round(cx - 8 + (i % 2)), Math.round(cy - 8 - i * 2)));
  }

  const scene = (G.Blackjack = {
    title: 'BLACKJACK',
    rules: [
      '#GOAL',
      'Beat the dealer by finishing closer to 21 without going over. Number cards count their value, J Q K count 10, and an Ace counts 1 or 11.',
      '#A ROUND',
      'Click chips to place a bet, then press DEAL. You and the dealer get two cards; one dealer card stays face down.',
      'HIT (H) takes a card. STAND (S) keeps your total. DOUBLE (D) doubles the bet for exactly one more card. SPLIT (P) turns a pair into two hands.',
      '#PAYOUTS',
      'Win pays 1:1. A natural Blackjack (Ace + 10-value card) pays 3:2. Ties push and your bet is returned. Going over 21 is a bust and loses.',
      '#DEALER RULES',
      'The dealer must hit until reaching 17 and stands on all 17s. Press HINT (?) to see the basic-strategy move.'
    ],
    enter() {
      this.chips = G.store.get('bj_chips', START_CHIPS);
      if (this.chips < 5) this.chips = START_CHIPS;
      this.stats = { won: 0, lost: 0, push: 0 };
      this.lastBet = 25; this.paused = false;
      this.newShoe();
      this.resetRound(true);
    },
    newShoe() {
      this.shoe = G.shuffle(G.makeDeck(G.settings.bjDecks));
      this.shoeTotal = this.shoe.length;
      this.discardCount = 0;
      this.shoe.forEach((c) => { c.x = SHOE.x; c.y = SHOE.y; });
    },
    resetRound(first) {
      this.phase = 'bet';
      this.bet = Math.min(this.lastBet, Math.floor(this.chips / 5) * 5);
      this.hands = []; this.dealer = []; this.active = 0;
      this.msg = first ? 'PLACE YOUR BET' : this.msg;
      this.q = []; this.qt = 0; this.hint = null;
      if (!this.table) this.table = [];
    },
    // queue of timed steps
    after(t, fn) { this.q.push({ t, fn }); },
    runQueue(dt) {
      if (!this.q.length) return;
      this.qt += dt;
      while (this.q.length && this.qt >= this.q[0].t) { this.qt -= this.q[0].t; const s = this.q.shift(); s.fn(); }
      if (!this.q.length) this.qt = 0;
    },
    draw1(faceUp = true) {
      if (!this.shoe.length) this.newShoe();
      const c = this.shoe.pop();
      c.x = SHOE.x; c.y = SHOE.y; c.faceUp = faceUp; c.shownFace = false; c.flip = 1; c.delay = 0;
      this.table.push(c);
      G.audio.sfx('deal');
      return c;
    },
    collect() {
      // sweep table cards into the discard tray
      this.table.forEach((c, i) => { c.faceUp = false; G.place(c, DISCARD.x, DISCARD.y, 500 + i, false, i * 0.03); c._toDiscard = true; });
    },
    deal() {
      if (this.bet < 5 || this.bet > this.chips) { G.audio.sfx('error'); this.msg = 'BET AT LEAST 5'; return; }
      this.collect();
      this.lastBet = this.bet;
      this.chips -= this.bet;
      this.hands = [{ cards: [], bet: this.bet, done: false, doubled: false, result: null, fromSplit: false }];
      this.dealer = []; this.active = 0; this.phase = 'deal'; this.msg = ''; this.hint = null;
      if (this.shoe.length < this.shoeTotal * 0.25) {
        this.msg = 'SHUFFLING THE SHOE'; G.audio.sfx('shuffle');
        this.after(0.9, () => { this.newShoe(); this.msg = ''; });
      }
      const h = this.hands[0];
      this.after(0.25, () => h.cards.push(this.draw1()));
      this.after(0.25, () => this.dealer.push(this.draw1()));
      this.after(0.25, () => h.cards.push(this.draw1()));
      this.after(0.25, () => this.dealer.push(this.draw1(false)));
      this.after(0.45, () => this.afterDeal());
    },
    afterDeal() {
      const up = this.dealer[0];
      const dealerBJ = isNatural(this.dealer);
      const playerBJ = isNatural(this.hands[0].cards);
      if (cardValue(up) >= 10 && !playerBJ) {
        this.msg = 'DEALER PEEKS...';
        this.after(0.6, () => {
          if (dealerBJ) { this.dealer[1].faceUp = true; this.msg = 'DEALER BLACKJACK'; this.after(0.6, () => this.settle()); }
          else { this.msg = ''; this.startPlay(); }
        });
        return;
      }
      if (playerBJ) { this.dealer[1].faceUp = true; this.hands[0].done = true; this.msg = 'BLACKJACK!'; G.audio.sfx('good'); this.after(0.8, () => this.settle()); return; }
      this.startPlay();
    },
    startPlay() { this.phase = 'play'; this.active = 0; this.checkAuto(); },
    cur() { return this.hands[this.active]; },
    canDouble() { const h = this.cur(); return this.phase === 'play' && h && h.cards.length === 2 && this.chips >= h.bet && !(h.fromSplit && h.cards[0].rank === 1); },
    canSplit() { const h = this.cur(); return this.phase === 'play' && h && h.cards.length === 2 && this.hands.length < 4 && this.chips >= h.bet && cardValue(h.cards[0]) === cardValue(h.cards[1]) && !(h.fromSplit && h.cards[0].rank === 1); },
    hit() {
      const h = this.cur(); this.hint = null;
      h.cards.push(this.draw1()); this.phase = 'wait';
      this.after(0.3, () => { this.phase = 'play'; this.checkAuto(); });
    },
    stand() { this.hint = null; this.cur().done = true; this.nextHand(); },
    double() {
      const h = this.cur(); this.hint = null;
      this.chips -= h.bet; h.bet *= 2; h.doubled = true; G.audio.sfx('chip');
      h.cards.push(this.draw1()); this.phase = 'wait';
      this.after(0.45, () => { h.done = true; this.phase = 'play'; this.nextHand(); });
    },
    split() {
      const h = this.cur(); this.hint = null;
      this.chips -= h.bet; G.audio.sfx('chip');
      const nh = { cards: [h.cards.pop()], bet: h.bet, done: false, doubled: false, result: null, fromSplit: true };
      h.fromSplit = true;
      this.hands.splice(this.active + 1, 0, nh);
      this.phase = 'wait';
      this.after(0.3, () => h.cards.push(this.draw1()));
      this.after(0.3, () => nh.cards.push(this.draw1()));
      this.after(0.35, () => {
        this.phase = 'play';
        if (h.cards[0].rank === 1) { h.done = true; nh.done = true; this.active = this.hands.length; this.dealerTurn(); return; }
        this.checkAuto();
      });
    },
    checkAuto() {
      const h = this.cur(); if (!h) return;
      const t = handTotal(h.cards).total;
      if (t > 21) { h.done = true; h.result = 'bust'; G.audio.sfx('error'); G.floatText('BUST', this.handX(this.active) + CW / 2, PLAYER_Y - 6, P.orange); this.after(0.5, () => this.nextHand()); this.phase = 'wait'; }
      else if (t === 21) { h.done = true; this.after(0.35, () => this.nextHand()); this.phase = 'wait'; }
    },
    nextHand() {
      this.active++;
      if (this.active < this.hands.length) { this.phase = 'play'; this.checkAuto(); return; }
      this.dealerTurn();
    },
    dealerTurn() {
      this.phase = 'dealer'; this.active = -1;
      this.after(0.3, () => { this.dealer[1].faceUp = true; });
      const allBust = this.hands.every((h) => handTotal(h.cards).total > 21);
      const step = () => {
        const t = handTotal(this.dealer);
        if (!allBust && t.total < 17) { this.dealer.push(this.draw1()); this.after(0.55, step); }
        else this.after(0.4, () => this.settle());
      };
      this.after(0.6, step);
    },
    settle() {
      this.phase = 'done';
      const dt = handTotal(this.dealer).total, dBJ = isNatural(this.dealer);
      let net = 0, wins = 0, losses = 0, pushes = 0;
      this.hands.forEach((h, i) => {
        const pt = handTotal(h.cards).total;
        const pBJ = isNatural(h.cards) && !h.fromSplit;
        let pay = 0, res;
        if (pt > 21) res = 'BUST';
        else if (pBJ && !dBJ) { res = 'BLACKJACK'; pay = h.bet * 2.5; }
        else if (dBJ && !pBJ) res = 'LOSE';
        else if (pBJ && dBJ) { res = 'PUSH'; pay = h.bet; }
        else if (dt > 21 || pt > dt) { res = 'WIN'; pay = h.bet * 2; }
        else if (pt === dt) { res = 'PUSH'; pay = h.bet; }
        else res = 'LOSE';
        h.result = res;
        pay = Math.floor(pay);
        this.chips += pay; net += pay - h.bet;
        if (res === 'PUSH') pushes++; else if (pay > 0) wins++; else losses++;
        const fx = this.handX(i) + this.handW(h) / 2;
        G.floatText(pay > h.bet ? '+' + (pay - h.bet) : pay === h.bet ? 'PUSH' : '-' + h.bet, fx, PLAYER_Y - 14, pay > h.bet ? P.lime : pay === h.bet ? P.white : P.orange);
      });
      this.stats.won += wins; this.stats.lost += losses; this.stats.push += pushes;
      this.msg = net > 0 ? 'YOU WIN ' + net : net < 0 ? (dt > 21 ? 'DEALER BUSTS' : 'DEALER WINS') : 'PUSH';
      if (net < 0 && dt > 21) this.msg = 'YOU LOSE ' + -net;
      if (net < 0 && dt <= 21) this.msg = 'DEALER WINS ' + dt;
      G.audio.sfx(net > 0 ? 'win' : net < 0 ? 'lose' : 'click');
      G.store.set('bj_chips', this.chips);
      const best = G.store.get('bj_best', START_CHIPS); if (this.chips > best) G.store.set('bj_best', this.chips);
      this.bet = Math.min(this.lastBet, Math.floor(this.chips / 5) * 5);
    },
    // ---------- layout ----------
    handW(h) { return CW + Math.max(0, h.cards.length - 1) * FAN; },
    handX(i) {
      const gap = 26; const widths = this.hands.map((h) => Math.max(this.handW(h), CW + 2 * FAN));
      const total = widths.reduce((a, b) => a + b, 0) + gap * (this.hands.length - 1);
      let x = G.W / 2 - total / 2;
      for (let k = 0; k < i; k++) x += widths[k] + gap;
      return Math.round(x + (widths[i] - this.handW(this.hands[i])) / 2);
    },
    layout() {
      const dw = CW + Math.max(0, this.dealer.length - 1) * FAN;
      this.dealer.forEach((c, i) => G.place(c, G.W / 2 - dw / 2 + i * FAN, DEALER_Y, 100 + i));
      this.hands.forEach((h, hi) => { const x = this.handX(hi); h.cards.forEach((c, i) => G.place(c, x, PLAYER_Y, 200 + hi * 20 + i)); h.cards.forEach((c, i) => { c.tx = x + i * FAN; }); });
    },
    // ---------- frame ----------
    frame(dt) {
      if (this.paused) ui.modal = true;
      this.runQueue(this.paused ? 0 : dt);
      this.layout();
      G.updateCards(this.table, dt, 13);
      // drop cards that reached the discard tray
      this.table = this.table.filter((c) => { if (c._toDiscard && c.delay <= 0 && Math.abs(c.x - c.tx) < 1 && Math.abs(c.y - c.ty) < 1) { c._toDiscard = false; this.discardCount++; return false; } return true; });

      ui.felt();
      this.drawTable();
      G.drawCards(this.table);
      this.drawTotals();
      G.drawFloaters(dt);
      if (this.msg) ui.banner(this.msg, 150, this.msg.startsWith('YOU WIN') || this.msg === 'BLACKJACK!' ? P.lime : this.msg.startsWith('DEALER WINS') || this.msg.startsWith('YOU LOSE') ? P.orange : P.white);
      this.drawControls();
      const menu = ui.topBar('BLACKJACK', [
        { label: 'W/L/P', value: this.stats.won + '/' + this.stats.lost + '/' + this.stats.push, color: P.cyan },
        { label: 'BET', value: this.hands.length && this.phase !== 'done' ? this.hands.reduce((a, h) => a + h.bet, 0) : this.bet, color: P.gold },
        { label: 'CHIPS', value: this.chips, color: P.lime }
      ]);
      if (menu && !this.paused) { this.paused = true; ui.modal = true; }
      if (this.paused) {
        const act = ui.pauseMenu(this);
        if (act === 'resume') this.paused = false;
        if (act === 'restart') { this.paused = false; this.chips = START_CHIPS; G.store.set('bj_chips', this.chips); this.table = []; this.discardCount = 0; this.stats = { won: 0, lost: 0, push: 0 }; this.lastBet = 25; this.newShoe(); this.resetRound(true); }
        if (act === 'menu') { this.paused = false; G.go(G.Menu); }
      } else if (this.phase === 'bet' && this.chips < 5 && this.bet < 5) {
        const act = ui.dialog('OUT OF CHIPS', [{ text: 'The house always wins... this time.' }, { text: 'Take a fresh stack of ' + START_CHIPS + ' chips?', color: P.silver }], [{ label: 'NEW STACK', act: 'reset', theme: 'green', key: 'Enter' }, { label: 'MENU', act: 'menu', theme: 'red' }]);
        if (act === 'reset') { this.chips = START_CHIPS; this.bet = 25; G.store.set('bj_chips', this.chips); }
        if (act === 'menu') G.go(G.Menu);
      }
    },
    drawTable() {
      // felt printing
      G.text('BLACKJACK PAYS 3 TO 2', G.W / 2, 122, P.felt4, 'big', 'center');
      G.text('DEALER MUST HIT 16 AND STAND ON ALL 17S', G.W / 2, 135, P.felt4, 'small', 'center');
      // shoe
      const remain = this.shoe.length / this.shoeTotal;
      G.panel(SHOE.x - 6, SHOE.y - 6, CW + 18, CH + 14, { fill: P.wood1, hi: P.wood3, lo: P.wood0 });
      const layers = Math.max(1, Math.ceil(remain * 6));
      for (let i = 0; i < layers; i++) G.ctx.drawImage(G.backImg(), SHOE.x + 6 - i, SHOE.y - i + 5);
      G.rect(SHOE.x - 2, SHOE.y + CH + 3, CW + 10, 3, P.wood0);
      G.rect(SHOE.x - 2, SHOE.y + CH + 3, Math.round((CW + 10) * remain), 3, P.gold);
      G.text('SHOE ' + this.shoe.length, SHOE.x + CW / 2 + 3, SHOE.y + CH + 11, P.felt4, 'small', 'center');
      // discard tray
      G.drawSlot(DISCARD.x, DISCARD.y, '');
      G.text('DISCARD', DISCARD.x + CW / 2, DISCARD.y + CH + 11, P.felt4, 'small', 'center');
      const dl = Math.min(6, Math.ceil(this.discardCount / 10));
      for (let i = 0; i < dl; i++) G.ctx.drawImage(G.backImg(), DISCARD.x - i, DISCARD.y - i);
      // bet spots
      if (this.phase === 'bet' || this.phase === 'done' || !this.hands.length) {
        this.drawBetSpot(G.W / 2, PLAYER_Y + CH + 30, this.bet);
      } else this.hands.forEach((h, i) => this.drawBetSpot(this.handX(i) + this.handW(h) / 2, PLAYER_Y + CH + 30, h.bet, i === this.active && this.phase === 'play'));
      if (this.phase === 'bet' && !this.table.length) {
        G.text('YOUR HAND', G.W / 2, PLAYER_Y + 26, P.felt4, 'big', 'center');
        G.text('DEALER', G.W / 2, DEALER_Y + 26, P.felt4, 'big', 'center');
      }
    },
    drawBetSpot(cx, cy, amount, active) {
      cx = Math.round(cx); cy = Math.round(cy);
      for (let yy = -9; yy <= 9; yy++) for (let xx = -17; xx <= 17; xx++) {
        const d = Math.hypot(xx / 17, yy / 9);
        if (d <= 1 && d > 0.82) G.rect(cx + xx, cy + yy, 1, 1, active ? P.gold : P.felt4);
      }
      if (amount > 0) { drawChipStack(amount, cx, cy); G.text(String(amount), cx + 22, cy - 3, P.gold, 'small'); }
    },
    drawTotals() {
      if (this.dealer.length) {
        const hidden = this.dealer.some((c) => !c.faceUp);
        const t = hidden ? handTotal(this.dealer.filter((c) => c.faceUp)) : handTotal(this.dealer);
        const lbl = hidden ? String(t.total) + ' + ?' : (t.total > 21 ? 'BUST ' + t.total : isNatural(this.dealer) ? 'BLACKJACK' : String(t.total));
        if (this.dealer.every((c) => c.delay <= 0)) ui.tag('DEALER ' + lbl, G.W / 2, DEALER_Y + CH + 5, t.total > 21 ? P.orange : P.white);
      }
      this.hands.forEach((h, i) => {
        if (!h.cards.length) return;
        const t = handTotal(h.cards);
        let lbl = (t.soft && t.total < 21 ? 'SOFT ' : '') + t.total;
        if (t.total > 21) lbl = 'BUST ' + t.total;
        else if (isNatural(h.cards) && !h.fromSplit) lbl = 'BLACKJACK';
        if (h.result && this.phase === 'done') lbl += ' - ' + h.result;
        const active = i === this.active && this.phase === 'play';
        const col = h.result === 'WIN' || h.result === 'BLACKJACK' ? P.lime : h.result === 'LOSE' || h.result === 'BUST' || t.total > 21 ? P.orange : active ? P.ink : P.white;
        ui.tag(lbl, this.handX(i) + this.handW(h) / 2, PLAYER_Y - 15, col, active ? P.gold : P.ink);
        if (active && this.hands.length > 1) { const ax = this.handX(i) + this.handW(h) / 2; G.rect(ax - 3, PLAYER_Y - 22, 7, 2, P.gold); G.rect(ax - 2, PLAYER_Y - 20, 5, 1, P.gold); G.rect(ax - 1, PLAYER_Y - 19, 3, 1, P.gold); }
      });
    },
    drawControls() {
      const y = 316;
      G.rect(0, y - 6, G.W, G.H - y + 6, P.ink); G.rect(0, y - 6, G.W, 1, P.dusk); G.rect(0, y - 7, G.W, 1, P.black);
      ui.block(0, y - 7, G.W, G.H - y + 7);
      if (this.phase === 'bet' || this.phase === 'done') {
        // chip buttons
        G.text('BET', 14, y + 10, P.silver, 'small');
        CHIP_VALUES.forEach((v, i) => {
          const cx = 52 + i * 40, cy = y + 13;
          const enabled = this.bet + v <= this.chips;
          const hover = enabled && !ui.modal && G.inRect(G.input.x, G.input.y, cx - 14, cy - 14, 28, 28);
          ui.block(cx - 14, cy - 14, 28, 28);
          if (hover) ui.cursorHand = true;
          G.ctx.globalAlpha = enabled ? 1 : 0.35;
          G.ctx.drawImage(chipSprite(v), cx - 8, cy - 8 - (hover ? 2 : 0), 16, 16);
          G.ctx.globalAlpha = 1;
          G.text(String(v), cx, cy + 11, enabled ? P.white : P.slate, 'small', 'center');
          if (hover && G.input.pressed) { this.bet += v; G.audio.sfx('chip'); G.input.pressed = false; if (this.phase === 'done') this.msg = ''; }
          if (enabled && G.key(String(i + 1)) && !ui.modal) { this.bet += v; G.audio.sfx('chip'); }
        });
        if (ui.button('CLEAR', 216, y, 70, 22, { key: 'c', theme: 'dark', enabled: this.bet > 0 })) this.bet = 0;
        if (ui.button('ALL IN', 292, y, 70, 22, { key: 'a', theme: 'red', enabled: this.chips >= 5 })) { this.bet = Math.floor(this.chips / 5) * 5; G.audio.sfx('chip'); }
        if (ui.button('DEAL', 480, y, 148, 26, { key: [' ', 'Enter'], keyLabel: 'SPACE', theme: 'green', enabled: this.bet >= 5 && this.bet <= this.chips })) this.deal();
        G.text('KEYS 1-4 ADD CHIPS', 372, y + 9, P.slate, 'small');
      } else {
        const playing = this.phase === 'play';
        const bw = 92;
        if (ui.button('HIT', 14, y, bw, 26, { key: 'h', theme: 'green', enabled: playing })) this.hit();
        if (ui.button('STAND', 14 + (bw + 8), y, bw, 26, { key: 's', theme: 'red', enabled: playing })) this.stand();
        if (ui.button('DOUBLE', 14 + (bw + 8) * 2, y, bw, 26, { key: 'd', theme: 'gold', enabled: playing && this.canDouble() })) this.double();
        if (ui.button('SPLIT', 14 + (bw + 8) * 3, y, bw, 26, { key: 'p', theme: 'blue', enabled: playing && this.canSplit() })) this.split();
        if (ui.button('HINT', 14 + (bw + 8) * 4, y, 70, 26, { key: ['?', '/'], keyLabel: '?', theme: 'dark', enabled: playing })) this.hint = basicStrategy(this.cur(), this.dealer[0], this.canDouble(), this.canSplit());
        if (this.hint && playing) {
          G.text('ADVISOR', 576, y + 4, P.silver, 'small', 'center');
          G.text(this.hint, 576, y + 14, P.cyan, 'big', 'center');
        }
      }
    }
  });
  G.Blackjack.basicStrategy = basicStrategy; G.Blackjack.handTotal = handTotal;
})();
