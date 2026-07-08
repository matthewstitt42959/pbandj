# Filling a Spellbook — How-To and Level Guide

Two things live here: (1) how to actually add spells to a character in the
app as it exists today, and (2) how many spells/slots a caster should have
at each level 1–20, so you know when to stop adding.

## 1. Adding spells in the app (no code changes needed)

Spells live in one place: `server/spellData.js`. Everything else —
the World Wiki's "Spells" category, and the dropdown on a character's
**Spells tab** — is generated from it.

**Flow:**
1. Add or edit an entry in `server/spellData.js` (or just use what's
   already there).
2. As SUPER_DM, open the **World Wiki** page and click **Sync Spells**.
   This pushes `spellData.js` into the database: new spells are added,
   changed ones are updated, and anything no longer in the file is
   removed. Safe to click any time after editing the file.
3. Open the character sheet, go to the **Spells** tab. The dropdown at
   the top is filtered to spells whose `classes` list includes the
   character's class (e.g. a Summoner only sees spells tagged
   `'Summoner'`). Pick one, optionally jot a note, click **Add**.
4. That's it — no separate "spellbook" data structure, no manual sync
   step beyond the button in step 2.

**Important:** the Spells tab dropdown does **not** enforce how many
spells or slots a character should have at their level — it'll let you
add every spell in the game if you click enough times. That's
intentional (keeps the tab simple), but it means the level cap in
section 2 below is something you self-enforce, not something the UI
stops you from breaking.

If you want a spell that doesn't exist yet, add it to `spellData.js`
following the template and checklist in
[SPELLBOOK_RULES.md](SPELLBOOK_RULES.md), then Sync Spells again.

## 2. How many spells should a character have?

Every class falls into one of three tracks. Find your class, then read
its row at your level.

- **Full caster** — Bard, Cleric, Druid, Sorcerer, Wizard
- **Half caster** — Paladin, Ranger, Tinker (starts casting later, tops
  out at 5th-level spells instead of 9th)
- **Pact caster** — Warlock, **Summoner** (few slots, but they're always
  your *highest* available level, and they refresh on a **short rest**
  instead of a long one — fits the fiction: the seam only opens so wide,
  so often, but it resets fast)

### Full caster

| Lvl | Cantrips known | Spells known/prepared | 1st | 2nd | 3rd | 4th | 5th | 6th | 7th | 8th | 9th |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 2 | 2 | | | | | | | | |
| 2 | 2 | 3 | 3 | | | | | | | | |
| 3 | 2 | 4 | 4 | 2 | | | | | | | |
| 4 | 3 | 5 | 4 | 3 | | | | | | | |
| 5 | 3 | 6 | 4 | 3 | 2 | | | | | | |
| 6 | 3 | 7 | 4 | 3 | 3 | | | | | | |
| 7 | 3 | 8 | 4 | 3 | 3 | 1 | | | | | |
| 8 | 3 | 9 | 4 | 3 | 3 | 2 | | | | | |
| 9 | 3 | 10 | 4 | 3 | 3 | 3 | 1 | | | | |
| 10 | 4 | 11 | 4 | 3 | 3 | 3 | 2 | | | | |
| 11 | 4 | 12 | 4 | 3 | 3 | 3 | 2 | 1 | | | |
| 12 | 4 | 12 | 4 | 3 | 3 | 3 | 2 | 1 | | | |
| 13 | 4 | 13 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | | |
| 14 | 4 | 13 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | | |
| 15 | 4 | 14 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | |
| 16 | 4 | 14 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | |
| 17 | 4 | 15 | 4 | 3 | 3 | 3 | 2 | 1 | 1 | 1 | 1 |
| 18 | 4 | 15 | 4 | 3 | 3 | 3 | 3 | 1 | 1 | 1 | 1 |
| 19 | 4 | 15 | 4 | 3 | 3 | 3 | 3 | 2 | 1 | 1 | 1 |
| 20 | 4 | 15 | 4 | 3 | 3 | 3 | 3 | 2 | 2 | 1 | 1 |

Our spell list currently tops out at level 5 spells (nothing at 6–9 yet),
so ignore those columns until we've written that content — just note the
slot count and let a full caster cast a lower-level spell in a higher slot
if they've got nothing else to spend it on.

### Half caster (Paladin, Ranger, Tinker)

Casting starts at level 2. Slots only, no cantrips known (except Tinker,
which gets cantrips like a full caster — see note below).

| Lvl | Spells known | 1st | 2nd | 3rd | 4th | 5th |
|---|---|---|---|---|---|---|
| 1 | — | — | | | | |
| 2 | 2 | 2 | | | | |
| 3 | 3 | 3 | | | | |
| 4 | 3 | 3 | | | | |
| 5 | 4 | 4 | 2 | | | |
| 6 | 4 | 4 | 2 | | | |
| 7 | 5 | 4 | 3 | | | |
| 8 | 5 | 4 | 3 | | | |
| 9 | 6 | 4 | 3 | 2 | | |
| 10 | 6 | 4 | 3 | 2 | | |
| 11 | 7 | 4 | 3 | 3 | | |
| 12 | 7 | 4 | 3 | 3 | | |
| 13 | 8 | 4 | 3 | 3 | 1 | |
| 14 | 8 | 4 | 3 | 3 | 1 | |
| 15 | 9 | 4 | 3 | 3 | 2 | |
| 16 | 9 | 4 | 3 | 3 | 2 | |
| 17 | 10 | 4 | 3 | 3 | 3 | 1 |
| 18 | 10 | 4 | 3 | 3 | 3 | 1 |
| 19 | 11 | 4 | 3 | 3 | 3 | 2 |
| 20 | 11 | 4 | 3 | 3 | 3 | 2 |

Tinker note: unlike Paladin/Ranger, Tinker knows 2 cantrips at level 1
(3 at level 10) and casts starting level 1, one level ahead of this
table — shift the whole slot column up by one level for Tinker.

### Pact caster (Warlock, **Summoner**)

Small number of slots, but always your highest level, and they come back
on a **short rest**. "Spells known" is the total pool you can pick from
at that level — you can cast any of them with any slot you have.

| Lvl | Cantrips known | Spells known | Slots | Slot level |
|---|---|---|---|---|
| 1 | 2 | 2 | 1 | 1st |
| 2 | 2 | 3 | 2 | 1st |
| 3 | 2 | 4 | 2 | 2nd |
| 4 | 3 | 5 | 2 | 2nd |
| 5 | 3 | 6 | 2 | 3rd |
| 6 | 3 | 7 | 2 | 3rd |
| 7 | 3 | 8 | 2 | 4th |
| 8 | 3 | 9 | 2 | 4th |
| 9 | 3 | 10 | 2 | 5th |
| 10 | 4 | 10 | 2 | 5th |
| 11 | 4 | 11 | 3 | 5th |
| 12 | 4 | 11 | 3 | 5th |
| 13 | 4 | 12 | 3 | 5th |
| 14 | 4 | 12 | 3 | 5th |
| 15 | 4 | 13 | 3 | 5th |
| 16 | 4 | 13 | 3 | 5th |
| 17 | 4 | 14 | 4 | 5th |
| 18 | 4 | 14 | 4 | 5th |
| 19 | 4 | 15 | 4 | 5th |
| 20 | 4 | 15 | 4 | 5th |

## 3. Redd Church at level 1 (Summoner)

From the table above: **2 cantrips known, 2 spells known, 1 slot (1st
level)**.

Current Summoner-tagged options in `spellData.js`:

- **Cantrips** (pick 2 of 4): Tether, Rift Lance, Corrosive Bubble,
  Noxious Puff
- **1st-level** (pick 2 of 3): Call Lesser, Root Snare, Haze Bank

A clean level-1 build for a summon-focused Summoner: **Rift Lance**
(cantrip damage when nothing's worth summoning for) + **Tether**
(utility, doesn't cost a slot) for cantrips, and **Call Lesser** is the
obvious 1st-level pick since it's Redd's actual bread-and-butter summon
— the second 1st-level slot-pick is really just "which utility spell,"
so Root Snare (battlefield control) or Haze Bank (escape/cover) both
work; pick whichever fits how you picture Redd fighting.

As Redd levels up, the Summoner's signature line — Call Lesser (1) →
Open the Seam (2) → Bind the Greater (3) → Anchor the Rift (4) → The
Long Call (5) — should almost always be one of the "known" picks at the
level it unlocks, since it's the strongest thing available in each new
slot.
