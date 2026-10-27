// Pixel Card Club - War: you vs 1-3 Club members. Battles, wars, auto-play, full game or one pass.
// Rules: Bicycle "War" (deal, battles, war = one down + one up) and pagat.com "War"
// (Ace high, 3-4 players with everyone joining a war, last card stays up if you run out mid-war).
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui, input = G.input;
  // positions for the wide (landscape) table; portrait() swaps in the upright layout
  let YOU_PILE, YOU_BAT, YOU_WON, LOG, BOARD;
  function lay() {
    if (G.portrait) {
      const E = G.EX(), m = Math.round(E / 2);
      YOU_PILE = { x: 158, y: 376 + m }; YOU_BAT = { x: 80, y: 290 + m }; YOU_WON = { x: 92, y: 376 + m };
      LOG = { x: 154, y: 462 + E, w: 198, h: 144 }; BOARD = { x: 8, y: 462 + E, w: 140, h: 144 };
    } else {
      YOU_PILE = { x: 196, y: 224 }; YOU_BAT = { x: 256, y: 224 }; YOU_WON = { x: 136, y: 224 };
      LOG = { x: 470, y: 134, w: 162, h: 168 }; BOARD = { x: 10, y: 134, w: 120, h: 168 };
    }
  }
  lay();
  const val = (c) => (c.rank === 1 ? 14 : c.rank);
  const LINES = {
    war: ['WAR!', 'I DECLARE WAR!', 'THIS MEANS WAR!', 'TO ARMS!'],
    warWin: ['THE SPOILS OF WAR!', 'MINE, ALL MINE!', 'VICTORY IS SWEET.', 'THANK YOU, KINDLY.'],
    warLose: ['NOT MY CARDS...', 'THIS SUCKS.', 'A TACTICAL RETREAT.', 'I WANT A REMATCH.'],
    ace: ['ACE HIGH!', 'BOW TO THE ACE.'],
    deuce: ['A TWO? REALLY?', 'SERIOUSLY, A TWO?'],
    out: ['I AM OUT...', 'GOOD GAME, ALL.', 'WIPED OUT.']
  };

  const scene = (G.War = Object.assign({
    title: 'WAR',
    bookChapter: 'war',
    enter() {
      this.setup = true; this.paused = false; this.players = []; this.cards = [];
      this.initSetup({
        title: 'WAR', prefix: 'war', defaults: ['tank', 'mimi', 'sarge'],
        option: { label: 'GAME LENGTH', items: ['FULL GAME', 'ONE PASS'], def: 0 },
        desc: (o) => (o ? 'Play through your cards once. Won cards are set aside. Most cards at the end wins.' : 'Win every card in the deck. Players drop out when they run out of cards.')
      });
    },
    start() {
      this.setup = false;
      const ids = this.takePicks();
      this.onePass = this.opt() === 1;
      this.resetTable();
      this.cards = G.shuffle(G.makeDeck(1));
      this.cards.forEach((c) => { c.x = G.W / 2 - CW / 2; c.y = 150; c.faceUp = false; c.shownFace = false; c.flip = 1; c.hidden = false; c.lift = 0; });
      this.players = [{ name: 'YOU', human: true, id: 'you', pile: [], won: [], battle: [], out: false, streak: 0 }];
      ids.forEach((id) => { const ch = G.char(id); this.players.push({ name: ch.name, human: false, id, ch, pile: [], won: [], battle: [], out: false, streak: 0 }); });
      // pagat: deal as many cards as possible so everyone has an equal number (26, 17 or 13)
      const per = Math.floor(52 / this.players.length);
      const deck = this.cards.slice();
      this.spare = [];
      let d = 0;
      for (let r = 0; r < per; r++) for (const p of this.players) { const c = deck.pop(); p.pile.push(c); c.delay = 0.1 + d++ * 0.012; }
      this.spare = deck; // 3 players: one card left over, set aside face down
      this.spare.forEach((c) => (c.hidden = true));
      this.battles = 0; this.wars = 0; this.phase = 'deal'; this.over = false; this.result = null;
      this.auto = false; this.speed = 1; this.autoT = 0; this.spectate = false; this.skipReq = false; this.banner = null; this.inWar = false;
      G.audio.sfx('shuffle');
      this.addLog('Dealt ' + per + ' cards each' + (this.spare.length ? ' (one card set aside)' : '') + '. Ace is high.', P.cyan);
      this.addLog(this.onePass ? 'One pass: won cards are kept aside.' : 'Win all ' + per * this.players.length + ' cards to win.', P.silver);
      this.after(0.4 + d * 0.012, () => { this.players.forEach((p, i) => { if (i && Math.random() < 0.6) this.say(i, p.ch.quote); }); this.phase = 'ready'; });
      G.bump('war_played');
    },
    active() { return this.players.filter((p) => !p.out); },
    count(p) { return p.pile.length + p.won.length + p.battle.length; },
    // ---------- a battle ----------
    flip() {
      if (this.phase !== 'ready' || this.over) return;
      this.parts = this.active().filter((p) => p.pile.length);
      if (this.parts.length < 2) return this.endGame();
      this.battles++; this.inWar = false; this.banner = null;
      for (const p of this.parts) { const c = p.pile.pop(); c.faceUp = true; c._up = true; p.battle.push(c); p.cur = c; }
      G.audio.sfx('flip');
      this.phase = 'busy';
      this.after(0.55, () => this.resolve());
    },
    resolve() {
      const best = Math.max(...this.parts.map((p) => val(p.cur)));
      const tied = this.parts.filter((p) => val(p.cur) === best);
      if (tied.length === 1) return this.after(0.6, () => this.collect(tied[0]));
      // a war: if nobody tied can still turn a new card and nobody else can either, it is stuck
      const canMove = this.parts.some((p) => p.pile.length);
      if (!canMove) return this.after(0.6, () => this.stalemate(tied));
      this.wars++; this.inWar = true;
      this.banner = { text: 'WAR', t: 0 };
      const loud = tied.filter((p) => !p.human);
      if (loud.length) this.say(this.players.indexOf(G.pick(loud)), G.talk(G.pick(loud).ch, 'war', LINES));
      else this.say(0, 'WAR!');
      this.addLog('War! ' + tied.map((p) => p.name).join(' and ') + ' tie with ' + G.RANK_PLURAL[tied[0].cur.rank].toLowerCase() + '.', P.orange);
      G.audio.sfx('error');
      this.after(0.9, () => this.warStep());
    },
    // pagat: every player in the battle joins the war: one card face down, then one face up.
    // Out of cards mid-war: your last card stays face up and is used for the rest of the war.
    warStep() {
      for (const p of this.parts) {
        if (p.pile.length >= 2) { const dn = p.pile.pop(); dn.faceUp = false; dn._up = false; p.battle.push(dn); }
        if (p.pile.length >= 1) { const up = p.pile.pop(); up.faceUp = true; up._up = true; p.battle.push(up); p.cur = up; }
      }
      G.audio.sfx('deal');
      this.after(0.7, () => this.resolve());
    },
    collect(w) {
      const loot = [];
      for (const p of this.parts) { loot.push(...p.battle); p.battle = []; }
      // house rule: won cards go under the pile in a random order, so a game cannot loop forever
      G.shuffle(loot);
      loot.forEach((c, i) => { c.faceUp = false; c._up = false; c.delay = i * 0.02; });
      if (this.onePass) w.won.push(...loot); else w.pile.unshift(...loot);
      const wi = this.players.indexOf(w);
      const n = loot.length;
      this.addLog((w.human ? 'You win ' : w.name + ' wins ') + n + ' cards' + (this.inWar ? ' in the war.' : ' with ' + G.cardShort(w.cur) + '.'), w.human ? P.lime : P.white);
      G.audio.sfx(w.human ? (this.inWar ? 'good' : 'chip') : 'place');
      // streaks and table talk
      for (const p of this.parts) {
        if (p === w) p.streak = Math.max(0, p.streak) + 1; else p.streak = Math.min(0, p.streak) - 1;
      }
      const talkers = this.parts.filter((p) => !p.human);
      if (this.inWar) {
        if (!w.human) this.say(wi, G.talk(w.ch, 'warWin', LINES));
        const loser = talkers.find((p) => p !== w);
        if (loser && Math.random() < 0.6) this.say(this.players.indexOf(loser), G.talk(loser.ch, 'warLose', LINES));
        if (w.human) G.floatText('+' + n + ' CARDS', YOU_PILE.x + CW / 2, YOU_PILE.y + CH / 2 + 4, P.lime, 'big', 14);
      } else if (talkers.length && Math.random() < 0.18) {
        const t = G.pick(talkers), ti = this.players.indexOf(t);
        if (t.streak >= 4) this.say(ti, G.talk(t.ch, 'hot', LINES));
        else if (t.streak <= -4) this.say(ti, G.talk(t.ch, 'cold', LINES));
        else if (t === w && val(t.cur) === 14) this.say(ti, G.talk(t.ch, 'ace', LINES));
        else if (t !== w && t.cur.rank === 2) this.say(ti, G.talk(t.ch, 'deuce', LINES));
      }
      this.inWar = false; this.banner = null;
      this.after(0.35, () => this.checkOut());
    },
    // last face-up cards still tied and nobody can turn another card
    stalemate(tied) {
      if (this.onePass) {
        // Tod und Leben rule: each player adds their own played cards to their tricks
        for (const p of this.parts) { p.battle.forEach((c) => { c.faceUp = false; c._up = false; }); p.won.push(...p.battle); p.battle = []; }
        this.addLog('Last cards tie. Everyone keeps their own cards.', P.silver);
        return this.endGame();
      }
      this.addLog('The last cards tie and nobody has cards left. The game is a draw.', P.gold);
      this.endGame(true);
    },
    checkOut() {
      if (this.onePass) {
        if (this.active().some((p) => !p.pile.length)) return this.endGame();
      } else {
        for (const p of this.active()) if (!p.pile.length) {
          p.out = true; p.outAt = this.battles;
          this.addLog((p.human ? 'You are' : p.name + ' is') + ' out of cards.', P.orange);
          if (!p.human) this.say(this.players.indexOf(p), G.talk(p.ch, 'out', LINES));
        }
        // optional watch mode (Options > WHEN YOU ARE OUT): the rest keep flipping until one player holds every card
        if (this.players[0].out && !this.spectate && G.settings.watchOut && this.active().length >= 2) {
          this.spectate = true; this.auto = true; this.autoT = 0.6; this.speed = Math.max(this.speed, 3);
          this.addLog('Watching the rest of the game...', P.cyan);
        }
        if ((this.players[0].out && !this.spectate) || this.active().length < 2) return this.endGame();
      }
      this.phase = 'ready';
    },
    endGame(draw) {
      if (this.over) return;
      this.over = true; this.phase = 'over'; this.auto = false;
      const me = this.players[0];
      const score = (p) => this.count(p);
      const best = Math.max(...this.players.map(score));
      let winners = draw ? [] : this.players.filter((p) => !p.out && score(p) === best);
      if (!this.onePass && !draw && me.out) winners = this.active().filter((p) => score(p) === Math.max(...this.active().map(score)));
      const youWin = winners.length === 1 && winners[0].human;
      const tie = draw || winners.length > 1;
      for (const p of this.players) {
        if (p.human) continue;
        if (this.onePass) { if (score(p) !== score(me)) G.addRecord(p.id, score(me) > score(p)); }
        else if (!draw) { if (youWin) G.addRecord(p.id, true); else if (me.out) G.addRecord(p.id, p.out && p.outAt < me.outAt); }
      }
      if (youWin) G.bump('war_won');
      const aw = winners.find((p) => !p.human), al = this.players.find((p) => !p.human && !winners.includes(p));
      const quote = youWin && al ? { p: al, text: G.say(al.ch, 'lose') } : aw ? { p: aw, text: G.say(aw.ch, 'win') } : null;
      this.result = { winners, youWin, tie, draw, quote };
      G.audio.sfx(youWin ? 'win' : 'lose');
    },
    // ---------- layout ----------
    pileXY(pi) { if (pi === 0) return YOU_PILE; const s = this.oppSlot(pi); return { x: s.x + 4, y: s.y + (G.portrait ? 32 : 34) }; },
    wonXY(pi) { if (pi === 0) return YOU_WON; const s = this.oppSlot(pi); return { x: s.x + s.w - CW - 4, y: s.y + (G.portrait ? 32 : 34) }; },
    batXY(pi) {
      if (pi === 0) return { ...YOU_BAT, w: 200 };
      const s = this.oppSlot(pi);
      // narrow portrait seats put the battle cards on a second row under the deck
      if (s.narrow) return { x: s.x + 4, y: s.y + 100, w: s.w - 8 };
      return { x: s.x + 54, y: s.y + (G.portrait ? 32 : 34), w: this.onePass ? s.w - 54 - CW - 8 : s.w - 54 };
    },
    layout() {
      this.players.forEach((p, pi) => {
        const pp = this.pileXY(pi), wp = this.wonXY(pi), bp = this.batXY(pi);
        p.pile.forEach((c, i) => { G.place(c, pp.x - Math.floor(i / 7), pp.y - Math.floor(i / 7), i, false); c.lift = 0; });
        p.won.forEach((c, i) => G.place(c, wp.x - Math.floor(i / 7), wp.y - Math.floor(i / 7), i, false));
        const n = p.battle.length;
        const off = n > 1 ? Math.min(12, Math.floor((bp.w - CW) / (n - 1))) : 0;
        p.battle.forEach((c, i) => G.place(c, bp.x + i * off, bp.y, 200 + i, c._up));
      });
    },
    frame(dt) {
      lay();
      if (this.setup) return this.drawSetupScreen();
      if (this.paused || this.over) ui.modal = true;
      if (!this.paused) this.runQueue(dt);
      // flipping: click your deck, SPACE, or auto
      const me = this.players[0];
      const pp = YOU_PILE;
      const overPile = !ui.modal && !ui.blocked() && G.inRect(input.x, input.y, pp.x - 4, pp.y - 4, CW + 4, CH + 4);
      if (this.phase === 'ready' && this.skipReq && !this.over) this.endGame();
      if (this.phase === 'ready' && !ui.modal) {
        if (overPile) ui.cursorHand = true;
        if ((overPile && input.pressed) || G.key(' ')) { input.pressed = false; delete input.keyPressed[' ']; this.flip(); }
        else if (this.auto) { this.autoT -= dt * this.speed; if (this.autoT <= 0) { this.autoT = 0.35; this.flip(); } }
      }
      this.layout();
      G.updateCards(this.cards, dt, 12 * Math.min(2, this.speed));

      ui.felt();
      // slots
      this.players.forEach((p, pi) => {
        const a = this.pileXY(pi); if (!p.pile.length) G.drawSlot(a.x, a.y, p.out ? 'OUT' : '');
        if (this.onePass) { const w = this.wonXY(pi); if (!p.won.length) G.drawSlot(w.x, w.y, 'WON'); }
      });
      if (this.onePass) G.text('WON ' + me.won.length, YOU_WON.x + CW / 2, YOU_WON.y + CH + 5, P.felt4, 'small', 'center');
      G.text('YOUR DECK ' + me.pile.length, pp.x + CW / 2, pp.y + CH + 5, P.gold, 'small', 'center');
      for (let pi = 1; pi < this.players.length; pi++) {
        const p = this.players[pi], s = this.oppSlot(pi);
        this.drawSeat(s, p, { out: p.out, line: p.out ? 'OUT OF CARDS' : (this.onePass ? 'DECK ' + p.pile.length + '  WON ' + p.won.length : p.pile.length + ' CARDS'), value: this.count(p), valueColor: P.gold });
      }
      G.drawCards(this.cards, (c) => (this.phase === 'ready' && overPile && me.pile.includes(c) && c === me.pile[me.pile.length - 1] ? { highlight: P.gold } : null));
      this.drawBoard();
      this.drawLog(LOG, Math.floor((LOG.h - 20) / 9));
      if (this.banner) {
        this.banner.t += dt;
        const b = Math.round(Math.sin(this.banner.t * 10) * 2);
        const wx = G.portrait ? G.W / 2 + 2 : 360, wy = G.portrait ? YOU_BAT.y - 50 : 150;
        G.text('WAR!', wx, wy + b, P.black, 'big', 'center', 3);
        G.text('WAR!', wx - 2, wy - 2 + b, P.orange, 'big', 'center', 3);
      }
      this.drawControls();
      this.drawBubbles(dt, [YOU_PILE.x + CW / 2, YOU_PILE.y - 20], G.portrait ? 30 : 98);
      G.drawFloaters(dt);
      const stats = [{ label: 'BATTLES', value: this.battles }, { label: 'WARS', value: this.wars, color: P.orange }, { label: 'YOUR CARDS', value: this.count(me), color: P.gold }];
      if (this.handlePause(this.onePass ? 'WAR - ONE PASS' : 'WAR', stats, () => { this.setup = true; })) return;
      if (this.over) this.drawResult();
    },
    drawBoard() {
      const { x, y, w, h } = BOARD;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk });
      G.text('CARD COUNT', x + 6, y + 5, P.gold, 'small');
      const total = 52 - this.spare.length;
      this.players.forEach((p, i) => {
        const yy = y + 18 + i * 28;
        G.drawAvatar(p.id, x + 5, yy);
        G.text(G.dn(p).length > 9 ? G.dn(p).replace('THE ', '').replace('CAPT ', '') : G.dn(p), x + 33, yy + 2, p.out ? P.slate : P.white, 'small');
        const n = this.count(p);
        G.rect(x + 33, yy + 13, w - 40, 6, P.dusk);
        G.rect(x + 33, yy + 13, Math.round((w - 40) * n / total), 6, p.human ? P.gold : P.sky);
        G.text(String(n), x + w - 6, yy + 2, P.gold, 'small', 'right');
      });
      G.text('WAR WINS ' + G.store.get('war_won', 0) + '/' + G.store.get('war_played', 0), x + 6, y + h - 12, P.slate, 'small');
    },
    drawControls() {
      const can = this.phase === 'ready' && !this.over;
      if (G.portrait) {
        const y = G.H - 26;
        if (this.spectate) { if (ui.button(this.skipReq ? 'SKIPPING...' : 'SKIP TO RESULT', 8, y, 130, 22, { key: 'k', theme: 'gold', font: 'small' })) { if (can) this.endGame(); else this.skipReq = true; } }
        else if (ui.button('FLIP', 8, y, 130, 22, { theme: 'gold', keyLabel: 'SPACE', enabled: can && !this.auto })) this.flip();
        if (ui.button(this.auto ? 'AUTO ON' : 'AUTO OFF', 144, y, 100, 22, { key: 'a', theme: this.auto ? 'green' : 'dark', font: 'small' })) { this.auto = !this.auto; this.autoT = 0; }
        const sp = [1, 3, 8];
        if (ui.button('SPEED X' + this.speed, 250, y, 102, 22, { key: 's', theme: 'blue', font: 'small' })) this.speed = sp[(sp.indexOf(this.speed) + 1) % sp.length];
        let s = '';
        if (this.spectate && !this.over) s = 'YOU ARE OUT - WATCHING (' + this.active().length + ' LEFT)';
        else if (this.phase === 'ready' && !this.auto) s = 'TAP YOUR DECK TO FLIP';
        if (s) ui.tag(s, G.W / 2, YOU_BAT.y - 18, P.gold, P.ink);
        return;
      }
      const y = 318;
      if (this.spectate) { if (ui.button(this.skipReq ? 'SKIPPING...' : 'SKIP TO RESULT', 196, y, 104, 22, { key: 'k', theme: 'gold', font: 'small' })) { if (can) this.endGame(); else this.skipReq = true; } }
      else if (ui.button('FLIP', 196, y, 104, 22, { theme: 'gold', keyLabel: 'SPACE', enabled: can && !this.auto })) this.flip();
      if (ui.button(this.auto ? 'AUTO ON' : 'AUTO OFF', 306, y, 80, 22, { key: 'a', theme: this.auto ? 'green' : 'dark', font: 'small' })) { this.auto = !this.auto; this.autoT = 0; }
      const sp = [1, 3, 8];
      if (ui.button('SPEED X' + this.speed, 392, y, 72, 22, { key: 's', theme: 'blue', font: 'small' })) this.speed = sp[(sp.indexOf(this.speed) + 1) % sp.length];
      let s = '';
      if (this.spectate && !this.over) s = 'YOU ARE OUT - WATCHING (' + this.active().length + ' LEFT)';
      else if (this.phase === 'ready' && !this.auto) s = G.touch ? 'TAP YOUR DECK TO FLIP' : 'CLICK YOUR DECK OR PRESS SPACE TO FLIP';
      if (s) ui.tag(s, 330, 302, P.gold, P.ink);
    },
    drawResult() {
      const r = this.result;
      const title = r.draw ? 'DRAW' : r.tie ? 'TIE GAME' : r.youWin ? 'YOU WIN THE WAR' : this.spectate && r.winners.length === 1 ? G.dn(r.winners[0]) + ' WINS THE WAR' : this.players[0].out && !this.onePass ? 'YOU ARE OUT' : 'GAME OVER';
      const lines = this.players.slice().sort((a, b) => this.count(b) - this.count(a)).map((p) => ({ text: G.dn(p) + '  ' + this.count(p) + ' CARDS' + (p.out ? '  (OUT)' : ''), color: r.winners.includes(p) ? P.lime : P.silver }));
      lines.push({ text: 'BATTLES ' + this.battles + '   WARS ' + this.wars, color: P.white });
      if (r.quote && r.quote.text) lines.push({ text: r.quote.p.name + ': "' + r.quote.text + '"', color: P.cyan });
      lines.push({ text: 'WAR WINS: ' + G.store.get('war_won', 0) + ' OF ' + G.store.get('war_played', 0), color: P.slate });
      const act = ui.dialog(title, lines, [{ label: 'PLAY AGAIN', act: 'again', theme: 'green', key: 'Enter' }, { label: 'SETUP', act: 'setup', theme: 'blue' }, { label: 'MENU', act: 'menu', theme: 'red' }], { w: 360, titleColor: r.youWin ? P.lime : r.tie ? P.gold : P.orange });
      if (act === 'again') this.start();
      if (act === 'setup') this.setup = true;
      if (act === 'menu') G.go(G.Menu);
    }
  }, G.TableKit));
})();
