// Pixel Card Club - Go Fish (you vs 1-3 computer opponents with Easy / Normal / Hard memory-based AI)
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui, input = G.input;
  const DECK = { x: 298, y: 140 };
  const HAND_Y = 262;
  const BOOK = { x: 16, y: 142 };
  const LOG = { x: 432, y: 124, w: 200, h: 124 };
  const LEVELS = ['EASY', 'NORMAL', 'HARD'];
  const AI_PEOPLE = [
    { name: 'LOU', skin: '#f2c79a', hair: P.wood2, shirt: P.blue, hat: P.red },
    { name: 'MAVIS', skin: '#d9a066', hair: P.ink, shirt: P.plum, hat: null },
    { name: 'RICO', skin: '#8f5b3c', hair: P.ink, shirt: P.green, hat: P.gold }
  ];
  const plural = (r) => G.RANK_PLURAL[r].toUpperCase();

  // pixel avatar portraits
  const avatarCache = {};
  function avatar(i) {
    if (avatarCache[i]) return avatarCache[i];
    const p = i < 0 ? { skin: '#f2c79a', hair: P.orange, shirt: P.teal, hat: null } : AI_PEOPLE[i];
    const [c, x] = G.makeCanvas(24, 24);
    x.fillStyle = P.navy; x.fillRect(0, 0, 24, 24);
    x.fillStyle = p.shirt; x.fillRect(4, 19, 16, 5); x.fillRect(6, 18, 12, 1);
    x.fillStyle = p.skin; x.fillRect(7, 6, 10, 12); x.fillRect(10, 17, 4, 2);
    x.fillStyle = p.hair; x.fillRect(6, 4, 12, 4); x.fillRect(6, 4, 2, 9); x.fillRect(16, 4, 2, 7);
    if (i === 1) { x.fillRect(5, 6, 2, 12); x.fillRect(17, 6, 2, 12); }
    if (p.hat) { x.fillStyle = p.hat; x.fillRect(5, 2, 14, 4); x.fillRect(3, 5, 18, 2); }
    x.fillStyle = P.ink; x.fillRect(9, 10, 2, 2); x.fillRect(13, 10, 2, 2);
    x.fillStyle = '#b05a4a'; x.fillRect(10, 14, 4, 1);
    if (i === 2) { x.fillStyle = P.ink; x.fillRect(9, 15, 6, 1); }
    avatarCache[i] = c; return c;
  }

  const scene = (G.GoFish = {
    title: 'GO FISH',
    rules: [
      '#GOAL',
      'Collect the most books. A book is all four cards of one rank (four 7s, four Kings...).',
      '#YOUR TURN',
      'Click a card in your hand to ask for that rank. With more than one opponent, then click the player you want to ask. You can only ask for ranks you already hold.',
      'If they have any, they must hand over all of them and you go again. If not, they say GO FISH and you draw from the pond. Draw the rank you asked for and you go again.',
      '#BOOKS AND THE END',
      'Books are laid down automatically. If your hand runs empty you draw a card. The game ends when all 13 books are made.',
      '#OPPONENTS',
      'EASY players ask at random. NORMAL players remember some of what others ask for. HARD players remember everything they hear and see.'
    ],
    enter() { this.setup = true; this.paused = false; this.players = []; this.cards = []; },
    start() {
      this.setup = false;
      const nOpp = G.settings.fishOpponents, level = G.settings.fishLevel;
      this.level = level;
      this.cards = G.shuffle(G.makeDeck(1));
      this.cards.forEach((c) => { c.x = DECK.x; c.y = DECK.y; c.faceUp = false; c.shownFace = false; c.flip = 1; c.lift = 0; });
      this.deck = this.cards.slice();
      this.players = [{ name: 'YOU', human: true, hand: [], books: [], av: -1 }];
      for (let i = 0; i < nOpp; i++) this.players.push({ name: AI_PEOPLE[i].name, human: false, hand: [], books: [], av: i, mem: { has: {}, lacks: {} } });
      this.turn = 0; this.q = []; this.qt = 0; this.log = []; this.bubbles = []; this.selRank = null; this.phase = 'deal'; this.over = false; this.result = null;
      const per = this.players.length <= 3 ? 7 : 5;
      let d = 0;
      for (let r = 0; r < per; r++) for (const p of this.players) { const c = this.deck.pop(); p.hand.push(c); c.delay = 0.2 + d++ * 0.05; if (p.human) c.faceUp = true; }
      this.sortHand();
      G.audio.sfx('shuffle');
      this.addLog('Dealt ' + per + ' cards each. You go first.', P.cyan);
      this.after(0.4 + d * 0.05, () => { this.players.forEach((p) => this.checkBooks(p, true)); this.startTurn(); });
      G.store.set('fish_played', G.store.get('fish_played', 0) + 1);
    },
    after(t, fn) { this.q.push({ t, fn }); },
    runQueue(dt) {
      if (!this.q.length) return;
      this.qt += dt;
      while (this.q.length && this.qt >= this.q[0].t) { this.qt -= this.q[0].t; this.q.shift().fn(); }
      if (!this.q.length) this.qt = 0;
    },
    addLog(text, color = P.white) { this.log.push({ text, color }); if (this.log.length > 40) this.log.shift(); },
    say(pi, text) { this.bubbles = this.bubbles.filter((b) => b.pi !== pi); this.bubbles.push({ pi, text, t: 1.6 }); },
    sortHand() { this.players[0].hand.sort((a, b) => a.rank - b.rank || a.suit - b.suit); },
    cur() { return this.players[this.turn]; },
    totalBooks() { return this.players.reduce((a, p) => a + p.books.length, 0); },
    // ---------- AI memory ----------
    remember(fact, pi, rank, val) {
      for (const ai of this.players) {
        if (ai.human) continue;
        if (this.level === 0) continue;
        if (this.level === 1 && val && Math.random() > 0.6) continue;
        const key = pi + '_' + rank;
        if (fact === 'has') { if (val) ai.mem.has[key] = true; else delete ai.mem.has[key]; }
        else { if (val) ai.mem.lacks[key] = true; else delete ai.mem.lacks[key]; }
      }
    },
    forgetLacks(pi) { for (const ai of this.players) if (!ai.human) for (const k in ai.mem.lacks) if (k.startsWith(pi + '_')) delete ai.mem.lacks[k]; },
    aiChoose(pi) {
      const me = this.players[pi];
      const ranks = [...new Set(me.hand.map((c) => c.rank))];
      const opps = this.players.map((p, i) => i).filter((i) => i !== pi && this.players[i].hand.length);
      const count = (r) => me.hand.filter((c) => c.rank === r).length;
      if (this.level === 0 || !opps.length) return { target: G.pick(opps), rank: G.pick(ranks) };
      // normal AI slowly forgets
      if (this.level === 1) for (const k in me.mem.has) if (Math.random() < 0.15) delete me.mem.has[k];
      const known = [];
      for (const r of ranks) for (const o of opps) if (me.mem.has[o + '_' + r]) known.push({ target: o, rank: r, w: count(r) });
      if (known.length) { known.sort((a, b) => b.w - a.w); return known[0]; }
      let rank;
      if (this.level === 2) { const best = Math.max(...ranks.map(count)); rank = G.pick(ranks.filter((r) => count(r) === best)); }
      else rank = G.pick(ranks);
      let targets = opps.filter((o) => !me.mem.lacks[o + '_' + rank]);
      if (!targets.length) targets = opps;
      if (this.level === 2) { const most = Math.max(...targets.map((o) => this.players[o].hand.length)); targets = targets.filter((o) => this.players[o].hand.length === most); }
      return { target: G.pick(targets), rank };
    },
    // ---------- turn flow ----------
    drawFor(p) {
      const c = this.deck.pop(); if (!c) return null;
      p.hand.push(c); c.faceUp = !!p.human;
      if (p.human) this.sortHand();
      this.forgetLacks(this.players.indexOf(p));
      G.audio.sfx('deal');
      return c;
    },
    startTurn() {
      if (this.totalBooks() >= 13) return this.endGame();
      const p = this.cur();
      if (!p.hand.length) {
        if (this.deck.length) {
          this.drawFor(p); this.addLog(p.name + (p.human ? ' have' : ' has') + ' no cards and draw' + (p.human ? '' : 's') + ' one.', P.silver);
          this.after(0.5, () => { this.checkBooks(p); this.startTurn(); });
        } else { this.addLog(p.name + (p.human ? ' are' : ' is') + ' out of cards.', P.silver); this.nextTurn(); }
        return;
      }
      if (p.human) { this.phase = 'choose'; this.selRank = null; }
      else { this.phase = 'ai'; this.after(0.9, () => { const ch = this.aiChoose(this.turn); this.ask(this.turn, ch.target, ch.rank); }); }
    },
    nextTurn() {
      if (this.totalBooks() >= 13) return this.endGame();
      let tries = 0;
      do { this.turn = (this.turn + 1) % this.players.length; tries++; } while (!this.players[this.turn].hand.length && !this.deck.length && tries <= this.players.length);
      if (tries > this.players.length) return this.endGame();
      this.phase = 'wait';
      this.after(0.45, () => this.startTurn());
    },
    ask(ai, ti, rank) {
      const a = this.players[ai], t = this.players[ti];
      this.phase = 'resolve'; this.selRank = null;
      this.say(ai, (a.human ? t.name + ', ' : (t.human ? '' : t.name + ', ')) + 'GOT ANY ' + plural(rank) + '?');
      this.addLog(a.name + ' asked ' + (t.human ? 'YOU' : t.name) + ' for ' + plural(rank).toLowerCase() + '.', a.human ? P.gold : P.white);
      this.remember('has', ai, rank, true);
      G.audio.sfx('click');
      this.after(1.0, () => {
        const matches = t.hand.filter((c) => c.rank === rank);
        if (matches.length) {
          t.hand = t.hand.filter((c) => c.rank !== rank);
          matches.forEach((c, i) => { a.hand.push(c); c.faceUp = !!a.human; c.delay = i * 0.08; });
          if (a.human) this.sortHand();
          this.say(ti, 'HERE, TAKE ' + matches.length + '.');
          this.addLog((t.human ? 'You gave ' : t.name + ' gave ') + matches.length + ' ' + (matches.length > 1 ? plural(rank).toLowerCase() : G.RANK_NAME[rank].toLowerCase()) + '. ' + (a.human ? 'Go again.' : a.name + ' goes again.'), a.human ? P.lime : P.orange);
          this.remember('has', ti, rank, false); this.remember('lacks', ti, rank, true);
          G.audio.sfx(a.human ? 'good' : 'chip');
          this.after(0.8, () => { this.checkBooks(a); this.startTurn(); });
        } else {
          this.say(ti, 'GO FISH!');
          G.audio.sfx('fish');
          this.remember('lacks', ti, rank, true);
          this.after(0.8, () => {
            if (!this.deck.length) { this.addLog('The pond is empty.', P.silver); return this.nextTurn(); }
            const c = this.drawFor(a);
            if (c.rank === rank) {
              this.say(ai, 'FISHED MY WISH!');
              this.addLog((a.human ? 'You' : a.name) + ' fished the ' + G.RANK_NAME[rank].toLowerCase() + '! Go again.', P.cyan);
              G.audio.sfx('good');
              this.after(0.8, () => { this.checkBooks(a); this.startTurn(); });
            } else {
              this.addLog((a.human ? 'You drew ' + G.cardName(c).toLowerCase() : a.name + ' drew a card') + '.', P.silver);
              this.after(0.6, () => { this.checkBooks(a); this.nextTurn(); });
            }
          });
        }
      });
    },
    checkBooks(p, quiet) {
      const counts = {};
      p.hand.forEach((c) => (counts[c.rank] = (counts[c.rank] || 0) + 1));
      for (const r in counts) if (counts[r] === 4) {
        const rank = +r;
        const four = p.hand.filter((c) => c.rank === rank);
        p.hand = p.hand.filter((c) => c.rank !== rank);
        four.forEach((c) => (c.faceUp = true));
        p.books.push({ rank, cards: four });
        this.addLog((p.human ? 'You complete' : p.name + ' completes') + ' a book of ' + plural(rank).toLowerCase() + '!', P.gold);
        const pi = this.players.indexOf(p);
        this.say(pi, 'BOOK OF ' + plural(rank) + '!');
        for (let i = 0; i < this.players.length; i++) { this.remember('has', i, rank, false); }
        G.audio.sfx('book');
      }
    },
    endGame() {
      if (this.over) return;
      this.over = true; this.phase = 'over';
      const scores = this.players.map((p) => p.books.length);
      const best = Math.max(...scores);
      const winners = this.players.filter((p) => p.books.length === best);
      const youWin = winners.some((p) => p.human);
      this.result = { winners, youWin, tie: winners.length > 1 };
      if (youWin && winners.length === 1) G.store.set('fish_won', G.store.get('fish_won', 0) + 1);
      G.audio.sfx(youWin ? 'win' : 'lose');
    },
    // ---------- layout ----------
    oppSlot(i) {
      // i = player index (1..n)
      const n = this.players.length - 1;
      const w = 190;
      const xs = n === 1 ? [G.W / 2 - w / 2] : n === 2 ? [70, G.W - 70 - w] : [16, G.W / 2 - w / 2, G.W - 16 - w];
      return { x: Math.round(xs[i - 1]), y: 26, w, h: 28 };
    },
    layout() {
      this.deck.forEach((c, i) => G.place(c, DECK.x - Math.floor(i / 6), DECK.y - Math.floor(i / 6), i, false));
      const me = this.players[0];
      const n = me.hand.length;
      const avail = 560;
      const off = n > 1 ? Math.min(32, Math.floor((avail - CW) / (n - 1))) : 0;
      const hw = CW + (n - 1) * off;
      const hov = this.hoverCard;
      me.hand.forEach((c, i) => {
        G.place(c, G.W / 2 - hw / 2 + i * off, HAND_Y, 100 + i, true);
        const target = this.selRank === c.rank ? 12 : hov && hov.rank === c.rank && this.phase === 'choose' ? 5 : 0;
        c.lift = G.lerp(c.lift || 0, target, 0.35);
      });
      for (let pi = 1; pi < this.players.length; pi++) {
        const p = this.players[pi], s = this.oppSlot(pi);
        const m = p.hand.length; const o = m > 1 ? Math.min(10, Math.floor((s.w - CW) / (m - 1))) : 0;
        const w = CW + (m - 1) * o;
        p.hand.forEach((c, i) => { G.place(c, s.x + s.w / 2 - w / 2 + i * o, s.y + 32, 100 + i, false); c.lift = 0; });
      }
      // books
      this.players.forEach((p, pi) => {
        p.books.forEach((b, bi) => {
          if (p.human) b.cards.forEach((c, k) => G.place(c, BOOK.x + bi * 15 + k, BOOK.y + k, 400 + bi * 4 + k, true));
          else { const s = this.oppSlot(pi); b.cards.forEach((c, k) => { G.place(c, s.x + s.w - 30, s.y - 2, 50, true); c.hidden = Math.abs(c.x - c.tx) < 2 && Math.abs(c.y - c.ty) < 2; }); }
        });
      });
    },
    handHit() {
      const me = this.players[0]; let hit = null;
      for (const c of me.hand) if (G.inRect(input.x, input.y, c.tx, c.ty - (c.lift || 0), CW, CH + (c.lift || 0))) hit = c; // last (top-most) wins
      return hit;
    },
    frame(dt) {
      if (this.setup) return this.drawSetup();
      if (this.paused || this.over) ui.modal = true;
      if (!this.paused) this.runQueue(dt);
      this.hoverCard = this.phase === 'choose' && !ui.modal && !ui.blocked() ? this.handHit() : null;
      if (this.hoverCard) ui.cursorHand = true;
      // human input
      if (this.phase === 'choose' && !ui.modal) {
        if (input.pressed && this.hoverCard) {
          input.pressed = false;
          const r = this.hoverCard.rank;
          const opps = this.players.map((p, i) => i).filter((i) => i > 0 && this.players[i].hand.length);
          if (opps.length === 1) this.ask(0, opps[0], r);
          else { this.selRank = this.selRank === r ? null : r; G.audio.sfx('click'); }
        }
        if (input.rpressed) this.selRank = null;
      }
      this.layout();
      G.updateCards(this.cards, dt, 12);

      ui.felt();
      // pond
      G.drawSlot(DECK.x, DECK.y, 'EMPTY');
      G.text('POND ' + this.deck.length, DECK.x + CW / 2, DECK.y + CH + 6, P.felt4, 'small', 'center');
      // book area
      G.text('YOUR BOOKS ' + this.players[0].books.length, BOOK.x, BOOK.y - 12, P.felt4, 'small');
      if (!this.players[0].books.length) G.drawSlot(BOOK.x, BOOK.y, 'BOOKS');
      this.drawOpponents();
      G.drawCards(this.cards, (c) => (this.selRank === c.rank && this.players[0].hand.includes(c) ? { highlight: P.gold } : null));
      this.drawLog();
      this.drawPrompt();
      this.drawBubbles(dt);
      const menu = ui.topBar('GO FISH', [
        { label: 'LEVEL', value: LEVELS[this.level], color: P.cyan },
        { label: 'BOOKS LEFT', value: 13 - this.totalBooks() },
        { label: 'YOUR BOOKS', value: this.players[0].books.length, color: P.gold }
      ]);
      if (menu && !this.paused) { this.paused = true; ui.modal = true; }
      if (this.paused) {
        const act = ui.pauseMenu(this);
        if (act === 'resume') this.paused = false;
        if (act === 'restart') { this.paused = false; this.setup = true; }
        if (act === 'menu') { this.paused = false; G.go(G.Menu); }
      } else if (this.over) {
        const r = this.result;
        const title = r.youWin ? (r.tie ? 'TIE GAME' : 'YOU WIN') : 'GAME OVER';
        const lines = this.players.slice().sort((a, b) => b.books.length - a.books.length).map((p) => ({ text: p.name + '  ' + p.books.length + ' BOOKS', color: r.winners.includes(p) ? P.lime : P.silver }));
        lines.push({ text: 'GO FISH WINS: ' + G.store.get('fish_won', 0) + ' OF ' + G.store.get('fish_played', 0), color: P.slate });
        const act = ui.dialog(title, lines, [{ label: 'PLAY AGAIN', act: 'again', theme: 'green', key: 'Enter' }, { label: 'SETUP', act: 'setup', theme: 'blue' }, { label: 'MENU', act: 'menu', theme: 'red' }], { w: 340, titleColor: r.youWin ? P.lime : P.orange });
        if (act === 'again') this.start();
        if (act === 'setup') this.setup = true;
        if (act === 'menu') G.go(G.Menu);
      }
    },
    drawOpponents() {
      const choosing = this.phase === 'choose' && this.selRank !== null;
      for (let pi = 1; pi < this.players.length; pi++) {
        const p = this.players[pi], s = this.oppSlot(pi);
        const isTurn = this.turn === pi && !this.over;
        const canPick = choosing && p.hand.length > 0;
        const hover = canPick && !ui.modal && G.inRect(input.x, input.y, s.x, s.y, s.w, s.h + 70);
        G.panel(s.x, s.y, s.w, s.h, { fill: hover ? P.navy : P.ink, hi: isTurn ? P.gold : P.dusk, border: isTurn ? P.gold : P.black });
        G.ctx.drawImage(avatar(p.av), s.x + 2, s.y + 2);
        G.text(p.name, s.x + 30, s.y + 5, isTurn ? P.gold : P.white, 'big');
        G.text(p.hand.length + ' CARDS', s.x + 30, s.y + 17, P.silver, 'small');
        // books badge
        G.text('BOOKS', s.x + s.w - 50, s.y + 6, P.silver, 'small', 'right');
        G.text(String(p.books.length), s.x + s.w - 6, s.y + 5, P.gold, 'big', 'right');
        if (p.books.length) G.text(p.books.map((b) => G.RANK_LABEL[b.rank]).join(' '), s.x + s.w - 6, s.y + 17, P.slate, 'small', 'right');
        if (canPick) {
          ui.block(s.x, s.y, s.w, s.h + 70);
          if (hover) { ui.cursorHand = true; ui.hoverId = 'opp' + pi; }
          if (Math.floor(performance.now() / 350) % 2 || hover) G.outline(s.x - 2, s.y - 2, s.w + 4, s.h + 74, hover ? P.gold : P.felt4, 1);
          if (hover && input.pressed) { input.pressed = false; this.ask(0, pi, this.selRank); }
        }
      }
    },
    drawLog() {
      const { x, y, w, h } = LOG;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk });
      G.text('TABLE TALK', x + 6, y + 5, P.gold, 'small');
      const lines = [];
      for (const l of this.log) for (const t of G.wrap(l.text.toUpperCase(), w - 12, 'small')) lines.push({ t, color: l.color });
      const show = lines.slice(-11);
      show.forEach((l, i) => G.text(l.t, x + 6, y + 16 + i * 9, l.color, 'small'));
    },
    drawPrompt() {
      let s = '', col = P.white;
      const p = this.cur();
      if (this.phase === 'choose') {
        s = this.selRank === null ? 'YOUR TURN - CLICK A CARD TO ASK FOR ITS RANK' : 'NOW CLICK A PLAYER TO ASK FOR ' + plural(this.selRank);
        col = P.gold;
      } else if (this.phase === 'deal') s = 'DEALING...';
      else if (p && !p.human && !this.over) s = p.name + ' IS THINKING...';
      if (s) { const y = HAND_Y - 26; ui.tag(s, G.W / 2, y, col, P.ink); }
      if (this.phase === 'choose' && this.selRank !== null) G.text('RIGHT-CLICK TO CANCEL', G.W / 2, G.H - 8, P.felt4, 'small', 'center');
    },
    drawBubbles(dt) {
      for (const b of this.bubbles) {
        b.t -= dt;
        if (b.pi === 0) ui.bubble(b.text, G.W / 2, HAND_Y - 46);
        else { const s = this.oppSlot(b.pi); ui.bubble(b.text, s.x + s.w / 2, s.y + 98, true); }
      }
      this.bubbles = this.bubbles.filter((b) => b.t > 0);
    },
    drawSetup() {
      ui.felt();
      ui.modal = true;
      const w = 340, h = 200, x = G.W / 2 - w / 2, y = 70;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
      G.text('GO FISH', G.W / 2, y + 14, P.gold, 'big', 'center', 2, P.black);
      G.text('OPPONENTS', x + 20, y + 48, P.silver, 'small');
      const o = ui.choice(['1', '2', '3'], G.settings.fishOpponents - 1, x + 20, y + 58, w - 40, 20, { modal: true, id: 'opp' });
      G.text('COMPUTER SKILL', x + 20, y + 88, P.silver, 'small');
      const l = ui.choice(LEVELS, G.settings.fishLevel, x + 20, y + 98, w - 40, 20, { modal: true, id: 'lvl' });
      if (o !== G.settings.fishOpponents - 1 || l !== G.settings.fishLevel) { G.settings.fishOpponents = o + 1; G.settings.fishLevel = l; G.saveSettings(); }
      const desc = ['Picks ranks and players at random.', 'Remembers some of what others ask for.', 'Remembers every ask, give and miss.'][G.settings.fishLevel];
      G.text(desc, G.W / 2, y + 126, P.cyan, 'small', 'center');
      for (let i = 0; i < G.settings.fishOpponents; i++) G.ctx.drawImage(avatar(i), G.W / 2 - (G.settings.fishOpponents * 30) / 2 + i * 30 + 3, y + 138);
      if (ui.button('START', x + 20, y + h - 30, 180, 22, { modal: true, theme: 'green', key: ['Enter', ' '], showKey: false })) this.start();
      if (ui.button('BACK', x + 208, y + h - 30, w - 228, 22, { modal: true, theme: 'red', key: 'Escape', showKey: false })) G.go(G.Menu);
    }
  });
})();
