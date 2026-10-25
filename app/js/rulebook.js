// Pixel Card Club - the Rulebook: an open book on a desk with animated page turns
(function () {
  'use strict';
  const P = G.P, ui = G.ui, input = G.input, CW = G.CW, CH = G.CH;
  const PW = 266, PH = 300;              // one page
  const LX = 50, RX = 324, PY = 30, SPINE = 320;
  const PAPER = '#f3e6c4', PAPER_D = '#e4d1a6', PAPER_DD = '#cdb685';
  const INK = '#2a2230', HEAD = '#8a2b3a', SUB = '#7a4a2e', FAINT = '#9c8a66';
  const TURN_TIME = 0.45;

  // ---------- page content ----------
  // block types: h, h2, p, li, table, cards, books, tip, member, draw, toc, gap
  const CHAPTERS = [
    { key: 'welcome', name: 'WELCOME + CONTROLS', tab: 'START', color: P.slate },
    { key: 'deck', name: 'THE DECK', tab: 'DECK', color: P.silver },
    { key: 'blackjack', name: 'BLACKJACK', tab: 'BJ', color: P.red },
    { key: 'holdem', name: "TEXAS HOLD'EM", tab: 'POKER', color: P.orange },
    { key: 'solitaire', name: 'SOLITAIRE', tab: 'SOL', color: P.gold },
    { key: 'spider', name: 'SPIDER SOLITAIRE', tab: 'SPDR', color: P.teal },
    { key: 'gofish', name: 'GO FISH', tab: 'FISH', color: P.blue },
    { key: 'crazy8', name: 'CRAZY EIGHTS', tab: 'CRAZY', color: P.sky },
    { key: 'war', name: 'WAR', tab: 'WAR', color: P.navy },
    { key: 'club', name: 'THE CLUB MEMBERS', tab: 'CLUB', color: P.green },
    { key: 'sources', name: 'THE REAL GAMES', tab: 'REAL', color: P.plum }
  ];
  CHAPTERS.forEach((c, i) => (c.page = 2 + i)); // replaced by the real page numbers in build()
  const chapterOf = (pg) => { let c = CHAPTERS[0]; for (const ch of CHAPTERS) if (pg >= ch.page) c = ch; return pg < 2 ? null : c; };

  function pages() {
    const members = (from) => G.ROSTER.slice(from, from + 6).map((c) => ({ member: c.id }));
    return [
      [{ draw: drawTitlePage }],
      [{ h: 'CONTENTS' }, { gap: 4 }, { toc: true }, { gap: 8 }, { tip: 'Click a chapter name, or a coloured tab on the edge of the book, to jump there.' }],
      // 2 welcome
      [{ h: 'WELCOME TO THE CLUB', ch: 'welcome' },
        { p: 'This book explains every game in Pixel Card Club. Turn a page by clicking it, with the arrow keys, or with A and D.' },
        { h2: 'CONTROLS' },
        { table: [['MOUSE', 'Click cards, buttons and players. Drag cards in Solitaire.'], ['ESC', 'Opens the pause menu during a game and closes this book.'], ['HOTKEYS', 'The small letter on a button is its key, like H for HIT.'], ['F11', 'Full screen in the desktop app.']] },
        { h2: 'SAVING' },
        { p: 'Your chips, wins, settings and your record against each Club member are saved for you.' },
        { h2: 'CUSTOMIZE' },
        { p: 'C on the menu picks table colours, card backs and the Classic or worn 1890s Western deck. P sets your name and look.' },
        { tip: 'In a game, press ESC and pick HOW TO PLAY to jump to its chapter.' }],
      // 3 deck
      [{ h: 'THE DECK', ch: 'deck' },
        { p: 'Every game uses the standard 52-card deck: four suits of thirteen ranks.' },
        { draw: drawSuits },
        { cards: [[1, 0], [5, 1], [10, 2], [11, 3], [12, 0], [13, 1]], off: 38 },
        { table: [['ACE', 'Written A. High or low, depending on the game.'], ['2 - 10', 'Number cards.'], ['J Q K', 'Jack, Queen and King: the face cards.']] },
        { p: 'Hearts and diamonds are red. Spades and clubs are black.' }],
      // 4 blackjack
      [{ h: 'BLACKJACK', ch: 'blackjack' },
        { p: 'Beat the dealer by finishing closer to 21 without going over. You only ever play against the dealer.' },
        { h2: 'CARD VALUES' },
        { table: [['2 - 10', 'Face value.'], ['J Q K', '10 each.'], ['ACE', '1 or 11, whichever helps. A hand counting an Ace as 11 is SOFT.']] },
        { groups: [{ cards: [[1, 0], [13, 1]], caption: 'BLACKJACK! PAYS 3:2' }, { cards: [[10, 3], [6, 2], [9, 1]], caption: '25 IS A BUST' }], off: 18 }],
      [{ h: 'A ROUND' },
        { li: ['Click chips to bet, then press DEAL.', 'You and the dealer get two cards. One dealer card stays face down.', 'If the dealer shows an Ace or a 10, they peek for blackjack.', 'You play your hand, then the dealer plays theirs.'] },
        { h2: 'YOUR MOVES' },
        { table: [['HIT  H', 'Take another card.'], ['STAND  S', 'Keep your total and end your turn.'], ['DOUBLE  D', 'Double your bet and take exactly one more card.'], ['SPLIT  P', 'Turn a pair into two hands, each with its own bet. Split Aces get one card each.'], ['HINT  ?', 'The advisor shows the basic-strategy move.']], col: 62 }],
      [{ h: 'THE DEALER' },
        { p: 'The dealer has no choices. They must hit until they reach 17, and they stand on every 17.' },
        { h2: 'PAYOUTS' },
        { table: [['WIN', 'Pays 1 to 1.'], ['BLACKJACK', 'An Ace and a 10-value card as your first two cards. Pays 3 to 2.'], ['PUSH', 'A tie. Your bet comes back.'], ['BUST', 'Over 21. You lose, even if the dealer busts later.']], col: 62 },
        { h2: 'HOUSE RULES' },
        { p: 'The shoe holds 1, 2, 4 or 6 decks (set in Options) and is reshuffled when it runs low. There is no insurance or surrender.' },
        { tip: 'Out of chips? The house hands you a fresh stack of 1000.' }],
      [{ h: 'TABLE-MATES' },
        { p: 'Up to two Club members can sit at your table. Pick them before you sit down, or press SEATS between hands. Each has their own chips and plays their own hand against the dealer.' },
        { p: 'Turn order: right seat, you, left seat, then the dealer.' },
        { h2: 'PLAY STYLES' },
        { table: [['BY THE BOOK', 'Perfect basic strategy.'], ['CAUTIOUS', 'Stands on 12 or more.'], ['RECKLESS', 'Hits to 18, loves to double.'], ['DEALER', 'Hits to 17 like the dealer.'], ['HUNCH', 'Plays on gut feeling.']], col: 70 },
        { h2: 'MOOD AND BETS' },
        { p: 'Bets rise and fall with each streak. Some press a hot run, some chase losses. Hotheads play wild when losing, jittery members freeze.' },
        { tip: 'The panel shows their streak (W3, L2) and mood: HOT, COLD, TILT, SHAKY.' }],
      // texas hold'em
      [{ h: "TEXAS HOLD'EM", ch: 'holdem' },
        { p: 'Win every chip at the table. Each player gets two private cards and shares five face-up cards in the middle. Your best five-card hand out of those seven wins.' },
        { h2: 'THE BLINDS' },
        { p: 'Before the deal, the two players left of the button post forced bets: the small blind and the big blind. With only two players, the button posts the small blind and acts first before the flop.' },
        { groups: [{ cards: [[1, 0], [1, 1]], caption: 'POCKET ACES' }, { cards: [[11, 2], [10, 2]], caption: 'SUITED J-10' }], off: 18 },
        { tip: 'Blinds start at 10/20 and rise every 10 hands. Pick FIXED 10/20 on the setup screen to keep them low.' }],
      [{ h: 'A HAND' },
        { table: [['PRE-FLOP', 'Two cards each. Betting starts left of the big blind.'], ['FLOP', 'Three shared cards, then a betting round.'], ['TURN', 'A fourth shared card and a betting round.'], ['RIVER', 'The fifth card and the last betting round.'], ['SHOWDOWN', 'Hands are shown. The best hand wins the pot.']], col: 62 },
        { cards: [[1, 1], [13, 1], [8, 3], [1, 2], [13, 3]], off: 30, caption: 'THE BOARD: FLOP, TURN, RIVER' },
        { p: 'One card is burned (dealt face down and not used) before the flop, the turn and the river. If everyone else folds, the last player wins without showing.' }],
      [{ h: 'BETTING' },
        { table: [['FOLD  F', 'Throw your cards away and sit out the hand.'], ['CHECK  C', 'Pass when there is nothing to call.'], ['CALL  C', 'Match the current bet.'], ['RAISE  R', 'Bet more. Set the size with - and +, or MIN, 1/2 POT and POT.'], ['ALL IN  A', 'Bet every chip you have.']], col: 62 },
        { h2: 'NO-LIMIT RULES' },
        { li: ['A raise must be at least as big as the last bet or raise.', 'An all-in too small to be a full raise does not reopen the betting.', 'An all-in player can only win what they matched from each player. The rest goes to a side pot.', 'Ties split the pot. An odd chip goes to the first winner left of the button.'] }],
      [{ h: 'HAND RANKINGS' },
        { p: 'Best to worst:' },
        { table: [['ROYAL FLUSH', 'A K Q J 10 of one suit.'], ['STR. FLUSH', 'Five in a row, one suit.'], ['FOUR KIND', 'Four cards of one rank.'], ['FULL HOUSE', 'Three of a kind plus a pair.'], ['FLUSH', 'Five cards of one suit.'], ['STRAIGHT', 'Five in a row. 5-4-3-2-A is the lowest.'], ['THREE KIND', 'Three cards of one rank.'], ['TWO PAIR', 'Two different pairs.'], ['ONE PAIR', 'Two cards of one rank.'], ['HIGH CARD', 'None of the above.']], col: 78 },
        { p: 'Suits never break ties. Between equal hands, the highest unpaired cards (kickers) decide.' }],
      [{ h: 'AT THE TABLE' },
        { p: 'You play a sit-and-go against 1 to 3 Club members. Everyone starts with 1000 chips. Lose them all and you are out. The last player with chips wins.' },
        { h2: 'POKER STYLES' },
        { table: [['SHARK', 'Tight and aggressive, reads pot odds.'], ['LAG', 'Plays many hands and bets them hard.'], ['ROCK', 'Only plays strong hands.'], ['STATION', 'Calls almost anything.'], ['MANIAC', 'Raises and bluffs all the time.'], ['WILD', 'Changes gear every hand.']], col: 58 },
        { p: 'Moods matter: a hothead who loses a big pot goes ON TILT, a jittery player gets RATTLED.' },
        { tip: 'Press O for the odds helper. It shows your chance to win and the share of the pot you need to call.' }],
      // solitaire
      [{ h: 'SOLITAIRE', ch: 'solitaire' },
        { p: 'This is Klondike. Move all 52 cards onto the four foundations, building each suit up from Ace to King.' },
        { draw: drawKlondike },
        { table: [['STOCK', 'Cards left over after the deal.'], ['WASTE', 'Cards turned over from the stock.'], ['FOUNDATIONS', 'One pile per suit, Ace up to King.'], ['TABLEAU', 'Seven columns of 1 to 7 cards. Only the top card starts face up.']], col: 70 }],
      [{ h: 'MOVING CARDS' },
        { p: 'In the tableau, build down in alternating colours: a red 7 goes on a black 8.' },
        { cards: [[8, 0], [7, 1], [6, 3], [5, 2]], off: 22 },
        { li: ['You can move a whole run of face-up cards at once.', 'Only a King, or a run starting with a King, can fill an empty column.', 'An uncovered face-down card turns face up.', 'Click the stock to turn 1 or 3 cards (set in Options). Click the empty stock to recycle the waste, as often as you like.'] }],
      [{ h: 'CONTROLS' },
        { table: [['DRAG', 'Pick up a card or run and drop it on a pile.'], ['DOUBLE-CLICK', 'Send a card to its foundation.'], ['UNDO  Z', 'Take back a move.'], ['HINT  H', 'Highlights a good move.'], ['AUTO  A', 'Finishes the game once every card is face up.']], col: 72 },
        { h2: 'SCORING' },
        { table: [['+10', 'A card moved to a foundation.'], ['+5', 'Waste to tableau, or turning a card face up.'], ['-15', 'A foundation card back to the tableau.'], ['-100', 'Recycling the stock in Draw 1.'], ['BONUS', 'Faster wins earn a time bonus.']], col: 44 }],
      // spider
      [{ h: 'SPIDER SOLITAIRE', ch: 'spider' },
        { p: 'Two decks, ten columns. Build eight full runs from King down to Ace in one suit. A finished run leaves the table.' },
        { h2: 'THE DEAL' },
        { p: '54 cards go out: six in each of the first four columns, five in the other six. Only the top card of each column is face up. The other 50 cards are the stock.' },
        { h2: 'SUITS' },
        { table: [['1 SUIT', 'All spades. The easiest.'], ['2 SUITS', 'Spades and hearts.'], ['4 SUITS', 'The full two decks. Very hard.']], col: 56 },
        { cards: [[13, 0], [12, 0], [11, 0], [10, 0], [9, 0]], off: 22, caption: 'A SAME-SUIT RUN' }],
      [{ h: 'MOVING CARDS' },
        { li: ['Put any card on a card one rank higher, any suit: a 6 on a 7.', 'A group can only move together if it is all one suit and in order.', 'Any card or run can fill an empty column.', 'A face-down card turns over once it is uncovered.', 'DEAL ROW (D) puts one card on every column. Every column must have a card first.'] },
        { h2: 'SCORE AND KEYS' },
        { table: [['500', 'Your starting score.'], ['-1', 'Every move, deal and undo.'], ['+100', 'Every finished run.'], ['KEYS', 'Z undo, H hint (press again for the next), D deal, N new game.']], col: 40 }],
      // go fish
      [{ h: 'GO FISH', ch: 'gofish' },
        { p: 'Collect the most books. A book is all four cards of one rank, such as four 7s.' },
        { h2: 'THE DEAL' },
        { p: 'With 2 or 3 players, everyone gets 7 cards. With 4 players, everyone gets 5. The rest go face down in the middle as the pond.' },
        { h2: 'ASKING' },
        { li: ['Click a card to ask for its rank. You must already hold at least one.', 'Then click the player to ask. With one opponent, they are asked right away.', 'If they have any, they hand over all of them and you go again.'] },
        { cards: [[7, 0], [7, 1], [7, 3]], off: 18, caption: '"GOT ANY SEVENS?"' }],
      [{ h: 'GO FISH!' },
        { p: 'If they have none, they say GO FISH and you draw the top card of the pond. Draw the rank you asked for and you go again. Otherwise your turn ends.' },
        { h2: 'BOOKS ON THE TABLE' },
        { p: 'When you collect all four of a rank, the book is laid face up on the table in front of you. Every player has their own row, so the score is easy to see.' },
        { books: [7, 12, 1, 9] },
        { p: 'Laying down a book earns another turn.' },
        { h2: 'THE END' },
        { p: 'If your hand runs empty, you draw from the pond. The game ends when all 13 books are down. Most books wins.' }],
      [{ h: 'TEAM PLAY 2V2' },
        { p: 'Pick TEAMS 2V2 on the setup screen. You and a partner of your choice are Team Blue. Two rivals are Team Red.' },
        { draw: drawSeats },
        { li: ['You may only ask players on the other team.', 'Teammates never trade cards, but their books count together.', 'Turns go around the table, so the teams alternate.', 'Once the pond is empty, a team holding all four of a rank pools them into a book.'] }],
      [{ h: 'HOW THEY THINK' },
        { p: 'Every Club member listens to the table. Some have better memories than others.' },
        { table: [['EASY', 'Asks at random and forgets everything.'], ['NORMAL', 'Remembers some asks and slowly forgets.'], ['HARD', 'Remembers every ask, give and miss.']], col: 52 },
        { h2: 'HABITS' },
        { table: [['FAVOURITE', 'Asks for the rank they hold the most of.'], ['TARGET', 'Some go after the biggest hand, some chase the leader, and some pick on you.'], ['GRUDGE', 'Take cards from someone and they may come after you next.']], col: 60 },
        { tip: 'If a Hard player just heard you ask for 9s, they know you hold one.' }],
      // crazy eights
      [{ h: 'CRAZY EIGHTS', ch: 'crazy8' },
        { p: 'Be the first to play all your cards.' },
        { h2: 'THE DEAL' },
        { p: 'Two players get 7 cards each. Three or four players get 5. One card is turned up to start the play pile. If it is an 8, it goes back into the stock.' },
        { h2: 'YOUR TURN' },
        { li: ['Play a card that matches the top card by suit or by rank.', 'An 8 is wild. Play it any time and name the next suit (keys 1 - 4).', 'Cannot play? Draw from the stock (D) until you can. You may draw even when you could play.'] },
        { cards: [[9, 1], [9, 3], [8, 0]], off: 22, caption: '9 ON 9, THEN AN 8 NAMES A SUIT' }],
      [{ h: 'SCORING' },
        { p: 'If the stock runs out, the play pile is shuffled into a new stock.' },
        { p: 'The first player out wins the hand and collects points for the cards left in everyone else.' },
        { table: [['EIGHTS', '50 points.'], ['K Q J 10', '10 points.'], ['ACE', '1 point.'], ['2 - 9', 'Face value.']], col: 60 },
        { h2: 'GAME MODES' },
        { table: [['ONE HAND', 'Win the hand, win the game.'], ['MATCH', 'Keep playing hands. First to 100 points wins.']], col: 60 },
        { p: 'If nobody can play and nothing is left to draw, the hand is blocked. The lowest hand wins it.' },
        { tip: 'Hard players notice who could not follow a suit.' }],
      // war
      [{ h: 'WAR', ch: 'war' },
        { p: 'A game of pure luck. Win all the cards.' },
        { h2: 'THE DEAL' },
        { p: 'The deck is split evenly: 26 each with two players, 17 with three (one card left out), 13 with four. Nobody looks at their cards.' },
        { h2: 'A BATTLE' },
        { p: 'Everyone turns their top card face up. The highest card takes all of them. Aces are high, 2s are low.' },
        { cards: [[12, 1], [7, 0]], off: 30, caption: 'QUEEN BEATS SEVEN' },
        { tip: 'Press SPACE or click your deck to flip. AUTO (A) flips for you, SPEED (S) runs it at x1, x3 or x8.' }],
      [{ h: 'GOING TO WAR' },
        { p: 'If the top cards tie, it is WAR. The tied players each put one card face down and one face up. The highest new card takes the whole pile. Another tie means another war.' },
        { p: 'With three or four players, everyone joins the war.' },
        { p: 'If you run out of cards during a war, your last card stays face up and counts for you.' },
        { h2: 'GAME MODES' },
        { table: [['FULL GAME', 'Play until one player has all the cards, or everyone else is out.'], ['ONE PASS', 'Go through the deck once. Most cards won takes the game.']], col: 62 }],
      // club
      [{ h: 'THE CLUB MEMBERS', ch: 'club' }, { p: 'Hearts at the table show their form tonight. Numbers are your record.' }, ...members(0).slice(0, 5)],
      [...members(5).slice(0, 5)],
      [...members(10).slice(0, 4), { tip: 'Every member also has a temper. Watch their bets and table talk change as they win and lose.' }],
      [...members(14).slice(0, 4)],
      // sources
      [{ h: 'THE REAL GAMES', ch: 'sources' },
        { p: 'Every game here follows published rules. These are the sources we checked.' },
        { h2: 'BLACKJACK' },
        { p: 'BICYCLECARDS.COM/HOW-TO-PLAY/BLACKJACK. The advisor uses multi-deck basic strategy (dealer stands on 17, double after split) from BLACKJACKINFO.COM.' },
        { h2: "TEXAS HOLD'EM" },
        { p: "BICYCLECARDS.COM/HOW-TO-PLAY/ TEXAS-HOLDEM-POKER and Wikipedia: Texas hold 'em (blinds, raises, burn cards). Side pots: PAGAT.COM/POKER/RULES/BETTING.HTML. Rankings: PAGAT.COM/POKER/RULES/RANKING.HTML." },
        { h2: 'SOLITAIRE' },
        { p: 'BICYCLECARDS.COM/HOW-TO-PLAY/KLONDIKE and Wikipedia: Klondike (solitaire).' },
        { h2: 'SPIDER' },
        { p: 'BICYCLECARDS.COM/HOW-TO-PLAY/ SPIDER-SOLITAIRE and Wikipedia: Spider (solitaire), which also gives the Windows scoring.' }],
      [{ h: 'MORE SOURCES' },
        { h2: 'GO FISH' },
        { p: 'BICYCLECARDS.COM/HOW-TO-PLAY/GO-FISH and PAGAT.COM/QUARTET/GOFISH.HTML.' },
        { h2: 'CRAZY EIGHTS' },
        { p: 'BICYCLECARDS.COM/HOW-TO-PLAY/CRAZY-EIGHTS (deal, wild eights, scoring) and PAGAT.COM/EIGHTS/CRAZY8S.HTML (seven cards for two players, reshuffling the play pile, blocked games).' },
        { h2: 'WAR' },
        { p: 'BICYCLECARDS.COM/HOW-TO-PLAY/WAR and PAGAT.COM/WAR/WAR.HTML (three or four players, running out in a war, the one-pass Tod und Leben variant).' },
        { h2: 'THE BOOK' },
        { p: 'The Bicycle Official Rules of Card Games is the printed rulebook behind BICYCLECARDS.COM.' },
        { p: 'Full links: docs/RULES_SOURCES.md on GitHub.' }],
      [{ h: 'HOUSE RULES' },
        { p: 'Where the sources differ or leave a choice, this is what we picked.' },
        { table: [['BLACKJACK', 'No insurance or surrender. Up to 4 hands from splits.'], ['HOLD\'EM', 'Sit-and-go with 1000 chips. Blinds rise every 10 hands, or stay at 10/20.'], ['SOLITAIRE', 'Unlimited passes through the stock. Windows-style scoring.'], ['SPIDER', 'Undo is allowed. Bicycle deals 10 columns of 5; we use the 54-card Windows deal.'], ['GO FISH', 'Ends when all 13 books are down, as Bicycle does. Teams 2v2 is our own.'], ['CRAZY 8S', 'Match to 100 is our own. Bicycle plays single hands.'], ['WAR', 'Won cards go under your pile in random order, which stops endless games.']], col: 62 }],
      [{ h: 'ABOUT' },
        { p: 'Pixel Card Club is free and open source under the MIT licence. The art, sounds and characters are all made in code.' },
        { p: 'GITHUB.COM/BLOODRIVE65/PIXEL-CARD-CLUB' },
        { gap: 6 },
        { draw: (x, y, w) => { G.text('- THE END -', x + w / 2, y, HEAD, 'big', 'center'); G.text('GOOD LUCK AT THE TABLES', x + w / 2, y + 14, SUB, 'small', 'center'); return 26; } }]
    ];
  }

  // ---------- custom drawings ----------
  function drawTitlePage(x, y, w) {
    const cx = x + w / 2;
    G.outline(x - 6, y - 6, w + 12, PH - 32, SUB, 1); G.outline(x - 4, y - 4, w + 8, PH - 36, PAPER_DD, 1);
    G.text('PIXEL', cx, y + 22, HEAD, 'big', 'center', 2);
    G.text('CARD CLUB', cx, y + 44, INK, 'big', 'center', 2);
    [0, 1, 2, 3].forEach((s, i) => G.drawSuit(s, cx - 31 + i * 16, y + 70, 'big', G.isRed(s) ? HEAD : INK));
    G.text('THE OFFICIAL RULEBOOK', cx, y + 88, SUB, 'small', 'center');
    const fan = [[1, 0], [13, 1], [12, 2], [11, 3]];
    fan.forEach(([r, s], i) => G.ctx.drawImage(G.cardArt.faces[s + '_' + r], Math.round(cx - (CW + 3 * 26) / 2 + i * 26), y + 104 + Math.abs(i - 1.5) * 4));
    G.text('SEVEN CLASSIC CARD GAMES', cx, y + 186, INK, 'small', 'center');
    G.text('EDITION 1.4', cx, y + 204, FAINT, 'small', 'center');
    G.text('THIS BOOK BELONGS TO:', cx, y + 228, SUB, 'small', 'center');
    G.text('YOU', cx, y + 240, HEAD, 'big', 'center');
    return 250;
  }
  function drawSuits(x, y, w) {
    const names = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
    names.forEach((n, i) => {
      const cx = x + w / 8 + (i * w) / 4;
      G.drawSuit(i, cx - 3, y, 'big', G.isRed(i) ? HEAD : INK);
      G.text(n, cx, y + 11, G.isRed(i) ? HEAD : INK, 'small', 'center');
    });
    return 22;
  }
  const miniBack = (x, y) => { G.rect(x, y, 14, 20, INK); G.rect(x + 1, y + 1, 12, 18, P.plum); G.outline(x + 2, y + 2, 10, 16, P.gold); };
  function drawKlondike(x, y, w) {
    const col = (i) => x + 8 + i * 32;
    G.text('STOCK', col(0) + 7, y, FAINT, 'small', 'center'); G.text('WASTE', col(1) + 7, y, FAINT, 'small', 'center');
    G.text('FOUNDATIONS', col(4) + 23, y, FAINT, 'small', 'center');
    const yy = y + 9;
    miniBack(col(0), yy); miniBack(col(0) - 1, yy - 1);
    G.ctx.drawImage(G.miniCard(9, 1), col(1), yy);
    for (let i = 3; i < 7; i++) { if (i === 3) G.ctx.drawImage(G.miniCard(1, 0), col(i), yy); else G.outline(col(i), yy, 14, 20, PAPER_DD); }
    const ty = yy + 28;
    G.text('TABLEAU', x + w / 2, ty, FAINT, 'small', 'center');
    const up = [[13, 3], [4, 1], [12, 1], [8, 0], [3, 2], [10, 3], [6, 1]];
    for (let i = 0; i < 7; i++) {
      for (let k = 0; k < i; k++) miniBack(col(i), ty + 9 + k * 5);
      G.ctx.drawImage(G.miniCard(up[i][0], up[i][1]), col(i), ty + 9 + i * 5);
    }
    return 28 + 9 + 30 + 20 + 6;
  }
  function drawSeats(x, y, w) {
    const cx = x + w / 2, cy = y + 44;
    G.rect(cx - 50, cy - 22, 100, 44, P.felt2); G.outline(cx - 50, cy - 22, 100, 44, P.wood1, 2);
    G.text('POND', cx, cy - 2, P.felt4, 'small', 'center');
    const seat = (id, sx, sy, label, col) => {
      G.rect(sx - 13, sy - 13, 26, 26, col); G.ctx.drawImage(G.avatar(id), sx - 12, sy - 12);
      G.text(label, sx, sy + 15, col, 'small', 'center');
    };
    seat('nova', cx, cy - 38, '', P.blue);
    G.text('PARTNER', cx + 18, cy - 41, P.blue, 'small');
    seat('you', cx, cy + 30, '', P.blue);
    G.text('YOU', cx + 18, cy + 27, P.blue, 'small');
    seat('tank', cx - 76, cy, 'RIVAL', HEAD);
    seat('granny', cx + 76, cy, 'RIVAL', HEAD);
    G.text('BLUE', x + 2, cy - 30, P.blue, 'big'); G.text('RED', x + w - 2, cy - 30, HEAD, 'big', 'right');
    return 92;
  }

  // ---------- page renderer ----------
  function renderPage(blocks, num, links) {
    const [cv, c] = G.makeCanvas(PW, PH);
    G.withCtx(c, () => {
      // paper with darker gutter toward the spine
      G.rect(0, 0, PW, PH, PAPER);
      const left = num % 2 === 0;
      for (let i = 0; i < 10; i++) G.alpha(0.06 + i * 0.018, () => G.rect(left ? PW - 10 + i : 9 - i, 0, 1, PH, '#6a4a2a'));
      for (let i = 0; i < 260; i++) G.alpha(0.25, () => G.rect(G.rand(PW), G.rand(PH), 1, 1, PAPER_D));
      const ch = chapterOf(num);
      const x = 16, w = PW - 32;
      if (ch && num > 1) { G.text(ch.name, left ? x : x + w, 9, FAINT, 'small', left ? 'left' : 'right'); G.rect(x, 17, w, 1, PAPER_DD); }
      if (num > 0) G.text(String(num), PW / 2, PH - 14, FAINT, 'small', 'center');
      let y = num > 1 ? 26 : 16;
      for (const b of blocks) y += drawBlock(b, x, y, w, links, num) || 0;
      if (y > PH - 20) console.warn('rulebook page ' + num + ' overflows by ' + (y - (PH - 20)));
    });
    return cv;
  }
  function wrapLines(str, w) { return G.wrap(String(str).toUpperCase(), w, 'small'); }
  function drawBlock(b, x, y, w, links) {
    if (b.gap) return b.gap;
    if (b.h) { G.text(b.h, x, y, HEAD, 'big'); G.rect(x, y + 10, G.textWidth(b.h, 'big'), 1, P.gold); return 17; }
    if (b.h2) { G.drawSuit(1, x, y, 'small', HEAD); G.text(b.h2, x + 8, y + 1, SUB, 'small'); return 11; }
    if (b.p) { const l = wrapLines(b.p, w); l.forEach((t, i) => G.text(t, x, y + i * 9, INK, 'small')); return l.length * 9 + 4; }
    if (b.li) {
      let h = 0;
      for (const item of b.li) { const l = wrapLines(item, w - 9); G.rect(x + 1, y + h + 1, 3, 3, HEAD); l.forEach((t, i) => G.text(t, x + 9, y + h + i * 9, INK, 'small')); h += l.length * 9 + 3; }
      return h + 3;
    }
    if (b.table) {
      const cw = b.col || 56; let h = 0;
      b.table.forEach(([k, v], i) => {
        const l = wrapLines(v, w - cw - 6);
        const rh = l.length * 9 + 3;
        if (i % 2 === 0) G.alpha(0.5, () => G.rect(x - 2, y + h - 2, w + 4, rh, PAPER_D));
        G.text(k, x, y + h, HEAD, 'small');
        l.forEach((t, j) => G.text(t, x + cw, y + h + j * 9, INK, 'small'));
        h += rh;
      });
      return h + 5;
    }
    if (b.cards) {
      const off = b.off || 22, n = b.cards.length, tw = CW + (n - 1) * off;
      b.cards.forEach(([r, s], i) => {
        const cx = Math.round(x + w / 2 - tw / 2 + i * off);
        G.alpha(0.3, () => G.rect(cx + 2, y + 2, CW - 1, CH - 1, '#6a4a2a'));
        G.ctx.drawImage(G.cardArt.faces[s + '_' + r], cx, y);
      });
      let h = CH + 5;
      if (b.caption) { G.text(b.caption, x + w / 2, y + h, SUB, 'small', 'center'); h += 10; }
      return h + 2;
    }
    if (b.groups) {
      const n = b.groups.length, off = b.off || 18;
      b.groups.forEach((g, gi) => {
        const cx0 = x + (w / n) * (gi + 0.5), tw = CW + (g.cards.length - 1) * off;
        g.cards.forEach(([r, s], i) => {
          const cx = Math.round(cx0 - tw / 2 + i * off);
          G.alpha(0.3, () => G.rect(cx + 2, y + 2, CW - 1, CH - 1, '#6a4a2a'));
          G.ctx.drawImage(G.cardArt.faces[s + '_' + r], cx, y);
        });
        G.text(g.caption, cx0, y + CH + 5, SUB, 'small', 'center');
      });
      return CH + 17;
    }
    if (b.books) {
      const n = b.books.length, gap = 34, tw = n * gap - 8;
      G.rect(x + w / 2 - tw / 2 - 6, y - 3, tw + 12, 28, P.felt2);
      b.books.forEach((r, i) => G.drawMiniBook(r, x + w / 2 - tw / 2 + i * gap, y + 1));
      return 31;
    }
    if (b.tip) {
      const l = wrapLines(b.tip, w - 14);
      const h = l.length * 9 + 8;
      G.rect(x, y, w, h, '#ead7a4'); G.outline(x, y, w, h, SUB);
      G.rect(x + 1, y + 1, 3, h - 2, P.gold);
      l.forEach((t, i) => G.text(t, x + 9, y + 5 + i * 9, INK, 'small'));
      return h + 5;
    }
    if (b.member) {
      const c = G.char(b.member);
      G.rect(x - 1, y - 1, 26, 26, INK); G.ctx.drawImage(G.avatar(c.id), x, y);
      G.text(c.name, x + 31, y, INK, 'big');
      const nx = x + 31 + G.textWidth(c.name, 'big') + 6;
      G.text('USUALLY ' + G.SKILL_NAMES[c.skill], nx, y + 2, SUB, 'small');
      const rec = G.record(c.id);
      G.text(rec.w + '-' + rec.l, x + w, y + 2, FAINT, 'small', 'right');
      G.text('"' + c.quote.toUpperCase() + '"', x + 31, y + 10, SUB, 'small');
      const fish = c.fish.perfect ? 'PERFECT MEMORY' : ['FORGETFUL', 'SOME MEMORY', 'SHARP MEMORY'][c.skill];
      const bj = { basic: 'BY THE BOOK', cautious: 'CAUTIOUS', reckless: 'RECKLESS', dealer: 'DEALER STYLE', hunch: 'GUT FEELING' }[c.bj];
      G.text('FISH: ' + fish, x + 31, y + 19, INK, 'small'); G.text('BJ: ' + bj, x + 152, y + 19, INK, 'small');
      G.text('POKER: ' + (c.poker || '').toUpperCase(), x + 31, y + 28, INK, 'small');
      return 42;
    }
    if (b.toc) {
      let h = 0;
      for (const ch of CHAPTERS) {
        G.rect(x, y + h, 4, 7, ch.color);
        G.text(ch.name, x + 9, y + h + 1, INK, 'small');
        const tw = G.textWidth(ch.name, 'small');
        for (let dx = x + 14 + tw; dx < x + w - 16; dx += 4) G.rect(dx, y + h + 5, 1, 1, FAINT);
        G.text(String(ch.page), x + w, y + h + 1, HEAD, 'small', 'right');
        links.push({ page: ch.page, x, y: y + h - 3, w, h: 13 });
        h += 16;
      }
      return h;
    }
    if (b.draw) return b.draw(x, y, w);
    return 0;
  }

  // ---------- desk + book chrome ----------
  let desk = null;
  function drawDesk() {
    if (!desk) {
      const [c, x] = G.makeCanvas(G.W, G.H);
      G.withCtx(x, () => {
        G.rect(0, 0, G.W, G.H, P.wood1);
        for (let yy = 0; yy < G.H; yy += 24) { G.rect(0, yy, G.W, 1, P.wood0); G.rect(0, yy + 1, G.W, 1, P.wood2); }
        for (let i = 0; i < 900; i++) { const yy = G.rand(G.H), xx = G.rand(G.W); G.rect(xx, yy, 2 + G.rand(14), 1, Math.random() < 0.5 ? P.wood0 : P.wood2); }
      });
      desk = c;
    }
    G.ctx.drawImage(desk, 0, 0);
  }
  function drawCover(spread, total) {
    // drop shadow + leather cover
    G.alpha(0.45, () => G.rect(36, 24, 572, 322, P.black));
    G.rect(38, 18, 564, 322, '#3a1418'); G.rect(40, 20, 560, 318, '#6b2a2a');
    for (let i = 0; i < 400; i++) G.alpha(0.3, () => G.rect(40 + G.rand(560), 20 + G.rand(318), 1, 1, '#4e1c20'));
    G.outline(43, 23, 554, 312, '#8e4038');
    // gold corners
    for (const [cx, cy, sx, sy] of [[42, 22, 1, 1], [597, 22, -1, 1], [42, 335, 1, -1], [597, 335, -1, -1]]) {
      for (let i = 0; i < 10; i++) { G.rect(cx + (sx > 0 ? 0 : -i), cy + (sy > 0 ? i : -i), i === 0 ? 10 : 2, 1, P.gold); G.rect(cx + (sx > 0 ? i : -i), cy + (sy > 0 ? 0 : 0), 1, 2, P.gold); }
      G.rect(cx + (sx > 0 ? 0 : -9), cy + (sy > 0 ? 0 : -1), 10, 2, P.gold); G.rect(cx + (sx > 0 ? 0 : -1), cy + (sy > 0 ? 0 : -9), 2, 10, P.gold);
    }
    // page block thickness on each side
    const leftDepth = Math.min(5, 1 + Math.round((spread / total) * 5)), rightDepth = Math.min(5, 1 + Math.round(((total - 1 - spread) / total) * 5));
    for (let i = leftDepth; i > 0; i--) G.rect(LX - i, PY + i, PW, PH, i % 2 ? PAPER_DD : PAPER_D);
    for (let i = rightDepth; i > 0; i--) G.rect(RX + i, PY + i, PW, PH, i % 2 ? PAPER_DD : PAPER_D);
  }

  const Book = (G.Rulebook = {
    open(key, ret) {
      this.ret = ret || G.Menu;
      this.build();
      const ch = CHAPTERS.find((c) => c.key === key);
      this.spread = ch ? Math.floor(ch.page / 2) : 0;
      this.turn = null;
      G.scene = this;
      G.audio.sfx('page');
    },
    enter() { if (!this.pages) this.build(); if (this.spread === undefined) this.spread = 0; },
    build() {
      const src = pages();
      src.forEach((pg, i) => pg.forEach((b) => { if (b.ch) CHAPTERS.find((c) => c.key === b.ch).page = i; }));
      if (src.length % 2) src.push([]);
      this.links = src.map(() => []);
      this.pages = src.map((b, i) => renderPage(b, i, this.links[i]));
      this.total = this.pages.length / 2;
    },
    close() { G.audio.sfx('page'); if (this.ret === G.Menu) G.go(G.Menu); else G.resume(this.ret); },
    goTo(spread) {
      spread = G.clamp(spread, 0, this.total - 1);
      if (spread === this.spread || this.turn) return;
      this.turn = { from: this.spread, to: spread, dir: spread > this.spread ? 1 : -1, t: 0 };
      G.audio.sfx('page');
    },
    frame(dt) {
      if (this.turn) { this.turn.t += dt / TURN_TIME; if (this.turn.t >= 1) { this.spread = this.turn.to; this.turn = null; } }
      const busy = !!this.turn;
      if (!busy) {
        if (G.key('ArrowRight') || G.key('d') || G.key('PageDown')) this.goTo(this.spread + 1);
        else if (G.key('ArrowLeft') || G.key('a') || G.key('PageUp')) this.goTo(this.spread - 1);
        else if (G.key('Home')) this.goTo(0);
        else if (G.key('End')) this.goTo(this.total - 1);
      }
      drawDesk();
      drawCover(this.turn ? this.turn.to : this.spread, this.total);
      this.drawTabs();
      const pg = (i) => this.pages[i];
      if (!this.turn) {
        G.ctx.drawImage(pg(this.spread * 2), LX, PY);
        G.ctx.drawImage(pg(this.spread * 2 + 1), RX, PY);
        this.pageInput();
      } else {
        const { from, to, dir } = this.turn;
        const t = this.turn.t, e = t * t * (3 - 2 * t);
        if (dir > 0) {
          G.ctx.drawImage(pg(from * 2), LX, PY);
          G.ctx.drawImage(pg(to * 2 + 1), RX, PY);
          if (e < 0.5) this.sheet(pg(from * 2 + 1), 1, Math.cos(e * Math.PI), e);
          else this.sheet(pg(to * 2), -1, -Math.cos(e * Math.PI), e);
        } else {
          G.ctx.drawImage(pg(to * 2), LX, PY);
          G.ctx.drawImage(pg(from * 2 + 1), RX, PY);
          if (e < 0.5) this.sheet(pg(from * 2), -1, Math.cos(e * Math.PI), e);
          else this.sheet(pg(to * 2 + 1), 1, -Math.cos(e * Math.PI), e);
        }
      }
      // spine
      G.alpha(0.35, () => G.rect(SPINE - 4, PY, 8, PH, '#5a3a1a'));
      G.rect(SPINE - 1, PY, 2, PH, '#8a6a3a');
      G.text('CLICK A PAGE OR USE THE ARROW KEYS TO TURN   -   ESC CLOSES THE BOOK', G.W / 2, 346, P.wood3, 'small', 'center');
      if (ui.button('ESC', 3, 4, 32, 15, { key: 'Escape', theme: 'dark', font: 'small', showKey: false, id: 'bookclose' })) this.close();
    },
    // a page in mid-turn, hinged at the spine; side 1 = right of spine, -1 = left
    sheet(img, side, frac, e) {
      const w = Math.max(1, Math.round(PW * frac));
      const lift = Math.round(Math.sin(e * Math.PI) * 6);
      const x = side > 0 ? SPINE + 4 : SPINE - 4 - w;
      G.alpha(0.3, () => G.rect(side > 0 ? x + w : x - 6, PY + 4, 6, PH - 4, P.black));
      G.ctx.drawImage(img, x, PY - lift, w, PH + lift * 2);
      G.alpha(0.45 * (1 - frac), () => G.rect(x, PY - lift, w, PH + lift * 2, '#3a2a1a'));
      G.rect(side > 0 ? x + w - 1 : x, PY - lift, 1, PH + lift * 2, PAPER_DD);
    },
    pageInput() {
      if (ui.modal) return;
      const mx = input.x, my = input.y;
      // contents links
      for (const side of [0, 1]) {
        const pi = this.spread * 2 + side, ox = side ? RX : LX;
        for (const l of this.links[pi] || []) {
          if (G.inRect(mx, my, ox + l.x, PY + l.y, l.w, l.h)) {
            ui.cursorHand = true; ui.hoverId = 'link' + l.page;
            G.alpha(0.18, () => G.rect(ox + l.x - 2, PY + l.y, l.w + 4, l.h, HEAD));
            if (input.pressed) { input.pressed = false; this.goTo(Math.floor(l.page / 2)); return; }
          }
        }
      }
      const onLeft = G.inRect(mx, my, LX, PY, PW, PH) && this.spread > 0;
      const onRight = G.inRect(mx, my, RX, PY, PW, PH) && this.spread < this.total - 1;
      if (onLeft || onRight) {
        ui.cursorHand = true; ui.hoverId = onLeft ? 'pgL' : 'pgR';
        // dog-ear hint in the outer corner
        const cx = onLeft ? LX : RX + PW - 14, cy = PY + PH - 14;
        G.alpha(0.6, () => { for (let i = 0; i < 14; i++) G.rect(onLeft ? cx : cx + 14 - i, cy + i, onLeft ? i : i, 1, PAPER_DD); });
        G.text(onLeft ? '<' : '>', onLeft ? LX + 4 : RX + PW - 8, PY + PH - 9, HEAD, 'small');
        if (input.pressed) { input.pressed = false; this.goTo(this.spread + (onLeft ? -1 : 1)); }
      }
    },
    drawTabs() {
      const shown = this.turn ? this.turn.to : this.spread;
      CHAPTERS.forEach((ch, i) => {
        const y = 34 + i * 27, active = Math.floor(ch.page / 2) === shown || (chapterOf(shown * 2 + 1) === ch && chapterOf(shown * 2) === ch);
        const x = 598, w = active ? 40 : 35, h = 23;
        const hover = !ui.modal && G.inRect(input.x, input.y, x, y, w, h);
        G.rect(x, y, w, h, P.black); G.rect(x, y + 1, w - 1, h - 2, ch.color);
        G.rect(x, y + 1, w - 1, 1, P.white + '60');
        G.text(ch.tab, x + (w + 2) / 2, y + 9, ch.color === P.gold || ch.color === P.silver || ch.color === P.sky || ch.color === P.orange ? P.ink : P.white, 'small', 'center');
        ui.block(x, y, w, h);
        if (hover) { ui.cursorHand = true; ui.hoverId = 'tab' + i; if (input.pressed) { input.pressed = false; this.goTo(Math.floor(ch.page / 2)); } }
      });
    }
  });
  G.resume = (s) => { G.scene = s; };
})();
