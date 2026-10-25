# How to Play

Every game shares the same layout:

- **Top bar (HUD)**: the **MENU** button (or **Esc**) on the left, the game name, and live stats on the right (chips, score, time, books…).
- **The table**: the green felt where cards are dealt, moved and flipped.
- **Controls**: buttons along the bottom or side. Each shows its keyboard shortcut in the corner.
- **Pause menu (Esc)**: Resume, **How to Play** (these rules in-game), New Game, Main Menu.

---

## Blackjack

**You vs the dealer.** The dealer's moves are fixed by casino rules, so the challenge is your own decisions.

### Goal
Finish with a hand closer to **21** than the dealer's without going over.

- Number cards are worth their value.
- **J, Q and K** are worth **10**.
- An **Ace** is worth **11**, or **1** if 11 would put you over 21. A hand with an Ace counted as 11 is called **soft** (for example, "SOFT 17").

### A round
1. **Bet.** Click the chips at the bottom (5, 25, 100, 500), or press **1–4**. **CLEAR (C)** removes the bet and **ALL IN (A)** bets everything. Your last bet is kept for the next round.
2. **Deal (Space / Enter).** You get two face-up cards. The dealer gets one face-up card and one face-down "hole" card.
3. If the dealer shows an Ace or a 10-value card, they **peek** for blackjack first.
4. **Play your hand:**
   | Button | Key | What it does |
   |---|---|---|
   | HIT | H | Take another card |
   | STAND | S | Keep your total and end the hand |
   | DOUBLE | D | Double your bet, take exactly one more card, then stand. Only on your first two cards. |
   | SPLIT | P | Two cards of the same value become two separate hands, each with its own bet. You can split up to 4 hands. Split Aces get one card each. |
   | HINT | ? | The **advisor** shows the mathematically best move (basic strategy) |
5. **Dealer's turn.** The hole card is turned over. The dealer **must hit on 16 or less and stands on all 17s**.
6. **Payouts:**
   | Result | Pays |
   |---|---|
   | Win | 1 to 1 (bet 25, win 25) |
   | Blackjack (Ace + 10-value on the first two cards) | 3 to 2 (bet 20, win 30) |
   | Push (tie) | Your bet is returned |
   | Bust (over 21) or lower total | You lose your bet |

The **shoe** (top right) holds 1–6 decks (set in Options). It's reshuffled automatically when about 75% has been dealt. You start with **1,000 chips**. If you run out, you can take a fresh stack.

### Tips
- Always split Aces and 8s. Never split 10s or 5s.
- Double down on 11 against anything but an Ace.
- Stand on hard 12–16 when the dealer shows 2–6 (with 12, stand only against 4–6), since the dealer is likely to bust.
- If unsure, press **?**.

---

## Solitaire (Klondike)

**A solo puzzle.** Sort the whole deck into four suit piles.

### The layout
- **Stock** (top left): face-down cards. Click it to turn cards onto the **waste** pile next to it.
- **Foundations** (top right, four slots marked "A"): build each suit **up** from Ace to King.
- **Tableau** (seven columns): build **down** in **alternating colours**, for example red 9 on black 10.

### Rules
- You can move the top card of the waste, any face-up card on the tableau (it carries every card on top of it), or the top card of a foundation.
- Only a **King** (or a run starting with a King) can go into an empty column.
- A face-down tableau card turns over automatically once it's uncovered.
- **Draw 1** turns one card at a time; **Draw 3** turns three, and only the top one is playable. Choose in **Options**.
- When the stock is empty, click its slot to **recycle** the waste back into the stock.

### Controls
| Action | How |
|---|---|
| Move cards | **Drag** them onto a legal pile |
| Quick move | **Click** a card to send it to the best legal spot (foundation first) |
| Draw | Click the stock |
| NEW DEAL | N |
| UNDO | Z (unlimited) |
| HINT | H: flashes a suggested move |
| AUTO | A: appears once every card is face up and finishes the game for you |

### Scoring
| Move | Points |
|---|---|
| Waste → tableau | +5 |
| Any card → foundation | +10 |
| Turning over a tableau card | +5 |
| Foundation → tableau | −15 |
| Recycling the stock (Draw 1) | −100 |
| Time bonus on a win (over 30 s) | 700,000 ÷ seconds |

Win and the cards bounce across the screen, just like the original. Click to continue.

---

## Go Fish

**You vs 1–3 computer players.** Choose the number of opponents and their skill on the setup screen.

### Goal
Collect the most **books**. A book is all four cards of one rank (four 7s, four Queens…). Books are laid down automatically as soon as you have all four.

### Setup
- 2–3 players: 7 cards each. 4 players: 5 cards each.
- The rest of the deck is the **pond** in the middle.
- You always go first.

### Your turn
1. **Click a card** in your hand to ask for that rank. You can only ask for ranks you already hold.
2. With more than one opponent, **click the player** you want to ask (their panel flashes). **Right-click** cancels.
3. **If they have any**, they hand over *all* of them and you **go again**.
4. **If not**, they say **"GO FISH!"** and you draw from the pond. If you happen to draw the rank you asked for, you go again ("FISHED MY WISH!"). Otherwise your turn ends.

If your hand runs empty you draw a card. Once the pond is empty, a player with no cards sits out. The game ends when all **13 books** are made.

### The HUD
- **Opponent panels** (top): name, card count, number of books and which ranks.
- **Speech bubbles**: who asked whom for what, "Go Fish!", "Here, take 2."
- **Table talk** (right): a running log of every ask, give, draw and book. Read it to work out who holds what.
- **Your books** (left) and the **pond** count (centre).

### Computer skill levels
| Level | How it plays |
|---|---|
| **Easy** | Asks for random ranks from random players |
| **Normal** | Remembers *some* of what others ask for, and slowly forgets |
| **Hard** | Remembers every ask, hand-over and miss, targets players it knows have a rank, and asks for the ranks it holds the most of |

### Tips
- When someone asks for a rank, they're holding at least one. Ask them for it on your next turn.
- If you ask someone for a rank and they say "Go Fish", don't ask them again until they've drawn more cards.
