# Hacker Pyramid - Game Design Document

## Overview

Hacker Pyramid is a hacker/security-themed adaptation of the classic TV game show *Pyramid* (ABC/CBS/syndicated, 1973-present). Two teams of two players race to communicate words within categories using descriptive clues, culminating in the Winner's Circle bonus round where one player must convey abstract categories by listing examples. It tests vocabulary breadth, lateral thinking, and deep domain knowledge in hacker culture.

## Source Material

The original *Pyramid* was created by Bob Stewart (who also created *Password*). It has aired in numerous incarnations:

- **The $10,000 Pyramid** (CBS 1973-76): Original format, hosted by Dick Clark
- **The $20,000 Pyramid** (ABC 1976-80): Same format, increased prize
- **The $25,000 Pyramid** (CBS 1982-88): Dick Clark continues
- **The $50,000 Pyramid** (syndicated 1981): Short-lived syndicated version
- **The $100,000 Pyramid** (ABC 1985-88, 1991): Donny Osmond hosted 1991 version
- **Pyramid** (CBS 2002-04): Donny Osmond, reformatted (6 words, 20 seconds)
- **The $100,000 Pyramid** (ABC 2016-present): Modern revival hosted by Michael Strahan

All versions share the core mechanic: one partner gives verbal clues to help the other guess words within a category, building to a reversed Winner's Circle where the clue-giver lists examples and the guesser identifies the common category.

---

## Game Rules

### Teams

- **2 teams** of 2 players each
- Each team: one **clue-giver** and one **guesser** (roles rotate)
- In a live hacker event, one player per team can be a "celebrity" (notable hacker, security researcher, conference speaker)

### Core Mechanic (Main Game)

1. Six categories are displayed on the board, arranged in a pyramid shape (3 bottom, 2 middle, 1 top)
2. The team in control picks a category
3. The clue-giver sees **7 words or phrases** that fit the chosen category
4. The clue-giver has **30 seconds** to describe each word and get the guesser to say it
5. One point scored per correct guess
6. The clue-giver may **pass** on a word and return to it if time remains
7. After the time expires, play passes to the other team to pick a category

### Role Rotation

- **Categories 1-2:** Celebrities (or designated Player A) give clues
- **Categories 3-4:** Contestants (or designated Player B) give clues
- **Categories 5-6:** Teams choose who gives and who receives

### Clue Rules (Illegal Clues)

A clue is **illegal** if it:

- Contains **any part of the answer word** (e.g., if the word is "firewall", can't say "fire" or "wall")
- Uses a **direct synonym** of the answer
- Gives a **definition** of the answer
- Uses **hand gestures or physical signals** (hands must stay down)
- Uses **sound effects** or non-verbal hints
- Spells out the answer or gives letter counts

**Penalty for illegal clue:** The word is thrown out and cannot be guessed. No point awarded. In the Winner's Circle, an illegal clue forfeits the entire category.

### Scoring (Main Game)

- 1 point per correctly guessed word (max 7 per category)
- Total possible: 21 points per team (3 categories x 7 words)
- **Higher-scoring team advances to the Winner's Circle**
- In case of a tie, a tiebreaker category is played

---

## Winner's Circle (Bonus Round)

The signature element of Pyramid. The mechanics are **reversed**: instead of guessing individual words within a known category, the guesser must identify the **category itself** from a list of examples.

### Setup

- 6 categories arranged in a pyramid (3 bottom, 2 middle, 1 top)
- Categories increase in difficulty/abstraction as you climb the pyramid
- Each tier has a cash/point value:

| Tier | Categories | Points (Hacker Adaptation) |
|------|-----------|---------------------------|
| Bottom | 3 categories | 100 pts each |
| Middle | 2 categories | 250 pts each |
| Top | 1 category | 500 pts each |
| **All 6** | **Grand Prize** | **2,000 pts bonus** |

### Mechanics

1. The clue-giver faces the pyramid board; the guesser sits with their **back to the board**
2. **60 seconds** on the clock
3. The clue-giver sees a category (e.g., "Things You Hack") and must list individual items that fit it
4. The guesser must identify what all the items have in common (the category)
5. Correct guess: the category lights up and they move to the next one
6. The clue-giver may **skip** a category and come back if time remains
7. Getting all 6 categories wins the **grand prize**

### Winner's Circle Illegal Clues

Stricter rules than the main game:

- Cannot use any word that appears in the category name
- Cannot use a synonym or definition of the category
- Cannot use descriptive prepositional phrases (e.g., "on a table" -- unless the category specifically involves location)
- Cannot use overly descriptive adverbs
- Every listed item **must genuinely fit** the category
- Cannot use gestures (hands strapped down in the TV version)

**Penalty:** An illegal clue removes the category entirely from play. The team loses the chance at that category's points and the grand prize.

---

## Hacker Adaptation: Content Design

### Main Game Category Examples

Categories are pun-driven or wordplay-based (matching the classic Pyramid style), but themed around hacker culture.

#### Example Categories with Word Lists

| Category Name | Words |
|--------------|-------|
| "Port Authority" | 80, 443, 22, 3389, 8080, 3306, 53 |
| "Getting Phishy" | spear, whaling, vishing, smishing, clone, angler, pharming |
| "Shell Shocked" | bash, zsh, PowerShell, cmd, ksh, fish, tcsh |
| "Crypto Currency" | RSA, AES, Diffie-Hellman, SHA, Blowfish, ChaCha20, Twofish |
| "Hack the Planet" | Stuxnet, WannaCry, NotPetya, SolarWinds, Log4Shell, Heartbleed, EternalBlue |
| "Social Engineering" | pretexting, tailgating, baiting, quid pro quo, watering hole, dumpster diving, shoulder surfing |
| "Kernel Panic" | fork bomb, null pointer, stack overflow, segfault, deadlock, race condition, memory leak |
| "Man in the Middle" | proxy, relay, ARP spoof, SSL strip, DNS hijack, session hijack, evil twin |

### Winner's Circle Category Examples

These must be **abstract categories** where the guesser identifies the common thread.

| Category | Example Clues Given |
|----------|-------------------|
| "Things that get brute-forced" | "passwords, locks, ZIP files, Wi-Fi networks, PINs..." |
| "Things with keys" | "SSH, encryption, keyboards, pianos, maps, registries..." |
| "Things that get spoofed" | "IP addresses, caller ID, email headers, GPS signals, MAC addresses..." |
| "Things that overflow" | "buffers, stacks, bathtubs, rivers, integer variables..." |
| "Things with shells" | "turtles, eggs, Linux terminals, shellcode, oysters, ammunition..." |
| "Things you reverse engineer" | "malware, firmware, protocols, binaries, APIs, obfuscated code..." |
| "Things with worms" | "gardens, apples, networks, tequila, Morris, Conficker..." |
| "Things you crack" | "passwords, safes, eggs, knuckles, codes, jokes, WPA..." |
| "Things with patches" | "software, quilts, pirates, pumpkins, vulnerabilities, jackets..." |
| "Things that get dumped" | "databases, memory, credentials, core files, partners, trash..." |

### Difficulty Progression

Winner's Circle categories should ascend in abstraction:

- **Bottom tier (3):** Concrete, domain-specific (e.g., "Types of malware", "Linux commands")
- **Middle tier (2):** Cross-domain with a hacker twist (e.g., "Things with shells", "Things you crack")
- **Top tier (1):** Maximally abstract, requires creative connection (e.g., "Things that get elevated", "Things with exploits")

### Content Format

```
# hacker-pyramid/content/main-categories.txt
# Format: CATEGORY_NAME|WORD1,WORD2,WORD3,WORD4,WORD5,WORD6,WORD7
# Main game categories (clue-giver describes words, guesser guesses words)

Port Authority|80,443,22,3389,8080,3306,53
Getting Phishy|spear,whaling,vishing,smishing,clone,angler,pharming
Shell Shocked|bash,zsh,PowerShell,cmd,ksh,fish,tcsh
```

```
# hacker-pyramid/content/winners-circle.txt
# Format: CATEGORY_NAME|EXAMPLE1,EXAMPLE2,EXAMPLE3,EXAMPLE4,EXAMPLE5
# Winner's Circle (clue-giver lists examples, guesser guesses category)

Things that get brute-forced|passwords,locks,ZIP files,Wi-Fi networks,PINs
Things with keys|SSH,encryption,keyboards,pianos,maps
Things that overflow|buffers,stacks,bathtubs,rivers,integer variables
```

### Content Volume Target

- **Minimum viable:** 30 main game categories (210 words) + 30 Winner's Circle categories
- **Production target:** 80+ main game categories + 60+ Winner's Circle categories
- **Per show:** 6 main categories + 6 Winner's Circle categories consumed = ~12 per show

---

## Round Structure

### Game Format (Recommended: Best of 2 games)

**Game 1:**
- 6 categories on the pyramid board
- Roles rotate as described (categories 1-2, 3-4, 5-6)
- Higher scorer goes to the Winner's Circle

**Game 2:**
- Fresh set of 6 categories
- Teams swap roles (the contestant who gave clues now receives, and vice versa)
- Winner goes to a second Winner's Circle trip

**If the same player wins both games:**
- Second Winner's Circle trip is worth **double points** (matching the TV show tradition where the second trip has a higher jackpot)

### Tiebreaker

If both teams tie at the end of a game:
- A single sudden-death category is played
- 30 seconds, 7 words
- Team with more correct guesses wins
- If still tied: first correct guess wins (rapid-fire alternation)

---

## Technical Requirements

### Game State Machine

```
LOBBY -> GAME_START -> CATEGORY_SELECT
  -> MAIN_ROUND (30-second timer, word-by-word tracking)
  -> ROUND_SCORED -> NEXT_CATEGORY | GAME_END
  -> TIEBREAKER (if needed)
  -> WINNERS_CIRCLE_START (60-second timer)
  -> WC_CATEGORY (clue-giver listing examples)
  -> WC_GUESS (guesser identifies category)
  -> WC_CORRECT | WC_SKIP | WC_ILLEGAL
  -> WC_COMPLETE -> FINAL_SCORE
```

### Host Console Requirements

- Display/hide category names and word lists
- Start/stop 30-second (main) and 60-second (Winner's Circle) timers
- Track correct/pass/illegal for each word (main game)
- Track correct/skip/illegal for each category (Winner's Circle)
- Manual score override for edge cases
- Control category reveal animation
- Mark illegal clues (host judgment call)
- Select which categories appear on each game's pyramid

### Player-Facing Displays

- **Clue-giver screen:** Current word (main) or category (WC), remaining time, score
- **Guesser screen:** Timer, score, category name (main) or blank (WC)
- **Audience screen:** Full board visible, current word/category, both scores, timer

### Buzzer Integration

- Not needed for core gameplay (unlike Password, Pyramid is turn-based)
- Useful for **tiebreaker** sudden-death format
- Can use existing DFIU buzzer infrastructure for tiebreaker rounds

### Audio/Visual Cues

- Buzzer sound for illegal clues
- Ding/chime for correct guesses
- Pyramid light-up animation as Winner's Circle categories are solved
- Clock ticking sound as timer winds down
- Dramatic reveal when top of pyramid is reached
- Category "lock-out" animation for illegal clues in Winner's Circle

---

## Differences from Classic Pyramid

| Aspect | Classic Pyramid | Hacker Pyramid |
|--------|----------------|----------------|
| Words/categories | General knowledge | Security/hacker terminology |
| Audience | General TV audience | Hacker conference attendees |
| Celebrity | TV/film celebrities | Notable hackers, security researchers |
| Category puns | Pop culture wordplay | Hacker/tech wordplay |
| Winner's Circle | Abstract common knowledge | Abstract with hacker twist |
| Prize | Cash ($10K-$100K) | Points, swag, bragging rights (configurable) |
| Setting | TV studio | Conference stage, bar, CTF event |
| Gestures | Prohibited (hands strapped) | Prohibited (honor system or visible hands rule) |

---

## Player Count and Roles

| Role | Count | Description |
|------|-------|-------------|
| Host | 1 | Controls game flow, judges clue legality |
| Team A - Player 1 | 1 | Celebrity or experienced hacker |
| Team A - Player 2 | 1 | Contestant |
| Team B - Player 1 | 1 | Celebrity or experienced hacker |
| Team B - Player 2 | 1 | Contestant |
| **Total** | **5** | 1 host + 4 players |

Optional: A dedicated **judge** for clue legality disputes (useful at larger events).

---

## Open Questions for the Board

1. **Prize structure:** Points/bragging rights, conference swag, or real prizes?
2. **Show length:** Target runtime? Each game takes ~10-15 min, so a full show (2 games + 2 Winner's Circles) runs ~30-40 min.
3. **Celebrity pool:** Who are the "celebrity hackers" we can recruit for each event?
4. **Content sourcing:** Internal curation vs. community-submitted categories?
5. **Difficulty calibration:** DEF CON audience vs. BSides vs. corporate event -- how technical should Winner's Circle categories be?
6. **Illegal clue enforcement:** Strict (immediate category forfeit like TV) or lenient (warning then forfeit)?
7. **Multiple games per event:** Run a tournament bracket with multiple pairs of teams?

---

## Research Sources

- [Pyramid (game show) - Wikipedia](https://en.wikipedia.org/wiki/Pyramid_(game_show))
- [Pyramid | Game Shows Wiki | Fandom](https://gameshows.fandom.com/wiki/Pyramid)
- [The $100,000 Pyramid | Pyramid Game Show Wikia | Fandom](https://pyramidgameshow.fandom.com/wiki/The_$100,000_Pyramid)
- [The $100,000 Pyramid (2016 ABC Revival) Review](https://theblogisright.com/2016/06/29/the-100000-pyramid-2016-abc-revival-review/)
- [Pyramid: Home Game Board Game Review and Rules - Geeky Hobbies](https://www.geekyhobbies.com/pyramid-home-game-board-game-review-and-rules/)
- [Pyramid (Series) - TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Series/Pyramid)
