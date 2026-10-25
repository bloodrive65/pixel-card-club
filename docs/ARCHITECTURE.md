# How It Works

Pixel Card Club is plain JavaScript drawing onto an HTML5 `<canvas>`. It has no game engine, framework or build step. The same `app/` folder runs in a browser or inside the Electron desktop wrapper.

## Rendering: a fake 16-bit screen

- The game draws to a fixed **640×360** canvas (16:9, like a widescreen SNES-era resolution).
- CSS scales the canvas up with `image-rendering: pixelated`, in whole-number steps by default (2× = 1280×720, 3× = 1920×1080), so every pixel stays a crisp square. See `G.resize()` in `engine.js`.
- Colours come from a fixed palette (`G.P`), based on Sweetie-16 plus a few felt and wood tones. Limiting the palette is what makes it look "16-bit".
- Text uses **bitmap fonts**. Press Start 2P (8 px) and Silkscreen (5 px) were converted into per-glyph pixel rows (`font.js`) and are drawn from a cached atlas for each colour, so text never blurs.
- The felt table is pre-rendered once with noise and an ordered-dither (Bayer) vignette instead of smooth gradients.

## Main loop

`main.js` runs one `requestAnimationFrame` loop:

```
ui.begin()  →  scene.frame(dt)  →  ui.end()  →  clear one-frame input flags
```

A **scene** is any object with `enter()` and `frame(dt)`: `G.Menu`, `G.Blackjack`, `G.Solitaire` or `G.GoFish`. `G.go(scene)` switches between them.

## Cards (`cards.js`)

- A card is a plain object: `{ id, suit, rank, faceUp, x, y, tx, ty, z, delay, flip }`.
- **The card art is generated in code** at startup: pips laid out on a grid, J/Q/K portraits drawn pixel by pixel, and four patterned backs. Each card face is cached as a 44×62 offscreen canvas. A custom sprite sheet can replace it (see CUSTOM_CARDS.md).
- **Animation uses targets.** Every frame, a game's `layout()` sets each card's *target* `(tx, ty, z, faceUp)` from the current game state. `G.updateCards()` eases the real `(x, y)` toward the target and plays a horizontal-squash flip whenever `faceUp` changes. `delay` staggers deals. Game logic never animates anything directly; it only changes state.
- `G.drawCards()` sorts by `z`, then draws moving and dragged cards on top.

## UI and HUD (`ui.js`)

The UI is **immediate mode**: `if (ui.button('HIT', x, y, w, h, { key: 'h' })) hit();` draws the button and returns `true` when it's clicked or its hotkey is pressed.

- `ui.topBar()`: the shared HUD (menu button, title and stat readouts).
- `ui.dialog()`, `ui.pauseMenu()`, `ui.rulesPanel()`: modal overlays. While one is open, `ui.modal` blocks everything underneath.
- `ui.blocked()`: card games check this so a click on a button doesn't also grab a card underneath.
- `ui.tag()`, `ui.banner()`, `ui.bubble()`: labels, messages and speech bubbles.

## Turn timing

Blackjack and Go Fish use a small **step queue** (`after(seconds, fn)` / `runQueue(dt)`). Dealing, dealer draws and AI turns are queued with short pauses, so you can follow what's happening, and the queue stops while the game is paused.

## The games

| File | Key pieces |
|---|---|
| `blackjack.js` | `handTotal()` (soft/hard Aces), `basicStrategy()` (the HINT advisor: multi-deck, dealer stands on soft 17, double after split), shoe and reshuffle, split hands, payouts, dealer AI (hit < 17) |
| `solitaire.js` | Piles (`stock`, `waste`, `found[4]`, `tab[7]`), `legal()` and `canTab()`/`canFound()`, drag and drop with best-overlap drop target, click-to-move `bestDest()`, snapshot-based unlimited undo, `findHint()`, auto-finish, Windows-style scoring, bouncing-card win screen |
| `gofish.js` | Turn flow (`startTurn` → `ask` → give or go fish → `checkBooks` → `nextTurn`), the AI memory model below, table-talk log, speech bubbles |

### Go Fish AI

Each computer player keeps a memory of facts it has *observed*:

- `has[player_rank]`: that player asked for this rank, so they hold at least one.
- `lacks[player_rank]`: that player just said "Go Fish" for this rank. This is forgotten as soon as they draw a new card.

Skill levels change how much is remembered and how it's used:

- **Easy** records nothing and asks for a random rank from a random player.
- **Normal** records each fact with a 60% chance and forgets 15% of its memory every turn.
- **Hard** remembers everything, asks a player it *knows* holds a rank first, otherwise asks for the rank it holds the most of, aimed at the player with the most cards who isn't known to lack it.

The AI only uses information a human at the table could also know. It never looks at hidden hands.

## Saving

`G.store.get/set` works the same everywhere:

- **Desktop app:** `electron/preload.js` exposes `window.cardclubNative`, which reads and writes `save.json` in the app's user-data folder (`%APPDATA%\Pixel Card Club\` on Windows).
- **Browser:** values are kept in memory for the session.

Saved data: settings, Blackjack chips and best stack, Solitaire games played, won and best score, and Go Fish games played and won.

## Sound

All sound effects are synthesized live with the Web Audio API in `engine.js` (`G.audio.sfx(name)`): square and triangle chiptune blips for buttons, wins and losses, and filtered noise bursts for dealing and shuffling. There are no audio files.

## Adding a new game

1. Create `app/js/games/mygame.js` defining `G.MyGame = { title, rules: [...], enter() {...}, frame(dt) {...} }`.
2. Use `G.makeDeck()`, `G.place()`, `G.updateCards()`, `G.drawCards()`, `ui.topBar()` and `ui.pauseMenu(this)` just like the existing games.
3. Add a `<script>` tag in `index.html` and an entry to the `GAMES` list in `main.js`.
