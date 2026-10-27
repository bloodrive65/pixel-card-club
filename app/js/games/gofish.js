// Pixel Card Club - Go Fish: free-for-all (you vs 1-3) or teams 2v2, with Club members as AI players
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui, input = G.input;
  // wide (landscape) table by default; lay() swaps in the upright (portrait) layout
  let DECK, HAND_Y, BOOK, LOG, PLATE, TAG_Y, BOOK_ROW;
  function lay() {
    if (G.portrait) {
      // opponents on top; the pond (left) and table talk (right) in the middle;
      // your plate, books and hand at the bottom. The middle is centred between the opponents' bubbles and your bubble.
      const BH = Math.round(CH * 1.5), BW = Math.round(CW * 1.5), top = 190, bot = G.H - 160 - 106;
      DECK = { x: 14, y: top + Math.max(0, Math.round((bot - top - BH - 14) / 2)) };
      const lx = DECK.x + BW + 16;
      LOG = { x: lx, y: DECK.y, w: G.W - lx - 8, h: BH + 10, strip: true };
      HAND_Y = G.H - 112; BOOK_ROW = 13;
      // these follow the hand (it moves up when it splits into two rows); see layout()
      BOOK = { x: 4, y: HAND_Y - 40 }; TAG_Y = HAND_Y - 74; PLATE = { x: 4, y: HAND_Y - 80 };
    } else {
      DECK = { x: 298, y: 176 }; HAND_Y = 268; BOOK = { x: 14, y: 190 }; BOOK_ROW = 7;
      LOG = { x: 470, y: 172, w: 162, h: 88 }; PLATE = { x: 8, y: 312 }; TAG_Y = 340;
    }
  }
  lay();
  const TEAM_COL = [P.sky, P.red];
  const TEAM_NAME = ['TEAM BLUE', 'TEAM RED'];
  const plural = (r) => G.RANK_PLURAL[r].toUpperCase();
  const RECALL = [0, 0.6, 0.95], FORGET = [0, 0.15, 0];

  const scene = (G.GoFish = {
    title: 'GO FISH',
    bookChapter: 'gofish',
    enter() {
      this.setup = true; this.paused = false; this.players = []; this.cards = [];
      const S = G.settings;
      if (!this.ffa) {
        this.ffa = { slots: [], picks: (S.fishPicks || ['lou', 'mavis', 'rico']).slice(0, 3), focus: 0, seatY: 104 };
        while (this.ffa.picks.length < 3) this.ffa.picks.push(null);
        const t = S.fishTeam || { partner: 'nova', opps: ['tank', 'granny'] };
        this.teams = { slots: [{ label: 'YOUR PARTNER - TEAM BLUE', color: P.sky }, { label: 'RIVAL 1 - TEAM RED', color: P.red }, { label: 'RIVAL 2 - TEAM RED', color: P.red }], picks: [t.partner, t.opps[0], t.opps[1]], focus: 0, seatY: 84 };
      }
    },
    mode() { return G.settings.fishMode === 'teams' ? 'teams' : 'ffa'; },
    start() {
      this.setup = false;
      const teams = this.mode() === 'teams';
      this.teamMode = teams;
      let ids;
      if (teams) { G.fillRandom(this.teams); const [pa, o1, o2] = this.teams.picks; ids = [o1, pa, o2]; G.settings.fishTeam = { partner: pa, opps: [o1, o2] }; }
      else { const n = G.settings.fishOpponents; const st = this.ffa; const sub = { picks: st.picks.slice(0, n) }; G.fillRandom(sub); st.picks.splice(0, n, ...sub.picks); ids = sub.picks; G.settings.fishPicks = st.picks.slice(); }
      G.saveSettings();
      this.cards = G.shuffle(G.makeDeck(1));
      this.cards.forEach((c) => { c.x = DECK.x; c.y = DECK.y; c.faceUp = false; c.shownFace = false; c.flip = 1; c.lift = 0; c.hidden = false; c.sc = undefined; });
      this.deck = this.cards.slice();
      this.players = [{ name: 'YOU', human: true, hand: [], books: [], id: 'you', team: 0 }];
      ids.forEach((id, i) => {
        const ch = G.char(id);
        this.players.push({ name: ch.name, human: false, hand: [], books: [], id, ch, team: teams ? (i === 1 ? 0 : 1) : i + 1, mem: { has: {}, lacks: {} }, grudge: null });
      });
      this.turn = 0; this.q = []; this.qt = 0; this.log = []; this.bubbles = []; this._logOpen = false; this.selRank = null; this.phase = 'deal'; this.over = false; this.result = null;
      // Bicycle rules: 7 cards each for 2-3 players, 5 each for 4 or more
      const per = this.players.length <= 3 ? 7 : 5;
      let d = 0;
      for (let r = 0; r < per; r++) for (const p of this.players) { const c = this.deck.pop(); p.hand.push(c); c.delay = 0.2 + d++ * 0.05; if (p.human) c.faceUp = true; }
      this.sortHand();
      G.audio.sfx('shuffle');
      this.addLog('Dealt ' + per + ' cards each. You go first.', P.cyan);
      if (teams) this.addLog('Team Blue: you + ' + this.players[2].name + '. Ask only Team Red.', P.sky);
      G.rollForms(this.players, (t) => this.addLog(t, P.silver));
      this.after(0.4 + d * 0.05, () => {
        this.players.forEach((p, i) => { if (!p.human && i) this.say(i, p.ch.quote.toUpperCase()); this.checkBooks(p); });
        this.startTurn();
      });
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
    say(pi, text) { if (!text) return; this.bubbles = this.bubbles.filter((b) => b.pi !== pi); this.bubbles.push({ pi, text, t: 2.7 }); },
    sortHand() { this.players[0].hand.sort((a, b) => a.rank - b.rank || a.suit - b.suit); },
    cur() { return this.players[this.turn]; },
    totalBooks() { return this.players.reduce((a, p) => a + p.books.length, 0); },
    teamBooks(t) { return this.players.filter((p) => p.team === t).reduce((a, p) => a + p.books.length, 0); },
    // who can player ai legally ask?
    targets(ai) { const a = this.players[ai]; return this.players.map((p, i) => i).filter((i) => i !== ai && this.players[i].hand.length && (!this.teamMode || this.players[i].team !== a.team)); },
    // ---------- AI memory (each Club member hears with their own skill) ----------
    remember(fact, pi, rank, val) {
      for (const ai of this.players) {
        if (ai.human) continue;
        const rec = ai.ch.fish.perfect ? 1 : RECALL[ai.form];
        if (val && Math.random() > rec) continue;
        const key = pi + '_' + rank;
        const m = fact === 'has' ? ai.mem.has : ai.mem.lacks;
        if (val) m[key] = true; else delete m[key];
      }
    },
    forgetLacks(pi) { for (const ai of this.players) if (!ai.human) for (const k in ai.mem.lacks) if (k.startsWith(pi + '_')) delete ai.mem.lacks[k]; },
    aiChoose(pi) {
      const me = this.players[pi], ch = me.ch;
      const ranks = [...new Set(me.hand.map((c) => c.rank))];
      const opps = this.targets(pi);
      const count = (r) => me.hand.filter((c) => c.rank === r).length;
      if (!ch.fish.perfect) for (const k in me.mem.has) if (Math.random() < FORGET[me.form]) delete me.mem.has[k];
      if (me.form > 0) {
        const known = [];
        for (const r of ranks) for (const o of opps) if (me.mem.has[o + '_' + r]) known.push({ target: o, rank: r, w: count(r) });
        if (known.length) { known.sort((a, b) => b.w - a.w); return known[0]; }
      }
      let rank;
      if (ch.fish.rank === 'most' && me.form > 0) { const best = Math.max(...ranks.map(count)); rank = G.pick(ranks.filter((r) => count(r) === best)); }
      else rank = G.pick(ranks);
      let ts = me.form > 0 ? opps.filter((o) => !me.mem.lacks[o + '_' + rank]) : opps.slice();
      if (!ts.length) ts = opps.slice();
      const tg = ch.fish.target;
      if (tg === 'mostCards') { const m = Math.max(...ts.map((o) => this.players[o].hand.length)); ts = ts.filter((o) => this.players[o].hand.length === m); }
      if (tg === 'leader') { const score = (o) => (this.teamMode ? this.teamBooks(this.players[o].team) : this.players[o].books.length); const m = Math.max(...ts.map(score)); ts = ts.filter((o) => score(o) === m); }
      if (tg === 'human' && ts.includes(0) && Math.random() < 0.7) ts = [0];
      if (me.grudge !== null && ts.includes(me.grudge) && Math.random() < 0.5) ts = [me.grudge];
      return { target: G.pick(ts), rank };
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
    canAct(i) { const p = this.players[i]; return p.hand.length ? this.targets(i).length > 0 || this.deck.length > 0 : this.deck.length > 0; },
    startTurn() {
      if (this.totalBooks() >= 13) return this.endGame();
      const p = this.cur(), pi = this.turn;
      if (!p.hand.length) {
        if (this.deck.length) {
          this.drawFor(p); this.addLog(p.name + (p.human ? ' have' : ' has') + ' no cards and draw' + (p.human ? '' : 's') + ' one.', P.silver);
          this.after(0.5, () => { this.checkBooks(p); this.startTurn(); });
        } else { this.addLog(p.name + (p.human ? ' are' : ' is') + ' out of cards.', P.silver); this.nextTurn(); }
        return;
      }
      if (!this.targets(pi).length) {
        // nobody (on the other team) has cards left to ask: fish once and pass
        if (this.deck.length) {
          this.addLog('Nobody to ask. ' + p.name + (p.human ? ' draw' : ' draws') + ' a card.', P.silver);
          this.drawFor(p);
          this.after(0.6, () => { this.checkBooks(p); this.nextTurn(); });
        } else this.nextTurn();
        return;
      }
      if (p.human) { this.phase = 'choose'; this.selRank = null; }
      else { this.phase = 'ai'; this.after(0.9, () => { const ch = this.aiChoose(this.turn); this.ask(this.turn, ch.target, ch.rank); }); }
    },
    nextTurn() {
      // teams: once the pond is dry, a rank held entirely by one team can never change hands, so the team pools it
      if (this.teamMode && !this.deck.length) this.poolTeams();
      if (this.totalBooks() >= 13) return this.endGame();
      let tries = 0;
      do { this.turn = (this.turn + 1) % this.players.length; tries++; } while (!this.canAct(this.turn) && tries <= this.players.length);
      if (tries > this.players.length) return this.endGame();
      this.phase = 'wait';
      this.after(0.45, () => this.startTurn());
    },
    ask(ai, ti, rank) {
      const a = this.players[ai], t = this.players[ti];
      this.phase = 'resolve'; this.selRank = null;
      this.say(ai, (t.human ? '' : t.name + ', ') + 'GOT ANY ' + plural(rank) + '?');
      this.addLog((a.human ? 'You' : a.name) + ' asked ' + (t.human ? 'YOU' : t.name) + ' for ' + plural(rank).toLowerCase() + '.', a.human ? P.gold : P.white);
      this.remember('has', ai, rank, true);
      G.audio.sfx('click');
      this.after(1.0, () => {
        const matches = t.hand.filter((c) => c.rank === rank);
        if (matches.length) {
          t.hand = t.hand.filter((c) => c.rank !== rank);
          matches.forEach((c, i) => { a.hand.push(c); c.faceUp = !!a.human; c.delay = i * 0.08; });
          if (a.human) this.sortHand();
          if (!t.human) t.grudge = ai;
          this.say(ti, 'HERE, TAKE ' + matches.length + '.');
          this.addLog((t.human ? 'You gave ' : t.name + ' gave ') + matches.length + ' ' + (matches.length > 1 ? plural(rank).toLowerCase() : G.RANK_NAME[rank].toLowerCase()) + '. ' + (a.human ? 'Go again.' : a.name + ' goes again.'), a.human || (this.teamMode && a.team === 0) ? P.lime : P.orange);
          this.remember('has', ti, rank, false); this.remember('lacks', ti, rank, true);
          G.audio.sfx(a.human ? 'good' : 'chip');
          this.after(0.8, () => { this.checkBooks(a); this.startTurn(); });
        } else {
          this.say(ti, t.human ? 'GO FISH!' : G.say(t.ch, 'fish'));
          G.audio.sfx('fish');
          this.remember('lacks', ti, rank, true);
          this.after(0.8, () => {
            if (!this.deck.length) { this.addLog('The pond is empty.', P.silver); return this.nextTurn(); }
            const c = this.drawFor(a);
            if (c.rank === rank) {
              this.say(ai, 'FISHED MY WISH!');
              this.addLog((a.human ? 'You' : a.name) + ' fished the ' + G.RANK_NAME[rank].toLowerCase() + '. Go again.', P.cyan);
              G.audio.sfx('good');
              this.after(0.8, () => { this.checkBooks(a); this.startTurn(); });
            } else {
              this.addLog((a.human ? 'You drew ' + G.cardName(c).toLowerCase() : a.name + ' drew a card') + '.', P.silver);
              // Bicycle rules: completing a book earns another turn
              this.after(0.6, () => { if (this.checkBooks(a)) { this.addLog('A new book earns another turn.', P.gold); this.startTurn(); } else this.nextTurn(); });
            }
          });
        }
      });
    },
    // lay down any four-of-a-kind; returns number of books made
    checkBooks(p) {
      const counts = {}; let made = 0;
      p.hand.forEach((c) => (counts[c.rank] = (counts[c.rank] || 0) + 1));
      for (const r in counts) if (counts[r] === 4) {
        const rank = +r;
        const four = p.hand.filter((c) => c.rank === rank);
        p.hand = p.hand.filter((c) => c.rank !== rank);
        four.forEach((c, k) => { c.faceUp = true; c.delay = k * 0.06; });
        p.books.push({ rank, cards: four, laid: false });
        made++;
        this.addLog((p.human ? 'You lay down' : p.name + ' lays down') + ' a book of ' + plural(rank).toLowerCase() + '.', P.gold);
        const pi = this.players.indexOf(p);
        this.say(pi, p.human ? 'BOOK OF ' + plural(rank) + '!' : G.say(p.ch, 'book') + ' ' + plural(rank) + '!');
        for (let i = 0; i < this.players.length; i++) this.remember('has', i, rank, false);
        G.audio.sfx('book');
      }
      if (made) this.sortHand();
      return made;
    },
    // teams: when play is stuck, teammates pool any rank they hold all four of between them
    poolTeams() {
      if (!this.teamMode) return;
      for (let r = 1; r <= 13; r++) for (const t of [0, 1]) {
        const mates = this.players.filter((p) => p.team === t);
        const cards = mates.flatMap((p) => p.hand.filter((c) => c.rank === r));
        if (cards.length === 4) {
          mates.forEach((p) => (p.hand = p.hand.filter((c) => c.rank !== r)));
          cards.forEach((c) => (c.faceUp = true));
          const owner = mates.find((p) => p.hand.length) || mates[0];
          owner.books.push({ rank: r, cards, laid: false });
          for (let i = 0; i < this.players.length; i++) this.remember('has', i, r, false);
          this.addLog(TEAM_NAME[t] + ' pools their ' + plural(r).toLowerCase() + ' into a book.', TEAM_COL[t]);
          G.audio.sfx('book');
        }
      }
      this.sortHand();
    },
    endGame() {
      if (this.over) return;
      this.poolTeams();
      this.over = true; this.phase = 'over';
      let youWin, tie, winners;
      if (this.teamMode) {
        const b = this.teamBooks(0), r = this.teamBooks(1);
        youWin = b > r; tie = b === r;
        winners = this.players.filter((p) => (tie ? true : p.team === (youWin ? 0 : 1)));
        this.players.forEach((p) => { if (!p.human && p.team === 1 && !tie) G.addRecord(p.id, youWin); });
      } else {
        const best = Math.max(...this.players.map((p) => p.books.length));
        winners = this.players.filter((p) => p.books.length === best);
        youWin = winners.some((p) => p.human); tie = winners.length > 1;
        const mine = this.players[0].books.length;
        this.players.forEach((p) => { if (!p.human && p.books.length !== mine) G.addRecord(p.id, mine > p.books.length); });
      }
      this.result = { winners, youWin, tie };
      if (youWin && !tie) G.store.set('fish_won', G.store.get('fish_won', 0) + 1);
      const aiWin = winners.find((p) => !p.human);
      const aiLose = this.players.find((p) => !p.human && !winners.includes(p));
      this.result.quote = youWin && aiLose ? { p: aiLose, text: G.say(aiLose.ch, 'lose') } : aiWin ? { p: aiWin, text: G.say(aiWin.ch, 'win') } : null;
      G.audio.sfx(youWin ? 'win' : 'lose');
    },
    // ---------- layout ----------
    oppSlot(i) {
      const n = this.players.length - 1;
      if (G.portrait) {
        const w = n === 1 ? 200 : n === 2 ? 172 : 114;
        const xs = n === 1 ? [G.W / 2 - w / 2] : n === 2 ? [6, G.W - 6 - w] : [4, 123, 242];
        return { x: Math.round(xs[i - 1]), y: 36, w, h: 28, narrow: w < 150 };
      }
      const w = 190;
      const xs = n === 1 ? [G.W / 2 - w / 2] : n === 2 ? [70, G.W - 70 - w] : [16, G.W / 2 - w / 2, G.W - 16 - w];
      return { x: Math.round(xs[i - 1]), y: 24, w, h: 28 };
    },
    bookSpot(pi, bi) {
      if (pi === 0) return { x: BOOK.x + (bi % BOOK_ROW) * 27, y: BOOK.y + Math.floor(bi / BOOK_ROW) * 23 };
      const s = this.oppSlot(pi);
      const per = Math.max(1, Math.floor((s.w + 1) / 27));
      return { x: s.x + 1 + (bi % per) * 27, y: (G.portrait ? s.y + 104 : 122) + Math.floor(bi / per) * (G.portrait ? 12 : 23) };
    },
    layout() {
      const PT = G.portrait, S = PT ? 1.5 : 1, BW = Math.round(CW * S);
      G.cardScale = S;
      this.deck.forEach((c, i) => G.place(c, DECK.x - Math.floor(i / 6), DECK.y - Math.floor(i / 6), i, false));
      const me = this.players[0];
      const n = me.hand.length;
      // a big hand splits into two rows so every card stays wide enough to tap
      const two = PT && n > 8, k1 = two ? Math.ceil(n / 2) : n, hy = two ? G.H - 160 : HAND_Y;
      // your prompt, status and books ride just above the top row of your hand
      if (PT) { BOOK.y = hy - 44; PLATE.y = hy - 80; }
      const rowOff = (k) => (k > 1 ? Math.min(PT ? 46 : 32, Math.floor(((PT ? G.W - 12 : 560) - BW) / (k - 1))) : 0);
      const hov = this.hoverCard;
      me.hand.forEach((c, i) => {
        const row = i < k1 ? 0 : 1, j = row ? i - k1 : i, k = row ? n - k1 : k1, off = rowOff(k), hw = BW + (k - 1) * off;
        G.place(c, G.W / 2 - hw / 2 + j * off, hy + row * 50, 100 + i, true);
        const target = this.selRank === c.rank ? 12 : hov && hov.rank === c.rank && this.phase === 'choose' ? 5 : 0;
        c.lift = G.lerp(c.lift || 0, target, 0.35);
      });
      G.cardScale = 1;
      for (let pi = 1; pi < this.players.length; pi++) {
        const p = this.players[pi], s = this.oppSlot(pi);
        const m = p.hand.length; const o = m > 1 ? Math.min(10, Math.floor((s.w - CW) / (m - 1))) : 0;
        const w = CW + (m - 1) * o;
        p.hand.forEach((c, i) => { G.place(c, s.x + s.w / 2 - w / 2 + i * o, s.y + 32, 100 + i, false); c.lift = 0; });
      }
      // books fly to the owner's spot on the table, then are laid down as a small fanned stack
      this.players.forEach((p, pi) => p.books.forEach((b, bi) => {
        if (b.laid) return;
        const sp = this.bookSpot(pi, bi);
        b.cards.forEach((c, k) => { G.place(c, sp.x - 9 + k * 2, sp.y - 21, 600 + k, true); c.lift = 0; });
        if (b.cards.every((c) => c.delay <= 0 && Math.abs(c.x - c.tx) < 3 && Math.abs(c.y - c.ty) < 3 && c.shownFace)) {
          b.laid = true; b.t = 0; b.cards.forEach((c) => (c.hidden = true)); G.audio.sfx('place');
        }
      }));
    },
    handHit() {
      const me = this.players[0]; let hit = null;
      for (const c of me.hand) if (G.inRect(input.x, input.y, c.tx, c.ty - (c.lift || 0), G.cw(c), G.ch(c) + (c.lift || 0))) hit = c;
      return hit;
    },
    frame(dt) {
      lay();
      if (this.setup) return this.drawSetup();
      if (this.paused || this.over) ui.modal = true;
      if (!this.paused) this.runQueue(dt);
      this.hoverCard = this.phase === 'choose' && !ui.modal && !ui.blocked() ? this.handHit() : null;
      if (this.hoverCard) ui.cursorHand = true;
      if (this.phase === 'choose' && !ui.modal) {
        if (input.pressed && this.hoverCard) {
          input.pressed = false;
          const r = this.hoverCard.rank;
          const opps = this.targets(0);
          if (opps.length === 1) this.ask(0, opps[0], r);
          else { this.selRank = this.selRank === r ? null : r; G.audio.sfx('click'); }
        }
        if (input.rpressed) this.selRank = null;
      }
      this.layout();
      G.updateCards(this.cards, dt, 12);

      ui.felt();
      const DS = G.portrait ? 1.5 : 1;
      G.drawSlot(DECK.x, DECK.y, 'EMPTY', undefined, DS);
      G.text('POND ' + this.deck.length, DECK.x + CW * DS / 2, DECK.y + CH * DS + 5, G.portrait ? P.silver : P.felt4, 'small', 'center');
      // your book area
      const me = this.players[0];
      if (!G.portrait) G.text('YOUR BOOKS ' + me.books.length, BOOK.x, BOOK.y - 11, this.teamMode ? P.sky : P.felt4, 'small');
      if (!me.books.length) { G.alpha(0.5, () => G.rect(BOOK.x, BOOK.y, 26, 20, P.felt0)); G.outline(BOOK.x, BOOK.y, 26, 20, P.felt4); }
      this.players.forEach((p, pi) => p.books.forEach((b, bi) => {
        if (!b.laid) return;
        const sp = this.bookSpot(pi, bi);
        b.t = (b.t || 0) + dt;
        const pop = b.t < 0.25 ? Math.round(Math.sin((b.t / 0.25) * Math.PI) * 3) : 0;
        G.alpha(0.35, () => G.rect(sp.x + 1, sp.y + 2, 26, 20, P.black));
        G.drawMiniBook(b.rank, sp.x, sp.y - pop);
      }));
      this.drawOpponents();
      if (G.portrait) {
        // your plate: avatar, name, the turn prompt on its second line, counts on the right
        const pr = this.promptText(), w = G.W - 8, turn = this.turn === 0 && !this.over;
        G.youPlate(PLATE.x, PLATE.y, w, pr.s, pr.col, turn);
        if (this.teamMode) G.text('TEAM BLUE', PLATE.x + w - 6, PLATE.y + 5, P.sky, 'small', 'right');
        G.text(me.hand.length + 'C  ' + me.books.length + ' BK', PLATE.x + w - 6, PLATE.y + (this.teamMode ? 17 : 11), P.silver, 'small', 'right');
      } else G.youPlate(PLATE.x, PLATE.y, 128, me.hand.length + ' CARDS  ' + me.books.length + ' BOOKS', P.silver, this.turn === 0 && !this.over);
      G.drawCards(this.cards, (c) => (this.selRank === c.rank && me.hand.includes(c) ? { highlight: P.gold } : null));
      this.drawLog();
      this.drawPrompt();
      this.drawBubbles(dt);
      const stats = this.teamMode
        ? [{ label: 'BOOKS LEFT', value: 13 - this.totalBooks() }, { label: 'BLUE', value: this.teamBooks(0), color: P.sky }, { label: 'RED', value: this.teamBooks(1), color: P.red }]
        : [{ label: 'BOOKS LEFT', value: 13 - this.totalBooks() }, { label: 'YOUR BOOKS', value: me.books.length, color: P.gold }];
      ui.talkOverlay(this, this.log);
      const menu = ui.topBar(this.teamMode ? 'GO FISH TEAMS' : 'GO FISH', stats);
      if (menu && !this.paused) { this.paused = true; ui.modal = true; }
      if (this.paused) {
        const act = ui.pauseMenu(this);
        if (act === 'resume') this.paused = false;
        if (act === 'restart') { this.paused = false; this.setup = true; }
        if (act === 'menu') { this.paused = false; G.go(G.Menu); }
      } else if (this.over) this.drawResult();
    },
    drawResult() {
      const r = this.result;
      const title = r.tie ? 'TIE GAME' : r.youWin ? (this.teamMode ? 'TEAM BLUE WINS' : 'YOU WIN') : this.teamMode ? 'TEAM RED WINS' : 'GAME OVER';
      let lines;
      if (this.teamMode) {
        lines = [0, 1].map((t) => ({ text: TEAM_NAME[t] + ' (' + this.players.filter((p) => p.team === t).map((p) => G.dn(p)).join(' + ') + ')  ' + this.teamBooks(t) + ' BOOKS', color: TEAM_COL[t] }));
      } else lines = this.players.slice().sort((a, b) => b.books.length - a.books.length).map((p) => ({ text: G.dn(p) + '  ' + p.books.length + ' BOOKS', color: r.winners.includes(p) ? P.lime : P.silver }));
      if (r.quote) lines.push({ text: r.quote.p.name + ': "' + r.quote.text + '"', color: P.cyan });
      lines.push({ text: 'GO FISH WINS: ' + G.store.get('fish_won', 0) + ' OF ' + G.store.get('fish_played', 0), color: P.slate });
      const act = ui.dialog(title, lines, [{ label: 'PLAY AGAIN', act: 'again', theme: 'green', key: 'Enter' }, { label: 'SETUP', act: 'setup', theme: 'blue' }, { label: 'MENU', act: 'menu', theme: 'red' }], { w: 380, titleColor: r.youWin ? P.lime : r.tie ? P.gold : P.orange });
      if (act === 'again') this.start();
      if (act === 'setup') this.setup = true;
      if (act === 'menu') G.go(G.Menu);
    },
    drawOpponents() {
      const choosing = this.phase === 'choose' && this.selRank !== null;
      const legal = this.targets(0);
      for (let pi = 1; pi < this.players.length; pi++) {
        const p = this.players[pi], s = this.oppSlot(pi);
        const isTurn = this.turn === pi && !this.over;
        const canPick = choosing && legal.includes(pi);
        const hover = canPick && !ui.modal && G.inRect(input.x, input.y, s.x, s.y, s.w, s.h + 70);
        const tcol = this.teamMode ? TEAM_COL[p.team] : null;
        G.panel(s.x, s.y, s.w, s.h, { fill: hover ? P.navy : P.ink, hi: isTurn ? P.gold : tcol || P.dusk, border: isTurn ? P.gold : P.black });
        if (tcol) G.rect(s.x + 1, s.y + s.h - 3, s.w - 2, 2, tcol);
        G.drawAvatar(p.id, s.x + 2, s.y + 2);
        G.text(p.name, s.x + 30, s.y + 5, isTurn ? P.gold : P.white, 'big');
        G.text(p.hand.length + (s.narrow ? 'C' : ' CARDS') + (this.teamMode ? (p.team === 0 ? (s.narrow ? ' PTNR' : '  PARTNER') : s.narrow ? '' : '  RIVAL') : ''), s.x + 30, s.y + 17, tcol || P.silver, 'small');
        if (!s.narrow || p.name.length <= 6) G.stars(p.form, s.x + s.w - 26, s.y + 6);
        G.text(s.narrow ? 'BK' : 'BOOKS', s.x + s.w - 20, s.y + 17, P.silver, 'small', 'right');
        G.text(String(p.books.length), s.x + s.w - 6, s.y + 17, P.gold, 'small', 'right');
        if (canPick) {
          ui.block(s.x, s.y, s.w, s.h + 70);
          if (hover) { ui.cursorHand = true; ui.hoverId = 'opp' + pi; }
          if (Math.floor(performance.now() / 350) % 2 || hover) G.outline(s.x - 2, s.y - 2, s.w + 4, s.h + 74, hover ? P.gold : P.felt4, 1);
          if (hover && input.pressed) { input.pressed = false; this.ask(0, pi, this.selRank); }
        }
      }
    },
    drawLog() {
      if (G.portrait && LOG.strip) return ui.talkStrip(this, LOG, this.log);
      const { x, y, w, h } = LOG;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk });
      G.text('TABLE TALK', x + 6, y + 5, P.gold, 'small');
      const lines = [];
      for (const l of this.log) for (const t of G.wrap(l.text.toUpperCase(), w - 12, 'small')) lines.push({ t, color: l.color });
      lines.slice(-(G.portrait ? Math.floor((h - 20) / 9) : 8)).forEach((l, i) => G.text(l.t, x + 6, y + 16 + i * 9, l.color, 'small'));
    },
    drawPrompt() {
      if (G.portrait) return; // shown inside your plate
      const { s, col } = this.promptText();
      if (s) ui.tag(s, G.W / 2, TAG_Y, col, P.ink);
    },
    promptText() {
      let s = '', col = P.white;
      const p = this.cur();
      if (this.phase === 'choose') {
        const tap = G.touch ? 'TAP' : 'CLICK';
        s = this.selRank === null ? 'YOUR TURN - ' + tap + ' A CARD TO ASK FOR ITS RANK' : 'NOW ' + tap + ' ' + (this.teamMode ? 'A RIVAL' : 'A PLAYER') + ' TO ASK FOR ' + plural(this.selRank) + (G.touch ? '  (TAP THE CARD AGAIN TO CANCEL)' : '  (RIGHT-CLICK CANCELS)');
        col = P.gold;
      } else if (this.phase === 'deal') s = 'DEALING...';
      else if (p && !p.human && !this.over) s = p.name + ' IS THINKING...';
      if (s && G.portrait) {
        s = s.replace(/  \(.*\)$/, '').replace(/^YOUR TURN - /, '');
        if (p && !p.human && !this.over) col = P.silver;
      }
      return { s, col };
    },
    drawBubbles(dt) {
      for (const b of this.bubbles) {
        b.t -= dt;
        if (G.portrait) {
          // yours points down at your books and hand; theirs hang under their cards (and books, if any)
          if (b.pi === 0) ui.bubble(b.text, PLATE.x + 15, PLATE.y - 22, false, 'big', G.W - 8);
          else {
            const s = this.oppSlot(b.pi), nb = this.players[b.pi].books.length, per = Math.max(1, Math.floor((s.w + 1) / 27));
            ui.bubble(b.text, s.x + s.w / 2, s.y + 104 + (nb ? Math.ceil(nb / per) * 12 + 10 : 0), true, 'big', Math.floor(G.W / (this.players.length - 1)) - 6);
          }
        } else if (b.pi === 0) ui.bubble(b.text, 72, PLATE.y - 18);
        else { const s = this.oppSlot(b.pi); ui.bubble(b.text, s.x + s.w / 2, s.y + 82, true); }
      }
      this.bubbles = this.bubbles.filter((b) => b.t > 0);
    },
    drawSetup() {
      ui.felt();
      ui.modal = false;
      if (G.portrait) return this.drawSetupPortrait();
      G.panel(10, 8, 620, 344, { fill: P.ink, hi: P.dusk, accent: P.gold });
      ui.block(10, 8, 620, 344);
      G.text('GO FISH', 22, 18, P.gold, 'big', 'left', 2, P.black);
      const S = G.settings;
      G.text('MODE', 22, 40, P.silver, 'small');
      const m = ui.choice(['FREE-FOR-ALL', 'TEAMS 2V2'], S.fishMode === 'teams' ? 1 : 0, 22, 48, 210, 18, { id: 'mode', font: 'small' });
      if ((m === 1 ? 'teams' : 'ffa') !== this.mode()) { S.fishMode = m === 1 ? 'teams' : 'ffa'; G.saveSettings(); }
      let st;
      if (this.mode() === 'ffa') {
        G.text('OPPONENTS', 22, 74, P.silver, 'small');
        const o = ui.choice(['1', '2', '3'], S.fishOpponents - 1, 22, 82, 210, 16, { id: 'opp' });
        if (o !== S.fishOpponents - 1) { S.fishOpponents = o + 1; G.saveSettings(); }
        st = this.ffa;
        const labels = S.fishOpponents === 1 ? ['OPPONENT - ACROSS'] : S.fishOpponents === 2 ? ['OPPONENT 1 - LEFT', 'OPPONENT 2 - RIGHT'] : ['OPPONENT 1 - LEFT', 'OPPONENT 2 - ACROSS', 'OPPONENT 3 - RIGHT'];
        st.slots = labels.map((l) => ({ label: l, color: P.orange }));
        st.focus = Math.min(st.focus, st.slots.length - 1);
        // the picker works on the visible slots only
        const view = { slots: st.slots, picks: st.picks.slice(0, st.slots.length), focus: st.focus, seatY: 104, hoverChar: st.hoverChar };
        G.rosterPicker(view);
        st.picks.splice(0, view.picks.length, ...view.picks); st.focus = view.focus; st.hoverChar = view.hoverChar;
        if (ui.button('RANDOM PICKS', 22, 230, 210, 18, { id: 'rnd', theme: 'dark' })) { const v = { picks: view.picks.map(() => null) }; G.fillRandom(v); st.picks.splice(0, v.picks.length, ...v.picks); }
      } else {
        st = this.teams;
        G.text('BLUE: YOU + PARTNER   VS   RED: 2 RIVALS', 22, 74, P.sky, 'small');
        st.seatY = 84; st.gridY = undefined;
        G.rosterPicker(st);
        if (ui.button('RANDOM PICKS', 22, 210, 210, 18, { id: 'rnd', theme: 'dark' })) { st.picks = [null, null, null]; G.fillRandom(st); }
      }
      const desc = this.mode() === 'teams'
        ? 'Partners sit across. Ask only the rival team. Team books are added together.'
        : 'Everyone plays for themselves. Most books wins.';
      G.wrap(desc.toUpperCase(), 210, 'small').forEach((l, i) => G.text(l, 22, 258 + i * 9, P.cyan, 'small'));
      if (ui.button('START', 22, 294, 210, 22, { theme: 'green', key: ['Enter', ' '], showKey: false })) this.start();
      if (ui.button('BACK', 22, 322, 210, 20, { theme: 'red', key: 'Escape', showKey: false })) G.go(G.Menu);
    },
    // portrait setup: mode + opponents on top, the seats, the Club grid, then the buttons
    drawSetupPortrait() {
      const S = G.settings, E = G.EX();
      G.panel(8, 8, G.W - 16, G.H - 16, { fill: P.ink, hi: P.dusk, accent: P.gold });
      ui.block(8, 8, G.W - 16, G.H - 16);
      G.text('GO FISH', 22, 18, P.gold, 'big', 'left', 2, P.black);
      G.text('MODE', 22, 40, P.silver, 'small');
      const m = ui.choice(['FREE', 'TEAMS 2V2'], S.fishMode === 'teams' ? 1 : 0, 22, 48, 150, 26, { id: 'mode', font: 'small' });
      if ((m === 1 ? 'teams' : 'ffa') !== this.mode()) { S.fishMode = m === 1 ? 'teams' : 'ffa'; G.saveSettings(); }
      let st, view;
      const gridY = 218 + Math.round(E / 3);
      if (this.mode() === 'ffa') {
        G.text('OPPONENTS', 188, 40, P.silver, 'small');
        const o = ui.choice(['1', '2', '3'], S.fishOpponents - 1, 188, 48, 150, 26, { id: 'opp' });
        if (o !== S.fishOpponents - 1) { S.fishOpponents = o + 1; G.saveSettings(); }
        st = this.ffa;
        const labels = S.fishOpponents === 1 ? ['OPPONENT - ACROSS'] : S.fishOpponents === 2 ? ['OPPONENT 1 - LEFT', 'OPPONENT 2 - RIGHT'] : ['OPPONENT 1 - LEFT', 'OPPONENT 2 - ACROSS', 'OPPONENT 3 - RIGHT'];
        st.slots = labels.map((l) => ({ label: l, color: P.orange }));
        st.focus = Math.min(st.focus, st.slots.length - 1);
        view = { slots: st.slots, picks: st.picks.slice(0, st.slots.length), focus: st.focus, seatY: 84, gridY, hoverChar: st.hoverChar };
        G.rosterPicker(view);
        st.picks.splice(0, view.picks.length, ...view.picks); st.focus = view.focus; st.hoverChar = view.hoverChar;
      } else {
        st = this.teams;
        G.text('BLUE: YOU + PARTNER', 188, 48, P.sky, 'small');
        G.text('RED: 2 RIVALS', 188, 60, P.red, 'small');
        st.seatY = 84; st.gridY = gridY;
        G.rosterPicker(st);
      }
      const desc = this.mode() === 'teams'
        ? 'Partners sit across. Ask only the rival team. Team books are added together.'
        : 'Everyone plays for themselves. Most books wins.';
      G.wrap(desc.toUpperCase(), 316, 'small').slice(0, 3).forEach((l, i) => G.text(l, 22, G.H - 114 + i * 9, P.cyan, 'small'));
      if (ui.button('RANDOM PICKS', 22, G.H - 82, 155, 30, { id: 'rnd', theme: 'dark' })) {
        if (view) { const v = { picks: view.picks.map(() => null) }; G.fillRandom(v); st.picks.splice(0, v.picks.length, ...v.picks); }
        else { st.picks = [null, null, null]; G.fillRandom(st); }
      }
      if (ui.button('BACK', 183, G.H - 82, 155, 30, { theme: 'red', key: 'Escape', showKey: false })) { G.go(G.Menu); return; }
      if (ui.button('START', 22, G.H - 46, 316, 34, { theme: 'green', key: ['Enter', ' '], showKey: false })) this.start();
    }
  });
})();
