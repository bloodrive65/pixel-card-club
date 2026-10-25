// Pixel Card Club - scene manager, title menu, options, main loop
(function () {
  'use strict';
  const P = G.P, ui = G.ui, CW = G.CW, CH = G.CH;

  G.saveSettings = () => G.store.set('settings', G.settings);
  G.scene = null;
  G.go = (s) => { G.scene = s; G.floaters = []; if (s.enter) s.enter(); };

  // ---------- Title / main menu ----------
  const GAMES = [
    { key: '1', name: 'BLACKJACK', blurb: ['BEAT THE DEALER TO 21', 'UP TO 2 TABLE-MATES'], scene: () => G.Blackjack, icon: [[1, 0], [13, 1]] },
    { key: '2', name: "HOLD'EM", blurb: ['NO-LIMIT SIT-AND-GO', 'VS 1-3 CLUB PLAYERS'], scene: () => G.Holdem, icon: [[1, 2], [1, 3], [12, 0]] },
    { key: '3', name: 'GO FISH', blurb: ['FREE-FOR-ALL OR 2V2', 'LAY DOWN YOUR BOOKS'], scene: () => G.GoFish, icon: [[7, 2], [7, 3], [7, 0]] },
    { key: '4', name: 'CRAZY EIGHTS', blurb: ['MATCH SUIT OR RANK', 'EIGHTS ARE WILD'], scene: () => G.Crazy8, icon: [[8, 1], [8, 0], [8, 2]] },
    { key: '5', name: 'WAR', blurb: ['FLIP, BATTLE, GO TO WAR', 'AUTO-PLAY AND SPEED UP'], scene: () => G.War, icon: [[1, 0], [1, 1]] },
    { key: '6', name: 'SOLITAIRE', blurb: ['CLASSIC KLONDIKE', 'DRAW 1 OR DRAW 3'], scene: () => G.Solitaire, icon: [[13, 3], [12, 1], [11, 0]] },
    { key: '7', name: 'SPIDER', blurb: ['TWO DECKS, TEN COLUMNS', '1, 2 OR 4 SUITS'], scene: () => G.Spider, icon: [[13, 0], [12, 0], [11, 0]] }
  ];
  const TW = 148, TH = 96;
  const tileXY = (i) => {
    if (i < 4) return [Math.round(G.W / 2 - (4 * TW + 3 * 8) / 2) + i * (TW + 8), 88];
    return [Math.round(G.W / 2 - (3 * TW + 2 * 8) / 2) + (i - 4) * (TW + 8), 192];
  };
  const Menu = (G.Menu = {
    enter() {
      this.t = 0; this.options = false; this.custom = false;
      if (!this.rain) {
        this.rain = [];
        const deck = G.shuffle(G.makeDeck(1));
        for (let i = 0; i < 18; i++) { const c = deck[i]; c.faceUp = c.shownFace = Math.random() < 0.7; this.rain.push({ c, x: Math.random() * G.W, y: Math.random() * G.H, v: 8 + Math.random() * 14 }); }
      }
    },
    frame(dt) {
      this.t += dt;
      if (this.options || this.custom) ui.modal = true;
      ui.felt();
      // drifting cards behind the logo
      G.alpha(0.3, () => {
        for (const r of this.rain) {
          r.y += r.v * dt; r.x += r.v * 0.3 * dt;
          if (r.y > G.H + 10) { r.y = -CH - 10; r.x = Math.random() * G.W - 40; }
          r.c.x = r.x; r.c.y = r.y; r.c.flip = 1;
          G.ctx.drawImage(r.c.shownFace ? G.faceImg(r.c) : G.backImg(), Math.round(r.x), Math.round(r.y));
        }
      });
      // logo
      const bob = Math.round(Math.sin(this.t * 2) * 2);
      G.text('PIXEL', G.W / 2, 12 + bob, P.ink, 'big', 'center', 3);
      G.text('PIXEL', G.W / 2, 10 + bob, P.white, 'big', 'center', 3);
      G.text('CARD CLUB', G.W / 2 + 2, 38 + bob, P.black, 'big', 'center', 4);
      G.text('CARD CLUB', G.W / 2, 36 + bob, P.gold, 'big', 'center', 4);
      G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(0, 36 + bob + 14, G.W, 14); G.ctx.clip();
      G.text('CARD CLUB', G.W / 2, 36 + bob, '#e8a33a', 'big', 'center', 4);
      G.ctx.restore();
      [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, G.W / 2 - 34 + i * 18, 73, 'big', s === 1 || s === 2 ? P.red : P.ink));
      [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, G.W / 2 - 34 + i * 18, 72, 'big', s === 1 || s === 2 ? P.orange : P.white));

      // game tiles: 4 table games on top, then War and the two solitaires
      GAMES.forEach((g, i) => {
        const [x, y0] = tileXY(i);
        const hover = !ui.modal && G.inRect(G.input.x, G.input.y, x, y0, TW, TH);
        const y = y0 - (hover ? 2 : 0);
        G.panel(x, y, TW, TH, { fill: hover ? P.navy : P.ink, hi: hover ? P.gold : P.dusk, border: hover ? P.gold : P.black });
        ui.block(x, y0, TW, TH);
        const n = g.icon.length, iw = 28 + (n - 1) * 16;
        g.icon.forEach(([r, s], k) => {
          const cx = x + TW / 2 - iw / 2 + k * 16, cy = y + 8 + Math.abs(k - (n - 1) / 2) * 2;
          G.alpha(0.35, () => G.rect(cx + 2, cy + 2, 27, 39, P.black));
          G.ctx.drawImage(G.miniCard(r, s), Math.round(cx), Math.round(cy), 28, 40);
        });
        G.text(g.name, x + TW / 2, y + 54, hover ? P.white : P.gold, 'big', 'center', 1, P.black);
        g.blurb.forEach((b, k) => G.text(b, x + TW / 2, y + 68 + k * 9, P.silver, 'small', 'center'));
        G.rect(x + TW - 15, y + 4, 11, 11, hover ? P.gold : P.dusk);
        G.text(g.key, x + TW - 9, y + 7, hover ? P.ink : P.silver, 'small', 'center');
        if (hover) { ui.cursorHand = true; ui.hoverId = 'tile' + i; }
        if ((hover && G.input.pressed) || (!ui.modal && G.key(g.key))) { G.input.pressed = false; delete G.input.keyPressed[g.key]; G.audio.sfx('click'); G.go(g.scene()); }
      });
      // footer buttons
      const fy = 302, bw = 120, gap = 8, fx = G.W / 2 - (bw * 4 + gap * 3) / 2;
      if (ui.button('OPTIONS', fx, fy, bw, 20, { key: 'o', theme: 'dark' })) this.options = true;
      if (ui.button('CUSTOMIZE', fx + (bw + gap), fy, bw, 20, { key: 'c', theme: 'gold' })) this.custom = true;
      if (ui.button('RULEBOOK', fx + (bw + gap) * 2, fy, bw, 20, { key: 'r', theme: 'blue' })) G.Rulebook.open('contents', G.Menu);
      const quitEnabled = !!window.cardclubNative;
      if (ui.button(quitEnabled ? 'QUIT' : 'FULLSCREEN', fx + (bw + gap) * 3, fy, bw, 20, { key: quitEnabled ? 'q' : 'f', theme: 'dark' })) {
        if (quitEnabled) window.cardclubNative.quit();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      }
      G.text('PICK A GAME WITH THE MOUSE OR PRESS 1 - 7', G.W / 2, 334, P.felt4, 'small', 'center');
      G.text('V1.3', G.W - 8, G.H - 10, P.felt4, 'small', 'right');
      if (this.options) this.drawOptions();
      if (this.custom) this.drawCustomize();
    },
    // ---------- Customize: table colour and card back, with a live preview ----------
    drawCustomize() {
      ui.modal = true;
      G.alpha(0.6, () => G.rect(0, 0, G.W, G.H, P.ink));
      ui.block(0, 0, G.W, G.H);
      const w = 500, h = 300, x = G.W / 2 - w / 2, y = 30;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
      G.text('CUSTOMIZE', G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
      const S = G.settings;
      // table colours
      G.text('TABLE COLOUR', x + 18, y + 34, P.silver, 'small');
      G.TABLES.forEach((t, i) => {
        const sx = x + 18 + (i % 3) * 78, sy = y + 46 + Math.floor(i / 3) * 40;
        const sel = (S.table || 0) === i;
        const hover = G.inRect(G.input.x, G.input.y, sx, sy, 72, 34);
        G.rect(sx, sy, 72, 34, sel ? P.gold : hover ? P.white : P.black);
        G.rect(sx + 2, sy + 2, 68, 20, t.f[2]);
        for (let k = 0; k < 5; k++) G.rect(sx + 2 + k * 13.6, sy + 18, 13.6, 4, t.f[k]);
        G.rect(sx + 2, sy + 22, 68, 10, sel ? P.gold : P.dusk);
        G.text(t.name, sx + 36, sy + 24, sel ? P.ink : P.white, 'small', 'center');
        if (hover) { ui.hoverId = 'tbl' + i; }
        if (hover && G.input.pressed) { G.input.pressed = false; S.table = i; G.applyTable(i); G.saveSettings(); G.audio.sfx('click'); }
      });
      // card backs
      G.text('CARD BACK', x + 18, y + 174, P.silver, 'small');
      G.backNames().forEach((name, i) => {
        const bx = x + 18 + i * 58, by = y + 184;
        const sel = S.back === i;
        const hover = G.inRect(G.input.x, G.input.y, bx, by, 50, 80);
        G.rect(bx, by, 50, 80, sel ? P.gold : hover ? P.white : P.black);
        G.rect(bx + 1, by + 1, 48, 78, P.ink);
        G.ctx.drawImage(G.cardArt.backs[i % G.cardArt.backs.length], bx + 3, by + 3);
        G.text(name.toUpperCase().slice(0, 8), bx + 25, by + 69, sel ? P.gold : P.silver, 'small', 'center');
        if (hover) ui.hoverId = 'bk' + i;
        if (hover && G.input.pressed) { G.input.pressed = false; S.back = i; G.saveSettings(); G.audio.sfx('chip'); }
      });
      // preview: a small slice of the table with your choices
      const px = x + 262, py = y + 46, pw = 220, ph = 154;
      G.text('PREVIEW', px, y + 34, P.silver, 'small');
      G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(px, py, pw, ph); G.ctx.clip();
      G.ctx.drawImage(G.ui.feltCanvas(), 210, 80, pw, ph, px, py, pw, ph);
      G.drawSlot(px + 14, py + 14, 'A');
      G.ctx.drawImage(G.backImg(), px + 64, py + 14); G.ctx.drawImage(G.backImg(), px + 67, py + 11);
      G.ctx.drawImage(G.cardArt.faces['1_1'], px + 120, py + 14); G.ctx.drawImage(G.cardArt.faces['0_13'], px + 150, py + 24);
      G.ctx.drawImage(G.cardArt.faces['2_10'], px + 30, py + 84); G.ctx.drawImage(G.cardArt.faces['3_12'], px + 62, py + 84); G.ctx.drawImage(G.cardArt.faces['0_1'], px + 94, py + 84); G.ctx.drawImage(G.backImg(), px + 156, py + 84);
      G.ctx.restore();
      G.outline(px - 1, py - 1, pw + 2, ph + 2, P.black);
      // deck style
      G.text('DECK', px, py + ph + 10, P.silver, 'small');
      const di = ui.choice(G.DECKS.map((d) => d.name), G.deckIndex || 0, px, py + ph + 20, pw, 20, { modal: true, id: 'deck' });
      if (di !== (G.deckIndex || 0)) { G.applyDeck(di); G.saveSettings(); G.audio.sfx('shuffle'); }
      if (G.cardArt.custom) G.text('A CUSTOM CARD SHEET IS IN USE', px + pw / 2, py + ph + 44, P.orange, 'small', 'center');
      else G.text('SAVED FOR EVERY GAME', px + pw / 2, py + ph + 46, P.slate, 'small', 'center');
      if (ui.button('DONE', G.W / 2 - 50, y + h - 28, 100, 20, { modal: true, theme: 'green', key: ['Escape', 'Enter'], showKey: false })) this.custom = false;
    },
    drawOptions() {
      ui.modal = true;
      G.alpha(0.7, () => G.rect(0, 0, G.W, G.H, P.ink));
      ui.block(0, 0, G.W, G.H);
      const w = 380, h = 230, x = G.W / 2 - w / 2, y = 60;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
      G.text('OPTIONS', G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
      const S = G.settings; let changed = false;
      const row = (label, yy) => G.text(label, x + 18, yy + 7, P.silver, 'small');
      let yy = y + 34;
      row('SOUND', yy);
      const snd = ui.choice(['ON', 'OFF'], S.sound ? 0 : 1, x + 150, yy, w - 168, 18, { modal: true, id: 'snd' });
      if ((snd === 0) !== S.sound) { S.sound = snd === 0; changed = true; }
      yy += 26; row('SCALING', yy);
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
        ['bj_chips', 'bj_best', 'sol_won', 'sol_played', 'sol_best', 'fish_won', 'fish_played', 'records', 'bj_mates', 'war_won', 'war_played', 'c8_won', 'c8_played', 'spider_won', 'spider_played', 'spider_best1', 'spider_best2', 'spider_best4', 'poker_won', 'poker_played'].forEach((k) => G.store.set(k, null));
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
    G.applyTable(G.settings.table || 0);
    G.initCardArt(() => {
      G.go(Menu);
      let last = performance.now();
      function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        ui.begin();
        G.ctx.fillStyle = P.black; G.ctx.fillRect(0, 0, G.W, G.H);
        G.scene.frame(dt);
        if (G.scene === Menu || G.scene === G.Solitaire) G.drawFloaters(dt);
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
