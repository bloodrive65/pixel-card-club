// Pixel Card Club - scene manager, title menu, options, main loop
(function () {
  'use strict';
  const P = G.P, ui = G.ui, CW = G.CW, CH = G.CH;

  G.saveSettings = () => G.store.set('settings', G.settings);
  G.scene = null;
  G.go = (s) => { G.scene = s; G.floaters = []; if (s.enter) s.enter(); };

  // ---------- Title / main menu ----------
  const GAMES = [
    { key: '1', name: 'BLACKJACK', blurb: ['Beat the dealer to 21.', 'Hit, stand, double, split.', 'Up to 2 Club table-mates.'], scene: () => G.Blackjack, color: 'red', icon: [[1, 1], [13, 0]] },
    { key: '2', name: 'SOLITAIRE', blurb: ['Classic Klondike.', 'Draw 1 or draw 3.', 'Undo, hints, auto-finish.'], scene: () => G.Solitaire, color: 'gold', icon: [[13, 3], [12, 1], [11, 0]] },
    { key: '3', name: 'GO FISH', blurb: ['Free-for-all or 2v2 teams.', '18 Club members to face.', 'Lay your books down.'], scene: () => G.GoFish, color: 'blue', icon: [[7, 2], [7, 3], [7, 0]] }
  ];
  const Menu = (G.Menu = {
    enter() {
      this.t = 0; this.options = false;
      if (!this.rain) {
        this.rain = [];
        const deck = G.shuffle(G.makeDeck(1));
        for (let i = 0; i < 18; i++) { const c = deck[i]; c.faceUp = c.shownFace = Math.random() < 0.7; this.rain.push({ c, x: Math.random() * G.W, y: Math.random() * G.H, v: 8 + Math.random() * 14 }); }
      }
    },
    frame(dt) {
      this.t += dt;
      if (this.options) ui.modal = true;
      ui.felt();
      // drifting cards behind the logo
      G.alpha(0.35, () => {
        for (const r of this.rain) {
          r.y += r.v * dt; r.x += r.v * 0.3 * dt;
          if (r.y > G.H + 10) { r.y = -CH - 10; r.x = Math.random() * G.W - 40; }
          r.c.x = r.x; r.c.y = r.y; r.c.flip = 1;
          G.ctx.drawImage(r.c.shownFace ? G.faceImg(r.c) : G.backImg(), Math.round(r.x), Math.round(r.y));
        }
      });
      // logo
      const bob = Math.round(Math.sin(this.t * 2) * 2);
      G.text('PIXEL', G.W / 2, 26 + bob, P.ink, 'big', 'center', 3);
      G.text('PIXEL', G.W / 2, 24 + bob, P.white, 'big', 'center', 3);
      G.text('CARD CLUB', G.W / 2 + 2, 56 + bob, P.black, 'big', 'center', 4);
      G.text('CARD CLUB', G.W / 2, 54 + bob, P.gold, 'big', 'center', 4);
      G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(0, 54 + bob + 14, G.W, 14); G.ctx.clip();
      G.text('CARD CLUB', G.W / 2, 54 + bob, '#e8a33a', 'big', 'center', 4);
      G.ctx.restore();
      // suit strip
      [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, G.W / 2 - 34 + i * 18, 92, 'big', s === 1 || s === 2 ? P.red : P.ink));
      [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, G.W / 2 - 34 + i * 18, 91, 'big', s === 1 || s === 2 ? P.orange : P.white));

      // game tiles
      const tw = 180, th = 170, gap = 16, x0 = G.W / 2 - (tw * 3 + gap * 2) / 2, y0 = 112;
      GAMES.forEach((g, i) => {
        const x = x0 + i * (tw + gap), y = y0;
        const hover = !ui.modal && G.inRect(G.input.x, G.input.y, x, y, tw, th);
        G.panel(x, y - (hover ? 2 : 0), tw, th, { fill: hover ? P.navy : P.ink, hi: hover ? P.gold : P.dusk, border: hover ? P.gold : P.black });
        const yy = y - (hover ? 2 : 0);
        // mini card fan icon
        const n = g.icon.length;
        g.icon.forEach(([r, s], k) => {
          const img = G.cardArt.faces[s + '_' + r];
          const cx = x + tw / 2 - (CW + (n - 1) * 18) / 2 + k * 18, cy = yy + 10 + Math.abs(k - (n - 1) / 2) * 3;
          G.alpha(0.35, () => G.rect(cx + 2, cy + 2, CW - 1, CH - 2, P.black));
          G.ctx.drawImage(img, Math.round(cx), Math.round(cy));
        });
        G.text(g.name, x + tw / 2, yy + 82, P.gold, 'big', 'center', 1, P.black);
        g.blurb.forEach((b, k) => G.text(b.toUpperCase(), x + tw / 2, yy + 98 + k * 10, P.silver, 'small', 'center'));
        if (ui.button('PLAY', x + 14, yy + th - 32, tw - 28, 22, { key: g.key, theme: g.color === 'red' ? 'red' : g.color === 'blue' ? 'blue' : 'gold', id: 'play' + i })) G.go(g.scene());
        if (hover && G.input.pressed && !ui.blocked()) { G.audio.sfx('click'); G.go(g.scene()); }
      });
      // footer buttons
      const fy = 296;
      if (ui.button('OPTIONS', G.W / 2 - 220, fy, 140, 20, { key: 'o', theme: 'dark' })) this.options = true;
      if (ui.button('RULEBOOK', G.W / 2 - 70, fy, 140, 20, { key: 'r', theme: 'blue' })) G.Rulebook.open('contents', G.Menu);
      const quitEnabled = !!window.cardclubNative;
      if (ui.button(quitEnabled ? 'QUIT' : 'FULLSCREEN', G.W / 2 + 80, fy, 140, 20, { key: quitEnabled ? 'q' : 'f', theme: 'dark' })) {
        if (quitEnabled) window.cardclubNative.quit();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      }
      G.text('PICK A GAME WITH THE MOUSE OR PRESS 1  2  3', G.W / 2, 330, P.felt4, 'small', 'center');
      G.text('V1.2', G.W - 8, G.H - 10, P.felt3, 'small', 'right');
      if (this.options) this.drawOptions();
    },
    drawOptions() {
      ui.modal = true;
      G.alpha(0.7, () => G.rect(0, 0, G.W, G.H, P.ink));
      ui.block(0, 0, G.W, G.H);
      const w = 380, h = 270, x = G.W / 2 - w / 2, y = 44;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
      G.text('OPTIONS', G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
      const S = G.settings; let changed = false;
      const row = (label, yy) => G.text(label, x + 18, yy + 7, P.silver, 'small');
      let yy = y + 34;
      row('SOUND', yy);
      const snd = ui.choice(['ON', 'OFF'], S.sound ? 0 : 1, x + 150, yy, w - 168, 18, { modal: true, id: 'snd' });
      if ((snd === 0) !== S.sound) { S.sound = snd === 0; changed = true; }
      yy += 26; row('CARD BACK', yy);
      const bk = ui.choice(G.BACKS.map((b) => b.name.toUpperCase()), S.back, x + 150, yy, w - 168, 18, { modal: true, id: 'bk', font: 'small' });
      if (bk !== S.back) { S.back = bk; changed = true; }
      yy += 22;
      for (let i = 0; i < 4; i++) G.ctx.drawImage(G.cardArt.backs[i], 0, 0, CW, 20, x + 152 + i * ((w - 168) / 4) + 6, yy, CW, 20);
      yy += 28; row('SCALING', yy);
      const sc = ui.choice(['PIXEL PERFECT', 'FILL WINDOW'], S.pixelPerfect ? 0 : 1, x + 150, yy, w - 168, 18, { modal: true, id: 'sc', font: 'small' });
      if ((sc === 0) !== S.pixelPerfect) { S.pixelPerfect = sc === 0; G.resize(); changed = true; }
      yy += 26; row('SOLITAIRE DRAW', yy);
      const dr = ui.choice(['DRAW 1', 'DRAW 3'], S.drawThree ? 1 : 0, x + 150, yy, w - 168, 18, { modal: true, id: 'dr', font: 'small' });
      if ((dr === 1) !== S.drawThree) { S.drawThree = dr === 1; changed = true; }
      yy += 26; row('BLACKJACK DECKS', yy);
      const deckOpts = [1, 2, 4, 6];
      const dk = ui.choice(deckOpts.map(String), Math.max(0, deckOpts.indexOf(S.bjDecks)), x + 150, yy, w - 168, 18, { modal: true, id: 'dk' });
      if (deckOpts[dk] !== S.bjDecks) { S.bjDecks = deckOpts[dk]; changed = true; }
      yy += 26; row('RESET STATS', yy);
      if (ui.button('RESET CHIPS + WINS', x + 150, yy, w - 168, 18, { modal: true, theme: 'red', font: 'small' })) {
        ['bj_chips', 'bj_best', 'sol_won', 'sol_played', 'sol_best', 'fish_won', 'fish_played', 'records', 'bj_mates'].forEach((k) => G.store.set(k, null));
        G.floatText('STATS RESET', G.W / 2, y + h - 40, P.orange, 'small');
      }
      if (changed) { G.saveSettings(); G.audio.sfx('click'); }
      if (ui.button('DONE', G.W / 2 - 50, y + h - 28, 100, 20, { modal: true, theme: 'green', key: ['Escape', 'Enter'], showKey: false })) this.options = false;
    }
  });

  // ---------- Boot ----------
  function boot() {
    const saved = G.store.get('settings', null);
    if (saved) Object.assign(G.settings, saved);
    G.resize();
    G.initCardArt(() => {
      G.go(Menu);
      let last = performance.now();
      function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        ui.begin();
        G.ctx.fillStyle = P.black; G.ctx.fillRect(0, 0, G.W, G.H);
        G.scene.frame(dt);
        if (G.scene === Menu) G.drawFloaters(dt);
        ui.end();
        G.endInputFrame();
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
      // F11 fullscreen toggle in desktop build, F for browser
      addEventListener('keydown', (e) => { if (e.key === 'F11' && window.cardclubNative) { e.preventDefault(); window.cardclubNative.toggleFullscreen(); } });
    });
  }
  boot();
})();
