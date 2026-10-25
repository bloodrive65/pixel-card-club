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

A **scene** is any object with `enter()` and `frame(dt)`: `G.Menu`, `G.Blackjack`, `G.Solitaire`, `G.GoFish` or `G.Rulebook`. `G.go(scene)` switches between them, and `G.resume(scene)` returns to a game without restarting it (used when the rulebook closes).

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

## The Club (`roster.js`)

- `G.ROSTER` is a list of 18 members. Each has an `id`, `name`, `skill` (0 Easy, 1 Normal, 2 Hard), `fish` habits (`rank`: `random` or `most`; `target`: `random`, `mostCards`, `leader` or `human`; optional `perfect`), a Blackjack style `bj` (`basic`, `cautious`, `reckless`, `dealer` or `hunch`), a bet size, a quote and table-talk `lines`.
- **Portraits are generated in code.** `G.avatar(id)` builds a 24×24 canvas from the member's colours, hair, hat and accessories (glasses, shades, monocle, beard, eyepatch…), and caches it. `G.drawAvatar()` draws it at any whole-number scale.
- `G.miniCard()` and `G.drawMiniBook()` draw the small 14×20 cards used for books on the table and in the rulebook.
- `G.rosterPicker(state)` is the shared opponent picker (seat slots, a 6×3 grid of portraits and an info panel). Go Fish and Blackjack both use it. `G.fillRandom()` fills empty seats.
- `G.record()` / `G.addRecord()` store each member's win/loss record against you.

## The rulebook (`rulebook.js`)

- `G.Rulebook` is a scene that draws a desk, a leather cover and two cream pages, with chapter tabs down the right edge.
- Pages are data: each page is a list of blocks (`h`, `h2`, `p`, `li`, `table`, `cards`, `groups`, `books`, `tip`, `member`, `toc`, `draw`). A small layout function wraps text to the page width and stacks blocks top to bottom. A QA check warns if any page overflows.
- Turning a page squeezes the turning page horizontally with a cosine curve, then reveals the next spread, with a paper `page` sound.
- `G.Rulebook.open(chapter, returnScene)` opens at a chapter. Each game sets `bookChapter`, so **Esc → How to Play** opens its own chapter.

## Turn timing

Blackjack and Go Fish use a small **step queue** (`after(seconds, fn)` / `runQueue(dt)`). Dealing, dealer draws and AI turns are queued with short pauses, so you can follow what's happening, and the queue stops while the game is paused.

## The games

| File | Key pieces |
|---|---|
| `blackjack.js` | `handTotal()` (soft/hard Aces), `basicStrategy()` (the HINT advisor: multi-deck, dealer stands on soft 17, double after split), shoe and reshuffle, split hands, payouts, dealer AI (hit < 17). Table-mates: setup screen, `startPlay()` → `nextSeat()` (right seat, you, left seat, dealer), `aiDecide()` per style. The dealer only draws if some hand is still live. |
| `solitaire.js` | Piles (`stock`, `waste`, `found[4]`, `tab[7]`), `legal()` and `canTab()`/`canFound()`, drag and drop with best-overlap drop target, click-to-move `bestDest()`, snapshot-based unlimited undo, `findHint()`, auto-finish, Windows-style scoring, bouncing-card win screen |
| `gofish.js` | Setup screen (free-for-all or teams), turn flow (`startTurn` → `ask` → give or go fish → `checkBooks` → `nextTurn`), `targets()` (teams may only ask the other team), books flying to the table, `poolTeams()`, the AI memory model below, table-talk log, speech bubbles |

### Go Fish AI

Each computer player keeps a memory of facts it has *observed*:

- `has[player_rank]`: that player asked for this rank, so they hold at least one.
- `lacks[player_rank]`: that player just said "Go Fish" for this rank. This is forgotten as soon as they draw a new card.

How much is heard and kept depends on the member's skill: Easy hears nothing, Normal hears 60% of facts and forgets 15% of its memory each turn, Hard hears 95% and never forgets, and BYTE (`perfect`) hears everything.

On its turn a member first asks a player it *knows* holds one of its ranks. Otherwise it picks a rank (`random`, or the rank it holds `most` of), skips players known to lack it, and chooses a target by habit: `mostCards`, the `leader` (counting team books in teams mode), the `human`, or at random. A member that just had cards taken may hold a `grudge` against the taker.

The AI only uses information a human at the table could also know. It never looks at hidden hands.

### Go Fish teams

Seats are `[you, rival, partner, rival]`, so turns alternate between teams. `targets()` filters out teammates. Books are still laid per player, and `teamBooks()` sums them. In teams mode a team can end up holding all four cards of a rank between its two players with no legal way to collect them, because teammates can't ask each other. `poolTeams()` runs whenever the pond is empty and turns any such rank into a book for that team, so the game always reaches 13 books.

## Saving

`G.store.get/set` works the same everywhere:

- **Desktop app:** `electron/preload.js` exposes `window.cardclubNative`, which reads and writes `save.json` in the app's user-data folder (`%APPDATA%\Pixel Card Club\` on Windows).
- **Browser:** values are kept in memory for the session.

Saved data: settings (including chosen opponents and teams), Blackjack chips and best stack, table-mates' chips (`bj_mates`), Solitaire games played, won and best score, Go Fish games played and won, and each Club member's record against you (`records`).

## Sound

All sound effects are synthesized live with the Web Audio API in `engine.js` (`G.audio.sfx(name)`): square and triangle chiptune blips for buttons, wins and losses, and filtered noise bursts for dealing and shuffling. There are no audio files.

## Adding a new game

1. Create `app/js/games/mygame.js` defining `G.MyGame = { title, rules: [...], enter() {...}, frame(dt) {...} }`.
2. Use `G.makeDeck()`, `G.place()`, `G.updateCards()`, `G.drawCards()`, `ui.topBar()` and `ui.pauseMenu(this)` just like the existing games.
3. Add a `<script>` tag in `index.html` and an entry to the `GAMES` list in `main.js`.
