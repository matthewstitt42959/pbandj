# Spellbook House Rules

Teraphobia's magic is entirely original content: original names, original
descriptions, original flavor. The mechanical skeleton (levels, dice,
ranges, durations) follows familiar tabletop math because that math is
just arithmetic, not anyone's IP — but every spell's name and description
must be written from scratch. Never port a name or description from
another game, book, or SRD, even "just to get started" — rewrite it from
the effect up.

## Where magic comes from

Magic in Teraphobia comes from proximity to the rifts — the tears between
here and Kimeria. Casters have learned to bend that bleed-through into
something usable. That's the in-fiction reason every discipline below
exists, and it's a good gut-check when naming a new spell: *would this
make sense as something learned from studying the bleed, not from a
dusty spellbook?*

## The 8 Disciplines

Every spell belongs to one. These replace "schools of magic" — same job
(grouping spells by what they do), original vocabulary.

| Discipline | Covers |
|---|---|
| **Combust** | Direct damage — fire, force, lightning, cold, concussive blasts |
| **Rot** | Decay, drain, death and undeath, curses |
| **Ward** | Protection, barriers, healing, defensive buffs |
| **Rift** | Conjuring, summoning, teleportation, the void-between-worlds stuff |
| **Sight** | Detection, divination, communication, information |
| **Sway** | Charm, compulsion, morale, mind-affecting |
| **Static** | Illusion, invisibility, sensory disruption |
| **Shift** | Transformation, movement, buffs to the body or environment |

## Tier power budget

Loose guidelines, not hard caps — bend them for a spell that's fun.

| Level | Direct damage | Save DC feel | Typical duration |
|---|---|---|---|
| Cantrip | 1d8–1d10 | minor | instant / 1 round |
| 1 | 2d6–3d6 | minor | instant / up to 1 min |
| 2 | 3d6–4d6 | moderate | up to 1 min / 1 hr |
| 3 | 6d6–8d6 | moderate | up to 1 min / 10 min |
| 4 | comparable to 3 + a strong condition or bigger area | strong | up to 1 min |
| 5 | signature, party-changing effect | strong | scene-length |

Utility/support spells don't need to hit a damage number — the bar is
"does this change what the party can do this scene."

## Spell template

```js
{
  name: 'Original Name',
  level: 0-5,
  school: 'Combust' | 'Rot' | 'Ward' | 'Rift' | 'Sight' | 'Sway' | 'Static' | 'Shift',
  castingTime: '1 action',
  range: '...',
  duration: '...',
  classes: ['Wizard', 'Sorcerer', ...],
  description: 'Original description — effect, save/attack, damage, duration.',
}
```

## Class list

Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue,
Sorcerer, Warlock, Wizard, **Tinker** (salvage-tech caster, formerly
"Artificer" — renamed to fit Teraphobia's scrap-and-signal aesthetic),
**Summoner** (new — a caster who specializes in holding a rift open long
enough to pull something through and bind it to their will).

Summoner draws mostly from **Rift** with some **Sway**/**Sight** utility,
mirroring how Warlock leans on Rift for its otherworldly-pact flavor.
Every tier should have at least one Rift spell either class can use, and
Summoner gets its own escalating "call something through" spell at each
tier (see `spellData.js` for the current line: Tether → Call Lesser →
Open the Seam → Bind the Greater → Anchor the Rift → The Long Call).

## Adding a new spell — checklist

1. Start from the *effect* you want, not from a memory of an existing
   game's spell of the same name.
2. Pick the discipline it belongs to, then a name that's short and
   effect-evocative (players should be able to guess roughly what it
   does from the name — that's the whole point of naming it well).
3. Write the description in plain original language. No lifted phrasing,
   no "reads suspiciously like a paraphrase" — if you're not sure, say
   it a different way.
4. Check the tier power budget table above.
5. Assign classes based on the discipline table and existing class
   flavor (a Fighter or Rogue still gets no spells; Barbarian and Monk
   stay non-casters).
