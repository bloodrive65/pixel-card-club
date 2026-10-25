// Pixel Card Club - Texas Hold'em: no-limit sit-and-go, you vs 1-3 Club members.
// Rules: Bicycle "Texas Hold'em Poker" (blinds, four betting rounds, showdown, rankings) and Wikipedia "Texas hold 'em"
// (heads-up blinds, no-limit minimum raise, burn cards, odd chips). Side pots follow pagat.com "Poker Betting".
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui, input = G.input;
  const START = 1000;
  const LEVELS = [[10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600], [500, 1000]];
  const HANDS_PER_LEVEL = 10;
  const DECK = { x: 140, y: 148 }, BURN = { x: 128, y: 150 };
  const BOARD_X = 202, BOARD_Y = 148, BOARD_STEP = 48;
  const YOU = { x: 16, y: 240, w: 190, h: 28 }, YOU_CARDS = { x: 250, y: 228 };
  const LOG = { x: 470, y: 140, w: 162, h: 160 };
  const INFO = { x: 10, y: 196, w: 102, h: 34 };
  const STREET = ['PRE-FLOP', 'FLOP', 'TURN', 'RIVER'];

  // ---------- hand evaluation: best 5 of 7, cards as ints v*4+s with v 2..14 ----------
  const toInt = (c) => (c.rank === 1 ? 14 : c.rank) * 4 + c.suit;
  const pack = (cat, a) => { let s = cat; for (let i = 0; i < 5; i++) s = s * 16 + (a[i] || 0); return s; };
  const straightHi = (m) => { if (m & (1 << 14)) m |= 2; for (let hi = 14; hi >= 5; hi--) { const need = 31 << (hi - 4); if ((m & need) === need) return hi; } return 0; };
  function evalHand(cs) {
    const cnt = new Array(15).fill(0), sc = [0, 0, 0, 0], sm = [0, 0, 0, 0];
    let mask = 0;
    for (const c of cs) { const v = c >> 2, s = c & 3; cnt[v]++; sc[s]++; sm[s] |= 1 << v; mask |= 1 << v; }
    let flush = 0;
    for (let s = 0; s < 4; s++) if (sc[s] >= 5) { const sh = straightHi(sm[s]); if (sh) return pack(8, [sh]); flush = sm[s]; }
    let quad = 0; const trips = [], pairs = [], singles = [];
    for (let v = 14; v >= 2; v--) { if (cnt[v] === 4) quad = v; else if (cnt[v] === 3) trips.push(v); else if (cnt[v] === 2) pairs.push(v); else if (cnt[v] === 1) singles.push(v); }
    const kick = (ex, n) => { const out = []; for (let v = 14; v >= 2 && out.length < n; v--) if (cnt[v] && !ex.includes(v)) out.push(v); return out; };
    if (quad) return pack(7, [quad, ...kick([quad], 1)]);
    if (trips.length && (trips.length > 1 || pairs.length)) return pack(6, [trips[0], Math.max(trips[1] || 0, pairs[0] || 0)]);
    if (flush) { const out = []; for (let v = 14; v >= 2 && out.length < 5; v--) if (flush & (1 << v)) out.push(v); return pack(5, out); }
    const st = straightHi(mask); if (st) return pack(4, [st]);
    if (trips.length) return pack(3, [trips[0], ...kick([trips[0]], 2)]);
    if (pairs.length >= 2) return pack(2, [pairs[0], pairs[1], ...kick([pairs[0], pairs[1]], 1)]);
    if (pairs.length) return pack(1, [pairs[0], ...kick([pairs[0]], 3)]);
    return pack(0, kick([], 5));
  }
  const VNAME = ['', '', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING', 'ACE'];
  const VPL = ['', '', 'TWOS', 'THREES', 'FOURS', 'FIVES', 'SIXES', 'SEVENS', 'EIGHTS', 'NINES', 'TENS', 'JACKS', 'QUEENS', 'KINGS', 'ACES'];
  function handName(score) {
    const d = []; let s = score; for (let i = 0; i < 5; i++) { d.unshift(s % 16); s = Math.floor(s / 16); }
    const cat = s;
    switch (cat) {
      case 8: return d[0] === 14 ? 'ROYAL FLUSH' : 'STRAIGHT FLUSH, ' + VNAME[d[0]] + ' HIGH';
      case 7: return 'FOUR ' + VPL[d[0]];
      case 6: return 'FULL HOUSE, ' + VPL[d[0]] + ' OVER ' + VPL[d[1]];
      case 5: return 'FLUSH, ' + VNAME[d[0]] + ' HIGH';
      case 4: return 'STRAIGHT, ' + VNAME[d[0]] + ' HIGH';
      case 3: return 'THREE ' + VPL[d[0]];
      case 2: return 'TWO PAIR, ' + VPL[d[0]] + ' AND ' + VPL[d[1]];
      case 1: return 'PAIR OF ' + VPL[d[0]];
      default: return VNAME[d[0]] + ' HIGH';
    }
  }
  G.pokerEval = (cards) => evalHand(cards.map(toInt));
  G.pokerName = handName;
  // Monte Carlo share of the pot against n random hands
  function equity(hole, board, nOpp, iters) {
    const known = hole.concat(board).map(toInt), used = new Set(known);
    const deck = []; for (let v = 2; v <= 14; v++) for (let s = 0; s < 4; s++) if (!used.has(v * 4 + s)) deck.push(v * 4 + s);
    const mine = hole.map(toInt), b0 = board.map(toInt), need = 5 - b0.length;
    let win = 0;
    for (let it = 0; it < iters; it++) {
      const take = need + nOpp * 2;
      for (let i = 0; i < take; i++) { const j = i + Math.floor(Math.random() * (deck.length - i)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
      const b = b0.concat(deck.slice(0, need));
      const me = evalHand(mine.concat(b));
      let best = 0, ties = 0;
      for (let o = 0; o < nOpp; o++) { const sc = evalHand([deck[need + o * 2], deck[need + o * 2 + 1]].concat(b)); if (sc > best) { best = sc; ties = 0; } else if (sc === best) ties++; }
      if (me > best) win++; else if (me === best) win += 1 / (ties + 2);
    }
    return win / iters;
  }
  G.pokerEquity = equity;

  // style: loose widens the hands played, aggr = how often strength turns into bets, bluff = bets on air
  const STYLE = {
    shark: { loose: 0, aggr: 0.75, bluff: 0.12, call: 0 },
    lag: { loose: 0.14, aggr: 0.8, bluff: 0.2, call: 0.02 },
    rock: { loose: -0.14, aggr: 0.4, bluff: 0.03, call: -0.02 },
    station: { loose: 0.2, aggr: 0.15, bluff: 0.03, call: 0.12 },
    maniac: { loose: 0.3, aggr: 0.95, bluff: 0.38, call: 0.06 },
    wild: null
  };
  const LINES = {
    raise: ['RAISE.', 'MAKE IT {amt}.', 'I LIKE MY CARDS.', 'THE PRICE GOES UP.'],
    allin: ['ALL IN!', 'EVERYTHING. LETS GO.', 'SHOVE!', 'ALL OF IT, BABY.'],
    call: ['CALL.', 'I WILL SEE IT.', 'I CALL.'],
    check: ['CHECK.', 'TAP TAP.'],
    fold: ['FOLD.', 'NOT THIS ONE.', 'TOO RICH FOR ME.'],
    bigwin: ['SHIP IT!', 'COME TO PAPA.', 'THANK YOU KINDLY.'],
    steal: ['NICE FOLD.', 'YOU WILL NEVER KNOW.'],
    badbeat: ['ARE YOU KIDDING ME?', 'THIS SUCKS.', 'THE RIVER HATES ME.', 'UNBELIEVABLE.'],
    bust: ['GG, I AM OUT.', 'BUSTED...', 'NO MORE CHIPS.']
  };

  const scene = (G.Holdem = Object.assign({
    title: "TEXAS HOLD'EM",
    bookChapter: 'holdem',
    enter() {
      this.setup = true; this.paused = false; this.players = []; this.cards = [];
      this.initSetup({
        title: "TEXAS HOLD'EM", prefix: 'poker', defaults: ['viper', 'granny', 'tank'], defOpp: 3,
        option: { label: 'BLINDS', items: ['RISING', 'FIXED 10/20'], def: 0 },
        desc: (o) => 'No-limit sit-and-go. Everyone starts with ' + START + ' chips. ' + (o ? 'Blinds stay at 10/20.' : 'Blinds go up every ' + HANDS_PER_LEVEL + ' hands.') + ' Last player with chips wins.'
      });
    },
    start() {
      this.setup = false;
      const ids = this.takePicks();
      this.rising = this.opt() === 0;
      this.players = [{ name: 'YOU', human: true, id: 'you', chips: START }];
      ids.forEach((id) => { const ch = G.char(id); this.players.push({ name: ch.name, human: false, id, ch, chips: START, mood: 0 }); });
      this.players.forEach((p) => Object.assign(p, { hole: [], bet: 0, total: 0, folded: false, allin: false, out: false, place: 0 }));
      this.button = G.rand(this.players.length);
      this.handNo = 0; this.over = false; this.result = null; this.showOdds = !!G.settings.pokerOdds; this.oddsCache = null;
      this.resetTable();
      this.cards = [];
      this.board = []; this.burns = []; this.deck = [];
      this.players.forEach((p) => { p.hole = []; });
      G.bump('poker_played');
      this.addLog('Sit-and-go: ' + this.players.length + ' players, ' + START + ' chips each.', P.cyan);
      G.rollForms(this.players, (t) => this.addLog(t, P.silver));
      this.after(0.3, () => this.newHand());
    },
    alive() { return this.players.filter((p) => !p.out); },
    live() { return this.players.filter((p) => !p.out && !p.folded); },
    nextAlive(i) { const n = this.players.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (!this.players[j].out) return j; } return i; },
    nextActive(i) { const n = this.players.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; const p = this.players[j]; if (!p.out && !p.folded && !p.allin) return j; } return -1; },
    pot() { return this.players.reduce((a, p) => a + p.total, 0); },
    blinds() { return LEVELS[this.rising ? Math.min(LEVELS.length - 1, Math.floor((this.handNo - 1) / HANDS_PER_LEVEL)) : 0]; },
    // ---------- a hand ----------
    newHand() {
      if (this.alive().length < 2 || this.players[0].out) return this.endGame();
      this.handNo++;
      const [sb, bb] = this.blinds();
      if (this.rising && this.handNo > 1 && (this.handNo - 1) % HANDS_PER_LEVEL === 0 && LEVELS[Math.floor((this.handNo - 1) / HANDS_PER_LEVEL)]) this.addLog('Blinds go up to ' + sb + '/' + bb + '.', P.orange);
      this.sb = sb; this.bb = bb;
      this.button = this.nextAlive(this.button);
      this.players.forEach((p) => Object.assign(p, { hole: [], bet: 0, total: 0, folded: p.out, allin: false, acted: false, canRaise: true, act: '', show: false, hand: null, startChips: p.chips, won: 0, eqAllin: null }));
      this.cards = G.shuffle(G.makeDeck(1));
      this.cards.forEach((c) => { c.x = DECK.x; c.y = DECK.y; c.faceUp = false; c.shownFace = false; c.flip = 1; c.hidden = false; c.lift = 0; });
      this.deck = this.cards.slice(); this.board = []; this.burns = []; this.street = 0; this.winners = []; this.potList = []; this.handDone = false;
      this.oddsCache = null; this.speed = 1;
      const n = this.alive().length;
      // Wikipedia: heads-up, the dealer posts the small blind and acts first before the flop
      const sbP = n === 2 ? this.button : this.nextAlive(this.button);
      const bbP = this.nextAlive(sbP);
      this.sbP = sbP; this.bbP = bbP;
      this.post(sbP, sb, 'SB'); this.post(bbP, bb, 'BB');
      this.curBet = bb; this.lastRaise = bb;
      // deal two cards each, one at a time, starting left of the button
      let d = 0, i = sbP;
      for (let r = 0; r < 2; r++) { i = sbP; for (let k = 0; k < n; k++) { const p = this.players[i]; const c = this.deck.pop(); p.hole.push(c); c.delay = 0.15 + d++ * 0.09; if (p.human) c.faceUp = true; i = this.nextAlive(i); } }
      G.audio.sfx('shuffle');
      this.addLog('Hand ' + this.handNo + '. Blinds ' + sb + '/' + bb + '. ' + this.players[this.button].name + ' ' + (this.players[this.button].human ? 'have' : 'has') + ' the button.', P.silver);
      this.phase = 'deal';
      this.after(0.4 + d * 0.09, () => this.prompt(this.firstPreflop(bbP)));
    },
    firstPreflop(bbP) { const j = this.nextActive(bbP); return j; },
    post(i, amt, label) {
      const p = this.players[i]; const a = Math.min(amt, p.chips);
      p.chips -= a; p.bet += a; p.total += a; p.act = label + ' ' + a;
      if (!p.chips) { p.allin = true; p.act = 'ALL IN'; }
      G.audio.sfx('chip');
    },
    prompt(i) {
      if (this.handDone) return;
      if (i < 0) return this.endRound();
      this.turn = i;
      const p = this.players[i];
      if (p.human) {
        this.phase = 'you';
        this.raiseTo = this.minRaiseTo();
        this.oddsCache = null;
        return;
      }
      this.phase = 'ai';
      this.after(0.55 + Math.random() * 0.4, () => this.aiAct(i));
    },
    toCall(p) { return Math.max(0, this.curBet - p.bet); },
    minRaiseTo() { return this.curBet + Math.max(this.lastRaise, this.bb); },
    maxTo(p) { return p.bet + p.chips; },
    // type: fold | check | call | raise (to amount)
    act(i, type, to) {
      const p = this.players[i], nm = p.human ? 'You' : p.name;
      const toCall = this.toCall(p);
      if (type === 'check' && toCall > 0) type = 'call';
      if (type === 'fold') {
        p.folded = true; p.act = 'FOLD';
        p.hole.forEach((c) => { c.faceUp = false; c._muck = true; });
        this.addLog(nm + ' fold' + (p.human ? '' : 's') + '.', P.slate);
        G.audio.sfx('place');
        if (p.human) this.speed = 2.2;
      } else if (type === 'check') {
        p.act = 'CHECK'; this.addLog(nm + ' check' + (p.human ? '' : 's') + '.', P.silver); G.audio.sfx('click');
      } else if (type === 'call') {
        const a = Math.min(toCall, p.chips);
        p.chips -= a; p.bet += a; p.total += a;
        if (!p.chips) { p.allin = true; p.act = 'ALL IN'; } else p.act = 'CALL ' + a;
        this.addLog(nm + ' call' + (p.human ? '' : 's') + ' ' + a + (p.allin ? ' and ' + (p.human ? 'are' : 'is') + ' all in' : '') + '.', P.white);
        G.audio.sfx('chip');
      } else {
        to = Math.min(Math.max(to, Math.min(this.minRaiseTo(), this.maxTo(p))), this.maxTo(p));
        const a = to - p.bet;
        p.chips -= a; p.bet = to; p.total += a;
        const inc = to - this.curBet;
        const wasBet = this.curBet === 0;
        if (inc >= this.lastRaise) {
          // full raise: everyone may act again
          this.lastRaise = Math.max(inc, this.bb);
          this.players.forEach((o) => { if (o !== p) { o.acted = false; o.canRaise = true; } });
        } else if (inc > 0) {
          // short all-in raise: players who already acted may only call or fold (it does not reopen the betting)
          this.players.forEach((o) => { if (o !== p && o.acted) { o.acted = false; o.canRaise = false; } });
        }
        this.curBet = Math.max(this.curBet, to);
        if (!p.chips) { p.allin = true; p.act = 'ALL IN'; } else p.act = (wasBet ? 'BET ' : 'RAISE ') + to;
        this.addLog(nm + (p.allin ? (p.human ? ' go' : ' goes') + ' all in for ' + to : (wasBet ? (p.human ? ' bet ' : ' bets ') : (p.human ? ' raise to ' : ' raises to ')) + to) + '.', p.human ? P.gold : P.orange);
        G.audio.sfx('chip');
      }
      p.acted = true;
      this.advance();
    },
    advance() {
      const live = this.live();
      if (live.length === 1) return this.winUncontested(live[0]);
      const can = live.filter((p) => !p.allin);
      const done = can.every((p) => p.acted && p.bet === this.curBet) || (can.length === 0) || (can.length === 1 && can[0].bet >= this.curBet && (can[0].acted || live.every((p) => p === can[0] || p.allin)));
      if (done) return this.after(0.45, () => this.endRound());
      const n = this.players.length;
      for (let k = 1; k <= n; k++) {
        const j = (this.turn + k) % n, p = this.players[j];
        if (p.out || p.folded || p.allin) continue;
        if (!p.acted || p.bet < this.curBet) { this.phase = 'wait'; return this.prompt(j); }
      }
      this.after(0.45, () => this.endRound());
    },
    endRound() {
      this.players.forEach((p) => { p.bet = 0; });
      this.curBet = 0; this.lastRaise = this.bb;
      if (this.street === 3) return this.showdown();
      const live = this.live();
      const canBet = live.filter((p) => !p.allin);
      if (canBet.length <= 1) {
        // everyone is all in: turn the hands face up and run out the board
        if (!this.runout) {
          this.runout = true;
          live.forEach((p) => { p.show = true; p.hole.forEach((c) => (c.faceUp = true)); p.eqAllin = null; });
          this.addLog('All in. Hands are turned face up.', P.gold);
          this.allinEquity();
        }
        this.nextStreet(true);
        return;
      }
      this.nextStreet(false);
    },
    allinEquity() {
      // record each player's chance at the moment of the all-in for bad beat talk
      const live = this.live(); if (live.length !== 2) return;
      live.forEach((p) => { const o = live.find((q) => q !== p); p.eqAllin = this.exactVs(p.hole, o.hole); });
    },
    exactVs(a, b) {
      const used = new Set(a.concat(b, this.board).map(toInt)); const deck = []; for (let v = 2; v <= 14; v++) for (let s = 0; s < 4; s++) if (!used.has(v * 4 + s)) deck.push(v * 4 + s);
      const A = a.map(toInt), B = b.map(toInt), b0 = this.board.map(toInt), need = 5 - b0.length; let w = 0; const it = 400;
      for (let t = 0; t < it; t++) { for (let i = 0; i < need; i++) { const j = i + Math.floor(Math.random() * (deck.length - i)); const x = deck[i]; deck[i] = deck[j]; deck[j] = x; } const bd = b0.concat(deck.slice(0, need)); const x = evalHand(A.concat(bd)), y = evalHand(B.concat(bd)); w += x > y ? 1 : x === y ? 0.5 : 0; }
      return w / it;
    },
    nextStreet(auto) {
      this.street++;
      // burn one card face down before the flop, the turn and the river
      const burn = this.deck.pop(); this.burns.push(burn);
      const k = this.street === 1 ? 3 : 1;
      for (let i = 0; i < k; i++) { const c = this.deck.pop(); c.faceUp = true; c.delay = 0.12 + i * 0.12; this.board.push(c); }
      this.addLog(STREET[this.street] + ': ' + this.board.map((c) => G.cardShort(c)).join(' ') + '.', P.cyan);
      this.players.forEach((p) => { if (!p.out && !p.folded && !p.allin) { p.acted = false; p.canRaise = true; p.act = ''; } });
      this.oddsCache = null;
      this.phase = 'deal';
      if (auto) return this.after(1.2, () => (this.street === 3 ? this.showdown() : this.nextStreet(true)));
      this.after(0.7, () => this.prompt(this.nextActive(this.button)));
    },
    winUncontested(w) {
      const pot = this.pot();
      w.chips += pot; w.won = pot;
      this.winners = [w]; this.handDone = true; this.phase = 'result';
      this.potList = [{ amt: pot, winners: [w] }];
      this.addLog((w.human ? 'You win ' : w.name + ' wins ') + pot + '. Everyone else folded.', w.human ? P.lime : P.gold);
      if (!w.human && pot >= this.bb * 6 && Math.random() < 0.6) this.say(this.players.indexOf(w), G.talk(w.ch, 'steal', LINES));
      G.audio.sfx(w.human ? 'good' : 'chip');
      this.after(1.8, () => this.endHand());
    },
    showdown() {
      this.handDone = true; this.phase = 'result';
      const live = this.live();
      live.forEach((p) => { p.show = true; p.hole.forEach((c) => (c.faceUp = true)); p.score = G.pokerEval(p.hole.concat(this.board)); p.hand = handName(p.score); });
      // build the main pot and side pots from what each player put in (pagat: Poker Betting)
      const levels = [...new Set(this.players.filter((p) => p.total > 0).map((p) => p.total))].sort((a, b) => a - b);
      const pots = []; let prev = 0;
      for (const L of levels) {
        let amt = 0; for (const p of this.players) amt += Math.max(0, Math.min(p.total, L) - prev);
        const elig = live.filter((p) => p.total >= L);
        if (elig.length) pots.push({ amt, elig }); else if (pots.length) pots[pots.length - 1].amt += amt;
        prev = L;
      }
      // merge pots that have the same eligible players
      const merged = [];
      for (const pt of pots) { const last = merged[merged.length - 1]; if (last && last.elig.length === pt.elig.length && last.elig.every((p) => pt.elig.includes(p))) last.amt += pt.amt; else merged.push({ ...pt }); }
      const order = []; { let i = this.button; for (let k = 0; k < this.players.length; k++) { i = (i + 1) % this.players.length; order.push(this.players[i]); } }
      this.potList = [];
      merged.forEach((pt, pi) => {
        const best = Math.max(...pt.elig.map((p) => p.score));
        const ws = order.filter((p) => pt.elig.includes(p) && p.score === best);
        const share = Math.floor(pt.amt / ws.length); let odd = pt.amt - share * ws.length;
        // odd chips go to the first winners to the left of the button
        ws.forEach((w) => { const x = share + (odd > 0 ? 1 : 0); if (odd > 0) odd--; w.chips += x; w.won += x; });
        this.potList.push({ amt: pt.amt, winners: ws, side: pi > 0, uncalled: pt.elig.length === 1 });
        const label = pt.elig.length === 1 ? 'gets back ' : (ws.length > 1 ? 'split ' : (ws[0].human ? 'win ' : 'wins ')) + (pi ? 'a side pot of ' : 'the pot of ');
        if (pt.elig.length === 1) this.addLog((ws[0].human ? 'You get back ' : ws[0].name + ' gets back ') + pt.amt + ' uncalled.', P.silver);
        else this.addLog(ws.map((w) => (w.human ? 'You' : w.name)).join(' and ') + ' ' + label + pt.amt + (ws.length > 1 ? '' : ' with ' + ws[0].hand.toLowerCase()) + '.', ws.some((w) => w.human) ? P.lime : P.gold);
      });
      this.winners = [...new Set(this.potList.filter((x) => !x.uncalled).flatMap((x) => x.winners))];
      const me = this.players[0];
      G.audio.sfx(this.winners.includes(me) ? 'win' : 'place');
      // table talk: big wins and bad beats
      for (const p of live) {
        if (p.human) continue;
        const pi = this.players.indexOf(p);
        if (this.winners.includes(p) && p.won > p.startChips * 0.5 && Math.random() < 0.7) this.say(pi, G.talk(p.ch, 'bigwin', LINES));
        else if (!this.winners.includes(p) && p.eqAllin !== null && p.eqAllin > 0.65) this.say(pi, G.talk(p.ch, 'badbeat', LINES));
      }
      this.after(3.2, () => this.endHand());
    },
    endHand() {
      this.runout = false;
      // moods: a big loss sours them, a big pot lifts them, otherwise they drift back to calm
      for (const p of this.players) {
        if (p.human || p.out) continue;
        const delta = p.chips - p.startChips, pi = this.players.indexOf(p);
        const before = p.mood;
        if (delta < -Math.max(this.bb * 4, p.startChips * 0.2)) p.mood = Math.max(-3, p.mood - 1);
        else if (delta > Math.max(this.bb * 4, p.startChips * 0.25)) p.mood = Math.min(3, p.mood + 1);
        else p.mood = p.mood > 0 ? p.mood - 0.25 : p.mood < 0 ? p.mood + 0.25 : 0;
        if (p.mood <= -2 && before > -2 && p.chips) this.say(pi, G.talk(p.ch, 'cold', null));
        if (p.mood >= 2 && before < 2) this.say(pi, G.talk(p.ch, 'hot', null));
      }
      // knock-outs: players who started with fewer chips finish lower
      const busted = this.players.filter((p) => !p.out && p.chips <= 0).sort((a, b) => a.startChips - b.startChips);
      let left = this.alive().length;
      busted.forEach((p) => {
        p.out = true; p.place = left--;
        this.addLog((p.human ? 'You are' : p.name + ' is') + ' out in place ' + p.place + '.', P.orange);
        if (!p.human) this.say(this.players.indexOf(p), G.talk(p.ch, 'bust', LINES));
      });
      if (this.alive().length < 2 || this.players[0].out) return this.after(busted.length ? 1.4 : 0.3, () => this.endGame());
      this.after(busted.length ? 1.2 : 0.4, () => this.newHand());
    },
    endGame() {
      if (this.over) return;
      this.over = true; this.phase = 'over';
      const alive = this.alive();
      if (alive.length === 1) alive[0].place = 1;
      const me = this.players[0];
      if (!me.out && alive.length > 1) me.place = 1 + alive.filter((p) => p.chips > me.chips).length;
      for (const p of this.players) {
        if (p.human) continue;
        if (!p.place) p.place = 1 + alive.filter((q) => q.chips > p.chips).length;
        if (p.place !== me.place) G.addRecord(p.id, me.place < p.place);
      }
      const youWin = me.place === 1;
      if (youWin) G.bump('poker_won');
      const champ = this.players.find((p) => p.place === 1);
      const loser = this.players.find((p) => !p.human && p.place > 1);
      this.result = { youWin, champ, quote: youWin && loser ? { p: loser, text: G.say(loser.ch, 'lose') } : champ && !champ.human ? { p: champ, text: G.say(champ.ch, 'win') } : null };
      G.audio.sfx(youWin ? 'win' : 'lose');
    },
    // ---------- AI ----------
    aiAct(i) {
      const p = this.players[i], ch = p.ch, sk = p.form;
      let st = STYLE[ch.poker] || STYLE.shark;
      if (!st) st = STYLE.shark;
      if (ch.poker === 'wild') { if (!p.wild || p.wildHand !== this.handNo) { p.wild = G.pick([STYLE.shark, STYLE.lag, STYLE.rock, STYLE.station, STYLE.maniac]); p.wildHand = this.handNo; } st = p.wild; }
      let loose = st.loose, aggr = st.aggr, bluff = st.bluff, callAdj = st.call;
      // temper from the Club roster: hotheads tilt when losing, jittery players tighten, confident ones push
      const nerve = ch.temper ? ch.temper.nerve : 'steady';
      if (nerve === 'hothead' && p.mood < 0) { loose += 0.06 * -p.mood; aggr += 0.08 * -p.mood; bluff += 0.05 * -p.mood; }
      if (nerve === 'jittery' && p.mood < 0) { loose -= 0.05 * -p.mood; aggr -= 0.08 * -p.mood; }
      if (nerve === 'confident' && p.mood > 0) { aggr += 0.07 * p.mood; bluff += 0.04 * p.mood; }
      const live = this.live(), nOpp = live.length - 1;
      const eq0 = equity(p.hole, this.board, nOpp, [160, 260, 420][sk]);
      const noise = [0.14, 0.06, 0.02][sk];
      const eq = G.clamp(eq0 + (Math.random() * 2 - 1) * noise, 0, 1);
      const rel = eq * (nOpp + 1);
      const toCall = this.toCall(p), pot = this.pot();
      const odds = toCall / (pot + toCall);
      const r = Math.random();
      const sizeBet = (f) => Math.round((this.curBet + Math.max(this.lastRaise, (pot + toCall) * f)) / this.sb) * this.sb;
      const maxTo = this.maxTo(p), minTo = Math.min(this.minRaiseTo(), maxTo);
      const raise = (to) => {
        to = Math.max(minTo, Math.min(maxTo, to));
        if (to >= maxTo * 0.7 && maxTo - to < this.bb * 3) to = maxTo;
        if (to <= this.curBet) return this.act(i, toCall ? 'call' : 'check');
        const allin = to === maxTo;
        this.say(i, allin ? G.talk(ch, 'allin', LINES) : Math.random() < 0.35 ? G.talk(ch, 'raise', LINES, { amt: to }) : null);
        this.act(i, 'raise', to);
      };
      const canRaise = p.canRaise && maxTo > this.curBet;
      const maniacShove = ch.poker === 'maniac' && r < 0.03 && this.street > 0;
      if (toCall === 0) {
        if (canRaise && (maniacShove || (rel > 1.45 - loose && r < aggr + 0.15))) return raise(maniacShove ? maxTo : sizeBet(0.45 + Math.random() * 0.4 + (rel > 2.2 ? 0.25 : 0)));
        if (canRaise && this.street > 0 && r < bluff * (nOpp === 1 ? 1.3 : 0.6)) return raise(sizeBet(0.5));
        if (Math.random() < 0.15) this.say(i, G.talk(null, 'check', LINES));
        return this.act(i, 'check');
      }
      // facing a bet
      const need = sk === 0 ? Math.min(odds, 0.3) : odds;
      const callLine = need * (1 - loose) - callAdj;
      const short = p.chips <= toCall;
      if (canRaise && !short && (maniacShove || (rel > 2.0 - loose * 0.8 && r < aggr) || (this.street > 0 && r < bluff * 0.35))) return raise(maniacShove ? maxTo : sizeBet(0.6 + Math.random() * 0.5 + (rel > 2.6 ? 0.4 : 0)));
      if (eq >= callLine || (this.street === 0 && toCall <= this.bb && rel > 0.75 - loose) || (ch.poker === 'station' && rel > 0.6 && toCall < pot)) {
        if (short) this.say(i, G.talk(ch, 'allin', LINES)); else if (Math.random() < 0.15) this.say(i, G.talk(null, 'call', LINES));
        return this.act(i, 'call');
      }
      if (Math.random() < 0.3) this.say(i, G.talk(null, 'fold', LINES));
      return this.act(i, 'fold');
    },
    // ---------- layout ----------
    holeXY(pi, k) {
      if (pi === 0) return { x: YOU_CARDS.x + k * 48, y: YOU_CARDS.y };
      const s = this.oppSlot(pi);
      return { x: s.x + s.w / 2 - 34 + k * 24, y: 56 };
    },
    layout() {
      if (!this.deck) return;
      this.deck.forEach((c, i) => G.place(c, DECK.x - Math.floor(i / 10), DECK.y - Math.floor(i / 10), i, false));
      this.burns.forEach((c, i) => G.place(c, BURN.x - i * 4, BURN.y, -20 + i, false));
      this.board.forEach((c, i) => G.place(c, BOARD_X + i * BOARD_STEP, BOARD_Y, 80 + i, true));
      this.players.forEach((p, pi) => p.hole.forEach((c, k) => {
        if (c._muck) { G.place(c, DECK.x + 4, DECK.y + 4, 1, false); if (c.delay <= 0 && Math.abs(c.x - c.tx) < 2 && Math.abs(c.y - c.ty) < 2) c.hidden = true; return; }
        const q = this.holeXY(pi, k); G.place(c, q.x, q.y, 100 + pi * 4 + k);
        const lift = this.handDone && this.winners.includes(p) && p.show ? 4 : 0; c.lift = G.lerp(c.lift || 0, lift, 0.3);
      }));
    },
    frame(dt) {
      if (this.setup) return this.drawSetupScreen();
      if (this.paused || this.over) ui.modal = true;
      if (!this.paused) this.runQueue(dt);
      this.layout();
      G.updateCards(this.cards, dt, 12);

      ui.felt();
      // table centre
      G.alpha(0.35, () => { G.rect(BOARD_X - 6, BOARD_Y - 4, BOARD_STEP * 5 + 8, CH + 8, P.felt0); });
      for (let i = 0; i < 5; i++) if (!this.board[i]) G.drawSlot(BOARD_X + i * BOARD_STEP, BOARD_Y, ['FLOP', 'FLOP', 'FLOP', 'TURN', 'RIVER'][i]);
      G.text('DECK', DECK.x + CW / 2, DECK.y + CH + 4, P.felt4, 'small', 'center');
      const pot = this.pot();
      if (pot) {
        const side = this.sidePotsPreview();
        const txt = 'POT ' + pot + (side > 1 ? '  (' + side + ' POTS)' : '');
        ui.tag(txt, G.W / 2, 134, P.gold, P.ink);
        this.drawChips(G.W / 2 - G.textWidth(txt, 'small') / 2 - 16, 134, pot);
      }
      this.drawInfo();
      // seats
      for (let pi = 1; pi < this.players.length; pi++) {
        const p = this.players[pi], s = this.oppSlot(pi);
        const turn = this.turn === pi && this.phase === 'ai';
        const line = p.out ? 'OUT - PLACE ' + p.place : p.folded ? 'FOLDED' : p.allin ? 'ALL IN' : this.moodWord(p);
        this.drawSeat(s, p, { turn, out: p.out || p.folded, line, lineColor: p.allin ? P.orange : p.mood <= -2 ? P.red : p.mood >= 2 ? P.lime : P.silver, value: p.chips });
        if (pi === this.button && !p.out) this.drawButton(s.x + s.w - 14, s.y + s.h + 4);
        this.drawBetTag(p, s.x + s.w / 2, 121);
      }
      this.drawYou();
      G.drawCards(this.cards, (c) => {
        const owner = this.players.find((p) => p.hole.includes(c));
        if (owner && owner.folded && !c._muck) return { dim: true };
        if (this.handDone && owner && this.winners.includes(owner) && owner.show) return { highlight: P.gold };
        return null;
      });
      // showdown hand names
      if (this.handDone) for (let pi = 1; pi < this.players.length; pi++) { const p = this.players[pi]; if (p.show && p.hand) { const s = this.oppSlot(pi); ui.tag(p.hand, s.x + s.w / 2, 121, this.winners.includes(p) ? P.lime : P.white, P.ink); } }
      this.drawLog(LOG, 15);
      this.drawActions();
      this.drawBubbles(dt, [110, 222], 82);
      G.drawFloaters(dt);
      const stats = [{ label: 'HAND', value: this.handNo }, { label: 'BLINDS', value: (this.sb || 10) + '/' + (this.bb || 20), color: P.cyan }, { label: 'CHIPS', value: this.players[0] ? this.players[0].chips : 0, color: P.gold }];
      if (this.handlePause("TEXAS HOLD'EM", stats, () => { this.setup = true; })) return;
      if (this.over) this.drawResult();
    },
    moodWord(p) {
      if (p.mood <= -2) return p.ch.temper && p.ch.temper.nerve === 'hothead' ? 'ON TILT' : 'RATTLED';
      if (p.mood >= 2) return 'ON A HEATER';
      return p.act || (p.ch.poker || '').toUpperCase();
    },
    sidePotsPreview() { const tot = [...new Set(this.live().filter((p) => p.allin).map((p) => p.total))]; return tot.length ? tot.length + (this.live().some((p) => !p.allin) || tot.length > 1 ? 1 : 0) : 1; },
    drawChips(x, y, amt) {
      const cols = [P.red, P.blue, P.green, P.gold];
      const n = Math.min(6, 1 + Math.floor(Math.log2(1 + amt / 40)));
      for (let i = 0; i < n; i++) { const c = cols[i % 4]; G.rect(x, y + 7 - i * 2, 10, 3, P.black); G.rect(x + 1, y + 7 - i * 2, 8, 2, c); }
    },
    drawButton(x, y) {
      G.rect(x + 1, y, 10, 12, P.black); G.rect(x, y + 1, 12, 10, P.black);
      G.rect(x + 1, y + 1, 10, 10, P.white);
      G.text('D', x + 6, y + 3, P.ink, 'small', 'center');
    },
    drawBetTag(p, x, y) {
      if (this.handDone && p.show && p.hand && !p.human) return;
      if (p.bet > 0) { const w = ui.tag(String(p.bet), x + 8, y, P.gold, P.ink); this.drawChips(x + 8 - w / 2 - 13, y + 1, p.bet); }
      else if (p.act && !p.out && (p.act === 'CHECK' || p.act === 'FOLD')) ui.tag(p.act, x, y, P.silver, P.ink);
    },
    drawInfo() {
      const { x, y, w, h } = INFO;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk });
      G.text('BLINDS ' + (this.sb || 10) + '/' + (this.bb || 20), x + 6, y + 6, P.cyan, 'small');
      let nxt = 'FIXED BLINDS';
      if (this.rising) { const lvl = Math.floor((this.handNo - 1) / HANDS_PER_LEVEL); nxt = lvl >= LEVELS.length - 1 ? 'TOP LEVEL' : 'UP IN ' + (HANDS_PER_LEVEL - ((this.handNo - 1) % HANDS_PER_LEVEL)) + ' HANDS'; }
      G.text(nxt, x + 6, y + 18, P.silver, 'small');
    },
    drawYou() {
      const me = this.players[0];
      if (!me) return;
      const turn = this.phase === 'you';
      this.drawSeat(YOU, me, { turn, out: me.out || me.folded, line: me.folded ? 'FOLDED' : me.allin ? 'ALL IN' : 'YOUR STACK', lineColor: me.allin ? P.orange : P.silver, value: me.chips });
      if (this.button === 0) this.drawButton(YOU.x + YOU.w + 6, YOU.y + 8);
      if (me.bet > 0) { const w = ui.tag(String(me.bet), YOU_CARDS.x + 54, 214, P.gold, P.ink); this.drawChips(YOU_CARDS.x + 54 - w / 2 - 13, 215, me.bet); }
      else if (me.act === 'CHECK') ui.tag('CHECK', YOU_CARDS.x + 46, 214, P.silver, P.ink);
      // your best hand right now
      if (me.hole.length === 2 && !me.folded && me.hole.every((c) => c.shownFace)) {
        const sc = G.pokerEval(me.hole.concat(this.board));
        const nm = this.board.length ? handName(sc) : me.hole[0].rank === me.hole[1].rank ? 'POCKET ' + VPL[toInt(me.hole[0]) >> 2] : (me.hole[0].suit === me.hole[1].suit ? 'SUITED ' : '') + G.RANK_LABEL[me.hole[0].rank] + '-' + G.RANK_LABEL[me.hole[1].rank];
        G.text(nm, YOU_CARDS.x + 46, 294, this.handDone && this.winners.includes(me) ? P.lime : P.white, 'small', 'center');
      }
      // odds helper
      if (ui.button(this.showOdds ? 'ODDS ON' : 'ODDS OFF', YOU.x, YOU.y + 32, 92, 15, { key: 'o', theme: this.showOdds ? 'blue' : 'dark', font: 'small', id: 'odds' })) { this.showOdds = !this.showOdds; G.settings.pokerOdds = this.showOdds; G.saveSettings(); }
      if (this.showOdds && turn) {
        const live = this.live().length - 1;
        const key = this.board.length + '_' + live;
        if (!this.oddsCache || this.oddsCache.key !== key) this.oddsCache = { key, eq: equity(me.hole, this.board, live, 700) };
        const toCall = this.toCall(me), pot = this.pot();
        const need = toCall ? Math.round(100 * toCall / (pot + toCall)) : 0;
        G.text('WIN ' + Math.round(this.oddsCache.eq * 100) + '%', YOU.x + 98, YOU.y + 36, P.cyan, 'small');
        if (toCall) G.text('NEED ' + need + '%', YOU.x + 146, YOU.y + 36, this.oddsCache.eq * 100 >= need ? P.lime : P.orange, 'small');
      }
    },
    drawActions() {
      const y = 312;
      G.rect(0, 306, G.W, 54, P.ink); G.rect(0, 306, G.W, 1, P.dusk);
      ui.block(0, 306, G.W, 54);
      const me = this.players[0];
      const my = this.phase === 'you' && !this.paused && !this.over;
      const toCall = my ? this.toCall(me) : 0;
      const maxTo = this.maxTo(me), minTo = Math.min(this.minRaiseTo(), maxTo);
      const canRaise = my && me.canRaise && maxTo > this.curBet;
      if (my) this.raiseTo = G.clamp(this.raiseTo || minTo, minTo, maxTo);
      const step = this.bb || 20;
      if (ui.button('FOLD', 10, y, 64, 22, { key: 'f', theme: 'red', enabled: my && toCall > 0 })) this.act(0, 'fold');
      const callLbl = toCall === 0 ? 'CHECK' : toCall >= me.chips ? 'ALL IN ' + me.chips : 'CALL ' + toCall;
      if (ui.button(callLbl, 80, y, 110, 22, { key: 'c', theme: 'green', enabled: my })) this.act(0, toCall ? 'call' : 'check');
      if (ui.button('-', 196, y, 22, 22, { key: '-', theme: 'dark', enabled: canRaise, showKey: false })) this.raiseTo = Math.max(minTo, this.raiseTo - step);
      const lbl = (this.curBet === 0 ? 'BET ' : 'RAISE TO ') + (my ? this.raiseTo : '');
      if (ui.button(lbl, 222, y, 120, 22, { key: 'r', theme: 'gold', enabled: canRaise, font: 'small' })) this.act(0, 'raise', this.raiseTo);
      if (ui.button('+', 346, y, 22, 22, { key: ['=', '+'], theme: 'dark', enabled: canRaise, showKey: false })) this.raiseTo = Math.min(maxTo, this.raiseTo + step);
      const pot = this.pot();
      const potTo = (f) => Math.round((this.curBet + (pot + toCall) * f) / (this.sb || 10)) * (this.sb || 10);
      if (ui.button('MIN', 374, y, 50, 22, { theme: 'blue', enabled: canRaise, font: 'small' })) this.raiseTo = minTo;
      if (ui.button('1/2 POT', 428, y, 56, 22, { theme: 'blue', enabled: canRaise, font: 'small' })) this.raiseTo = G.clamp(potTo(0.5), minTo, maxTo);
      if (ui.button('POT', 488, y, 50, 22, { theme: 'blue', enabled: canRaise, font: 'small' })) this.raiseTo = G.clamp(potTo(1), minTo, maxTo);
      if (ui.button('ALL IN', 542, y, 88, 22, { key: 'a', theme: 'red', enabled: canRaise })) this.act(0, 'raise', maxTo);
      let s, col = P.silver;
      if (my) { s = 'YOUR MOVE (' + STREET[this.street] + ')  -  TO CALL ' + toCall + '   POT ' + pot + '   STACK ' + me.chips; col = P.gold; }
      else if (this.handDone) s = 'HAND OVER';
      else if (this.phase === 'ai') s = this.players[this.turn].name + ' IS THINKING...';
      else if (me.folded && !me.out) s = 'YOU FOLDED - WATCHING THE HAND';
      else s = STREET[this.street || 0];
      G.text(s, G.W / 2, 342, col, 'small', 'center');
    },
    drawResult() {
      const r = this.result;
      const me = this.players[0];
      const title = r.youWin ? 'YOU WIN THE TABLE' : 'YOU FINISH ' + ['', '1ST', '2ND', '3RD', '4TH'][me.place];
      const lines = this.players.slice().sort((a, b) => a.place - b.place).map((p) => ({ text: ['', '1ST', '2ND', '3RD', '4TH'][p.place] + '  ' + G.dn(p) + (p.out ? '' : '  ' + p.chips + ' CHIPS'), color: p.place === 1 ? P.lime : P.silver }));
      lines.push({ text: 'HANDS PLAYED ' + this.handNo, color: P.white });
      if (r.quote && r.quote.text) lines.push({ text: r.quote.p.name + ': "' + r.quote.text + '"', color: P.cyan });
      lines.push({ text: "HOLD'EM WINS: " + G.store.get('poker_won', 0) + ' OF ' + G.store.get('poker_played', 0), color: P.slate });
      const act = ui.dialog(title, lines, [{ label: 'PLAY AGAIN', act: 'again', theme: 'green', key: 'Enter' }, { label: 'SETUP', act: 'setup', theme: 'blue' }, { label: 'MENU', act: 'menu', theme: 'red' }], { w: 360, titleColor: r.youWin ? P.lime : P.orange });
      if (act === 'again') this.start();
      if (act === 'setup') this.setup = true;
      if (act === 'menu') G.go(G.Menu);
    }
  }, G.TableKit));
})();
