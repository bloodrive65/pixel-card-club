// Pixel Card Club - extra deck styles (1.7): Four Colour and Midnight.
// They reuse the Classic drawing code with different inks. Added after the Western deck so saved choices keep their numbers.
(function () {
  'use strict';
  const C = G.DECKS[0];
  // Four Colour: every suit has its own colour - spades black, hearts red, diamonds blue, clubs green
  G.DECKS.push({
    name: 'FOUR COLOUR', tint: true, backs: C.backs, face: C.face, back: C.back,
    ink: Object.assign({}, C.ink, { suit: ['#1a1c2c', '#b13e53', '#2f5fc4', '#22894a'] })
  });
  // Midnight: dark cards with glowing ink
  G.DECKS.push({
    name: 'MIDNIGHT', backs: C.backs, face: C.face, back: C.back,
    ink: { paper: '#22274a', edge: '#151a30', line: '#06070d', red: '#ff6b81', black: '#d8e2ff', frame: '#2e3563', backBorder: '#22274a',
      suit: ['#d8e2ff', '#ff6b81', '#ffb35c', '#7cf0c0'] }
  });
})();
