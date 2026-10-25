// Pixel Card Club - shared table kit for the Club games (War, Crazy Eights, Texas Hold'em):
// action queue, table talk log, speech bubbles, opponent seat panels, and the common setup screen.
(function () {
  'use strict';
  const P = G.P, ui = G.ui, input = G.input;

  // mixed personal + generic lines with {placeholders}
  G.talk = (ch, kind, pool, vars) => {
    const own = (ch && ch.lines[kind]) || [], gen = (pool && pool[kind]) || [];
    const all = own.concat(gen);
    if (!all.length) return null;
    let s = own.length && Math.random() < 0.45 ? G.pick(own) : G.pick(all);
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
    return s;
  };

  G.TableKit = {
    // ---------- timed action queue ----------
    after(t, fn) { this.q.push({ t, fn }); },
    runQueue(dt) {
      if (!this.q.length) return;
      this.qt += dt * (this.speed || 1);
      while (this.q.length && this.qt >= this.q[0].t) { this.qt -= this.q[0].t; this.q.shift().fn(); }
      if (!this.q.length) this.qt = 0;
    },
    resetTable() { this.q = []; this.qt = 0; this.log = []; this.bubbles = []; },
    addLog(text, color = P.white) { this.log.push({ text, color }); if (this.log.length > 40) this.log.shift(); },
    say(pi, text, t = 2.8) { if (!text) return; this.bubbles = this.bubbles.filter((b) => b.pi !== pi); this.bubbles.push({ pi, text: String(text).toUpperCase(), t }); },
    // ---------- layout ----------
    oppSlot(i) {
      const n = this.players.length - 1, w = 190;
      const xs = n === 1 ? [G.W / 2 - w / 2] : n === 2 ? [70, G.W - 70 - w] : [16, G.W / 2 - w / 2, G.W - 16 - w];
      return { x: Math.round(xs[i - 1]), y: 24, w, h: 28 };
    },
    drawLog(L, rows = 8) {
      const { x, y, w, h } = L;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk });
      G.text('TABLE TALK', x + 6, y + 5, P.gold, 'small');
      const lines = [];
      for (const l of this.log) for (const t of G.wrap(l.text.toUpperCase(), w - 12, 'small')) lines.push({ t, color: l.color });
      lines.slice(-rows).forEach((l, i) => G.text(l.t, x + 6, y + 16 + i * 9, l.color, 'small'));
    },
    // bubbles: pi 0 = you (drawn at youXY), others under their seat panel
    drawBubbles(dt, youXY = [200, 246], oppDY = 82) {
      for (const b of this.bubbles) {
        b.t -= dt;
        if (b.pi === 0) ui.bubble(b.text, youXY[0], youXY[1]);
        else { const s = this.oppSlot(b.pi); if (s) ui.bubble(b.text, s.x + s.w / 2, s.y + oppDY, true); }
      }
      this.bubbles = this.bubbles.filter((b) => b.t > 0);
    },
    // seat panel: avatar, name, stars, a status line (left) and a value (right)
    drawSeat(s, p, o = {}) {
      const hi = o.turn ? P.gold : o.out ? P.black : P.dusk;
      G.panel(s.x, s.y, s.w, s.h, { fill: o.out ? '#11131d' : P.ink, hi, border: o.turn ? P.gold : P.black });
      G.alpha(o.out ? 0.45 : 1, () => {
        G.drawAvatar(p.id, s.x + 2, s.y + 2);
        G.text(G.dn(p), s.x + 30, s.y + 5, o.turn ? P.gold : P.white, 'big');
        if (p.ch && p.form !== undefined) G.stars(p.form, s.x + s.w - 26, s.y + 6);
        if (o.line) G.text(o.line, s.x + 30, s.y + 17, o.lineColor || P.silver, 'small');
        if (o.value !== undefined) G.text(String(o.value), s.x + s.w - 6, s.y + 17, o.valueColor || P.gold, 'small', 'right');
      });
    },
    // ---------- setup screen shared by the Club table games ----------
    // cfg: { title, prefix, desc, option: {label, items:[...], def}, defaults:[ids] }
    initSetup(cfg) {
      const S = G.settings;
      this.cfg = cfg;
      if (!this.pickState) {
        const picks = (S[cfg.prefix + 'Picks'] || cfg.defaults).slice(0, 3);
        while (picks.length < 3) picks.push(null);
        this.pickState = { slots: [], picks, focus: 0, seatY: 104 };
      }
      if (!S[cfg.prefix + 'Opp']) S[cfg.prefix + 'Opp'] = cfg.defOpp || 1;
      if (S[cfg.prefix + 'Opt'] === undefined) S[cfg.prefix + 'Opt'] = cfg.option ? cfg.option.def || 0 : 0;
    },
    nOpp() { return G.clamp(G.settings[this.cfg.prefix + 'Opp'] || 1, 1, 3); },
    opt() { return G.settings[this.cfg.prefix + 'Opt'] || 0; },
    // seats the chosen opponents (filling blanks at random) and saves them
    takePicks() {
      const st = this.pickState, n = this.nOpp();
      const sub = { picks: st.picks.slice(0, n) }; G.fillRandom(sub);
      st.picks.splice(0, n, ...sub.picks);
      G.settings[this.cfg.prefix + 'Picks'] = st.picks.slice(); G.saveSettings();
      return sub.picks;
    },
    drawSetupScreen() {
      ui.felt();
      ui.modal = false;
      const cfg = this.cfg, S = G.settings;
      G.panel(10, 8, 620, 344, { fill: P.ink, hi: P.dusk, accent: P.gold });
      ui.block(10, 8, 620, 344);
      G.text(cfg.title, 22, 18, P.gold, 'big', 'left', 2, P.black);
      G.text('OPPONENTS', 22, 40, P.silver, 'small');
      const o = ui.choice(['1', '2', '3'], this.nOpp() - 1, 22, 48, 210, 16, { id: 'opp' });
      if (o !== this.nOpp() - 1) { S[cfg.prefix + 'Opp'] = o + 1; G.saveSettings(); }
      if (cfg.option) {
        G.text(cfg.option.label, 22, 74, P.silver, 'small');
        const v = ui.choice(cfg.option.items, this.opt(), 22, 82, 210, 16, { id: 'opt', font: 'small' });
        if (v !== this.opt()) { S[cfg.prefix + 'Opt'] = v; G.saveSettings(); }
      }
      const st = this.pickState, n = this.nOpp();
      const labels = n === 1 ? ['OPPONENT - ACROSS'] : n === 2 ? ['OPPONENT 1 - LEFT', 'OPPONENT 2 - RIGHT'] : ['OPPONENT 1 - LEFT', 'OPPONENT 2 - ACROSS', 'OPPONENT 3 - RIGHT'];
      st.slots = labels.map((l) => ({ label: l, color: P.orange }));
      st.focus = Math.min(st.focus, n - 1);
      const view = { slots: st.slots, picks: st.picks.slice(0, n), focus: st.focus, seatY: 104, hoverChar: st.hoverChar };
      G.rosterPicker(view);
      st.picks.splice(0, n, ...view.picks); st.focus = view.focus; st.hoverChar = view.hoverChar;
      if (ui.button('RANDOM PICKS', 22, 230, 210, 18, { id: 'rnd', theme: 'dark' })) { const v = { picks: view.picks.map(() => null) }; G.fillRandom(v); st.picks.splice(0, n, ...v.picks); }
      const desc = typeof cfg.desc === 'function' ? cfg.desc(this.opt()) : cfg.desc;
      G.wrap(desc.toUpperCase(), 210, 'small').slice(0, 4).forEach((l, i) => G.text(l, 22, 254 + i * 9, P.cyan, 'small'));
      if (ui.button('START', 22, 294, 210, 22, { theme: 'green', key: ['Enter', ' '], showKey: false })) { this.start(); return; }
      if (ui.button('BACK', 22, 322, 210, 20, { theme: 'red', key: 'Escape', showKey: false })) G.go(G.Menu);
    },
    // shared pause handling; returns true while paused
    handlePause(title, stats, restartFn) {
      const menu = ui.topBar(title, stats);
      if (menu && !this.paused) { this.paused = true; ui.modal = true; }
      if (this.paused) {
        const act = ui.pauseMenu(this);
        if (act === 'resume') this.paused = false;
        if (act === 'restart') { this.paused = false; restartFn(); }
        if (act === 'menu') { this.paused = false; G.go(G.Menu); }
        return true;
      }
      return false;
    }
  };
  G.bump = (k, n = 1) => G.store.set(k, G.store.get(k, 0) + n);
})();
