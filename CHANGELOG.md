# Changelog

Every version of Pixel Card Club, newest first. The current version is also summarized at the top of the [README](README.md). Downloads for each version are on the [Releases page](https://github.com/bloodrive65/pixel-card-club/releases).

## 1.7.6

- **Cleaner Go Fish table in portrait**: the table now has three clear areas. Opponents sit across the top. The middle shows the current exchange (who asked whom for what, and the reply) with the pond right below it. Your prompt, card count, books and hand sit together at the bottom.
- The table talk box in Go Fish is now one compact line under the pond. Tap it for the full history.
- In portrait Go Fish, your own name plate and speech bubble are gone. Your books are laid in one row just above your hand.

## 1.7.5

- **Bigger cards in portrait**: your hand, the centre piles, the Hold'em board and the Blackjack dealer's cards are now 1.5x larger when the phone is held upright, so they are easier to see and to tap. The portrait screen is drawn at double resolution, so the bigger cards stay sharp.
- **Your hand sits at the bottom**: in Go Fish and Crazy Eights your cards are low on the screen, next to your thumbs. Above 8 cards the hand splits into two rows.
- **Table talk moved to open space**: Go Fish, Crazy Eights and War show table talk as a box in the middle of the table, beside the pond or piles. Hold'em uses the gap above the action buttons. Tap the box to read the whole conversation.
- War puts your deck and battle cards low on the screen. The card count and table talk share the middle.

## 1.7.4

- **Easier portrait controls on iPhone**: every button in portrait is bigger and more spread out, so it is hard to hit the wrong one. This covers the game tables, setup screens, main menu, profile, customize, options, pause menu, end-of-game windows and the rulebook.
- **Buttons fire when you lift your finger**: on touch screens a button only triggers if your finger is still on it when you let go. Slide off a button to cancel.
- **Compact table talk**: in portrait the chat log is now a slim strip showing the last two lines. Tap it to read the whole conversation, then tap anywhere to close it.
- **Bigger hands split into two rows** in Crazy Eights and Go Fish once you hold more than 9 cards, so every card stays wide enough to tap.
- Hold'em, Blackjack, War, Solitaire and Spider have larger bottom button bars in portrait; War's card count is now a compact two-column panel.

## 1.7.3

- **Portrait and landscape on iPhone and iPad**: hold the device upright or sideways and the game re-lays itself to fit, even in the middle of a hand. In portrait, every game has its own tall table with the main buttons in easy thumb reach along the bottom. The menu, setup screens, profile, customize screen, options and rulebook have upright layouts too.
- **Sound with the ringer off**: on iPhone and iPad the game's sound now plays even when the Ring/Silent switch is set to silent, the same way video audio does. Use the volume buttons, or turn sound off in Options.
- Crazy Eights no longer shows the keyboard hint "(D DRAWS)" on touch screens.

## 1.7.2

- **Redrawn court cards**: the Jacks, Queens and Kings are new full-length, double-headed figures with real shading (3–4 tones per colour and a soft outline). The King has a sword and a golden orb, the Queen has a lace collar and fan, and the Jack carries a halberd and wears a feathered beret.
- **Bigger aces**: every Ace now shows one large, clean suit symbol in the centre.

## 1.7.1

- **New splash logo**: the bloodrive65 intro now shows a pixel-art version of the bloodrive65 wolf, redrawn in the game's palette, with the name in dark red.

## 1.7.0

- **Developer splash**: a short bloodrive65 intro when the game opens. It fades out on its own after about two seconds, or tap / click / press any key to skip it.
- **Detailed court cards**: the Classic deck's Jacks, Queens and Kings are now double-headed portraits (like a real deck), with robes coloured by suit. Every Ace has an ornate medallion, and the Ace of Spades gets a gold sunburst.
- **New decks**: **Four Colour** (spades black, hearts red, diamonds blue, clubs green) and **Midnight** (dark cards with glowing ink).
- **Card colours**: Classic and Four Colour cards come in White, Ivory, Mint, Sky, Rose or Gold.
- **Four new card backs** with their own patterns: Gold (sunburst), Ocean (waves), Ember (checks) and Shadow (stripes).
- **Table surfaces**: Felt, Pattern (a diamond weave), Wood Rail (patterned felt with a wooden rail), Wood (a plank table) and Casino (wood rail with gold pinstripes).
- The **Customize** menu now has **TABLE** and **CARDS** tabs, with a preview of the whole table.

## 1.6.5

- iPhone / iPad: the game no longer shrinks when any keyboard opens, including the browser's own address bar. It keeps its full size behind the keyboard and is still the right size when the keyboard closes. Rotating the device and toolbars showing or hiding still resize it normally.

## 1.6.4

- **The web version now updates itself.** GitHub Pages lets browsers reuse files for up to 10 minutes, so a phone or tablet could keep opening an older version. The game now always asks for the newest files. When a new version is published, it reloads on its own: right away if you are on the main menu, or the next time you return to it, so a hand in progress is never cut off.
- Links with extra tags on the end (such as `?utm_source=...`) open the same up-to-date game and still work offline.
- Releasing: the version number lives in `package.json`, `app/version.json` and `G.VERSION` in `app/js/main.js`.

## 1.6.3

- Typing your name on iPhone / iPad: the game no longer shrinks when the on-screen keyboard opens. It keeps its size and slides up just enough to keep the name box above the keyboard.
- When the keyboard closes, the game returns to full screen right away, instead of staying the wrong size until you refresh.
- The keyboard's return key reads Done, and the browser's password and address suggestions no longer appear over the name box (where the browser allows it).

## 1.6.2

- **No more border in the PC browser or the desktop app.** Fill window is now the default screen mode, and it fills the whole window at any size or shape. The game stays centred, and the table, top bar and bottom controls stretch into the extra space. Saves from older versions switch to Fill window once. You can still pick Pixel perfect in Options for perfectly even pixels with a border.

## 1.6.1

- **Fills the whole screen on iPad and iPhone.** The game no longer shows black bars when the screen is not widescreen, such as an iPad, or a phone or tablet browser with its address bar showing. The table, top bar, bottom controls and the rulebook desk now stretch into the extra space, and the game stays centred. This works in Safari, Chrome and Firefox, and in the Home Screen app.

## 1.6.0

- **Play on iPhone and iPad.** The game is now hosted on GitHub Pages and works as a touch game. Add it to your Home Screen and it opens full screen like an app (see [Play on iPhone / iPad](#play-on-iphone--ipad)).
- Touch controls: tap anything you would click. The keyboard hints on the buttons are hidden on touch screens, and on-screen hints say TAP instead of CLICK.
- Tap the name box in Your profile to type your name with the on-screen keyboard.
- The picture scales to fill the screen on phones and tablets, and a "turn your device sideways" screen appears in portrait.
- Progress in the browser and on iPhone / iPad is now saved on the device, so chips, wins and settings carry over between visits.
- It works offline after the first visit.

## 1.5.0

- **Watch to the end** (Options > WHEN YOU ARE OUT): when you are knocked out, keep watching the Club finish the game and see who wins.
  - Hold'em: the remaining players play on at double pace until one holds every chip.
  - War: the rest flip on auto at speed x3 until one player holds every card.
  - Blackjack: when you run out of chips, your table-mates play up to 20 more hands with no rebuys. The one with the most chips wins the table, then you can take a fresh stack and sit back in.
  - **K** or **SKIP TO RESULT** jumps straight to the standings.
- Floating payout text (+15, -25, PUSH, BUST) now stays in open felt, so it never drifts over a name plate or a result tag.
- Crazy Eights: the suit picker explains that the next player must follow the suit you name, and shows how many of each suit you hold.
- Hold'em: your plate shows your finishing place once you are out.

## 1.4.3

- Blackjack: table-mate plates are a touch wider. Form hearts now sit next to the name, and the mood tag (HOT, COLD, ON FIRE, DOWN BAD and so on) moved down beside the chip count, so long names like CAPT FINN or GRANNY JO no longer collide with it. When there is no mood, the win/loss streak shows in that spot.

## 1.4.2

- War: your deck and its card count sit a little higher, so the "YOUR DECK" label no longer hides under the flip hint.
- Blackjack: the "BLACKJACK PAYS 3 TO 2" table print fades away once cards are dealt, so the dealer total and result banners never sit on top of it.

## 1.4.1

- Your speech bubble now pops up above your own seat plate instead of over your cards (Go Fish and Crazy Eights).
- Every speech bubble, yours and the Club members', stays on screen about a second longer.

## 1.4

- **Form is dealt each game**: Club members no longer show fixed hearts. Each game, every member at the table gets hearts for their form that game, rolled from their usual level, so a shark can have an off night and an easy player can get hot. The AI plays to its form.
- **Your own profile**: press **P** (or click your badge on the main menu) to set your name and build your portrait: skin, hair, hat, facial hair, glasses, extras, shirt and backdrop. You now have a seat plate at every Club table.

## 1.3.1

- **Two-page main menu**: the three classics (Blackjack, Solitaire, Go Fish) are back on the first page with the 1.2 layout, and the newer games are on a second page.

## 1.3

- **Four new games**: Texas Hold'em, Spider Solitaire, Crazy Eights and War, each with its own HUD and Club opponents.
- **Customize menu** (press **C**): nine table colours (Green, Blue, Red, Brown, Orange, Pink, Purple, Teal, Charcoal), card backs and a choice of deck.
- **The Western Deck**: a worn 1890s deck with yellowed stock, coffee stains, faded ink and nicked corners. The court cards are an outlaw, a saloon queen and a cattle baron in wanted-poster frames, and the backs have a sheriff-star medallion.
- **Bigger rulebook**: new chapters for every new game, poker styles for every Club member, and a sources section listing the published rules each game is based on.

## 1.2

- **Blackjack table-mates have moods.** Their bets rise and fall with their streak and stack, their play gets riskier or safer depending on their nerve, and they comment on it as the session goes ("THIS SUCKS." on a cold run, cheering on a hot one). Their panel shows their streak and mood.

## 1.1

- **Rulebook**: press **R** on the main menu (or **Esc → How to Play** in any game). It's drawn as a leather book with chapter tabs, and pages turn with an animation.
- **The Club**: 18 computer players, each with a pixel portrait, a usual skill level, a Go Fish habit, a Blackjack style and their own lines. Their win/loss record against you is saved.
- **Go Fish teams (2v2)**: pick a partner and two rivals. Team books are counted together.
- **Books on the table**: every completed Go Fish book is laid face up in front of the player who made it.
- **Blackjack table-mates**: up to 2 Club members sit at the table and play their own hands.
- Solitaire fixes: the hint outline on the stock is centred, and it clears as soon as you start dragging.

