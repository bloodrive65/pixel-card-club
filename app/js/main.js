// Pixel Card Club - scene manager, title menu, options, main loop
(function () {
  'use strict';
  G.VERSION = '1.7.4'; // keep in step with package.json and app/version.json
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
      if (G.updateReady) G.applyUpdate();
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
      if (G.portrait) this.framePortrait(dt); else {
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
        // phones / tablets: a Home Screen app is already full screen, so that slot opens your profile instead
        const fsApi = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
        const lastBtn = quitEnabled ? 'QUIT' : G.touch && (G.standalone || !fsApi) ? 'PROFILE' : 'FULLSCREEN';
        if (ui.button(lastBtn, fx + (bw + gap) * 3, fy, bw, 20, { key: quitEnabled ? 'q' : 'f', theme: 'dark' })) {
          if (quitEnabled) window.cardclubNative.quit();
          else if (lastBtn === 'PROFILE') { this.profileOpen = true; this.nameT = 0; }
          else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
          else if (fsApi) fsApi.call(document.documentElement);
        }
        G.text(G.touch ? pg.name + '  -  TAP A GAME TO PLAY  -  ' + (this.page ? 'TAP < FOR THE CLASSICS' : 'TAP > FOR MORE GAMES')
          : pg.name + '  -  PRESS 1 - ' + pg.games.length + ' TO PLAY  -  ' + (this.page ? '< OR TAB FOR THE CLASSICS' : '> OR TAB FOR MORE GAMES'), G.W / 2, 332, P.felt4, 'small', 'center');
        G.text('V' + G.VERSION, G.W - 8, G.H - 10, P.felt4, 'small', 'right')      }
      if (this.options) this.drawOptions();
      if (this.custom) this.drawCustomize();
      // your player badge (top left) opens the profile editor
      if (!this.options && !this.custom && !this.profileOpen) {
        const bx = 8, by = 8, bw = 132;
        const hov = G.inRect(G.input.x, G.input.y, bx, by, bw, 30);
        G.panel(bx, by, bw, 30, { fill: hov ? P.navy : P.ink, hi: hov ? P.gold : P.dusk, border: hov ? P.gold : P.black });
        G.drawAvatar('you', bx + 3, by + 3);
        G.text(G.playerName(), bx + 31, by + 6, hov ? P.gold : P.white, 'big');
        G.text(G.touch ? 'TAP TO EDIT' : 'EDIT PROFILE  P', bx + 31, by + 18, P.silver, 'small');
        if (hov) { ui.cursorHand = true; ui.hoverId = 'badge'; }
        if ((hov && G.input.pressed) || G.key('p')) { G.input.pressed = false; delete G.input.keyPressed.p; G.audio.sfx('click'); this.profileOpen = true; this.nameT = 0; }
      }
      if (this.profileOpen) this.drawProfile(dt);
    },
    // ---------- portrait (phone held upright): logo, page switch, the games as rows, buttons in a 2 x 2 grid ----------
    framePortrait(dt) {
      const bob = Math.round(Math.sin(this.t * 2) * 2), ly = 50;
      G.text('PIXEL', G.W / 2, ly + 2 + bob, P.ink, 'big', 'center', 3);
      G.text('PIXEL', G.W / 2, ly + bob, P.white, 'big', 'center', 3);
      G.text('CARD CLUB', G.W / 2 + 2, ly + 30 + bob, P.black, 'big', 'center', 4);
      G.text('CARD CLUB', G.W / 2, ly + 28 + bob, P.gold, 'big', 'center', 4);
      G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(0, ly + 28 + bob + 14, G.W, 14); G.ctx.clip();
      G.text('CARD CLUB', G.W / 2, ly + 28 + bob, '#e8a33a', 'big', 'center', 4);
      G.ctx.restore();
      [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, G.W / 2 - 34 + i * 18, ly + 67, 'big', s === 1 || s === 2 ? P.red : P.ink));
      [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, G.W / 2 - 34 + i * 18, ly + 66, 'big', s === 1 || s === 2 ? P.orange : P.white));
      const turn = (d) => { const np = Math.max(0, Math.min(PAGES.length - 1, (this.page || 0) + d)); if (np !== (this.page || 0)) { this.page = np; this.slide = 1; this.slideDir = d; G.audio.sfx('flip'); } };
      const pi = ui.choice(PAGES.map((p) => p.name), this.page || 0, 20, 132, G.W - 40, 28, { id: 'pgtab' });
      if (pi !== (this.page || 0)) turn(pi - (this.page || 0));
      if (!ui.modal && G.key('Tab')) { delete G.input.keyPressed.Tab; turn((this.page || 0) < PAGES.length - 1 ? 1 : -1); }
      const E = G.EX(), pg = PAGES[this.page || 0], n = pg.games.length, y0 = 172 + Math.round(E / 6), gap = 8;
      const rh = Math.min(n > 3 ? 100 : 124, Math.floor((314 + E * 0.6 - gap * (n - 1)) / n)), rw = G.W - 28, x0 = 14;
      this.slide = Math.max(0, (this.slide || 0) - dt * 6);
      const off = Math.round(this.slide * this.slide * 40 * (this.slideDir || 1));
      // a sideways swipe over the list also changes page
      const inp = G.input;
      if (inp.pressed && G.inRect(inp.x, inp.y, 0, y0, G.W, n * (rh + gap))) this.swipe = { x: inp.x, y: inp.y };
      if (this.swipe && inp.down && !ui.modal) { const dx = inp.x - this.swipe.x; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(inp.y - this.swipe.y) * 1.5) { turn(dx < 0 ? 1 : -1); this.swipe = null; this.swiped = true; } }
      if (!inp.down) this.swipe = null;
      pg.games.forEach((g, i) => {
        const x = x0 + off, y1 = y0 + i * (rh + gap);
        const hover = !ui.modal && G.inRect(inp.x, inp.y, x, y1, rw, rh);
        const y = y1 - (hover && !G.touch ? 1 : 0);
        G.panel(x, y, rw, rh, { fill: hover ? P.navy : P.ink, hi: hover ? P.gold : P.dusk, border: hover ? P.gold : P.black });
        const k = g.icon.length, fan = 14, cy = y + Math.round((rh - CH) / 2);
        g.icon.forEach(([r, s], j) => {
          const img = G.cardArt.faces[s + '_' + r], cx = x + 10 + j * fan;
          G.alpha(0.35, () => G.rect(cx + 2, cy + 2, CW - 1, CH - 2, P.black));
          G.ctx.drawImage(img, Math.round(cx), Math.round(cy - Math.abs(j - (k - 1) / 2) * 2));
        });
        const tx = x + 96, big = rh > 90;
        G.text(g.name, tx, y + (big ? 16 : 10), P.gold, 'big', 'left', 1, P.black);
        g.blurb.forEach((b, q) => G.text(b.toUpperCase(), tx, y + (big ? 34 : 25) + q * 10, P.silver, 'small'));
        if (ui.button('PLAY', tx, y + rh - 38, 120, 30, { key: g.key, theme: g.theme, id: 'play' + this.page + i })) G.go(g.scene());
        else if (hover && inp.released && !inp.moved && !this.swiped && !ui.blocked()) { G.audio.sfx('click'); G.go(g.scene()); }
      });
      if (!inp.down) this.swiped = false;
      const fy = 500 + E, bw = 162, fx = G.W / 2 - bw - 5, fh = 34, fp = 42;
      if (ui.button('OPTIONS', fx, fy, bw, fh, { key: 'o', theme: 'dark' })) this.options = true;
      if (ui.button('CUSTOMIZE', fx + bw + 10, fy, bw, fh, { key: 'c', theme: 'gold' })) this.custom = true;
      if (ui.button('RULEBOOK', fx, fy + fp, bw, fh, { key: 'r', theme: 'blue' })) G.Rulebook.open('contents', G.Menu);
      const quitEnabled = !!window.cardclubNative;
      const fsApi = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      const lastBtn = quitEnabled ? 'QUIT' : G.touch && (G.standalone || !fsApi) ? 'PROFILE' : 'FULLSCREEN';
      if (ui.button(lastBtn, fx + bw + 10, fy + fp, bw, fh, { key: quitEnabled ? 'q' : 'f', theme: 'dark' })) {
        if (quitEnabled) window.cardclubNative.quit();
        else if (lastBtn === 'PROFILE') { this.profileOpen = true; this.nameT = 0; }
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
        else if (fsApi) fsApi.call(document.documentElement);
      }
      G.text('TAP A GAME TO PLAY - SWIPE FOR MORE', G.W / 2, 588 + E, P.felt4, 'small', 'center');
      G.text('TURN SIDEWAYS FOR THE WIDE TABLE', G.W / 2, 600 + E, P.felt4, 'small', 'center');
      G.text('V' + G.VERSION, G.W - 8, G.H - 10, P.felt4, 'small', 'right');
    },
    // ---------- Profile: your name and look ----------
    drawProfile(dt) {
      ui.modal = true;
      G.alpha(0.6, () => G.rect(0, 0, G.W, G.H, P.ink));
      ui.block(0, 0, G.W, G.H);
      const PT = G.portrait, w = PT ? 344 : 520, h = PT ? 570 : 312, x = G.W / 2 - w / 2, y = PT ? 36 + Math.round(G.EX() / 2) : 24;
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
      // portrait: the name, random button and plate sit beside the avatar instead of under it
      const nx = PT ? px + 146 : px, ny = PT ? py - 130 : py, nw = PT ? 160 : 124;
      G.text(G.touch ? 'NAME - TAP TO TYPE' : 'NAME - JUST TYPE', nx, ny + 130, P.silver, 'small');
      // touch: tapping the name box brings up the on-screen keyboard
      // (iOS only opens the keyboard from inside a real tap, so the engine opens it on pointerup)
      if (G.touch) G.typer.zone = { x: nx - 2, y: ny + 138, w: nw, h: 24, t: performance.now(), value: () => f.name || '',
        set: (v) => { f.name = v.toUpperCase().replace(/[^A-Z0-9 .\-]/g, '').replace(/^ +/, '').slice(0, 10); G.saveSettings(); } };
      G.rect(nx - 2, ny + 140, nw, 20, P.gold); G.rect(nx - 1, ny + 141, nw - 2, 18, P.ink);
      const nm = (f.name || '');
      G.text(nm, nx + 4, ny + 146, P.white, 'big');
      if (Math.floor(this.nameT * 2) % 2 === 0 && nm.length < 10) G.rect(nx + 5 + G.textWidth(nm, 'big'), ny + 145, 6, 9, P.gold);
      if (!nm.length) G.text('SHOWS AS YOU', nx + nw / 2 + 2, ny + 164, P.slate, 'small', 'center');
      if (ui.button('RANDOM LOOK', nx - 2, ny + 172, nw, PT ? 26 : 18, { modal: true, theme: 'blue', id: 'prnd' })) { G.randomProfile(); changed = true; G.audio.sfx('chip'); }
      G.text('AT THE TABLE', nx, ny + 202, P.silver, 'small');
      G.youPlate(nx - 2, ny + 212, nw, 'YOUR STACK 1000', P.silver);
      // option rows
      const rx = PT ? x + 18 : x + 160, vw = PT ? w - 36 : w - 178;
      G.PROFILE_OPTS.forEach((o, i) => {
        // portrait rows are taller, with wide arrow buttons that are easy to hit
        const rhh = PT ? 26 : 18, ab = PT ? 40 : 18, ty = PT ? 10 : 6;
        const yy = (PT ? y + 162 : y + 34) + i * (PT ? 30 : 22);
        const cur = (f[o.key] || 0) % o.items.length;
        G.text(o.label, rx, yy + ty, P.silver, 'small');
        const ax = rx + (PT ? 78 : 96), aw = vw - (PT ? 78 : 96);
        G.rect(ax, yy, aw, rhh, P.black); G.rect(ax + 1, yy + 1, aw - 2, rhh - 2, P.dusk);
        if (ui.button('<', ax, yy, ab, rhh, { modal: true, theme: 'dark', id: 'pl' + i })) { f[o.key] = (cur + o.items.length - 1) % o.items.length; changed = true; G.audio.sfx('click'); }
        if (ui.button('>', ax + aw - ab, yy, ab, rhh, { modal: true, theme: 'dark', id: 'pr' + i })) { f[o.key] = (cur + 1) % o.items.length; changed = true; G.audio.sfx('click'); }
        const label = (o.names ? o.names[cur] : o.items[cur]).toUpperCase();
        if (o.names) {
          const tw = G.textWidth(label, 'small') + 14, sx = ax + aw / 2 - tw / 2;
          G.rect(sx, yy + ty - 1, 9, 8, P.black); G.rect(sx + 1, yy + ty, 7, 6, o.items[cur]);
          G.text(label, sx + 14, yy + ty, P.white, 'small');
        } else G.text(label, ax + aw / 2, yy + ty, P.white, 'small', 'center');
        if (!PT) G.text((cur + 1) + '/' + o.items.length, ax + aw - 22, yy + 6, P.slate, 'small', 'right');
      });
      if (changed) { G.resetAvatar('you'); G.saveSettings(); }
      if (ui.button('DONE', G.W / 2 - (PT ? 70 : 50), y + h - (PT ? 44 : 26), PT ? 140 : 100, PT ? 34 : 20, { modal: true, theme: 'green', key: ['Escape', 'Enter'], showKey: false })) { G.typer.close(); f.name = (f.name || '').trim(); G.saveSettings(); this.profileOpen = false; }
    },
    // ---------- Customize: TABLE tab (colour + surface) and CARDS tab (deck, card colour, back) ----------
    drawCustomize() {
      ui.modal = true;
      G.alpha(0.6, () => G.rect(0, 0, G.W, G.H, P.ink));
      ui.block(0, 0, G.W, G.H);
      const PT = G.portrait, w = PT ? 344 : 500, h = PT ? 580 : 300, x = G.W / 2 - w / 2, y = PT ? 30 + Math.round(G.EX() / 2) : 30;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
      G.text('CUSTOMIZE', G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
      const S = G.settings;
      const tab = ui.choice(['TABLE', 'CARDS'], this.cTab || 0, G.W / 2 - (PT ? 120 : 100), y + 26, PT ? 240 : 200, PT ? 26 : 18, { modal: true, id: 'ctab' });
      if (tab !== (this.cTab || 0)) { this.cTab = tab; G.audio.sfx('click'); }
      const smooth = G.ctx.imageSmoothingEnabled;
      if (!this.cTab) {
        // table colours
        G.text('TABLE COLOUR', x + 18, y + (PT ? 58 : 56), P.silver, 'small');
        G.TABLES.forEach((t, i) => {
          const sx = x + (PT ? 56 : 18) + (i % 3) * 78, sy = y + 66 + Math.floor(i / 3) * 32;
          const sel = (S.table || 0) === i;
          const hover = G.inRect(G.input.x, G.input.y, sx, sy, 72, 28);
          G.rect(sx, sy, 72, 28, sel ? P.gold : hover ? P.white : P.black);
          G.rect(sx + 2, sy + 2, 68, 14, t.f[2]);
          for (let k = 0; k < 5; k++) G.rect(sx + 2 + k * 13.6, sy + 13, 13.6, 3, t.f[k]);
          G.rect(sx + 2, sy + 16, 68, 10, sel ? P.gold : P.dusk);
          G.text(t.name, sx + 36, sy + 18, sel ? P.ink : P.white, 'small', 'center');
          if (hover) { ui.hoverId = 'tbl' + i; }
          if (hover && G.input.pressed) { G.input.pressed = false; S.table = i; G.applyTable(i); G.saveSettings(); G.audio.sfx('click'); }
        });
        // surfaces
        G.text('SURFACE', x + 18, y + 170, P.silver, 'small');
        G.SURFACES.forEach((name, i) => {
          const bx = x + (PT ? 56 : 18) + (i % 3) * 78, by = y + 180 + Math.floor(i / 3) * (PT ? 32 : 24);
          const sel = (S.surface || 0) === i;
          if (ui.button(name, bx, by, 72, PT ? 28 : 20, { modal: true, theme: sel ? 'gold' : 'dark', selected: sel, font: 'small', id: 'surf' + i }) && !sel) {
            S.surface = i; G.applySurface(); G.saveSettings(); G.audio.sfx('click');
          }
        });
        if (S.surface === 3) G.text('WOOD IGNORES THE TABLE COLOUR', x + 18, y + (PT ? 246 : 234), P.slate, 'small');
        // preview: the whole table, shrunk down
        const ph = PT ? 236 : Math.round(220 * G.SH / G.SW), pw = PT ? Math.round(ph * G.SW / G.SH) : 220;
        const px = PT ? Math.round(G.W / 2 - pw / 2) : x + 262, py = PT ? y + 270 : y + 66;
        G.text('PREVIEW', px, py - 10, P.silver, 'small');
        G.ctx.imageSmoothingEnabled = false;
        G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(px, py, pw, ph); G.ctx.clip();
        G.ctx.drawImage(G.ui.feltCanvas(), 0, 0, G.SW, G.SH, px, py, pw, ph);
        const k = pw / G.SW, cw = Math.round(G.CW * k * 1.4), ch = Math.round(G.CH * k * 1.4);
        const mx = px + pw / 2, my = py + ph / 2;
        [['0_1', -2.2], ['1_13', -1.1], ['2_12', 0], ['3_11', 1.1]].forEach(([f, o], i) => G.ctx.drawImage(G.cardArt.faces[f], Math.round(mx + o * cw * 0.8 - cw / 2 + cw * 0.5), Math.round(my - ch * 1.05), cw, ch));
        for (let i = 0; i < 3; i++) G.ctx.drawImage(G.backImg(), Math.round(mx - cw * 1.6 + i * cw * 0.9), Math.round(my + ch * 0.15), cw, ch);
        G.ctx.drawImage(G.cardArt.faces['1_1'], Math.round(mx + cw * 1.3), Math.round(my + ch * 0.15), cw, ch);
        G.ctx.restore();
        G.ctx.imageSmoothingEnabled = smooth;
        G.outline(px - 1, py - 1, pw + 2, ph + 2, P.black);
        G.text('SAVED FOR EVERY GAME', px + pw / 2, py + ph + 10, P.slate, 'small', 'center');
      } else {
        // deck style
        G.text('DECK', x + 18, y + 56, P.silver, 'small');
        G.DECKS.forEach((d, i) => {
          const bx = x + (PT ? 55 : 18) + (i % 2) * 117, by = y + 66 + Math.floor(i / 2) * (PT ? 32 : 24);
          const sel = (G.deckIndex || 0) === i;
          if (ui.button(d.name, bx, by, 111, PT ? 28 : 20, { modal: true, theme: sel ? 'gold' : 'dark', selected: sel, font: 'small', id: 'deck' + i }) && !sel) {
            G.applyDeck(i); G.saveSettings(); G.audio.sfx('shuffle');
          }
        });
        // card colour (paper) for decks that allow it
        const cy0 = y + 66 + Math.ceil(G.DECKS.length / 2) * (PT ? 32 : 24) + 8;
        G.text('CARD COLOUR', x + 18, cy0, P.silver, 'small');
        if (G.cardArt.custom) G.text('A CUSTOM CARD SHEET IS IN USE', x + 18, cy0 + 14, P.orange, 'small');
        else if (!G.deckTintable()) G.text('THIS DECK HAS ITS OWN COLOURS', x + 18, cy0 + 14, P.slate, 'small');
        else G.CARD_COLOURS.forEach((cc, i) => {
          const ch = PT ? 26 : 18, sx = x + (PT ? 56 : 18) + (i % 3) * 78, sy = cy0 + 9 + Math.floor(i / 3) * (PT ? 30 : 21);
          const sel = (S.cardColour || 0) === i;
          const hover = G.inRect(G.input.x, G.input.y, sx, sy, 72, ch);
          G.rect(sx, sy, 72, ch, sel ? P.gold : hover ? P.white : P.black);
          G.rect(sx + 2, sy + 2, 68, ch - 4, cc.paper); G.rect(sx + 2, sy + ch - 5, 68, 3, cc.edge);
          G.text(cc.name, sx + 36, sy + (PT ? 8 : 5), P.ink, 'small', 'center');
          if (hover) ui.hoverId = 'cc' + i;
          if (hover && G.input.pressed && !sel) { G.input.pressed = false; S.cardColour = i; G.rebuildDeck(); G.saveSettings(); G.audio.sfx('chip'); }
        });
        // preview: a fan of court cards and aces on your table
        const px = PT ? x + 18 : x + 262, py = PT ? cy0 + 74 : y + 56, pw = PT ? w - 36 : 220, ph = PT ? 108 : 112;
        G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(px, py, pw, ph); G.ctx.clip();
        G.ctx.drawImage(G.ui.feltCanvas(), 210 + G.ox, 80 + G.oy, pw, ph, px, py, pw, ph);
        ['0_1', '1_13', '2_12', '3_11', '1_1', '2_10'].forEach((f, i) => G.ctx.drawImage(G.cardArt.faces[f], px + (PT ? 22 : 8) + i * (PT ? 46 : 34), py + (i % 2 ? (PT ? 40 : 46) : (PT ? 6 : 8))));
        G.ctx.restore();
        G.outline(px - 1, py - 1, pw + 2, ph + 2, P.black);
        // card backs
        const bky = PT ? py + ph + 14 : y + 176;
        G.text('CARD BACK', x + 18, bky, P.silver, 'small');
        const names = G.backNames();
        names.forEach((name, i) => {
          const bx = PT ? x + 28 + (i % 5) * 58 : x + 18 + i * 58, by = PT ? bky + 8 + Math.floor(i / 5) * 84 : y + 186;
          const sel = S.back === i;
          const hover = G.inRect(G.input.x, G.input.y, bx, by, 50, 80);
          G.rect(bx, by, 50, 80, sel ? P.gold : hover ? P.white : P.black);
          G.rect(bx + 1, by + 1, 48, 78, P.ink);
          G.ctx.drawImage(G.cardArt.backs[i % G.cardArt.backs.length], bx + 3, by + 3);
          G.text(name.toUpperCase().slice(0, 8), bx + 25, by + 69, sel ? P.gold : P.silver, 'small', 'center');
          if (hover) ui.hoverId = 'bk' + i;
          if (hover && G.input.pressed) { G.input.pressed = false; S.back = i; G.saveSettings(); G.audio.sfx('chip'); }
        });
      }
      if (ui.button('DONE', G.W / 2 - (PT ? 70 : 50), y + h - (PT ? 44 : 26), PT ? 140 : 100, PT ? 34 : 20, { modal: true, theme: 'green', key: ['Escape', 'Enter'], showKey: false })) this.custom = false;
    },
    drawOptions() {
      ui.modal = true;
      G.alpha(0.7, () => G.rect(0, 0, G.W, G.H, P.ink));
      ui.block(0, 0, G.W, G.H);
      const PT = G.portrait, ch = PT ? 30 : 18, pitch = PT ? 40 : 26;
      const w = Math.min(380, G.W - 12), h = PT ? 34 + pitch * 6 + 50 : 256, x = G.W / 2 - w / 2, y = PT ? Math.round(G.H / 2 - h / 2) : 52;
      G.panel(x, y, w, h, { fill: P.ink, hi: P.dusk, accent: P.gold });
      G.text('OPTIONS', G.W / 2, y + 12, P.gold, 'big', 'center', 1, P.black);
      const S = G.settings; let changed = false;
      const row = (label, yy) => G.text(label, x + (PT ? 12 : 18), yy + (PT ? 12 : 7), P.silver, 'small');
      const ox2 = PT ? 120 : 150; // where the choices start
      let yy = y + 34;
      row('SOUND', yy);
      const snd = ui.choice(['ON', 'OFF'], S.sound ? 0 : 1, x + ox2, yy, w - ox2 - (PT ? 8 : 18), ch, { modal: true, id: 'snd' });
      if ((snd === 0) !== S.sound) { S.sound = snd === 0; changed = true; }
      yy += pitch; row('SCALING', yy);
      const sc = ui.choice(['PIXEL PERFECT', 'FILL WINDOW'], S.pixelPerfect ? 0 : 1, x + ox2, yy, w - ox2 - (PT ? 8 : 18), ch, { modal: true, id: 'sc', font: 'small' });
      if ((sc === 0) !== S.pixelPerfect) { S.pixelPerfect = sc === 0; G.resize(); changed = true; }
      yy += pitch; row('SOLITAIRE DRAW', yy);
      const dr = ui.choice(['DRAW 1', 'DRAW 3'], S.drawThree ? 1 : 0, x + ox2, yy, w - ox2 - (PT ? 8 : 18), ch, { modal: true, id: 'dr', font: 'small' });
      if ((dr === 1) !== S.drawThree) { S.drawThree = dr === 1; changed = true; }
      yy += pitch; row('BLACKJACK DECKS', yy);
      const deckOpts = [1, 2, 4, 6];
      const dk = ui.choice(deckOpts.map(String), Math.max(0, deckOpts.indexOf(S.bjDecks)), x + ox2, yy, w - ox2 - (PT ? 8 : 18), ch, { modal: true, id: 'dk' });
      if (deckOpts[dk] !== S.bjDecks) { S.bjDecks = deckOpts[dk]; changed = true; }
      yy += pitch; row('WHEN YOU ARE OUT', yy);
      const wo = ui.choice(['STOP', 'WATCH TO THE END'], S.watchOut ? 1 : 0, x + ox2, yy, w - ox2 - (PT ? 8 : 18), ch, { modal: true, id: 'wo', font: 'small' });
      if ((wo === 1) !== !!S.watchOut) { S.watchOut = wo === 1; changed = true; }
      yy += pitch; row('RESET STATS', yy);
      if (ui.button('RESET CHIPS + WINS', x + ox2, yy, w - ox2 - (PT ? 8 : 18), ch, { modal: true, theme: 'red', font: 'small' })) {
        ['bj_chips', 'bj_best', 'sol_won', 'sol_played', 'sol_best', 'fish_won', 'fish_played', 'records', 'bj_mates', 'war_won', 'war_played', 'c8_won', 'c8_played', 'spider_won', 'spider_played', 'spider_best1', 'spider_best2', 'spider_best4', 'poker_won', 'poker_played'].forEach((k) => G.store.set(k, null));
        G.floatText('STATS RESET', G.W / 2, y + h - 40, P.orange, 'small');
      }
      if (changed) { G.saveSettings(); G.audio.sfx('click'); }
      if (ui.button('DONE', G.W / 2 - (PT ? 70 : 50), y + h - (PT ? 44 : 28), PT ? 140 : 100, PT ? 34 : 20, { modal: true, theme: 'green', key: ['Escape', 'Enter'], showKey: false })) this.options = false;
    }
  });

  // ---------- Updates (web version) ----------
  // Checks app/version.json (never cached) when the game opens and whenever you come back to it.
  // A newer version reloads the page right away on the main menu, or the next time you return to the menu.
  G.updateReady = false;
  G.watchForUpdates = () => {
    if (window.cardclubNative || !location.protocol.startsWith('http')) return;
    let lastCheck = 0;
    const check = () => {
      if (Date.now() - lastCheck < 30000) return; lastCheck = Date.now();
      fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((j) => {
        if (!j || !j.version || j.version === G.VERSION) return;
        try { if (sessionStorage.getItem('pcc_reloaded_for') === j.version) return; sessionStorage.setItem('pcc_reloaded_for', j.version); } catch (_) {}
        G.updateReady = true; G.applyUpdate();
      }).catch(() => {});
    };
    check();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    addEventListener('focus', check); addEventListener('pageshow', check);
    setInterval(check, 5 * 60 * 1000);
  };
  G.applyUpdate = () => {
    if (!G.updateReady || G.scene !== Menu || Menu.profileOpen || Menu.options || Menu.custom) return;
    G.updateReady = false;
    const go = () => location.reload();
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then((reg) => (reg ? reg.update().catch(() => {}) : null)).then(go, go);
    } else go();
  };

  // ---------- Splash: the developer card, shown for a moment when the game opens ----------
  const logo = new Image();
  logo.src = 'assets/brand/bloodrive65.png';
  const Splash = (G.Splash = {
    enter() { this.t = 0; },
    frame(dt) {
      this.t += dt;
      const T = 1.8, t = this.t;
      G.rect(0, 0, G.W, G.H, '#050506');
      const a = Math.min(1, t / 0.3, Math.max(0, (T - t) / 0.35));
      G.alpha(a, () => {
        const s = 2, lw = 80 * s, lx = G.W / 2 - lw / 2, ly = G.portrait ? Math.round(G.H / 2 - 120) : 52;
        if (logo.complete && logo.naturalWidth) { const sm = G.ctx.imageSmoothingEnabled; G.ctx.imageSmoothingEnabled = false; G.ctx.drawImage(logo, lx, ly, lw, lw); G.ctx.imageSmoothingEnabled = sm; }
        G.text('BLOODRIVE65', G.W / 2, ly + lw + 14, '#a3141c', 'big', 'center', 2, '#2a0507');
        G.text('PRESENTS', G.W / 2, ly + lw + 38, '#8a7a72', 'small', 'center');
      });
      // a tap, click or key skips it
      if (t > 0.25 && (G.input.pressed || Object.keys(G.input.keyPressed).length)) { G.input.pressed = false; G.input.keyPressed = {}; G.go(Menu); return; }
      if (t >= T) G.go(Menu);
    }
  });

  // ---------- Boot ----------
  function boot() {
    const saved = G.store.get('settings', null);
    if (saved) Object.assign(G.settings, saved);
    G.watchForUpdates();
    // 1.6.2: FILL WINDOW became the default screen mode (it now fills the window with no border)
    if (saved && saved.fitV !== 2) { G.settings.pixelPerfect = false; G.settings.fitV = 2; G.store.set('settings', G.settings); }
    G.resize();
    G.applyTable(G.settings.table || 0);
    G.initCardArt(() => {
      G.go(Splash);
      let last = performance.now();
      function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        ui.begin();
        G.beginFrame();
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
