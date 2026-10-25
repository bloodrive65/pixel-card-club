// Copy this file to deck.js (same folder) to use your own card art.
// See docs/CUSTOM_CARDS.md for details.
window.CUSTOM_DECK = {
  image: 'assets/cards/my-deck.png', // sprite sheet, relative to index.html
  cardWidth: 57,                      // size of one card in the sheet (px)
  cardHeight: 79,
  offsetX: 0, offsetY: 0,             // where the first card starts
  gapX: 0, gapY: 0,                   // spacing between cards
  layout: 'rows',                     // 'rows' = one suit per row, 'columns' = one suit per column
  suitOrder: ['S', 'H', 'D', 'C'],    // order of suits in the sheet
  rankOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], // A..K order across each row
  backs: [[0, 4]]                     // [column, row] of card back(s) in the sheet
};
