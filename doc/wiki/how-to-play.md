# How to Play

## The board

The battle board is a **6 × 5 grid of orbs**. Every orb colour belongs to one of the five gear pieces you equipped, and its colour tells you what it does:

| Colour | Type | What a link does |
| --- | --- | --- |
| 🔴 Red | **ATK** | Damages the enemy |
| 🔵 Blue | **BLOCK** | Gives you block, which soaks the enemy's next hit |
| 🟢 Green | **HEAL** | Restores your HP |

## Linking

Press an orb and **drag through 3 or more orbs of the same piece**, then let go. You can move in any direction, **diagonals included**, but you can't visit the same orb twice.

Every link is one move. The linked orbs clear, the orbs above fall down, and new orbs drop in from the top.

### Longer links pay more

A gear card's **Power** is exactly what a 3-link pays. Every extra orb adds a little more:

| Link length | Payout |
| --- | --- |
| 3 | 100% of Power |
| 4 | 120% |
| 5 | 142% |
| 6 | 166% |
| 7 | 192% |
| 8 | 220% |
| 9 | 250% |
| 10+ | +32% per extra orb |

Longer links also unlock **rider effects** on many cards (Burn, Mark, Frost, Strength, Grit). See [Heroes & Gear](heroes-and-gear.md#rider-effects).

## Bombs

Link **6 or more** orbs and a **bomb** forms where your link ended.

- **Tap a bomb** on its own to set it off, or **link through it** as part of a normal chain.
- A bomb blasts the **3 × 3 area** around it.
- Every orb caught in the blast fires its own gear at **40%** of its Power. The bomb itself fires at **80%**.
- A bomb caught in another bomb's blast **goes off too**, so bombs can chain.

## The enemy

Every enemy has an HP pool, a strength (how hard it hits) and a **charge meter**.

- The meter fills **one notch per move** you make.
- When it reaches the red notch, the enemy **swings** at you.
- Early on, enemies swing every 3 moves. Deeper into the map, every 2.
- The icon above the enemy shows its intent: **charging**, **attack**, or **heavy** (a big hit).

Your **block** absorbs the hit first. Whatever gets through comes off your HP.

### Block limits

Block can't stack forever. Past a soft cap (about 2.5× the enemy's strength), extra block only lands at a quarter rate, up to a hard cap. An over-long block link is wasteful, not worthless.

## HP across a battle

Your HP **does not refill between waves**. A battle is one long fight through all of its waves, so every hit you take carries forward. Strength and Grit you build up also carry over between waves.

Enemy statuses (Burn, Mark, Frost) die with the enemy.

## Winning and losing

- **Kill the enemy** and the next wave walks in. Kill the last wave (the boss) and you've won the location.
- **Drop to 0 HP** and the run ends.
- **Run out of legal links** (no 3-link anywhere and no bomb) and the run ends too.

Your run is banked when it ends, win or lose. You keep your score, coins and quest progress either way.

## Scoring

```
Score = damage dealt
      + 50 × wave number for each wave cleared
      + 300 for clearing the whole location
      + 5 × your longest link
```

That total is then multiplied by:

- **Map depth:** +25% for each location further along the map (Greenwood ×1.0, Old Bridge ×1.25 … The Castle ×2.25).
- **Ascension:** ×1.25 for each ascension, compounding.

You earn **1 coin for every 40 points** of score.

## Fair play

Every run is checked by the server. Your moves are replayed through the same game engine and the server works out your score itself, so ladders can't be faked with edited scores or forged loadouts.
