# Using Your Own Card Art

The game ships with its own deck, drawn in code at **44×62 pixels** with 4 card backs. You can replace it with any pixel-art sprite sheet, without touching the code.

## 1. Add the image

Put your sprite sheet (PNG) in `app/assets/cards/`, for example `app/assets/cards/my-deck.png`.

## 2. Describe the sheet

Copy `app/assets/cards/deck.example.js` to `app/assets/cards/deck.js` and edit it:

```js
window.CUSTOM_DECK = {
  image: 'assets/cards/my-deck.png', // path relative to app/index.html
  cardWidth: 57,                      // one card's size in the sheet
  cardHeight: 79,
  offsetX: 0, offsetY: 0,             // pixel position of the first card
  gapX: 0, gapY: 0,                   // spacing between cards
  layout: 'rows',                     // 'rows' = one suit per row; 'columns' = one suit per column
  suitOrder: ['S', 'H', 'D', 'C'],    // suit order in the sheet (S=Spades H=Hearts D=Diamonds C=Clubs)
  rankOrder: [1,2,3,4,5,6,7,8,9,10,11,12,13], // Ace..King order across each row (use [2,...,13,1] if Aces are last)
  backs: [[0, 4]]                     // [column, row] of each card back in the sheet (up to 4)
};
```

Reload the game (or restart the desktop app). If the image can't be found, the game quietly falls back to the built-in deck and logs a warning in the developer console (Ctrl+Shift+I).

## Notes

- Cards are scaled to the game's 44×62 card size with nearest-neighbour scaling, so pixels stay sharp. Art drawn at about that size, or at exactly 2× it (88×124), looks best.
- If your pack ships one PNG per card instead of a sheet, combine them into a sheet first. Any sprite-sheet packer works, or ask for a small script.
- **Licenses:** check the artist's terms. For example, [Art_Bickles' Pixel Playing Cards](https://art-bickles.itch.io/playing-cards) allow use in games but not redistributing the raw assets. If your repository is public, add the image to `.gitignore` (or keep `deck.js` out of the repo) and include the art only in your own builds.
