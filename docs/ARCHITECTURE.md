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

A **scene** is any object with `enter()` and `frame(dt)`: `G.Menu`, `G.Blackjack`, `G.Holdem`, `G.Solitaire`, `G.Spider`, `G.GoFish`, `G.Crazy8`, `G.War` or `G.Rulebook`. `G.go(scene)` switches between them, and `G.resume(scene)` returns to a game without restarting it (used when the rulebook closes).

## Cards (`cards.js`)

- A card is a plain object: `{ id, suit, rank, faceUp, x, y, tx, ty, z, delay, flip }`.
- **The card art is generated in code** at startup: pips laid out on a grid, J/Q/K portraits drawn pixel by pixel, and four patterned backs. Each card face is cached as a 44×62 offscreen canvas. A custom sprite sheet can replace it (see CUSTOM_CARDS.md).
- **Deck styles** live in `G.DECKS`. Each entry has `face(suit, rank)`, `back(spec, i)`, four back specs and an `ink` palette that the mini cards also use. `G.applyDeck(i)` rebuilds every face and back at run time, so the Customize menu can switch decks without restarting. `western.js` adds the Western Deck: it draws clean cards in a sepia palette and then ages them in a pixel pass (`weather()`): darker edges and bottom, coffee-ring and blot stains, foxing spots, a crease, about 10% of ink pixels faded, nicks punched into the outline and dog-eared corners. A seeded random generator gives every card the same wear each time.
- **Animation uses targets.** Every frame, a game's `layout()` sets each card's *target* `(tx, ty, z, faceUp)` from the current game state. `G.updateCards()` eases the real `(x, y)` toward the target and plays a horizontal-squash flip whenever `faceUp` changes. `delay` staggers deals. Game logic never animates anything directly; it only changes state.
- `G.drawCards()` sorts by `z`, then draws moving and dragged cards on top.

## UI and HUD (`ui.js`)

The UI is **immediate mode**: `if (ui.button('HIT', x, y, w, h, { key: 'h' })) hit();` draws the button and returns `true` when it's clicked or its hotkey is pressed.

- `ui.topBar()`: the shared HUD (menu button, title and stat readouts).
- `ui.dialog()`, `ui.pauseMenu()`, `ui.rulesPanel()`: modal overlays. While one is open, `ui.modal` blocks everything underneath.
- `ui.blocked()`: card games check this so a click on a button doesn't also grab a card underneath.
- `ui.tag()`, `ui.banner()`, `ui.bubble()`: labels, messages and speech bubbles.

## The Club (`roster.js`)

- **Form**: `skill` is only a member's usual level. `G.rollForm(ch)` rolls a 0–2 form from it (Easy 60/30/10, Normal 25/50/25, Hard 10/30/60) and `G.rollForms(players, log)` sets `p.form` on every seated member when a game starts. All AI code reads `p.form`, never `ch.skill`, and the seat panels draw `p.form` as hearts.
- **Player profile**: `G.profile()` (saved in `settings.profile`) holds the player's name and look as indexes into `G.PROFILE_OPTS`. `G.profileChar()` turns it into a portrait spec, `G.avatar('you')` draws it, and `G.resetAvatar('you')` clears the cache after an edit. `G.playerName()` and `G.dn(p)` give display names; game logic keeps `name: 'YOU'` for grammar in the log. `G.youPlate()` draws the player's seat plate.
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

### Blackjack table-mate temper

Each member's `temper` in `roster.js` has `press` (bet growth per win in a streak), `chase` (bet growth, or shrink if negative, per loss), a `nerve` (`steady`, `hothead`, `jittery` or `confident`) and an optional `kelly` share of the stack.

- `mateResult()` updates `m.streak` after each hand and picks a line: comeback, cooled-off, hot, cold or tilt first, then the ordinary win/lose/push lines.
- `mateBet()` sets the bet as base × multiplier. The multiplier comes from the streak (a streak of 1 counts half) and is adjusted when the stack is well up or down, then clamped to 0.4×–4×. Bet comments only fire when the multiplier really changes (not on a hunch wobble), with a two-hand cooldown.
- `risk()` turns streak and nerve into a value from −2 to +2. `aiDecide()` shifts each style's thresholds by it, and at ±2 a stiff hand (hard 12–16) may be hit or stood on against the member's usual style (`moodMove`, with its own lines).
- `mood()` gives the panel label. `LINES` in `blackjack.js` is the general table-talk pool, mixed with each member's own `hot` and `cold` lines.

## Table themes

`G.TABLES` in `ui.js` holds nine felt palettes of five tones each. `G.applyTable(i)` writes them into `P.felt0`–`P.felt4` and clears the cached felt texture, so every screen that uses those colours follows the chosen table.

## Shared table kit (`table.js`)

Hold'em, Crazy Eights and War share `G.TableKit`, mixed into each game: the step queue, the table-talk log, speech bubbles, seat panels, opponent slots, the pause-menu helper, and the setup screen (1–3 opponents, one game option, the Club picker and random picks). `G.talk()` mixes a member's own lines with generic ones and fills placeholders such as `{amt}`.

## Turn timing

Blackjack, Go Fish, Hold'em, Crazy Eights and War use a small **step queue** (`after(seconds, fn)` / `runQueue(dt)`). Dealing, dealer draws and AI turns are queued with short pauses, so you can follow what's happening, and the queue stops while the game is paused.

## The games

| File | Key pieces |
|---|---|
| `blackjack.js` | `handTotal()` (soft/hard Aces), `basicStrategy()` (the HINT advisor: multi-deck, dealer stands on soft 17, double after split), shoe and reshuffle, split hands, payouts, dealer AI (hit < 17). Table-mates: setup screen, `startPlay()` → `nextSeat()` (right seat, you, left seat, dealer), `aiDecide()` per style. The dealer only draws if some hand is still live. |
| `solitaire.js` | Piles (`stock`, `waste`, `found[4]`, `tab[7]`), `legal()` and `canTab()`/`canFound()`, drag and drop with best-overlap drop target, click-to-move `bestDest()`, snapshot-based unlimited undo, `findHint()`, auto-finish, Windows-style scoring, bouncing-card win screen |
| `holdem.js` | Sit-and-go with rising or fixed blinds, heads-up blind rules, minimum raises and short all-ins (`act()`), `advance()` / `endRound()` / `nextStreet()`, burn cards, all-in runouts, side pots built from each player's total contribution (`showdown()`), odd chips left of the button. `G.pokerEval()` scores the best 5 of 7 cards; `G.pokerEquity()` runs a Monte Carlo simulation used by the AI and the odds helper. AI styles (shark, lag, rock, station, maniac, wild) adjust looseness, aggression, bluffing and calling, and the member's nerve shifts them after big pots. |
| `spider.js` | Two decks re-suited for 1, 2 or 4 suits, the 54-card deal, `movableFrom()` (same-suit runs), `checkRun()` to remove K–A runs, deal row only when no column is empty, snapshot undo, ranked hints, Windows scoring |
| `crazy8.js` | Deal (7 for two players, else 5), starter 8 buried, `legal()`, wild 8 suit picker, draw/reshuffle/pass/blocked hands, scoring and match to 100. AI: easy random, normal holds 8s and plays its longest suit, hard tracks suits each player couldn't follow |
| `war.js` | Even deal (17 each plus a spare for three players), battles and multi-player wars, the last-card rule, won cards returned in random order, one-pass mode, auto-flip and speed |
| `gofish.js` | Setup screen (free-for-all or teams), turn flow (`startTurn` → `ask` → give or go fish → `checkBooks` → `nextTurn`), `targets()` (teams may only ask the other team), books flying to the table, `poolTeams()`, the AI memory model below, table-talk log, speech bubbles |

### Go Fish AI

Each computer player keeps a memory of facts it has *observed*:

- `has[player_rank]`: that player asked for this rank, so they hold at least one.
- `lacks[player_rank]`: that player just said "Go Fish" for this rank. This is forgotten as soon as they draw a new card.

How much is heard and kept depends on the member's form for this game (see below): Easy hears nothing, Normal hears 60% of facts and forgets 15% of its memory each turn, Hard hears 95% and never forgets, and BYTE (`perfect`) hears everything.

On its turn a member first asks a player it *knows* holds one of its ranks. Otherwise it picks a rank (`random`, or the rank it holds `most` of), skips players known to lack it, and chooses a target by habit: `mostCards`, the `leader` (counting team books in teams mode), the `human`, or at random. A member that just had cards taken may hold a `grudge` against the taker.

The AI only uses information a human at the table could also know. It never looks at hidden hands.

### Go Fish teams

Seats are `[you, rival, partner, rival]`, so turns alternate between teams. `targets()` filters out teammates. Books are still laid per player, and `teamBooks()` sums them. In teams mode a team can end up holding all four cards of a rank between its two players with no legal way to collect them, because teammates can't ask each other. `poolTeams()` runs whenever the pond is empty and turns any such rank into a book for that team, so the game always reaches 13 books.

## Saving

`G.store.get/set` works the same everywhere:

- **Desktop app:** `electron/preload.js` exposes `window.cardclubNative`, which reads and writes `save.json` in the app's user-data folder (`%APPDATA%\Pixel Card Club\` on Windows).
- **Browser:** values are kept in memory for the session.

Saved data: settings (including chosen opponents and teams, table colour, deck and card back), Blackjack chips and best stack, table-mates' chips (`bj_mates`), Solitaire games played, won and best score, Spider wins and best score per suit count, Go Fish, Crazy Eights, War and Hold'em games played and won, and each Club member's record against you (`records`).

## Sound

All sound effects are synthesized live with the Web Audio API in `engine.js` (`G.audio.sfx(name)`): square and triangle chiptune blips for buttons, wins and losses, and filtered noise bursts for dealing and shuffling. There are no audio files.

## Adding a new game

1. Create `app/js/games/mygame.js` defining `G.MyGame = { title, rules: [...], enter() {...}, frame(dt) {...} }`.
2. Use `G.makeDeck()`, `G.place()`, `G.updateCards()`, `G.drawCards()`, `ui.topBar()` and `ui.pauseMenu(this)` just like the existing games.
3. Add a `<script>` tag in `index.html` and an entry to one of the `PAGES` in `main.js` (the main menu has two pages: The Classics and More Games, each tile with its own page-local number key).
