// Pixel Card Club - the Club roster: 18 computer players, pixel portraits, mini card sprites, roster picker
(function () {
  'use strict';
  const P = G.P, ui = G.ui, input = G.input;
  const SK = { a: '#f2c79a', b: '#e0a878', c: '#c68a5e', d: '#8f5b3c', e: '#5e3a26', robot: '#94b0c2' };

  // skill: 0 easy, 1 normal, 2 hard. fish = Go Fish habits, bj = Blackjack style, bet = bet size
  const R = [
    { id: 'lou', name: 'LUCKY LOU', skill: 0, bg: P.navy, skin: SK.a, hair: ['short', P.wood2], hat: ['cap', P.red], shirt: P.blue, acc: [], fish: { rank: 'random', target: 'random' }, bj: 'hunch', bet: 'mid', quote: 'Feelin lucky tonight!', lines: { fish: ['NOPE! GO FISH!', 'NOT TODAY, PAL!'], book: ['LUCKY ME!'], win: ['TOLD YOU I WAS LUCKY!'], lose: ['LUCK RAN DRY...'], bust: ['AW SHUCKS!'] } },
    { id: 'mavis', name: 'MAVIS', skill: 1, bg: P.plum, skin: SK.b, hair: ['long', P.ink], shirt: '#8a4f9e', acc: ['glasses'], fish: { rank: 'random', target: 'mostCards' }, bj: 'basic', bet: 'low', quote: 'I read the rules twice.', lines: { fish: ['GO FISH, DEAR.'], book: ['BY THE BOOK!'], win: ['STUDY PAYS OFF.'], lose: ['MOST IRREGULAR.'], bust: ['OH, BOTHER.'] } },
    { id: 'rico', name: 'RICO', skill: 2, bg: P.teal, skin: SK.c, hair: ['short', P.ink], hat: ['cowboy', P.gold], shirt: P.green, acc: ['mustache'], fish: { rank: 'most', target: 'mostCards' }, bj: 'basic', bet: 'high', quote: 'I never forget a card.', lines: { fish: ['GO FISH, AMIGO.'], book: ['ANOTHER ONE!'], win: ['GG, AMIGO.'], lose: ['NEXT TIME...'], bust: ['AY, NO!'] } },
    { id: 'doc', name: 'DOC', skill: 2, bg: '#2b4a5a', skin: SK.a, hair: ['bald', P.silver], shirt: P.white, acc: ['monocle', 'beard:#c9d2da'], fish: { rank: 'most', target: 'mostCards' }, bj: 'basic', bet: 'mid', quote: 'Probability is my bedside manner.', lines: { fish: ['NEGATIVE. GO FISH.'], book: ['AS CALCULATED.'], win: ['THE ODDS AGREED.'], lose: ['AN OUTLIER.'], bust: ['STATISTICALLY RUDE.'] } },
    { id: 'pixie', name: 'PIXIE', skill: 0, bg: '#6e2b62', skin: SK.a, hair: ['spiky', '#ff77c8'], shirt: P.cyan, acc: ['freckles'], fish: { rank: 'random', target: 'random' }, bj: 'reckless', bet: 'mid', quote: 'Rules are more like suggestions.', lines: { fish: ['HEHE, GO FISH!'], book: ['YAY! SPARKLY!'], win: ['WHEEE!'], lose: ['BOOO!'], bust: ['OOPSIE!'] } },
    { id: 'tank', name: 'TANK', skill: 1, bg: P.dusk, skin: SK.d, hair: ['mohawk', P.lime], shirt: P.ink, acc: ['shades'], fish: { rank: 'most', target: 'leader' }, bj: 'reckless', bet: 'high', quote: 'Go big or go home.', lines: { fish: ['DENIED. GO FISH.'], book: ['BOOM!'], win: ['CRUSHED IT!'], lose: ['GRR.'], bust: ['TOO BIG!'] } },
    { id: 'granny', name: 'GRANNY JO', skill: 2, bg: '#4a3a5a', skin: SK.a, hair: ['bun', '#d8dde2'], shirt: '#b48ac9', acc: ['glasses'], fish: { rank: 'most', target: 'human' }, bj: 'cautious', bet: 'low', quote: 'Playing since before you were born.', lines: { fish: ['GO FISH, SWEETIE.'], book: ['THERE WE ARE.'], win: ['GRANNY STILL GOT IT.'], lose: ['WELL PLAYED, DEAR.'], bust: ['OH MY STARS.'] } },
    { id: 'ziggy', name: 'ZIGGY', skill: 0, bg: '#5a3a1e', skin: SK.e, hair: ['afro', P.ink], hat: ['headband', P.orange], shirt: P.orange, acc: [], fish: { rank: 'random', target: 'random' }, bj: 'hunch', bet: 'low', quote: 'Just vibing with the deck.', lines: { fish: ['NAH MAN, GO FISH.'], book: ['GROOVY!'], win: ['FAR OUT!'], lose: ['BUMMER.'], bust: ['HEAVY.'] } },
    { id: 'viper', name: 'VIPER', skill: 2, bg: P.ink, skin: SK.b, hair: ['slick', P.ink], shirt: '#2a2a3a', acc: ['shades', 'earring'], fish: { rank: 'most', target: 'leader' }, bj: 'basic', bet: 'high', quote: 'I see everything.', lines: { fish: ['GO. FISH.'], book: ['TOO EASY.'], win: ['PREDICTABLE.'], lose: ['...HM.'], bust: ['TCH.'] } },
    { id: 'bubba', name: 'BUBBA', skill: 0, bg: '#5a3222', skin: SK.a, hair: ['short', P.wood2], hat: ['cowboy', P.wood1], shirt: P.red, acc: ['beard:#7a4a2e'], fish: { rank: 'random', target: 'random' }, bj: 'dealer', bet: 'mid', quote: 'Same as the dealer does it.', lines: { fish: ['GO ON AND FISH.'], book: ['YEEHAW!'], win: ['WELL HOT DOG!'], lose: ['DANG IT.'], bust: ['DAGNABBIT!'] } },
    { id: 'finn', name: 'CAPT FINN', skill: 1, bg: '#1e3a5a', skin: SK.b, hair: ['short', P.white], hat: ['captain', P.navy], shirt: P.navy, acc: ['beard:#f4f4f4', 'eyepatch'], fish: { rank: 'most', target: 'random' }, bj: 'reckless', bet: 'mid', quote: 'Arr, I invented this game.', lines: { fish: ['ARR! GO FISH!'], book: ['A FINE CATCH!'], win: ['TREASURE!'], lose: ['SUNK...'], bust: ['MAN OVERBOARD!'] } },
    { id: 'nova', name: 'NOVA', skill: 1, bg: '#2b5a3a', skin: SK.c, hair: ['pony', P.gold], hat: ['visor', P.white], shirt: P.lime, acc: [], fish: { rank: 'random', target: 'mostCards' }, bj: 'basic', bet: 'mid', quote: 'Speedrunning this table.', lines: { fish: ['GO FISH! NEXT!'], book: ['PB!'], win: ['NEW RECORD!'], lose: ['RESET...'], bust: ['MISSED THE TRICK!'] } },
    { id: 'duke', name: 'THE DUKE', skill: 2, bg: '#3a1a40', skin: SK.a, hair: ['short', P.silver], hat: ['top', P.ink], shirt: P.plum, acc: ['mustache:#d8dde2', 'monocle'], fish: { rank: 'most', target: 'leader' }, bj: 'cautious', bet: 'high', quote: 'One plays for honour, of course.', lines: { fish: ['GO FISH, PEASANT.'], book: ['SPLENDID.'], win: ['QUITE RIGHT.'], lose: ['HOW DREADFUL.'], bust: ['GOOD HEAVENS.'] } },
    { id: 'mimi', name: 'MIMI', skill: 0, bg: '#7a2a40', skin: SK.a, hair: ['bob', P.orange], shirt: '#ff77a8', acc: ['rose'], fish: { rank: 'random', target: 'human' }, bj: 'hunch', bet: 'low', quote: 'Is this the fishing one?', lines: { fish: ['GO FISHY!'], book: ['OOH, PRETTY!'], win: ['I WON? I WON!'], lose: ['AWW.'], bust: ['UH OH!'] } },
    { id: 'sarge', name: 'SARGE', skill: 1, bg: '#3a4a2a', skin: SK.c, hair: ['short', P.wood1], hat: ['beret', '#4b6b3a'], shirt: '#5f7a3c', acc: ['mustache:#5a3222'], fish: { rank: 'most', target: 'mostCards' }, bj: 'dealer', bet: 'mid', quote: 'Follow the procedure. Every time.', lines: { fish: ['NEGATIVE! GO FISH!'], book: ['MISSION COMPLETE.'], win: ['HOOAH!'], lose: ['REGROUP!'], bust: ['ABORT!'] } },
    { id: 'kai', name: 'KAI', skill: 1, bg: '#29366f', skin: SK.b, hair: ['short', P.ink], hat: ['beanie', P.sky], shirt: P.slate, acc: ['earring'], fish: { rank: 'random', target: 'mostCards' }, bj: 'cautious', bet: 'low', quote: 'Slow and steady.', lines: { fish: ['SORRY. GO FISH.'], book: ['NICE.'], win: ['CHILL WIN.'], lose: ['ALL GOOD.'], bust: ['WHOOPS.'] } },
    { id: 'rosa', name: 'ROSA', skill: 2, bg: '#5a1e2e', skin: SK.c, hair: ['long', '#3a1a1a'], shirt: P.red, acc: ['rose', 'earring'], fish: { rank: 'most', target: 'human' }, bj: 'basic', bet: 'high', quote: 'I remember who asked for what.', lines: { fish: ['GO FISH, CARINO.'], book: ['MINE.'], win: ['OLE!'], lose: ['BIEN JUGADO.'], bust: ['AY!'] } },
    { id: 'byte', name: 'BYTE', skill: 2, bg: '#1e2a3a', skin: SK.robot, hair: ['robot', P.silver], shirt: P.slate, acc: ['robot'], fish: { rank: 'most', target: 'mostCards', perfect: true }, bj: 'basic', bet: 'mid', quote: 'BEEP. MEMORY 100 PERCENT.', lines: { fish: ['QUERY DENIED. GO FISH.'], book: ['SET COMPLETE.'], win: ['VICTORY.EXE'], lose: ['ERROR 404: WIN'], bust: ['OVERFLOW!'] } }
  ];
  G.ROSTER = R;
  // ---------- Blackjack temper: how each member bets and plays as the night goes on ----------
  // press: bet grows this much per win in a streak. chase: bet grows (or shrinks if negative) per loss in a streak.
  // nerve: steady (mood never changes play), hothead (losing makes them reckless), jittery (losing makes them timid),
  //        confident (winning makes them bolder). kelly: bets a fixed share of the stack.
  const TEMPER = {
    lou: { press: 0.5, chase: 0.35, nerve: 'hothead', bets: 'Rides a hot streak, chases losses' },
    mavis: { press: 0.25, chase: -0.2, nerve: 'jittery', bets: 'Small raises, pulls back fast' },
    rico: { press: 0.5, chase: -0.15, nerve: 'steady', bets: 'Presses wins, trims losses' },
    doc: { press: 0, chase: 0, nerve: 'steady', bets: 'Flat bets, every hand' },
    pixie: { press: 0.5, chase: 0.5, nerve: 'hothead', bets: 'Up when winning, up when losing' },
    tank: { press: 0.5, chase: 0.75, nerve: 'hothead', bets: 'Doubles down on bad luck' },
    granny: { press: 0.2, chase: -0.25, nerve: 'steady', bets: 'Careful, shrinks bets when cold' },
    ziggy: { press: 0.25, chase: 0.25, nerve: 'steady', bets: 'Drifts with the vibe' },
    viper: { press: 1, chase: -0.25, nerve: 'steady', bets: 'Presses hard on a streak' },
    bubba: { press: 0.25, chase: 0.25, nerve: 'hothead', bets: 'Gets stubborn when losing' },
    finn: { press: 0.5, chase: 0.5, nerve: 'confident', bets: 'Bold on a streak, chases treasure' },
    nova: { press: 0.5, chase: 0, nerve: 'confident', bets: 'Speeds up on a hot streak' },
    duke: { press: 0.25, chase: 0.5, nerve: 'hothead', bets: 'Wounded pride raises the stakes' },
    mimi: { press: 0.25, chase: -0.25, nerve: 'jittery', bets: 'Gets nervous after losses' },
    sarge: { press: 0, chase: 0, nerve: 'steady', bets: 'Flat bets, by procedure' },
    kai: { press: 0.1, chase: -0.3, nerve: 'jittery', bets: 'Steady, backs off when cold' },
    rosa: { press: 0.5, chase: 0.25, nerve: 'confident', bets: 'Presses wins, never backs down' },
    byte: { press: 0, chase: 0, nerve: 'steady', kelly: 0.03, bets: 'Bets 3 percent of its stack' }
  };
  // personal lines for streaks
  const MOOD_LINES = {
    lou: { hot: ['LADY LUCK LOVES ME!', 'CANT LOSE TONIGHT!'], cold: ['THIS SUCKS.', 'WHO JINXED ME?'] },
    mavis: { hot: ['THE BOOK WORKS!'], cold: ['THIS IS MOST UNFAIR.', 'I NEED A TEA.'] },
    rico: { hot: ['THE CARDS LOVE RICO.'], cold: ['THIS SHOE IS CURSED.'] },
    doc: { hot: ['VARIANCE, IN MY FAVOUR.'], cold: ['A NEGATIVE SAMPLE. FINE.'] },
    pixie: { hot: ['SPARKLE STREAK!'], cold: ['THIS SUCKS! BOOO!', 'UGH, NO FAIR!'] },
    tank: { hot: ['UNSTOPPABLE!', 'FEED ME CHIPS!'], cold: ['THIS SUCKS.', 'I WILL BREAK THIS TABLE.'] },
    granny: { hot: ['GRANNY IS ON A ROLL.'], cold: ['IN MY DAY CARDS WERE KINDER.'] },
    ziggy: { hot: ['THE VIBES ARE IMMACULATE.'], cold: ['BAD VIBES, MAN.', 'THIS KINDA SUCKS, DUDE.'] },
    viper: { hot: ['I SAW THIS COMING.'], cold: ['...THIS IS IRRITATING.'] },
    bubba: { hot: ['HOT DIGGITY!'], cold: ['THIS DANG SHOE.', 'WELL THIS JUST STINKS.'] },
    finn: { hot: ['FULL SAIL, LADS!'], cold: ['ROUGH SEAS, ROUGH SEAS.'] },
    nova: { hot: ['NEW PB INCOMING!', 'ON PACE!'], cold: ['THIS RUN IS DEAD.', 'BAD RNG.'] },
    duke: { hot: ['AS IS MY BIRTHRIGHT.'], cold: ['THIS IS BENEATH ME.', 'AN OUTRAGE.'] },
    mimi: { hot: ['IM GOOD AT THIS?!'], cold: ['THIS SUCKS...', 'WHY DO I KEEP LOSING?'] },
    sarge: { hot: ['OUTSTANDING!'], cold: ['EMBRACE THE SUCK.', 'THIS IS A CLUSTER.'] },
    kai: { hot: ['RIDING THE WAVE.'], cold: ['NOT MY NIGHT.', 'OKAY, THIS SUCKS.'] },
    rosa: { hot: ['MI RACHA!', 'KEEP THEM COMING.'], cold: ['QUE MALA SUERTE.'] },
    byte: { hot: ['WIN STREAK DETECTED.'], cold: ['THIS OUTCOME SUCKS.EXE', 'RECALIBRATING.'] }
  };
  // Texas Hold'em style: shark (tight-aggressive), lag (loose-aggressive), rock (tight-passive),
  // station (calls too much), maniac (raises everything), wild (changes every hand)
  const POKER = { lou: 'wild', mavis: 'rock', rico: 'shark', doc: 'shark', pixie: 'maniac', tank: 'maniac', granny: 'rock', ziggy: 'station', viper: 'shark', bubba: 'station', finn: 'maniac', nova: 'lag', duke: 'rock', mimi: 'wild', sarge: 'rock', kai: 'station', rosa: 'lag', byte: 'shark' };
  G.POKER_STYLE = { shark: 'Tight and aggressive, reads pot odds', lag: 'Plays many hands, bets them hard', rock: 'Only plays strong hands', station: 'Calls almost anything', maniac: 'Raises and bluffs constantly', wild: 'Changes gear every hand' };
  for (const c of R) { c.temper = TEMPER[c.id]; c.poker = POKER[c.id]; Object.assign(c.lines, MOOD_LINES[c.id]); }
  G.NERVE = { steady: 'Plays the same win or lose', hothead: 'Gets reckless when losing', jittery: 'Gets timid when losing', confident: 'Gets bolder when winning' };
  G.char = (id) => R.find((c) => c.id === id) || R[0];
  G.SKILL_NAMES = ['EASY', 'NORMAL', 'HARD'];
  G.BJ_STYLE = { basic: 'Plays perfect basic strategy', cautious: 'Stands on 12 or more', reckless: 'Hits to 18, loves to double', dealer: 'Copies the dealer: hits to 17', hunch: 'Plays on gut feeling' };
  G.FISH_STYLE = (c) => {
    if (c.fish.perfect) return 'Remembers every card it hears';
    return ['Asks at random, forgets everything', 'Remembers some asks, slowly forgets', 'Remembers every ask, give and miss'][c.skill];
  };
  // ---------- form: how sharp a member plays this particular game ----------
  // A member's skill is only their usual level. Each game rolls their form for the night,
  // so an easy player can have a sharp night and a shark can play a sloppy one.
  const FORM_ODDS = [[0.6, 0.3, 0.1], [0.25, 0.5, 0.25], [0.1, 0.3, 0.6]];
  G.rollForm = (ch) => {
    const o = FORM_ODDS[ch.skill] || FORM_ODDS[1];
    let r = Math.random();
    for (let i = 0; i < 3; i++) { r -= o[i]; if (r < 0) return i; }
    return ch.skill;
  };
  G.FORM_NAMES = ['OFF NIGHT', 'STEADY', 'SHARP'];
  G.formNote = (p) => {
    const d = p.form - p.ch.skill;
    if (d > 0) return p.name + (d > 1 ? ' is red hot tonight.' : ' looks sharp tonight.');
    if (d < 0) return p.name + (d < -1 ? ' looks lost tonight.' : ' seems off their game tonight.');
    return null;
  };
  // roll form for every Club member at the table; log(text) gets the notable ones
  G.rollForms = (players, log) => {
    for (const p of players) {
      if (p.human || !p.ch) continue;
      p.form = G.rollForm(p.ch);
      const n = G.formNote(p);
      if (n && log) log(n);
    }
  };
  G.say = (c, kind) => (c.lines[kind] ? G.pick(c.lines[kind]) : null);

  // ---------- pixel portrait 24x24 ----------
  const cache = {};
  G.avatar = (id) => {
    if (cache[id]) return cache[id];
    const c = id === 'you' ? G.profileChar() : G.char(id);
    const [cv, x] = G.makeCanvas(24, 24);
    const r = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const [hs, hc] = c.hair;
    r(0, 0, 24, 24, c.bg);
    // dithered background corner
    for (let yy = 0; yy < 24; yy++) for (let xx = 0; xx < 24; xx++) if ((xx + yy) % 4 === 0 && yy > 14) r(xx, yy, 1, 1, P.black + '30');
    // hair behind head
    if (hs === 'long') { r(5, 6, 14, 16, hc); }
    if (hs === 'afro') { r(3, 1, 18, 15, hc); r(4, 0, 16, 1, hc); }
    if (hs === 'bob') { r(5, 5, 14, 11, hc); }
    // body
    r(3, 19, 18, 5, c.shirt); r(5, 18, 14, 1, c.shirt);
    if (c.shirt === P.white) { r(11, 18, 2, 6, P.sky); r(10, 19, 1, 3, P.silver); r(13, 19, 1, 3, P.silver); }
    // neck + head
    const robot = hs === 'robot';
    r(10, 16, 4, 3, robot ? P.slate : c.skin);
    r(7, 6, 10, 11, c.skin); r(6, 8, 1, 6, c.skin); r(17, 8, 1, 6, c.skin);
    if (robot) { r(7, 6, 10, 1, P.white); r(7, 16, 10, 1, P.slate); r(11, 2, 2, 4, P.slate); r(10, 1, 4, 2, P.red); r(6, 9, 1, 4, P.slate); r(17, 9, 1, 4, P.slate); }
    // eyes / mouth
    if (robot) { r(8, 9, 3, 2, P.cyan); r(13, 9, 3, 2, P.cyan); r(9, 13, 6, 1, P.ink); r(10, 13, 1, 1, P.cyan); r(12, 13, 1, 1, P.cyan); }
    else { r(9, 10, 2, 2, P.ink); r(13, 10, 2, 2, P.ink); r(10, 14, 4, 1, '#a05a4a'); }
    // hair on top
    if (hs === 'short') { r(7, 4, 10, 3, hc); r(6, 5, 1, 4, hc); r(17, 5, 1, 4, hc); }
    if (hs === 'long') { r(7, 4, 10, 3, hc); r(6, 5, 2, 6, hc); r(16, 5, 2, 6, hc); }
    if (hs === 'spiky') { r(7, 4, 10, 3, hc); for (let i = 0; i < 5; i++) r(7 + i * 2, 2 + (i % 2), 1, 2, hc); r(6, 5, 1, 3, hc); r(17, 5, 1, 3, hc); }
    if (hs === 'mohawk') { r(10, 1, 4, 6, hc); }
    if (hs === 'bun') { r(7, 4, 10, 3, hc); r(9, 1, 6, 3, hc); r(6, 6, 1, 4, hc); r(17, 6, 1, 4, hc); }
    if (hs === 'afro') { r(7, 5, 10, 1, hc); }
    if (hs === 'slick') { r(7, 4, 10, 3, hc); r(6, 5, 1, 5, hc); r(17, 5, 1, 3, hc); r(8, 4, 3, 1, P.slate); }
    if (hs === 'pony') { r(7, 4, 10, 3, hc); r(6, 5, 1, 4, hc); r(17, 6, 3, 2, hc); r(19, 7, 2, 7, hc); }
    if (hs === 'bob') { r(7, 4, 10, 3, hc); r(6, 5, 1, 9, hc); r(17, 5, 1, 9, hc); }
    if (hs === 'bald') { r(6, 8, 1, 3, hc); r(17, 8, 1, 3, hc); r(9, 6, 3, 1, '#ffffff60'); }
    // accessories
    for (const aRaw of c.acc) {
      const [a, col] = aRaw.split(':');
      if (a === 'glasses') { r(8, 9, 4, 4, P.ink); r(12, 9, 4, 4, P.ink); r(9, 10, 2, 2, '#bfe9ff'); r(13, 10, 2, 2, '#bfe9ff'); r(10, 11, 1, 1, P.ink); r(14, 11, 1, 1, P.ink); r(6, 10, 2, 1, P.ink); r(16, 10, 2, 1, P.ink); }
      if (a === 'shades') { r(8, 9, 8, 3, P.black); r(7, 9, 1, 1, P.black); r(16, 9, 1, 1, P.black); r(9, 10, 1, 1, P.slate); r(13, 10, 1, 1, P.slate); }
      if (a === 'monocle') { r(12, 9, 4, 4, P.gold); r(13, 10, 2, 2, P.ink); r(15, 13, 1, 5, P.gold); }
      if (a === 'beard') { r(7, 13, 10, 4, col || P.wood2); r(8, 17, 8, 2, col || P.wood2); r(10, 14, 4, 1, '#a05a4a'); }
      if (a === 'mustache') { r(8, 13, 8, 1, col || P.ink); r(8, 14, 2, 1, col || P.ink); r(14, 14, 2, 1, col || P.ink); }
      if (a === 'eyepatch') { r(8, 9, 4, 4, P.ink); r(7, 7, 10, 1, P.ink); }
      if (a === 'earring') { r(17, 13, 1, 2, P.gold); }
      if (a === 'rose') { r(16, 4, 3, 3, P.red); r(17, 5, 1, 1, '#ff77a8'); r(15, 7, 2, 1, P.green); }
      if (a === 'freckles') { r(8, 12, 1, 1, '#d0866a'); r(10, 12, 1, 1, '#d0866a'); r(14, 12, 1, 1, '#d0866a'); r(16, 12, 1, 1, '#d0866a'); }
    }
    // hats
    if (c.hat) {
      const [t, hcol] = c.hat;
      if (t === 'cap') { r(7, 3, 10, 4, hcol); r(6, 5, 1, 2, hcol); r(16, 6, 5, 1, hcol); r(11, 3, 2, 1, P.white); }
      if (t === 'cowboy') { r(8, 1, 8, 5, hcol); r(3, 5, 18, 2, hcol); r(8, 4, 8, 1, P.ink); }
      if (t === 'top') { r(8, 0, 8, 6, hcol); r(5, 5, 14, 2, hcol); r(8, 4, 8, 1, P.red); }
      if (t === 'beanie') { r(7, 2, 10, 5, hcol); r(6, 5, 12, 2, P.white); r(11, 1, 2, 1, P.white); }
      if (t === 'headband') { r(6, 6, 12, 2, hcol); }
      if (t === 'visor') { r(6, 5, 12, 2, hcol); r(14, 6, 6, 1, hcol); }
      if (t === 'captain') { r(6, 2, 12, 4, P.white); r(6, 5, 12, 2, hcol); r(11, 3, 2, 2, P.gold); r(6, 7, 7, 1, P.ink); }
      if (t === 'beret') { r(6, 3, 12, 3, hcol); r(5, 4, 3, 2, hcol); r(14, 4, 2, 1, P.gold); }
    }
    cache[id] = cv;
    return cv;
  };
  G.resetAvatar = (id) => { delete cache[id]; };
  G.drawAvatar = (id, x, y, scale = 1) => G.ctx.drawImage(G.avatar(id), Math.round(x), Math.round(y), 24 * scale, 24 * scale);

  // ---------- the player's own profile: name and look ----------
  const PAL = [P.ink, P.wood2, '#3a1a1a', P.wood1, P.gold, P.orange, P.silver, '#d8dde2', '#ff77c8', P.sky, P.lime, P.red];
  const PAL_NAMES = ['BLACK', 'BROWN', 'DARK BROWN', 'CHESTNUT', 'BLOND', 'GINGER', 'GREY', 'WHITE', 'PINK', 'BLUE', 'GREEN', 'RED'];
  const CLOTH = [P.gold, P.red, P.blue, P.navy, P.green, P.lime, P.orange, P.plum, '#ff77a8', P.teal, P.white, P.ink, P.slate, P.wood1];
  const CLOTH_NAMES = ['GOLD', 'RED', 'BLUE', 'NAVY', 'GREEN', 'LIME', 'ORANGE', 'PLUM', 'PINK', 'TEAL', 'WHITE', 'BLACK', 'SLATE', 'LEATHER'];
  const BGS = [P.teal, P.navy, P.plum, '#2b4a5a', '#5a3222', '#3a4a2a', '#7a2a40', P.dusk, '#1e2a3a', '#6e2b62'];
  const BG_NAMES = ['TEAL', 'NAVY', 'PLUM', 'STEEL', 'RUST', 'OLIVE', 'WINE', 'DUSK', 'NIGHT', 'MAGENTA'];
  G.PROFILE_OPTS = [
    { key: 'skin', label: 'SKIN', items: [SK.a, SK.b, SK.c, SK.d, SK.e, '#ffe2c6', '#8fd694'], names: ['LIGHT', 'FAIR', 'TAN', 'BROWN', 'DARK', 'PALE', 'ALIEN'] },
    { key: 'hair', label: 'HAIR', items: ['short', 'long', 'spiky', 'mohawk', 'bun', 'afro', 'slick', 'pony', 'bob', 'bald'] },
    { key: 'hairCol', label: 'HAIR COLOUR', items: PAL, names: PAL_NAMES },
    { key: 'hat', label: 'HAT', items: ['none', 'cap', 'cowboy', 'top', 'beanie', 'headband', 'visor', 'captain', 'beret'] },
    { key: 'hatCol', label: 'HAT COLOUR', items: CLOTH, names: CLOTH_NAMES },
    { key: 'face', label: 'FACIAL HAIR', items: ['none', 'mustache', 'beard'] },
    { key: 'faceCol', label: 'BEARD COLOUR', items: PAL, names: PAL_NAMES },
    { key: 'eyes', label: 'EYES', items: ['none', 'glasses', 'shades', 'monocle', 'eyepatch'] },
    { key: 'extra', label: 'EXTRA', items: ['none', 'earring', 'freckles', 'rose'] },
    { key: 'shirt', label: 'SHIRT', items: CLOTH, names: CLOTH_NAMES },
    { key: 'bg', label: 'BACKDROP', items: BGS, names: BG_NAMES }
  ];
  const DEF_PROFILE = { name: '', skin: 0, hair: 0, hairCol: 5, hat: 0, hatCol: 0, face: 0, faceCol: 5, eyes: 0, extra: 0, shirt: 0, bg: 0 };
  G.profile = () => {
    const S = G.settings;
    if (!S.profile) S.profile = Object.assign({}, DEF_PROFILE);
    for (const k in DEF_PROFILE) if (S.profile[k] === undefined) S.profile[k] = DEF_PROFILE[k];
    return S.profile;
  };
  G.playerName = () => (G.profile().name || 'YOU').toUpperCase();
  // display name for a player object in any game
  G.dn = (p) => (p && p.human ? G.playerName() : p ? p.name : '');
  G.profileChar = () => {
    const f = G.profile(), O = {}; G.PROFILE_OPTS.forEach((o) => (O[o.key] = o.items[(f[o.key] || 0) % o.items.length]));
    const acc = [];
    if (O.face !== 'none') acc.push(O.face + ':' + O.faceCol);
    if (O.eyes !== 'none') acc.push(O.eyes);
    if (O.extra !== 'none') acc.push(O.extra);
    return { bg: O.bg, skin: O.skin, hair: [O.hair, O.hairCol], hat: O.hat === 'none' ? null : [O.hat, O.hatCol], shirt: O.shirt, acc };
  };
  G.randomProfile = () => {
    const f = G.profile();
    G.PROFILE_OPTS.forEach((o) => (f[o.key] = G.rand(o.items.length)));
    if (Math.random() < 0.5) f.hat = 0;
    if (Math.random() < 0.5) f.face = 0;
    if (Math.random() < 0.5) f.eyes = 0;
    if (Math.random() < 0.6) f.extra = 0;
    G.resetAvatar('you');
  };
  // the player's name plate: avatar, name and an optional status line
  G.youPlate = (x, y, w, line, lineColor, turn) => {
    G.panel(x, y, w, 28, { fill: turn ? P.navy : P.ink, hi: turn ? P.gold : P.dusk, border: turn ? P.gold : P.black });
    G.drawAvatar('you', x + 2, y + 2);
    G.text(G.playerName(), x + 30, y + 5, turn ? P.gold : P.white, 'big');
    if (line) G.text(line, x + 30, y + 17, lineColor || P.silver, 'small');
  };

  // ---------- mini cards (books laid on the table) ----------
  let mini = {};
  G.clearMiniCards = () => { mini = {}; };
  G.miniCard = (rank, suit) => {
    const k = rank + '_' + suit; if (mini[k]) return mini[k];
    const ink = G.cardInk || { paper: P.white, edge: '#d4dde6', line: P.ink, red: P.red, black: P.ink };
    const [c, x] = G.makeCanvas(14, 20);
    x.fillStyle = ink.line; x.fillRect(1, 0, 12, 20); x.fillRect(0, 1, 14, 18);
    x.fillStyle = ink.paper; x.fillRect(1, 1, 12, 18);
    x.fillStyle = ink.edge; x.fillRect(1, 18, 12, 1);
    const col = G.isRed(suit) ? ink.red : ink.black;
    G.withCtx(x, () => { G.text(G.RANK_LABEL[rank], 3, 3, col, 'small'); G.drawSuit(suit, 5, 11, 'small', col); });
    mini[k] = c; return c;
  };
  G.MINI_BOOK_W = 26; G.MINI_BOOK_H = 20;
  G.drawMiniBook = (rank, x, y) => { for (let s = 0; s < 4; s++) G.ctx.drawImage(G.miniCard(rank, [0, 1, 3, 2][s]), Math.round(x + s * 4), Math.round(y)); };

  // ---------- records vs you ----------
  G.record = (id) => (G.store.get('records', {}) || {})[id] || { w: 0, l: 0 };
  G.addRecord = (id, youWon) => {
    const all = G.store.get('records', {}) || {};
    const r = all[id] || { w: 0, l: 0 };
    if (youWon) r.w++; else r.l++;
    all[id] = r; G.store.set('records', all);
  };

  // ---------- roster picker ("the club table") ----------
  // st: { slots: [{label, color}], picks: [id|null], focus }
  G.stars = (n, x, y, col = P.gold) => { for (let i = 0; i < 3; i++) G.drawSuit(1, x + i * 7, y, 'small', i <= n ? col : P.dusk); };
  G.rosterPicker = (st) => {
    // seats (left column) drawn by caller-provided y
    const sx = 22, sw = 210;
    st.slots.forEach((slot, i) => {
      const y = st.seatY + i * 40;
      const id = st.picks[i];
      const focus = st.focus === i;
      const hover = G.inRect(input.x, input.y, sx, y, sw, 36);
      G.panel(sx, y, sw, 36, { fill: focus ? P.navy : P.ink, hi: focus ? P.gold : P.dusk, border: focus ? P.gold : P.black });
      ui.block(sx, y, sw, 36);
      G.rect(sx + 3, y + 3, 3, 30, slot.color || P.slate);
      if (id) G.drawAvatar(id, sx + 9, y + 6); else { G.rect(sx + 9, y + 6, 24, 24, P.dusk); G.text('?', sx + 21, y + 14, P.slate, 'big', 'center'); }
      G.text(slot.label, sx + 40, y + 7, slot.color || P.silver, 'small');
      G.text(id ? G.char(id).name : 'EMPTY - PICK BELOW', sx + 40, y + 19, id ? P.white : P.slate, id ? 'big' : 'small');
      if (hover && !ui.modal) { ui.cursorHand = true; ui.hoverId = 'seat' + i; st.hoverChar = id || st.hoverChar; }
      if (hover && input.pressed && !ui.modal) { st.focus = i; input.pressed = false; G.audio.sfx('click'); }
    });
    // club grid
    const gx = 248, gy = 58, tw = 58, th = 62, gap = 4;
    G.text(G.touch ? 'THE CLUB - TAP A MEMBER TO SEAT THEM' : 'THE CLUB - CLICK A MEMBER TO SEAT THEM', gx, 46, P.gold, 'small');
    let hov = null;
    R.forEach((c, i) => {
      const x = gx + (i % 6) * (tw + gap), y = gy + Math.floor(i / 6) * (th + gap);
      const seatIdx = st.picks.indexOf(c.id);
      const hover = !ui.modal && G.inRect(input.x, input.y, x, y, tw, th);
      if (hover) { hov = c; ui.cursorHand = true; ui.hoverId = 'tile' + c.id; }
      const border = seatIdx >= 0 ? st.slots[seatIdx].color || P.gold : hover ? P.white : P.black;
      G.rect(x, y, tw, th, border); G.rect(x + 1, y + 1, tw - 2, th - 2, P.ink);
      G.drawAvatar(c.id, x + 5, y + 2, 2);
      G.rect(x + 1, y + th - 12, tw - 2, 11, seatIdx >= 0 ? border : P.dusk);
      G.text(c.name.length > 9 ? c.name.replace('THE ', '').replace('CAPT ', '') : c.name, x + tw / 2, y + th - 9, seatIdx >= 0 ? P.ink : P.white, 'small', 'center');
      if (seatIdx >= 0) { G.rect(x + 2, y + 2, 11, 11, border); G.text(String(seatIdx + 1), x + 8, y + 5, P.ink, 'small', 'center'); }
      ui.block(x, y, tw, th);
      if (hover && input.pressed) {
        input.pressed = false; G.audio.sfx('chip');
        const f = st.focus;
        if (seatIdx >= 0 && seatIdx !== f) { st.picks[seatIdx] = st.picks[f]; }
        st.picks[f] = c.id;
        const empty = st.picks.findIndex((p) => !p);
        st.focus = empty >= 0 ? empty : (f + 1) % st.slots.length;
      }
    });
    // info panel
    const show = hov || G.char(st.picks[st.focus] || st.hoverChar || R[0].id);
    const iy = 262, ix = 248, iw = 370;
    G.panel(ix, iy, iw, 82, { fill: P.ink, hi: P.dusk });
    G.drawAvatar(show.id, ix + 8, iy + 8, 2);
    G.text(show.name, ix + 64, iy + 9, P.gold, 'big');
    G.text('USUALLY ' + G.SKILL_NAMES[show.skill] + ' - FORM IS DEALT EACH GAME', ix + 64 + G.textWidth(show.name, 'big') + 8, iy + 10, P.silver, 'small');
    G.text('"' + show.quote.toUpperCase() + '"', ix + 64, iy + 21, P.cyan, 'small');
    G.text('GO FISH: ' + G.FISH_STYLE(show).toUpperCase(), ix + 64, iy + 29, P.white, 'small');
    G.text('BLACKJACK: ' + G.BJ_STYLE[show.bj].toUpperCase(), ix + 64, iy + 37, P.white, 'small');
    G.text('POKER: ' + G.POKER_STYLE[show.poker].toUpperCase(), ix + 64, iy + 45, P.white, 'small');
    G.text('BETS: ' + show.temper.bets.toUpperCase(), ix + 64, iy + 53, P.white, 'small');
    G.text('NERVE: ' + G.NERVE[show.temper.nerve].toUpperCase(), ix + 64, iy + 61, P.white, 'small');
    const rec = G.record(show.id);
    G.text('YOUR RECORD VS ' + show.name + ':  ' + rec.w + ' W - ' + rec.l + ' L', ix + 64, iy + 71, P.silver, 'small');
  };
  // fill empty slots with random members not already picked
  G.fillRandom = (st, all) => {
    const taken = new Set(st.picks.filter(Boolean));
    st.picks = st.picks.map((p) => {
      if (p && !all) return p;
      const pool = R.filter((c) => !taken.has(c.id));
      const c = G.pick(pool); taken.add(c.id); return c.id;
    });
  };
})();
