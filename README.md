# Pixel Card Club

A 16-bit pixel-art card game collection for Windows (and the browser). It has three classic games, each with its own HUD, animated cards, chiptune sound effects and computer opponents where needed.

| Game | Mode | Highlights |
|---|---|---|
| **Blackjack** | You vs the dealer | Hit, stand, double, split, 3:2 blackjacks, a 1–6 deck shoe, and a basic-strategy **advisor** |
| **Solitaire** | Klondike, solo | Draw 1 or 3, drag and drop or click-to-move, unlimited undo, hints, auto-finish, classic bouncing-card win screen |
| **Go Fish** | You vs 1–3 AI players | Easy / Normal / Hard AI that **remembers** what other players ask for, speech bubbles and a table-talk log |

![Main menu](docs/screenshots/menu.png)

| Blackjack | Solitaire | Go Fish |
|---|---|---|
| ![Blackjack](docs/screenshots/blackjack.png) | ![Solitaire](docs/screenshots/solitaire.png) | ![Go Fish](docs/screenshots/gofish.png) |

## Download and play (Windows)

1. Open the [**Releases**](../../releases) page.
2. Download one of:
   - `PixelCardClub-x.y.z-portable.exe`: a single file. Double-click to play; no install needed.
   - `Pixel.Card.Club.Setup.x.y.z.exe`: a normal installer with Start-menu and desktop shortcuts.
3. Windows SmartScreen may warn about an unknown publisher, because the app isn't code-signed. Click **More info → Run anyway**.

Your chips, wins, best scores and settings are saved automatically to `%APPDATA%\Pixel Card Club\save.json`.

### Play in a browser instead

Open `app/index.html` in any modern browser (Chrome, Edge, Firefox). No server or install is needed. In the browser, progress lasts only for the session.

## Controls at a glance

| Where | Key / mouse | Action |
|---|---|---|
| Everywhere | **Mouse** | Everything is clickable |
| Everywhere | **Esc** | Pause menu: Resume, How to Play, New Game, Main Menu |
| Everywhere | **F11** | Toggle fullscreen (desktop app) |
| Main menu | **1 / 2 / 3** | Start Blackjack / Solitaire / Go Fish |
| Main menu | **O** | Options |
| Blackjack | **1–4**, **C**, **A**, **Space** | Add 5/25/100/500 chips, clear the bet, all in, deal |
| Blackjack | **H S D P ?** | Hit, Stand, Double, Split, Hint |
| Solitaire | **N Z H A** | New deal, Undo, Hint, Auto-finish |
| Go Fish | **Left click / right click** | Choose a card, then a player / cancel the selection |

Full rules and strategy for every mode are in [**docs/HOW_TO_PLAY.md**](docs/HOW_TO_PLAY.md). The same rules are also available in-game from **Esc → How to Play**.

## Options

- **Sound**: on or off. All sounds are generated live, so there are no audio files.
- **Card back**: Crimson, Cobalt, Forest or Royal.
- **Scaling**: *Pixel perfect* scales the 640×360 image by whole numbers (2×, 3×, 4×…) for perfectly sharp pixels. *Fill window* stretches it to fit.
- **Solitaire draw**: draw 1 or draw 3.
- **Blackjack decks**: 1, 2, 4 or 6 decks in the shoe.
- **Reset chips + wins**: clears saved stats.

## Using your own card art

The built-in deck is drawn in code, but you can drop in any pixel-art sprite sheet, such as [Art_Bickles' Pixel Playing Cards](https://art-bickles.itch.io/playing-cards) or [drawsgood's 8Bit Deck](https://drawsgood.itch.io/8bit-deck-card-assets). See [**docs/CUSTOM_CARDS.md**](docs/CUSTOM_CARDS.md). Please follow each artist's license, and don't commit paid assets to a public repo.

## Building from source

```bash
npm install
npm start            # run the desktop app
npm run dist:win     # build the Windows installer and portable .exe into release/
```

Full details, including automatic GitHub releases, are in [**docs/BUILDING.md**](docs/BUILDING.md). For how the code is put together, see [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md).

## Project layout

```
app/                  the game itself (plain HTML5 canvas + JavaScript, no frameworks)
  index.html
  js/engine.js        canvas scaling, input, bitmap text, chiptune audio, save storage
  js/cards.js         card model, procedural pixel card art, card animation
  js/ui.js            buttons, HUD bar, dialogs, pause and rules menus, felt table
  js/games/*.js       blackjack.js, solitaire.js, gofish.js
  js/main.js          main menu, options, scene manager, game loop
  assets/cards/       optional custom card sprite sheet (see docs/CUSTOM_CARDS.md)
electron/             desktop wrapper (window, fullscreen, save file)
docs/                 documentation and screenshots
.github/workflows/    automatic Windows build + release
```

## Credits and license

- Code: MIT License (see [LICENSE](LICENSE)).
- Fonts: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38 and [Silkscreen](https://fonts.google.com/specimen/Silkscreen) by Jason Kottke, both under the SIL Open Font License 1.1. They're baked into `app/js/font.js` as bitmap data.
- Palette based on [Sweetie 16](https://lospec.com/palette-list/sweetie-16) by GrafxKid.
