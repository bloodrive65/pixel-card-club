// Pixel Card Club - Crazy Eights: you vs 1-3 Club members, single hand or a match to 100 points.
// Rules: Bicycle "Crazy Eights" (match suit or rank, eights are wild and name a suit, draw until you can play,
// winner collects points) and pagat.com "Crazy Eights" (7 cards each with two players, reshuffle the play pile).
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui, input = G.input;
  const STOCK = { x: 246, y: 150 }, DISC = { x: 336, y: 150 };
  const HAND_Y = 268;
  const LOG = { x: 470, y: 172, w: 162, h: 88 };
  const BOARD = { x: 10, y: 150, w: 128, h: 92 };
  const TARGET = 100;
  const SUIT_WORD = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
  const pts = (c) => (c.rank === 8 ? 50 : c.rank >= 10 ? 10 : c.rank === 1 ? 1 : c.rank);
  const LINES = {
    eight: ['CRAZY EIGHT! {suit}!', 'EIGHT! MAKE IT {suit}.', 'WILD CARD! {suit}!'],
    last: ['LAST CARD!', 'ONE LEFT!', 'ALMOST THERE!'],
    draw: ['UGH, DRAWING.', 'NOTHING FITS.', 'COME ON, DECK...'],
    bigdraw: ['THIS SUCKS.', 'HOW MANY CARDS IS THIS?', 'THE DECK HATES ME.'],
    out: ['AND I AM OUT!', 'DONE!', 'CLEAN HAND!'],
    stuck: ['I HAVE TO PASS.', 'NOTHING. PASS.']
  };

  const scene = (G.Crazy8 = Object.assign({
    title: 'CRAZY EIGHTS',
    bookChapter: 'crazy8',
    enter() {
      this.setup = true; this.paused = false; this.players = []; this.cards = [];
      this.initSetup({
        title: 'CRAZY EIGHTS', prefix: 'c8', defaults: ['pixie', 'doc', 'finn'], defOpp: 2,
        option: { label: 'GAME', items: ['ONE HAND', 'MATCH TO 100'], def: 1 },
        desc: (o) => (o ? 'Hand winners collect points for the cards left in other hands. First to 100 wins the match.' : 'One hand. First player to empty their hand wins.')
      });
    },
    start() {
      this.setup = false;
      const ids = this.takePicks();
      this.match = this.opt() === 1;
      this.players = [{ name: 'YOU', human: true, id: 'you', hand: [], score: 0 }];
      ids.forEach((id) => { const ch = G.char(id); this.players.push({ name: ch.name, human: false, id, ch, hand: [], score: 0 }); });
      this.dealer = this.players.length - 1; this.handNo = 0; this.over = false; this.result = null;
      this.resetTable();
      G.rollForms(this.players, (t) => this.addLog(t, P.silver));
      G.bump('c8_played');
      this.newHand();
    },
    newHand() {
      this.handNo++;
      this.cards = G.shuffle(G.makeDeck(1));
      this.cards.forEach((c) => { c.x = STOCK.x; c.y = STOCK.y; c.faceUp = false; c.shownFace = false; c.flip = 1; c.lift = 0; c.hidden = false; });
      this.stock = this.cards.slice(); this.disc = [];
      this.players.forEach((p) => { p.hand = []; p.lacks = {}; p.drew = 0; });
      this.handOver = null; this.phase = 'deal'; this.passes = 0; this.pending8 = null; this.bubbles = [];
      // Bicycle: 5 cards each; pagat: 7 each with only two players
      const per = this.players.length === 2 ? 7 : 5;
      let d = 0;
      const n = this.players.length;
      for (let r = 0; r < per; r++) for (let k = 1; k <= n; k++) { const p = this.players[(this.dealer + k) % n]; const c = this.stock.pop(); p.hand.push(c); c.delay = 0.2 + d++ * 0.05; if (p.human) c.faceUp = true; }
      this.sortHand();
      // starter: if it is an eight, it is buried in the stock and the next card is turned (Bicycle)
      let st = this.stock.pop();
      while (st.rank === 8) { this.stock.splice(G.rand(this.stock.length - 4) + 2, 0, st); this.addLog('The starter was an eight. It is buried in the stock.', P.silver); st = this.stock.pop(); }
      this.toDisc(st); st.delay = 0.3 + d * 0.05;
      this.suit = st.suit;
      G.audio.sfx('shuffle');
      this.turn = (this.dealer + 1) % n;
      this.addLog('Hand ' + this.handNo + ': ' + per + ' cards each. Starter ' + G.cardShort(st) + '.', P.cyan);
      this.after(0.6 + d * 0.05, () => this.startTurn());
    },
    sortHand() { this.players[0].hand.sort((a, b) => a.suit - b.suit || a.rank - b.rank); },
    top() { return this.disc[this.disc.length - 1]; },
    toDisc(c) { c.faceUp = true; c._dx = G.rand(5) - 2; c._dy = G.rand(5) - 2; this.disc.push(c); },
    legal(c) { const t = this.top(); return c.rank === 8 || c.suit === this.suit || c.rank === t.rank; },
    legalCards(p) { return p.hand.filter((c) => this.legal(c)); },
    // pagat basic game: when the stock runs out, the played cards except the top one are shuffled into a new stock
    refill() {
      if (this.stock.length || this.disc.length < 2) return false;
      const t = this.disc.pop();
      this.stock = G.shuffle(this.disc); this.disc = [t];
      this.stock.forEach((c) => (c.faceUp = false));
      this.addLog('Stock empty. The play pile is shuffled into a new stock.', P.silver);
      G.audio.sfx('shuffle');
      return true;
    },
    canDraw() { return this.stock.length > 0 || this.disc.length > 1; },
    drawCard(p) {
      if (!this.stock.length) this.refill();
      const c = this.stock.pop(); if (!c) return null;
      p.hand.push(c); c.faceUp = !!p.human; p.drew++;
      if (p.human) this.sortHand();
      G.audio.sfx('deal');
      return c;
    },
    cur() { return this.players[this.turn]; },
    startTurn() {
      if (this.handOver) return;
      const p = this.cur();
      p.drew = 0;
      if (p.human) { this.phase = 'you'; return; }
      this.phase = 'ai';
      this.after(0.8, () => this.aiStep());
    },
    nextTurn() {
      this.turn = (this.turn + 1) % this.players.length;
      this.phase = 'wait';
      this.after(0.4, () => this.startTurn());
    },
    play(pi, c, suit) {
      const p = this.players[pi];
      p.hand = p.hand.filter((k) => k !== c);
      this.toDisc(c);
      this.passes = 0;
      G.audio.sfx('place');
      const nm = p.human ? 'You' : p.name;
      if (c.rank === 8) {
        this.suit = suit;
        this.addLog(nm + ' played an eight and named ' + SUIT_WORD[suit].toLowerCase() + '.', P.gold);
        this.say(pi, p.human ? 'EIGHT! ' + SUIT_WORD[suit] + '!' : G.talk(null, 'eight', LINES, { suit: SUIT_WORD[suit] }));
      } else {
        this.suit = c.suit;
        this.addLog(nm + ' played ' + G.cardShort(c) + '.', p.human ? P.white : P.silver);
      }
      if (p.human) this.sortHand();
      if (!p.hand.length) return this.after(0.5, () => this.endHand(pi));
      if (p.hand.length === 1) { this.say(pi, p.human ? 'LAST CARD!' : G.talk(null, 'last', LINES)); this.addLog(nm + (p.human ? ' have' : ' has') + ' one card left.', P.orange); }
      this.nextTurn();
    },
    pass(pi) {
      const p = this.players[pi];
      this.passes++;
      this.addLog((p.human ? 'You pass' : p.name + ' passes') + ' (no play, no cards to draw).', P.silver);
      if (!p.human) this.say(pi, G.talk(null, 'stuck', LINES));
      // pagat: if everyone passes the game is blocked
      if (this.passes >= this.players.length) return this.after(0.5, () => this.endHand(null));
      this.nextTurn();
    },
    // ---------- AI ----------
    aiStep() {
      const pi = this.turn, p = this.cur();
      const legal = this.legalCards(p);
      if (!legal.length) {
        if (!this.canDraw()) return this.pass(pi);
        // remember: this player could not follow the current suit
        for (const o of this.players) if (o !== p) o.lacks[pi + '_' + this.suit] = true;
        this.drawCard(p);
        if (p.drew === 1) this.addLog(p.name + ' draws.', P.silver);
        if (p.drew === 4) this.say(pi, G.talk(p.ch, 'bigdraw', LINES));
        else if (p.drew === 1 && Math.random() < 0.25) this.say(pi, G.talk(p.ch, 'draw', LINES));
        return this.after(0.35, () => this.aiStep());
      }
      if (p.drew > 1) this.addLog(p.name + ' drew ' + p.drew + ' cards.', P.silver);
      const choice = this.aiChoose(pi, legal);
      this.play(pi, choice.card, choice.suit);
    },
    aiChoose(pi, legal) {
      const p = this.players[pi], sk = p.form;
      const count = (s, hand) => hand.filter((c) => c.suit === s && c.rank !== 8).length;
      const bestSuit = (hand) => { let b = 0, bn = -1; for (let s = 0; s < 4; s++) { const n = count(s, hand); if (n > bn || (n === bn && Math.random() < 0.5)) { bn = n; b = s; } } return b; };
      const eights = legal.filter((c) => c.rank === 8), plain = legal.filter((c) => c.rank !== 8);
      const n = this.players.length, next = (pi + 1) % n;
      const danger = Math.min(...this.players.filter((o, i) => i !== pi).map((o) => o.hand.length));
      let card;
      if (sk === 0 || (p.ch.bj === 'reckless' && Math.random() < 0.35)) card = G.pick(legal);
      else {
        let pool = plain.length ? plain : eights;
        // hard: when someone is nearly out, dump points and steer away from suits the next player lacks
        if (sk === 2 && danger <= 2) {
          if (eights.length && Math.random() < 0.6) pool = eights;
          else {
            const lacking = pool.filter((c) => p.lacks[next + '_' + c.suit]);
            if (lacking.length) pool = lacking;
          }
        }
        const rest = (c) => p.hand.filter((k) => k !== c);
        pool = pool.slice().sort((a, b) => count(b.suit, rest(b)) - count(a.suit, rest(a)) || pts(b) - pts(a));
        card = pool[0];
      }
      let suit = card.suit;
      if (card.rank === 8) {
        const rest = p.hand.filter((k) => k !== card);
        suit = sk === 0 && Math.random() < 0.5 ? G.rand(4) : bestSuit(rest);
        if (sk === 2 && rest.length && p.lacks[next + '_' + suit] === undefined) {
          const alt = [0, 1, 2, 3].filter((s) => p.lacks[next + '_' + s] && count(s, rest) > 0);
          if (alt.length && danger <= 2) suit = alt[0];
        }
      }
      return { card, suit };
    },
    // ---------- hand end + scoring ----------
    endHand(wi) {
      if (this.handOver) return;
      this.phase = 'handover';
      this.players.forEach((p) => p.hand.forEach((c) => (c.faceUp = true)));
      const val = (p) => p.hand.reduce((a, c) => a + pts(c), 0);
      let blocked = false;
      if (wi === null) { blocked = true; const low = Math.min(...this.players.map(val)); wi = this.players.findIndex((p) => val(p) === low); }
      const w = this.players[wi];
      // Bicycle: the winner collects the value of the cards left in everyone else's hands
      let gain = 0;
      const rows = this.players.map((p) => { const v = p === w ? 0 : val(p); gain += v; return { p, v }; });
      if (blocked) gain -= val(w);
      gain = Math.max(0, gain);
      w.score += gain;
      this.addLog((blocked ? 'Blocked. ' : '') + (w.human ? 'You win' : w.name + ' wins') + ' the hand and ' + gain + ' points.', w.human ? P.lime : P.gold);
      this.say(wi, w.human ? 'I AM OUT!' : G.talk(w.ch, 'out', LINES));
      G.audio.sfx(w.human ? 'good' : 'lose');
      const matchWon = !this.match || this.players.some((p) => p.score >= TARGET);
      this.handOver = { w, gain, rows, blocked, matchWon };
      if (matchWon) this.after(1.4, () => this.endMatch());
    },
    endMatch() {
      this.over = true; this.phase = 'over';
      const me = this.players[0];
      let winners;
      if (this.match) { const best = Math.max(...this.players.map((p) => p.score)); winners = this.players.filter((p) => p.score === best); }
      else winners = [this.handOver.w];
      const youWin = winners.length === 1 && winners[0].human;
      for (const p of this.players) if (!p.human) {
        if (this.match) { if (p.score !== me.score) G.addRecord(p.id, me.score > p.score); }
        else if (youWin || winners.includes(p)) G.addRecord(p.id, youWin);
      }
      if (youWin) G.bump('c8_won');
      const aw = winners.find((p) => !p.human), al = this.players.find((p) => !p.human && !winners.includes(p));
      this.result = { winners, youWin, tie: winners.length > 1, quote: youWin && al ? { p: al, text: G.say(al.ch, 'lose') } : aw ? { p: aw, text: G.say(aw.ch, 'win') } : null };
      G.audio.sfx(youWin ? 'win' : 'lose');
    },
    // ---------- layout ----------
    layout() {
      this.stock.forEach((c, i) => G.place(c, STOCK.x - Math.floor(i / 6), STOCK.y - Math.floor(i / 6), i, false));
      this.disc.forEach((c, i) => { G.place(c, DISC.x + (c._dx || 0), DISC.y + (c._dy || 0), 60 + i, true); c.lift = 0; });
      const me = this.players[0], n = me.hand.length;
      const off = n > 1 ? Math.min(32, Math.floor((560 - CW) / (n - 1))) : 0;
      const hw = CW + (n - 1) * off;
      const myTurn = this.phase === 'you' && !this.pending8;
      me.hand.forEach((c, i) => {
        G.place(c, G.W / 2 - hw / 2 + i * off, HAND_Y, 100 + i, true);
        const target = myTurn && this.legal(c) ? (this.hoverCard === c ? 12 : 5) : 0;
        c.lift = G.lerp(c.lift || 0, target, 0.35);
      });
      for (let pi = 1; pi < this.players.length; pi++) {
        const p = this.players[pi], s = this.oppSlot(pi);
        const m = p.hand.length; const o = m > 1 ? Math.min(10, Math.floor((s.w - CW) / (m - 1))) : 0;
        const w = CW + (m - 1) * o;
        p.hand.forEach((c, i) => { G.place(c, s.x + s.w / 2 - w / 2 + i * o, s.y + 32, 100 + i, this.phase === 'handover' || this.phase === 'over'); c.lift = 0; });
      }
    },
    handHit() {
      let hit = null;
      for (const c of this.players[0].hand) if (G.inRect(input.x, input.y, c.tx, c.ty - (c.lift || 0), CW, CH + (c.lift || 0))) hit = c;
      return hit;
    },
    humanDraw() {
      if (this.phase !== 'you' || this.pending8) return;
      if (!this.canDraw()) { G.audio.sfx('error'); return; }
      const me = this.players[0];
      for (const o of this.players) if (o !== me && !this.legalCards(me).length) o.lacks['0_' + this.suit] = true;
      const c = this.drawCard(me);
      if (c) this.addLog('You drew ' + G.cardShort(c) + '.', P.silver);
    },
    frame(dt) {
      if (this.setup) return this.drawSetupScreen();
      if (this.paused || this.over || this.pending8 || (this.handOver && !this.handOver.matchWon && this.phase === 'handover')) ui.modal = true;
      if (!this.paused) this.runQueue(dt);
      const me = this.players[0];
      const myTurn = this.phase === 'you' && !this.pending8 && !ui.modal;
      this.hoverCard = myTurn && !ui.blocked() ? this.handHit() : null;
      const overStock = myTurn && !ui.blocked() && G.inRect(input.x, input.y, STOCK.x - 8, STOCK.y - 8, CW + 8, CH + 8);
      if (this.hoverCard && this.legal(this.hoverCard)) ui.cursorHand = true;
      if (overStock && this.canDraw()) ui.cursorHand = true;
      if (myTurn && input.pressed) {
        if (this.hoverCard) {
          input.pressed = false;
          const c = this.hoverCard;
          if (!this.legal(c)) { G.audio.sfx('error'); G.floatText('MATCH ' + SUIT_WORD[this.suit] + ' OR ' + G.RANK_LABEL[this.top().rank], G.W / 2, 250, P.orange, 'small'); }
          else if (c.rank === 8) { this.pending8 = c; G.audio.sfx('click'); }
          else this.play(0, c);
        } else if (overStock) { input.pressed = false; this.humanDraw(); }
      }
      this.layout();
      G.updateCards(this.cards, dt, 12);

      ui.felt();
      G.drawSlot(STOCK.x, STOCK.y, 'EMPTY');
      G.text('STOCK ' + this.stock.length, STOCK.x + CW / 2, STOCK.y + CH + 5, P.felt4, 'small', 'center');
      G.text('PLAY PILE', DISC.x + CW / 2, DISC.y + CH + 5, P.felt4, 'small', 'center');
      this.drawSuitBox();
      for (let pi = 1; pi < this.players.length; pi++) {
        const p = this.players[pi], s = this.oppSlot(pi);
        this.drawSeat(s, p, { turn: this.turn === pi && !this.handOver, line: p.hand.length + (p.hand.length === 1 ? ' CARD - LAST!' : ' CARDS'), lineColor: p.hand.length === 1 ? P.orange : P.silver, value: this.match ? p.score + ' PTS' : '' });
      }
      G.drawCards(this.cards, (c) => {
        if (!me.hand.includes(c)) return null;
        if (this.phase === 'you' && !this.pending8) return this.legal(c) ? (c === this.hoverCard ? { highlight: P.gold } : null) : { dim: true };
        return null;
      });
      if (overStock && this.canDraw()) G.outline(STOCK.x - 2, STOCK.y - 2, CW + 4, CH + 4, P.gold, 1);
      this.drawBoard();
      G.youPlate(8, 312, 128, me.hand.length + ' CARDS' + (this.match ? '  ' + me.score + ' PTS' : ''), P.silver, this.turn === 0 && !this.handOver && !this.over);
      this.drawLog(LOG);
      this.drawControls();
      this.drawBubbles(dt, [72, 294]);
      G.drawFloaters(dt);
      const stats = this.match
        ? [{ label: 'HAND', value: this.handNo }, { label: 'TARGET', value: TARGET }, { label: 'YOUR POINTS', value: me.score, color: P.gold }]
        : [{ label: 'STOCK', value: this.stock.length }, { label: 'YOUR CARDS', value: me.hand.length, color: P.gold }];
      if (this.handlePause('CRAZY EIGHTS', stats, () => { this.setup = true; })) return;
      if (this.pending8) this.drawSuitPicker();
      else if (this.over) this.drawResult();
      else if (this.handOver && !this.handOver.matchWon && this.phase === 'handover') this.drawHandResult();
    },
    drawSuitBox() {
      const x = DISC.x + CW + 12, y = DISC.y + 8;
      G.panel(x, y, 44, 46, { fill: P.ink, hi: P.dusk });
      G.text('SUIT', x + 22, y + 5, P.silver, 'small', 'center');
      const s = this.suit;
      if (s === undefined) return;
      const ctx = G.ctx; ctx.save(); ctx.translate(x + 15, y + 16); ctx.scale(2, 2);
      G.drawSuit(s, 0, 0, 'big', G.isRed(s) ? P.red : P.white); ctx.restore();
      const t = this.top();
      if (t && t.rank === 8) G.text('NAMED', x + 22, y + 34, P.gold, 'small', 'center');
    },
    drawBoard() {
      const { x, y, w } = BOARD;
      const h = 20 + this.players.length * 14 + 6;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk });
      G.text(this.match ? 'POINTS - TO ' + TARGET : 'CARDS LEFT', x + 6, y + 5, P.gold, 'small');
      this.players.forEach((p, i) => {
        const yy = y + 18 + i * 14;
        G.text(G.dn(p).length > 10 ? G.dn(p).replace('THE ', '').replace('CAPT ', '') : G.dn(p), x + 6, yy, this.turn === i && !this.handOver ? P.gold : P.white, 'small');
        G.text(String(this.match ? p.score : p.hand.length), x + w - 6, yy, p.human ? P.gold : P.silver, 'small', 'right');
      });
      G.text('WINS ' + G.store.get('c8_won', 0) + '/' + G.store.get('c8_played', 0), x + 6, y + h + 4, P.felt4, 'small');
    },
    drawControls() {
      const me = this.players[0];
      const myTurn = this.phase === 'you' && !this.pending8;
      const noPlay = myTurn && !this.legalCards(me).length;
      if (myTurn && ui.button('DRAW', STOCK.x - 2, STOCK.y + CH + 14, CW + 4, 16, { key: 'd', theme: noPlay ? 'gold' : 'dark', font: 'small', enabled: this.canDraw(), showKey: false })) this.humanDraw();
      if (myTurn && noPlay && !this.canDraw() && ui.button('PASS', DISC.x - 2, DISC.y + CH + 14, CW + 4, 16, { key: 'p', theme: 'red', font: 'small', showKey: false })) this.pass(0);
      let s = '', col = P.gold;
      if (myTurn) s = noPlay ? (this.canDraw() ? 'NO MATCH - CLICK THE STOCK TO DRAW' : 'NO MATCH AND NO CARDS TO DRAW - PASS') : 'YOUR TURN - PLAY ' + SUIT_WORD[this.suit] + ', ' + (this.top().rank === 8 ? 'OR ANOTHER 8' : ([1, 8].includes(this.top().rank) ? 'AN ' : 'A ') + G.RANK_NAME[this.top().rank].toUpperCase() + ', OR AN 8') + '   (D DRAWS)';
      else if (this.phase === 'deal') { s = 'DEALING...'; col = P.white; }
      else if (this.phase === 'ai' || this.phase === 'wait') { const p = this.cur(); if (p && !p.human) { s = p.name + ' IS THINKING...'; col = P.white; } }
      if (s) ui.tag(s, G.W / 2, 340, col, P.ink);
    },
    drawSuitPicker() {
      ui.modal = true;
      G.alpha(0.55, () => G.rect(0, 0, G.W, G.H, P.ink));
      ui.block(0, 0, G.W, G.H);
      const w = 236, h = 98, x = G.W / 2 - w / 2, y = 120;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
      G.text('CRAZY EIGHT - NAME A SUIT', G.W / 2, y + 10, P.gold, 'big', 'center', 1, P.black);
      const me = this.players[0];
      for (let s = 0; s < 4; s++) {
        const bx = x + 14 + s * 54, by = y + 28;
        const n = me.hand.filter((c) => c.suit === s && c !== this.pending8).length;
        if (ui.button('', bx, by, 46, 40, { modal: true, theme: 'light', key: String(s + 1), id: 'suit' + s })) { const c = this.pending8; this.pending8 = null; this.play(0, c, s); return; }
        const ctx = G.ctx; ctx.save(); ctx.translate(bx + 16, by + 6); ctx.scale(2, 2); G.drawSuit(s, 0, 0, 'big', G.isRed(s) ? P.red : P.ink); ctx.restore();
        G.text(s + 1 + ':' + n, bx + 23, by + 28, P.slate, 'small', 'center');
      }
      if (ui.button('CANCEL', G.W / 2 - 40, y + h - 24, 80, 16, { modal: true, theme: 'red', key: 'Escape', font: 'small', showKey: false })) this.pending8 = null;
    },
    drawHandResult() {
      const r = this.handOver;
      const lines = r.rows.filter((x) => x.p !== r.w).map((x) => ({ text: G.dn(x.p) + ' HELD ' + x.v + ' POINTS', color: P.silver }));
      lines.unshift({ text: (r.w.human ? 'YOU COLLECT ' : r.w.name + ' COLLECTS ') + r.gain + ' POINTS', color: r.w.human ? P.lime : P.gold, font: 'big' });
      lines.push({ text: 'SCORES: ' + this.players.map((p) => G.dn(p) + ' ' + p.score).join('   '), color: P.white });
      const act = ui.dialog(r.blocked ? 'HAND BLOCKED' : (r.w.human ? 'YOU WIN THE HAND' : r.w.name + ' WINS THE HAND'), lines, [{ label: 'NEXT HAND', act: 'next', theme: 'green', key: 'Enter' }], { w: 400, titleColor: r.w.human ? P.lime : P.gold, y: 96 });
      if (act === 'next') { this.dealer = (this.dealer + 1) % this.players.length; this.newHand(); }
    },
    drawResult() {
      const r = this.result;
      const title = r.tie ? 'TIE MATCH' : r.youWin ? (this.match ? 'YOU WIN THE MATCH' : 'YOU WIN') : r.winners[0].name + ' WINS';
      const lines = this.match
        ? this.players.slice().sort((a, b) => b.score - a.score).map((p) => ({ text: G.dn(p) + '  ' + p.score + ' POINTS', color: r.winners.includes(p) ? P.lime : P.silver }))
        : this.players.map((p) => ({ text: G.dn(p) + '  ' + p.hand.length + ' CARDS LEFT', color: r.winners.includes(p) ? P.lime : P.silver }));
      if (this.match) lines.push({ text: 'HANDS PLAYED ' + this.handNo, color: P.white });
      if (r.quote && r.quote.text) lines.push({ text: r.quote.p.name + ': "' + r.quote.text + '"', color: P.cyan });
      lines.push({ text: 'CRAZY EIGHTS WINS: ' + G.store.get('c8_won', 0) + ' OF ' + G.store.get('c8_played', 0), color: P.slate });
      const act = ui.dialog(title, lines, [{ label: 'PLAY AGAIN', act: 'again', theme: 'green', key: 'Enter' }, { label: 'SETUP', act: 'setup', theme: 'blue' }, { label: 'MENU', act: 'menu', theme: 'red' }], { w: 380, titleColor: r.youWin ? P.lime : r.tie ? P.gold : P.orange });
      if (act === 'again') this.start();
      if (act === 'setup') this.setup = true;
      if (act === 'menu') G.go(G.Menu);
    }
  }, G.TableKit));
})();
