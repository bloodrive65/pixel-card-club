// Pixel Card Club - Blackjack (player vs dealer, dealer stands on all 17s, blackjack pays 3:2)
(function () {
  'use strict';
  const P = G.P, CW = G.CW, CH = G.CH, ui = G.ui;
  const SHOE = { x: 566, y: 30 }, DISCARD = { x: 30, y: 30 };
  const DEALER_Y = 40, PLAYER_Y = 186, FAN = 15;
  const CHIP_VALUES = [5, 25, 100, 500];
  const CHIP_COLORS = { 5: [P.red, P.white], 25: [P.green, P.white], 100: [P.navy, P.sky], 500: [P.plum, P.gold] };
  const START_CHIPS = 1000;
  const WATCH_HANDS = 20; // watch mode: how many hands the table-mates play after you run dry
  // general table talk, mixed with each Club member's own lines
  const LINES = {
    hot: ['THREE IN A ROW!', 'IM ON A HEATER!', 'DONT STOP NOW!', 'KEEP EM COMING!'],
    cold: ['THIS SUCKS.', 'WHO SHUFFLED THIS?', 'CAN I GET ONE WIN?', 'BRUTAL.', 'I HATE THIS SHOE.'],
    tilt: ['I AM NOT LEAVING DOWN!', 'THIS TABLE OWES ME.', 'THAT IS IT. NO MORE MR NICE.', 'UNBELIEVABLE.'],
    allin: ['FORGET IT. {bet} CHIPS.', 'DOUBLE OR NOTHING! {bet}!', '{bet}. MY LUCK HAS TO TURN.'],
    press: ['RAISING TO {bet}.', 'LETS MAKE IT {bet}.', 'BUMPING IT UP. {bet}.', '{bet}. FEELING IT.', 'RIDING IT. {bet}.'],
    chase: ['{bet}. WINNING IT BACK.', 'UPPING IT TO {bet}. IT HAS TO TURN.', '{bet}. ONE GOOD HAND IS ALL I NEED.'],
    reset: ['BACK TO {bet}. PHEW.', 'OKAY, RESET. {bet}.', 'BACK TO NORMAL. {bet}.'],
    lower: ['DOWN TO {bet}. CAREFUL NOW.', 'JUST {bet} THIS TIME.', 'PULLING BACK. {bet}.', 'BABY STEPS. {bet}.'],
    comeback: ['FINALLY!', 'THERE IT IS!', 'THE COMEBACK STARTS NOW.', 'ABOUT TIME!'],
    cooled: ['ALL GOOD THINGS...', 'WELL, IT WAS FUN.', 'STREAK OVER. RATS.', 'THE TABLE TURNS.'],
    push: ['A PUSH. BORING.', 'EVEN STEVEN.', 'NOBODY WINS.'],
    broke: ['I AM TAPPED OUT.', 'THAT IS ME DONE.', 'NOTHING LEFT TO BET.'],
    rebuy: ['BUYING BACK IN.', 'ANOTHER STACK, PLEASE.', 'I CAN STILL WIN THIS.'],
    brave: ['WHO CARES? HIT ME!', 'GO BIG!', 'RISK IT!', 'NO FEAR. HIT.'],
    timid: ['I... WILL STAND.', 'NOT RISKING IT.', 'STAYING PUT.', 'SAFE IS GOOD.'],
    cheer: ['NICE HAND!', 'SHOW OFF.', 'LUCKY YOU.', 'SHARE SOME OF THAT.'],
    dealerBust: ['DEALER BUSTS!', 'HA! THE HOUSE CRACKS.', 'PAY UP, DEALER.']
  };

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
    bookChapter: 'blackjack',
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
      this.setup = true; this.mates = []; this.bubbles = []; this.watch = null;
      const picks = (G.settings.bjPicks || ['rico', 'bubba']).slice(0, 2);
      while (picks.length < 2) picks.push(null);
      this.pick = { slots: [{ label: 'SEAT 1 - RIGHT OF YOU', color: P.lime }, { label: 'SEAT 2 - LEFT OF YOU', color: P.lime }], picks, focus: 0, seatY: 84 };
    },
    // ---------- table-mates (Club members who play their own hands against the dealer) ----------
    startTable() {
      const n = G.settings.bjMates === undefined ? 1 : G.settings.bjMates;
      const view = { picks: this.pick.picks.slice(0, n) }; G.fillRandom(view);
      this.pick.picks.splice(0, n, ...view.picks);
      G.settings.bjPicks = this.pick.picks.slice(); G.saveSettings();
      const bank = G.store.get('bj_mates', {}) || {};
      this.mates = view.picks.map((id, seat) => { const chips = bank[id] || START_CHIPS; return { id, ch: G.char(id), seat, chips, start: chips, cards: [], bet: 0, lastBet: 0, streak: 0, best: 0, worst: 0, hands: 0, result: null, done: false }; });
      this.bubbles = []; this.setup = false; this.watch = null;
      G.rollForms(this.mates.map((m) => Object.assign(m, { name: m.ch.name })));
      this.mates.forEach((m) => { const d = m.form - m.ch.skill; this.say(m, d > 0 ? G.pick(['FEELING SHARP TONIGHT.', 'I CAN SEE THE CARDS TONIGHT.']) : d < 0 ? G.pick(['NOT FEELING IT TONIGHT.', 'LONG DAY. GO EASY ON ME.']) : m.ch.quote.toUpperCase()); });
    },
    seatX(m) { return m.seat === 0 ? 520 : 16; },
    say(m, text) { if (!text) return; this.bubbles = this.bubbles.filter((b) => b.m !== m); this.bubbles.push({ m, text, t: 2.8 }); },
    // ---------- table-mate temper: mood, risk and betting change with the run of cards ----------
    // mood comes from the current streak (+ wins, - losses) and how the stack compares with when they sat down
    mood(m) {
      const s = m.streak, n = m.ch.temper.nerve, ratio = m.chips / Math.max(1, m.start);
      if (s >= 4) return { key: 'fire', label: 'ON FIRE', col: P.gold };
      if (s >= 2) return { key: 'hot', label: 'HOT', col: P.lime };
      if (s <= -3 && n === 'hothead') return { key: 'tilt', label: 'TILT', col: P.orange };
      if (s <= -3 && n === 'jittery') return { key: 'shaky', label: 'SHAKY', col: P.sky };
      if (s <= -2) return { key: 'cold', label: 'COLD', col: P.sky };
      if (ratio >= 1.5) return { key: 'up', label: 'UP BIG', col: P.lime };
      if (ratio <= 0.5) return { key: 'down', label: 'DOWN BAD', col: P.orange };
      return null;
    },
    // risk shift for play decisions: + plays more dangerously, - more cautiously
    risk(m) {
      const s = m.streak, n = m.ch.temper.nerve;
      if (n === 'hothead') return s <= -4 ? 2 : s <= -2 ? 1 : 0;
      if (n === 'jittery') return s <= -4 ? -2 : s <= -2 ? -1 : 0;
      if (n === 'confident') return s >= 4 ? 2 : s >= 2 ? 1 : s <= -3 ? -1 : 0;
      return 0;
    },
    mateBet(m) {
      const t = m.ch.temper, s = m.streak;
      const round5 = (v) => Math.max(5, Math.round(v / 5) * 5);
      let bet;
      // a streak of 1 counts half, then each extra hand counts fully
      const eff = s === 0 ? 0 : Math.abs(s) - 0.5;
      if (t.kelly) { bet = round5(m.chips * t.kelly); m.mult = bet / 25; }
      else {
        const base = ({ low: 10, mid: 25, high: 50 }[m.ch.bet] || 25) * (m.ch.bj === 'hunch' ? G.pick([0.5, 1, 1, 2]) : 1);
        let mult = s > 0 ? 1 + t.press * eff : s < 0 ? 1 + t.chase * eff : 1;
        const ratio = m.chips / Math.max(1, m.start);
        if (ratio >= 1.5) mult *= 1.25;                    // playing with house money
        if (ratio <= 0.5 && t.chase <= 0) mult *= 0.6;     // protecting what is left
        if (this.risk(m) > 1) mult *= 1.5;                 // full tilt
        mult = Math.min(4, Math.max(0.4, mult));
        m.mult = mult;
        bet = round5(base * mult);
      }
      return Math.min(bet, 500);
    },
    // pick a line: the member's own lines for this kind, mixed with the general table pool
    line(m, kind, vars) {
      const own = m.ch.lines[kind] || [], pool = LINES[kind] || [];
      const all = own.length && (!pool.length || Math.random() < 0.6) ? own : pool;
      if (!all.length) return null;
      let t = G.pick(all);
      for (const k in vars || {}) t = t.replace('{' + k + '}', vars[k]);
      return t;
    },
    // after each hand: update the streak and pick something to say about it
    mateResult(m, res) {
      const before = m.streak, won = res === 'WIN' || res === 'BLACKJACK', lost = res === 'LOSE' || res === 'BUST';
      m.hands++;
      if (won) m.streak = before > 0 ? before + 1 : 1;
      else if (lost) m.streak = before < 0 ? before - 1 : -1;
      m.best = Math.max(m.best, m.streak); m.worst = Math.min(m.worst, m.streak);
      let kind = null;
      if (won && before <= -3) kind = 'comeback';
      else if (lost && before >= 3) kind = 'cooled';
      else if (won && m.streak >= 3) kind = 'hot';
      else if (lost && m.streak <= -3) kind = m.ch.temper.nerve === 'hothead' && m.streak <= -4 ? 'tilt' : 'cold';
      else if (res === 'BLACKJACK') kind = 'win';
      else if (won) kind = Math.random() < 0.6 ? 'win' : null;
      else if (res === 'LOSE') kind = Math.random() < 0.6 ? 'lose' : null;
      else if (res === 'PUSH') kind = Math.random() < 0.3 ? 'push' : null;
      return kind ? this.line(m, kind) : null;
    },
    aiDecide(m) {
      const t = handTotal(m.cards), up = this.dealer[0];
      const d = up.rank === 1 ? 11 : Math.min(10, up.rank);
      const canD = m.cards.length === 2 && m.chips >= m.bet;
      const r = this.risk(m);
      let act;
      switch (m.ch.bj) {
        case 'basic': act = basicStrategy({ cards: m.cards }, up, canD, false); break;
        case 'cautious': act = t.total < 12 + Math.max(0, r) || (t.soft && t.total < 18) ? 'HIT' : 'STAND'; if (r > 0 && canD && t.total === 11) act = 'DOUBLE'; break;
        case 'reckless': if (canD && t.total >= 9 - Math.max(0, r) && t.total <= 11) { act = 'DOUBLE'; break; } act = t.total < 18 + Math.min(0, r) ? 'HIT' : 'STAND'; break;
        case 'dealer': act = t.total < 17 + Math.min(0, r) + (r > 1 ? 1 : 0) ? 'HIT' : 'STAND'; break;
        default: // hunch
          if (canD && t.total === 11 && Math.random() < 0.5 + 0.2 * r) { act = 'DOUBLE'; break; }
          if (t.total <= 11) { act = 'HIT'; break; }
          act = t.total <= 16 && Math.random() < (d >= 7 ? 0.65 : 0.35) + 0.15 * r ? 'HIT' : 'STAND';
      }
      // tonight's form: a sharp night plays closer to perfect strategy, an off night makes mistakes
      if (m.form === 2 && m.ch.bj !== 'basic' && Math.random() < 0.35) act = basicStrategy({ cards: m.cards }, up, canD, false);
      if (m.form === 0 && !t.soft && t.total >= 12 && t.total <= 17 && Math.random() < 0.2) act = act === 'STAND' ? 'HIT' : 'STAND';
      // mood overrides on stiff hands (12-16): tilted members gamble, shaky members freeze
      const stiff = !t.soft && t.total >= 12 && t.total <= 16;
      if (stiff && r >= 2 && act === 'STAND' && Math.random() < 0.6) { m.moodMove = 'brave'; return 'HIT'; }
      if (stiff && r <= -2 && act === 'HIT' && Math.random() < 0.6) { m.moodMove = 'timid'; return 'STAND'; }
      if (r >= 1 && act === 'HIT' && canD && t.total >= 9 && t.total <= 11 && !t.soft && Math.random() < 0.5) { m.moodMove = 'brave'; return 'DOUBLE'; }
      return act;
    },
    aiStep(m) {
      const t = handTotal(m.cards).total;
      const fx = this.seatX(m) + CW / 2;
      if (t > 21) { m.done = true; m.result = 'BUST'; G.audio.sfx('error'); G.floatText('BUST', fx, PLAYER_Y + 34, P.orange, 'big', 12); this.say(m, G.say(m.ch, 'bust')); this.after(0.6, () => this.nextSeat()); return; }
      if (t === 21) { m.done = true; this.say(m, isNatural(m.cards) ? 'BLACKJACK!' : '21!'); this.after(0.6, () => this.nextSeat()); return; }
      const act = this.aiDecide(m);
      const mm = m.moodMove; m.moodMove = null;
      const talk = (plain) => this.say(m, mm ? this.line(m, mm) || plain : plain);
      if (act === 'HIT') { talk('HIT ME.'); m.cards.push(this.draw1()); this.after(0.65, () => this.aiStep(m)); }
      else if (act === 'DOUBLE') {
        m.chips -= m.bet; m.bet *= 2; m.doubled = true; G.audio.sfx('chip'); talk('DOUBLE DOWN!');
        m.cards.push(this.draw1());
        this.after(0.7, () => { m.done = true; if (handTotal(m.cards).total > 21) { m.result = 'BUST'; G.audio.sfx('error'); G.floatText('BUST', fx, PLAYER_Y + 34, P.orange, 'big', 12); this.say(m, G.say(m.ch, 'bust')); } this.after(0.5, () => this.nextSeat()); });
      } else { m.done = true; talk('STAND.'); this.after(0.55, () => this.nextSeat()); }
    },
    // turn order around the table: seat 1 (right), you, seat 2 (left), then the dealer
    nextSeat() {
      this.seatI++;
      const s = this.order[this.seatI];
      if (s === undefined) { this.active = this.hands.length; return this.dealerTurn(); }
      if (s === 'you') {
        const h = this.hands[0];
        if (isNatural(h.cards)) { h.done = true; this.active = -1; this.phase = 'wait'; this.after(0.4, () => this.nextSeat()); return; }
        this.aiTurn = null; this.phase = 'play'; this.active = 0; this.checkAuto(); return;
      }
      const m = this.mates[s];
      this.active = -1; this.phase = 'ai'; this.aiTurn = m;
      this.after(0.6, () => this.aiStep(m));
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
      const W = this.watch && !this.watch.done;
      if (!W && (this.bet < 5 || this.bet > this.chips)) { G.audio.sfx('error'); this.msg = 'BET AT LEAST 5'; return; }
      this.collect();
      if (W) { this.watch.n++; this.hands = []; }
      else {
        this.lastBet = this.bet;
        this.chips -= this.bet;
        this.hands = [{ cards: [], bet: this.bet, done: false, doubled: false, result: null, fromSplit: false }];
      }
      this.dealer = []; this.active = 0; this.phase = 'deal'; this.msg = ''; this.hint = null;
      if (this.shoe.length < this.shoeTotal * 0.25) {
        this.msg = 'SHUFFLING THE SHOE'; G.audio.sfx('shuffle');
        this.after(0.9, () => { this.newShoe(); this.msg = ''; });
      }
      const h = this.hands[0];
      const bank = {};
      this.mates.forEach((m) => {
        m.cards = []; m.result = null; m.done = false; m.doubled = false;
        if (m.out) { m.bet = 0; return; }
        const lastMult = m.mult || 1;
        m.bet = this.mateBet(m);
        let talk = null;
        m.cool = (m.cool || 0) - 1;
        if (W && m.chips < m.bet) m.bet = Math.floor(m.chips / 5) * 5; // no rebuys while you watch
        else if (m.chips < m.bet) { m.chips = START_CHIPS; m.start = START_CHIPS; m.streak = 0; m.bet = this.mateBet(m); talk = this.line(m, 'rebuy'); }
        else if (m.cool <= 0 && m.lastBet && m.bet > m.lastBet) {
          // only talk about bet changes that come from their temper, not from a hunch wobble
          if (m.mult >= lastMult * 1.35 && Math.random() < 0.75) talk = this.line(m, this.risk(m) > 1 ? 'allin' : m.streak < 0 ? 'chase' : 'press', { bet: m.bet });
        } else if (m.cool <= 0 && m.lastBet && m.bet < m.lastBet && m.mult <= lastMult * 0.75 && Math.random() < 0.75) {
          talk = this.line(m, m.streak > 0 ? 'reset' : 'lower', { bet: m.bet });
        }
        if (talk) m.cool = 2;
        m.lastBet = m.bet;
        m.chips -= m.bet;
        if (talk) this.say(m, talk);
      });
      const m0 = this.mates.find((m) => m.seat === 0 && !m.out), m1 = this.mates.find((m) => m.seat === 1 && !m.out);
      for (let r = 0; r < 2; r++) {
        if (m0) this.after(0.2, () => m0.cards.push(this.draw1()));
        if (h) this.after(0.2, () => h.cards.push(this.draw1()));
        if (m1) this.after(0.2, () => m1.cards.push(this.draw1()));
        this.after(0.2, () => this.dealer.push(this.draw1(r === 0)));
      }
      this.after(0.45, () => this.afterDeal());
    },
    afterDeal() {
      const up = this.dealer[0];
      const dealerBJ = isNatural(this.dealer);
      const playerBJ = !!this.hands[0] && isNatural(this.hands[0].cards);
      if (cardValue(up) >= 10 && !(playerBJ && !this.mates.length)) {
        this.msg = 'DEALER PEEKS...';
        this.after(0.6, () => {
          if (dealerBJ) { this.dealer[1].faceUp = true; this.msg = 'DEALER BLACKJACK'; this.after(0.6, () => this.settle()); }
          else { this.msg = ''; this.startPlay(); }
        });
        return;
      }
      if (playerBJ && !this.mates.length) { this.dealer[1].faceUp = true; this.hands[0].done = true; this.msg = 'BLACKJACK!'; G.audio.sfx('good'); this.after(0.8, () => this.settle()); return; }
      if (playerBJ) { this.msg = 'BLACKJACK!'; G.audio.sfx('good'); }
      this.startPlay();
    },
    startPlay() {
      this.order = [];
      if (this.mates.some((m) => m.seat === 0 && !m.out)) this.order.push(this.mates.findIndex((m) => m.seat === 0));
      if (this.hands.length) this.order.push('you');
      if (this.mates.some((m) => m.seat === 1 && !m.out)) this.order.push(this.mates.findIndex((m) => m.seat === 1));
      this.seatI = -1; this.nextSeat();
    },
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
        if (h.cards[0].rank === 1) { h.done = true; nh.done = true; this.active = this.hands.length; this.nextSeat(); return; }
        this.checkAuto();
      });
    },
    checkAuto() {
      const h = this.cur(); if (!h) return;
      const t = handTotal(h.cards).total;
      if (t > 21) { h.done = true; h.result = 'bust'; G.audio.sfx('error'); G.floatText('BUST', this.handX(this.active) + CW / 2, PLAYER_Y + 34, P.orange, 'big', 12); this.after(0.5, () => this.nextHand()); this.phase = 'wait'; }
      else if (t === 21) { h.done = true; this.after(0.35, () => this.nextHand()); this.phase = 'wait'; }
    },
    nextHand() {
      this.active++;
      if (this.active < this.hands.length) { this.phase = 'play'; this.checkAuto(); return; }
      this.nextSeat();
    },
    dealerTurn() {
      this.phase = 'dealer'; this.active = -1; this.aiTurn = null;
      this.after(0.3, () => { this.dealer[1].faceUp = true; });
      // the dealer only draws if someone still has a live hand (not bust, not a natural blackjack)
      const live = (cards, split) => handTotal(cards).total <= 21 && !(isNatural(cards) && !split);
      const allBust = !this.hands.some((h) => live(h.cards, h.fromSplit)) && !this.mates.some((m) => m.cards.length && live(m.cards, false));
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
        G.floatText(pay > h.bet ? '+' + (pay - h.bet) : pay === h.bet ? 'PUSH' : '-' + h.bet, fx, PLAYER_Y + CH + 13, pay > h.bet ? P.lime : pay === h.bet ? P.white : P.orange, 'big', 7);
      });
      const bank = G.store.get('bj_mates', {}) || {};
      this.mates.forEach((m) => {
        if (!m.cards.length) return;
        const pt = handTotal(m.cards).total, pBJ = isNatural(m.cards);
        let pay = 0, res;
        if (pt > 21) res = 'BUST';
        else if (pBJ && !dBJ) { res = 'BLACKJACK'; pay = m.bet * 2.5; }
        else if (dBJ && !pBJ) res = 'LOSE';
        else if ((pBJ && dBJ) || pt === dt) { res = 'PUSH'; pay = m.bet; }
        else if (dt > 21 || pt > dt) { res = 'WIN'; pay = m.bet * 2; }
        else res = 'LOSE';
        pay = Math.floor(pay); m.result = res; m.chips += pay;
        G.floatText(pay > m.bet ? '+' + (pay - m.bet) : pay === m.bet ? 'PUSH' : '-' + m.bet, this.seatX(m) + 37, PLAYER_Y + CH + 13, pay > m.bet ? P.lime : pay === m.bet ? P.white : P.orange, 'big', 7);
        const quip = this.mateResult(m, res);
        if (quip) this.say(m, quip);
        bank[m.id] = m.chips;
      });
      if (this.mates.length) G.store.set('bj_mates', bank);
      // the table reacts to the dealer busting, or to your blackjack, if nobody already had something to say
      const quiet = this.mates.filter((m) => !this.bubbles.some((b) => b.m === m));
      if (quiet.length && dt > 21 && Math.random() < 0.5) this.say(G.pick(quiet), G.pick(LINES.dealerBust));
      else if (quiet.length && this.hands.some((h) => h.result === 'BLACKJACK') && Math.random() < 0.6) this.say(G.pick(quiet), G.pick(LINES.cheer));
      this.stats.won += wins; this.stats.lost += losses; this.stats.push += pushes;
      this.msg = net > 0 ? 'YOU WIN ' + net : net < 0 ? (dt > 21 ? 'DEALER BUSTS' : 'DEALER WINS') : 'PUSH';
      if (net < 0 && dt > 21) this.msg = 'YOU LOSE ' + -net;
      if (net < 0 && dt <= 21) this.msg = 'DEALER WINS ' + dt;
      G.audio.sfx(net > 0 ? 'win' : net < 0 ? 'lose' : 'click');
      if (!this.hands.length) this.msg = '';
      G.store.set('bj_chips', this.chips);
      const best = G.store.get('bj_best', START_CHIPS); if (this.chips > best) G.store.set('bj_best', this.chips);
      this.bet = Math.min(this.lastBet, Math.floor(this.chips / 5) * 5);
      if (this.watch && !this.watch.done) this.watchStep(dt);
    },
    // ---------- watch mode (Options > WHEN YOU ARE OUT) ----------
    startWatch() {
      this.watch = { n: 0, done: false };
      this.after(1.4, () => { this.msg = 'WATCHING THE TABLE'; });
      this.after(1.2, () => this.deal());
    },
    watchStep(dt) {
      for (const m of this.mates) if (!m.out && m.chips < 5) { m.out = true; this.say(m, this.line(m, 'broke')); }
      this.msg = dt > 21 ? 'DEALER BUSTS' : 'DEALER ' + (isNatural(this.dealer) ? 'BLACKJACK' : dt);
      const left = this.mates.filter((m) => !m.out);
      if (!left.length || this.watch.n >= WATCH_HANDS) this.after(1.8, () => this.endWatch());
      else this.after(2.2, () => { if (this.watch && !this.watch.done) this.deal(); });
    },
    endWatch() {
      if (!this.watch || this.watch.done) return;
      this.q = []; this.qt = 0;
      // refund anything still riding if you skip mid-hand
      if (this.phase !== 'done') for (const m of this.mates) { m.chips += m.bet || 0; m.bet = 0; }
      this.watch.done = true; this.phase = 'bet';
      const ranked = this.mates.slice().sort((a, b) => b.chips - a.chips);
      this.watch.ranked = ranked;
      this.watch.champ = ranked[0] && ranked[0].chips > 0 && (!ranked[1] || ranked[0].chips !== ranked[1].chips) ? ranked[0] : null;
      this.msg = '';
      G.audio.sfx('win');
    },
    rejoin() {
      // take a fresh stack; anyone who went broke while you watched buys back in too
      this.chips = START_CHIPS; this.bet = 25; G.store.set('bj_chips', this.chips);
      for (const m of this.mates) if (m.out || m.chips < 5) { m.out = false; m.chips = START_CHIPS; m.start = START_CHIPS; m.streak = 0; }
      this.watch = null; this.msg = 'PLACE YOUR BET';
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
      this.mates.forEach((m) => { const n = m.cards.length, off = n > 1 ? Math.min(FAN, Math.floor(76 / (n - 1))) : 0; m.cards.forEach((c, i) => G.place(c, this.seatX(m) + i * off, PLAYER_Y, 300 + m.seat * 20 + i)); });
      this.hands.forEach((h, hi) => { const x = this.handX(hi); h.cards.forEach((c, i) => G.place(c, x, PLAYER_Y, 200 + hi * 20 + i)); h.cards.forEach((c, i) => { c.tx = x + i * FAN; }); });
    },
    // ---------- frame ----------
    frame(dt) {
      if (this.setup) return this.drawSetup();
      if (this.paused) ui.modal = true;
      this.runQueue(this.paused ? 0 : dt);
      this.layout();
      G.updateCards(this.table, dt, 13);
      // drop cards that reached the discard tray
      this.table = this.table.filter((c) => { if (c._toDiscard && c.delay <= 0 && Math.abs(c.x - c.tx) < 1 && Math.abs(c.y - c.ty) < 1) { c._toDiscard = false; this.discardCount++; return false; } return true; });

      ui.felt();
      this.drawTable();
      this.drawMates();
      if (this.hands.length <= 2) G.youPlate(128, 264, 112, this.watch ? 'SITTING OUT' : 'CHIPS ' + this.chips, this.watch ? P.slate : P.lime, this.phase === 'play');
      G.drawCards(this.table);
      this.drawTotals();
      this.drawBubbles(dt);
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
        if (act === 'restart') { this.paused = false; this.watch = null; this.mates.forEach((m) => { m.out = false; }); this.chips = START_CHIPS; G.store.set('bj_chips', this.chips); this.table = []; this.discardCount = 0; this.stats = { won: 0, lost: 0, push: 0 }; this.lastBet = 25; this.newShoe(); this.resetRound(true); }
        if (act === 'menu') { this.paused = false; G.go(G.Menu); }
      } else if (this.watch && this.watch.done) {
        const w = this.watch, title = w.champ ? G.dn(w.champ) + ' WINS THE TABLE' : 'THE TABLE IS EVEN';
        const lines = w.ranked.map((m) => { const d = m.chips - m.start; return { text: G.dn(m) + '  ' + m.chips + ' CHIPS  (' + (d >= 0 ? '+' : '') + d + ')' + (m.out ? '  BROKE' : ''), color: m === w.champ ? P.lime : P.silver }; });
        lines.push({ text: 'YOU WATCHED ' + w.n + ' HAND' + (w.n === 1 ? '' : 'S') + '.', color: P.white });
        lines.push({ text: 'Take a fresh stack of ' + START_CHIPS + ' chips and sit back in?', color: P.slate });
        const act = ui.dialog(title, lines, [{ label: 'NEW STACK', act: 'reset', theme: 'green', key: 'Enter' }, { label: 'MENU', act: 'menu', theme: 'red' }], { w: 360, titleColor: P.gold });
        if (act === 'reset') this.rejoin();
        if (act === 'menu') G.go(G.Menu);
      } else if ((this.phase === 'bet' || this.phase === 'done') && this.chips < 5 && !this.watch && G.settings.watchOut && this.mates.length && !this.q.length) {
        this.startWatch();
      } else if (this.phase === 'bet' && this.chips < 5 && this.bet < 5 && !this.watch) {
        const act = ui.dialog('OUT OF CHIPS', [{ text: 'The house always wins... this time.' }, { text: 'Take a fresh stack of ' + START_CHIPS + ' chips?', color: P.silver }], [{ label: 'NEW STACK', act: 'reset', theme: 'green', key: 'Enter' }, { label: 'MENU', act: 'menu', theme: 'red' }]);
        if (act === 'reset') { this.chips = START_CHIPS; this.bet = 25; G.store.set('bj_chips', this.chips); }
        if (act === 'menu') G.go(G.Menu);
      }
    },
    drawTable() {
      // felt printing (hidden once the dealer has cards so labels never sit on it)
      if (!this.dealer.length) G.text('BLACKJACK PAYS 3 TO 2', G.W / 2, 122, P.felt4, 'big', 'center');
      if (!this.dealer.length) G.text('DEALER MUST HIT 16 AND STAND ON ALL 17S', G.W / 2, 135, P.felt4, 'small', 'center');
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
    drawMates() {
      for (const m of this.mates) {
        const x = this.seatX(m), turn = this.aiTurn === m;
        // plate: name + form hearts on top, chips + mood (or streak) below
        G.panel(x - 2, 138, 116, 30, { fill: turn ? P.navy : P.ink, hi: turn ? P.gold : P.dusk, border: turn ? P.gold : P.black });
        G.drawAvatar(m.id, x + 1, 141);
        G.text(m.ch.name, x + 29, 144, turn ? P.gold : P.white, 'small');
        G.stars(m.form, x + 91, 144);
        G.text(m.out ? 'BROKE' : String(m.chips), x + 29, 155, m.out ? P.orange : P.lime, 'small');
        const md = this.mood(m);
        if (md && !m.out) G.text(md.label, x + 111, 155, md.col, 'small', 'right');
        else if (m.streak) G.text((m.streak > 0 ? 'W' : 'L') + Math.abs(m.streak), x + 111, 155, m.streak > 0 ? P.lime : P.orange, 'small', 'right');
        const cx = x + 37;
        if (m.bet > 0 && this.phase !== 'bet') this.drawBetSpot(cx, PLAYER_Y + CH + 30, m.bet, turn);
        else this.drawBetSpot(cx, PLAYER_Y + CH + 30, 0, false);
        if (this.phase === 'bet' && !m.cards.length) G.text(m.ch.name, cx, PLAYER_Y + 26, P.felt4, 'small', 'center');
      }
    },
    drawBubbles(dt) {
      for (const b of this.bubbles) { b.t -= dt; ui.bubble(b.text, this.seatX(b.m) + 14, 120); }
      this.bubbles = this.bubbles.filter((b) => b.t > 0);
    },
    drawSetup() {
      ui.felt();
      G.panel(10, 8, 620, 344, { fill: P.ink, hi: P.dusk, accent: P.gold });
      ui.block(10, 8, 620, 344);
      G.text('BLACKJACK', 22, 18, P.gold, 'big', 'left', 2, P.black);
      const S = G.settings;
      const n = S.bjMates === undefined ? 1 : S.bjMates;
      G.text('TABLE-MATES', 22, 40, P.silver, 'small');
      const c = ui.choice(['NONE', '1', '2'], n, 22, 48, 210, 18, { id: 'mates' });
      if (c !== n) { S.bjMates = c; G.saveSettings(); }
      G.text('THEY PLAY THEIR OWN HANDS VS THE DEALER', 22, 74, P.cyan, 'small');
      const st = this.pick;
      st.slots.forEach((sl, i) => (sl.color = i < c ? P.lime : P.slate));
      const view = { slots: st.slots.slice(0, Math.max(1, c)), picks: st.picks.slice(0, Math.max(1, c)), focus: Math.min(st.focus, Math.max(0, c - 1)), seatY: 84, hoverChar: st.hoverChar };
      if (c === 0) { G.alpha(0.4, () => G.rosterPicker(view)); G.text('JUST YOU AND THE DEALER', 127, 128, P.gold, 'small', 'center'); }
      else { G.rosterPicker(view); st.picks.splice(0, view.picks.length, ...view.picks); st.focus = view.focus; st.hoverChar = view.hoverChar; }
      if (c > 0 && ui.button('RANDOM PICKS', 22, 180, 210, 18, { id: 'rnd', theme: 'dark' })) { const v = { picks: view.picks.map(() => null) }; G.fillRandom(v); st.picks.splice(0, v.picks.length, ...v.picks); }
      G.wrap('Each member keeps their own chip stack. Their bets, mood and nerve shift with every win and loss. Watch Tank chase his losses or Nova press a hot streak.'.toUpperCase(), 210, 'small').forEach((l, i) => G.text(l, 22, 240 + i * 9, P.silver, 'small'));
      if (ui.button('TAKE A SEAT', 22, 294, 210, 22, { theme: 'green', key: ['Enter', ' '], showKey: false })) this.startTable();
      if (ui.button('BACK', 22, 322, 210, 20, { theme: 'red', key: 'Escape', showKey: false })) G.go(G.Menu);
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
      this.mates.forEach((m) => {
        if (!m.cards.length || m.cards.some((c) => c.delay > 0)) return;
        const t = handTotal(m.cards);
        let lbl = t.total > 21 ? 'BUST' : isNatural(m.cards) ? 'BLACKJACK' : (t.soft && t.total < 21 ? 'SOFT ' : '') + t.total;
        if (m.result && this.phase === 'done') lbl = m.result === 'BUST' ? 'BUST' : lbl + ' - ' + m.result;
        const col = m.result === 'WIN' || m.result === 'BLACKJACK' ? P.lime : m.result === 'LOSE' || m.result === 'BUST' || t.total > 21 ? P.orange : P.white;
        const w = CW + (m.cards.length - 1) * (m.cards.length > 1 ? Math.min(FAN, Math.floor(76 / (m.cards.length - 1))) : 0);
        ui.tag(lbl, this.seatX(m) + w / 2, PLAYER_Y - 15, col, this.aiTurn === m ? P.navy : P.ink);
      });
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
      if (this.watch && !this.watch.done) {
        const left = this.mates.filter((m) => !m.out).length;
        G.text('YOU ARE OUT OF CHIPS - WATCHING THE TABLE', 14, y + 4, P.cyan, 'small');
        G.text('HAND ' + Math.max(1, this.watch.n) + ' OF ' + WATCH_HANDS + '   ' + left + ' STILL PLAYING', 14, y + 15, P.silver, 'small');
        if (ui.button('SKIP TO RESULT', 480, y, 148, 26, { key: 'k', theme: 'blue', font: 'small' })) this.endWatch();
        return;
      }
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
        if (ui.button('SEATS', 370, y, 102, 22, { key: 't', theme: 'blue' })) this.setup = true;
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
