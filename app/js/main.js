// Pixel Card Club - scene manager, title menu, options, main loop
(function () {
  'use strict';
  const P = G.P, ui = G.ui, CW = G.CW, CH = G.CH;

  G.saveSettings = () => G.store.set('settings', G.settings);
  G.scene = null;
  G.go = (s) => { G.scene = s; G.floaters = []; if (s.enter) s.enter(); };

  // ---------- Title / main menu ----------
  // Two menu pages: the three classics (as in 1.2), then the newer games.
  const PAGES = [
    { name: 'THE CLASSICS', tw: 180, gap: 16, games: [
      { key: '1', name: 'BLACKJACK', blurb: ['Beat the dealer to 21.', 'Hit, stand, double, split.', 'Up to 2 Club table-mates.'], scene: () => G.Blackjack, theme: 'red', icon: [[1, 1], [13, 0]] },
      { key: '2', name: 'SOLITAIRE', blurb: ['Classic Klondike.', 'Draw 1 or draw 3.', 'Undo, hints, auto-finish.'], scene: () => G.Solitaire, theme: 'gold', icon: [[13, 3], [12, 1], [11, 0]] },
      { key: '3', name: 'GO FISH', blurb: ['Free-for-all or 2v2 teams.', '18 Club members to face.', 'Lay your books down.'], scene: () => G.GoFish, theme: 'blue', icon: [[7, 2], [7, 3], [7, 0]] }
    ] },
    { name: 'MORE GAMES', tw: 136, gap: 10, games: [
      { key: '1', name: "HOLD'EM", blurb: ['No-limit poker.', 'Sit-and-go vs', '1-3 Club players.'], scene: () => G.Holdem, theme: 'red', icon: [[1, 2], [1, 3], [12, 0]] },
      { key: '2', name: 'CRAZY 8S', blurb: ['Match suit or rank.', 'Eights are wild.', 'Match to 100.'], scene: () => G.Crazy8, theme: 'gold', icon: [[8, 1], [8, 0], [8, 2]] },
      { key: '3', name: 'WAR', blurb: ['Flip and battle.', 'Ties go to war.', 'Auto-play, speed up.'], scene: () => G.War, theme: 'blue', icon: [[1, 0], [1, 1]] },
      { key: '4', name: 'SPIDER', blurb: ['Two decks,', 'ten columns.', '1, 2 or 4 suits.'], scene: () => G.Spider, theme: 'gold', icon: [[13, 0], [12, 0], [11, 0]] }
    ] }
  ];
  const Menu = (G.Menu = {
    enter() {
      this.t = 0; this.options = false; this.custom = false; this.profileOpen = false;
      if (!this.rain) {
        this.rain = [];
        const deck = G.shuffle(G.makeDeck(1));
        for (let i = 0; i < 18; i++) { const c = deck[i]; c.faceUp = c.shownFace = Math.random() < 0.7; this.rain.push({ c, x: Math.random() * G.W, y: Math.random() * G.H, v: 8 + Math.random() * 14 }); }
      }
    },
    frame(dt) {
      this.t += dt;
      if (this.options || this.custom || this.profileOpen) ui.modal = true;
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
      G.text('PIXEL', G.W / 2, 26 + bob, P.ink, 'big', 'center', 3);
      G.text('PIXEL', G.W / 2, 24 + bob, P.white, 'big', 'center', 3);
      G.text('CARD CLUB', G.W / 2 + 2, 56 + bob, P.black, 'big', 'center', 4);
      G.text('CARD CLUB', G.W / 2, 54 + bob, P.gold, 'big', 'center', 4);
      G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(0, 54 + bob + 14, G.W, 14); G.ctx.clip();
      G.text('CARD CLUB', G.W / 2, 54 + bob, '#e8a33a', 'big', 'center', 4);
      G.ctx.restore();
      [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, G.W / 2 - 34 + i * 18, 92, 'big', s === 1 || s === 2 ? P.red : P.ink));
      [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, G.W / 2 - 34 + i * 18, 91, 'big', s === 1 || s === 2 ? P.orange : P.white));

      // game tiles for the current page
      const pg = PAGES[this.page || 0], th = 170, y0 = 112;
      const x0 = Math.round(G.W / 2 - (pg.tw * pg.games.length + pg.gap * (pg.games.length - 1)) / 2);
      this.slide = Math.max(0, (this.slide || 0) - dt * 6);
      const off = Math.round(this.slide * this.slide * 40 * (this.slideDir || 1));
      pg.games.forEach((g, i) => {
        const tw = pg.tw, x = x0 + i * (tw + pg.gap) + off;
        const hover = !ui.modal && G.inRect(G.input.x, G.input.y, x, y0, tw, th);
        const y = y0 - (hover ? 2 : 0);
        G.panel(x, y, tw, th, { fill: hover ? P.navy : P.ink, hi: hover ? P.gold : P.dusk, border: hover ? P.gold : P.black });
        const n = g.icon.length;
        g.icon.forEach(([r, s], k) => {
          const img = G.cardArt.faces[s + '_' + r];
          const cx = x + tw / 2 - (CW + (n - 1) * 18) / 2 + k * 18, cy = y + 10 + Math.abs(k - (n - 1) / 2) * 3;
          G.alpha(0.35, () => G.rect(cx + 2, cy + 2, CW - 1, CH - 2, P.black));
          G.ctx.drawImage(img, Math.round(cx), Math.round(cy));
        });
        G.text(g.name, x + tw / 2, y + 82, P.gold, 'big', 'center', 1, P.black);
        g.blurb.forEach((b, k) => G.text(b.toUpperCase(), x + tw / 2, y + 98 + k * 10, P.silver, 'small', 'center'));
        if (ui.button('PLAY', x + 14, y + th - 32, tw - 28, 22, { key: g.key, theme: g.theme, id: 'play' + this.page + i })) G.go(g.scene());
        if (hover && G.input.pressed && !ui.blocked()) { G.audio.sfx('click'); G.go(g.scene()); }
      });
      // page arrows and dots
      const turn = (d) => { const np = Math.max(0, Math.min(PAGES.length - 1, (this.page || 0) + d)); if (np !== (this.page || 0)) { this.page = np; this.slide = 1; this.slideDir = d; G.audio.sfx('flip'); } };
      if ((this.page || 0) > 0 && ui.button('<', 6, y0 + th / 2 - 20, 20, 40, { key: 'ArrowLeft', theme: 'dark', id: 'pgL', showKey: false })) turn(-1);
      if ((this.page || 0) < PAGES.length - 1 && ui.button('>', G.W - 26, y0 + th / 2 - 20, 20, 40, { key: 'ArrowRight', theme: 'dark', id: 'pgR', showKey: false })) turn(1);
      if (!ui.modal && G.key('Tab')) { delete G.input.keyPressed.Tab; turn((this.page || 0) < PAGES.length - 1 ? 1 : -1); }
      PAGES.forEach((p, i) => {
        const dx = G.W / 2 - (PAGES.length * 14) / 2 + i * 14 + 3;
        G.rect(dx, y0 + th + 6, 8, 8, i === (this.page || 0) ? P.gold : P.felt1);
        if (!ui.modal && G.inRect(G.input.x, G.input.y, dx - 3, y0 + th + 3, 14, 14) && G.input.pressed) { G.input.pressed = false; turn(i - (this.page || 0)); }
      });
      // footer buttons
      const fy = 300, bw = 120, gap = 8, fx = G.W / 2 - (bw * 4 + gap * 3) / 2;
      if (ui.button('OPTIONS', fx, fy, bw, 20, { key: 'o', theme: 'dark' })) this.options = true;
      if (ui.button('CUSTOMIZE', fx + (bw + gap), fy, bw, 20, { key: 'c', theme: 'gold' })) this.custom = true;
      if (ui.button('RULEBOOK', fx + (bw + gap) * 2, fy, bw, 20, { key: 'r', theme: 'blue' })) G.Rulebook.open('contents', G.Menu);
      const quitEnabled = !!window.cardclubNative;
      if (ui.button(quitEnabled ? 'QUIT' : 'FULLSCREEN', fx + (bw + gap) * 3, fy, bw, 20, { key: quitEnabled ? 'q' : 'f', theme: 'dark' })) {
        if (quitEnabled) window.cardclubNative.quit();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      }
      G.text(pg.name + '  -  PRESS 1 - ' + pg.games.length + ' TO PLAY  -  ' + (this.page ? '< OR TAB FOR THE CLASSICS' : '> OR TAB FOR MORE GAMES'), G.W / 2, 332, P.felt4, 'small', 'center');
      G.text('V1.4', G.W - 8, G.H - 10, P.felt4, 'small', 'right');
      if (this.options) this.drawOptions();
      if (this.custom) this.drawCustomize();
      // your player badge (top left) opens the profile editor
      if (!this.options && !this.custom && !this.profileOpen) {
        const bx = 8, by = 8, bw = 132;
        const hov = G.inRect(G.input.x, G.input.y, bx, by, bw, 30);
        G.panel(bx, by, bw, 30, { fill: hov ? P.navy : P.ink, hi: hov ? P.gold : P.dusk, border: hov ? P.gold : P.black });
        G.drawAvatar('you', bx + 3, by + 3);
        G.text(G.playerName(), bx + 31, by + 6, hov ? P.gold : P.white, 'big');
        G.text('EDIT PROFILE  P', bx + 31, by + 18, P.silver, 'small');
        if (hov) { ui.cursorHand = true; ui.hoverId = 'badge'; }
        if ((hov && G.input.pressed) || G.key('p')) { G.input.pressed = false; delete G.input.keyPressed.p; G.audio.sfx('click'); this.profileOpen = true; this.nameT = 0; }
      }
      if (this.profileOpen) this.drawProfile(dt);
    },
    // ---------- Profile: your name and look ----------
    drawProfile(dt) {
      ui.modal = true;
      G.alpha(0.6, () => G.rect(0, 0, G.W, G.H, P.ink));
      ui.block(0, 0, G.W, G.H);
      const w = 520, h = 312, x = G.W / 2 - w / 2, y = 24;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
      G.text('YOUR PROFILE', G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
      const f = G.profile();
      let changed = false;
      // name: type to edit (letters, numbers, space, dot, dash), backspace deletes
      this.nameT = (this.nameT || 0) + dt;
      for (const k in G.input.keyPressed) {
        if (k === 'Backspace') { f.name = (f.name || '').slice(0, -1); changed = true; }
        else if (k.length === 1 && /[a-z0-9 .\-]/.test(k) && (f.name || '').length < 10) { if (!(k === ' ' && !(f.name || '').length)) { f.name = (f.name || '') + k.toUpperCase(); changed = true; } }
        else continue;
        delete G.input.keyPressed[k];
      }
      // preview
      const px = x + 18, py = y + 34;
      G.rect(px - 2, py - 2, 124, 124, P.black);
      G.drawAvatar('you', px, py, 5);
      G.text('NAME - JUST TYPE', px, py + 130, P.silver, 'small');
      G.rect(px - 2, py + 140, 124, 20, P.gold); G.rect(px - 1, py + 141, 122, 18, P.ink);
      const nm = (f.name || '');
      G.text(nm, px + 4, py + 146, P.white, 'big');
      if (Math.floor(this.nameT * 2) % 2 === 0 && nm.length < 10) G.rect(px + 5 + G.textWidth(nm, 'big'), py + 145, 6, 9, P.gold);
      if (!nm.length) G.text('SHOWS AS YOU', px + 64, py + 164, P.slate, 'small', 'center');
      if (ui.button('RANDOM LOOK', px - 2, py + 174, 124, 18, { modal: true, theme: 'blue', id: 'prnd' })) { G.randomProfile(); changed = true; G.audio.sfx('chip'); }
      G.text('AT THE TABLE', px, py + 202, P.silver, 'small');
      G.youPlate(px - 2, py + 212, 124, 'YOUR STACK 1000', P.silver);
      // option rows
      const rx = x + 160, vw = w - 178;
      G.PROFILE_OPTS.forEach((o, i) => {
        const yy = y + 34 + i * 22;
        const cur = (f[o.key] || 0) % o.items.length;
        G.text(o.label, rx, yy + 6, P.silver, 'small');
        const ax = rx + 96, aw = vw - 96;
        G.rect(ax, yy, aw, 18, P.black); G.rect(ax + 1, yy + 1, aw - 2, 16, P.dusk);
        if (ui.button('<', ax, yy, 18, 18, { modal: true, theme: 'dark', id: 'pl' + i })) { f[o.key] = (cur + o.items.length - 1) % o.items.length; changed = true; G.audio.sfx('click'); }
        if (ui.button('>', ax + aw - 18, yy, 18, 18, { modal: true, theme: 'dark', id: 'pr' + i })) { f[o.key] = (cur + 1) % o.items.length; changed = true; G.audio.sfx('click'); }
        const label = (o.names ? o.names[cur] : o.items[cur]).toUpperCase();
        if (o.names) {
          const tw = G.textWidth(label, 'small') + 14, sx = ax + aw / 2 - tw / 2;
          G.rect(sx, yy + 5, 9, 8, P.black); G.rect(sx + 1, yy + 6, 7, 6, o.items[cur]);
          G.text(label, sx + 14, yy + 6, P.white, 'small');
        } else G.text(label, ax + aw / 2, yy + 6, P.white, 'small', 'center');
        G.text((cur + 1) + '/' + o.items.length, ax + aw - 22, yy + 6, P.slate, 'small', 'right');
      });
      if (changed) { G.resetAvatar('you'); G.saveSettings(); }
      if (ui.button('DONE', G.W / 2 - 50, y + h - 26, 100, 20, { modal: true, theme: 'green', key: ['Escape', 'Enter'], showKey: false })) { f.name = (f.name || '').trim(); G.saveSettings(); this.profileOpen = false; }
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
