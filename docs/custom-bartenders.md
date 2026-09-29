# Your own bartender

A bartender is a `Personality`: plain data saying what it looks like and what it says. Change a few lines of BETA or
BLIP, or write one from scratch with models of your own.

## Change what it says

The easy way to a bartender of your own: one of the kit's, with new words.

```ts
import { addBartender, BETA, whisper, Personality } from 'dcl-bar-kit'

const rusty: Personality = {
  ...BETA(),
  name: 'RUSTY',
  bubble: { ...BETA().bubble, tag: 'RUSTY // SAYS' },
  greetings: ['Well, look who it is.', 'What’ll it be, partner?'],
  preparing: 'Comin’ right up.',
  served: (d) => `One ${d.name}. Don’t spill it on my floor.`,
  another: 'Fill her up?',
  tookGlass: 'Obliged.',
  mutters: ['Quiet night.', 'Had a fella in here once asked for milk.'],
  special: (grant) => [
    { at: 0, say: 'Hm.', glare: 2 },
    { at: 2.2, say: whisper('Round the back. Knock twice.'), then: grant }
  ],
  afterSpecial: ['Never seen you before in my life.']
}

addBartender(rusty, { position: Vector3.create(14, 0, 21), facing: 180 })
```

Every line is a plain string, or `whisper('…')` for a whisper (italics, dimmer). Lines wrap at about 24 characters and
show for a few seconds after they've typed out, so keep them short: a readout, not a paragraph.

## What it says, and when

| Field | When |
|---|---|
| `greetings` | Clicked (one at random). |
| `preparing` | Starting on a drink. |
| `served` | Handing it over. A function of the drink; leave it out to use each drink's own `served`. |
| `another` | Clicked by someone already holding a drink. |
| `tookGlass` | Taking the glass back. |
| `mutters` | Every 40–80 s, to anyone within 6 m, 60% of the time, if it isn't busy talking. `jittery: true` makes it glance about as it does. |
| `special` | Its routine when a special's ordered. |
| `afterSpecial` | Clicked within two minutes of granting a special: instead of a greeting. |

## Routines

`special` returns a list of `Beat`s: a little scene, timed from its start.

```ts
special: (grant, again) =>
  again
    ? [{ at: 0, say: '…Again?', glare: 1.8 }, { at: 1.8, say: whisper('Fine. Quick.'), then: grant }]
    : [
        { at: 0, say: '…', glare: 2.4 },                                  // a dirty look
        { at: 2.4, say: whisper('Keep your voice down.'), nervous: 2 },   // glancing about
        { at: 4.6, say: whisper('Right. That one.') },
        { at: 7.0, say: whisper('Nobody followed you?'), nervous: 2.2 },
        { at: 9.2, say: whisper('…Be quick.'), then: grant }              // and now onSpecial runs
      ]
```

- `at`: seconds from the start.
- `say`: a line.
- `glare`: lean in and stare them down, for this long. (With visor eyes: they narrow and tilt into a scowl.)
- `nervous`: glance left and right, for this long.
- `happy`: hop and wiggle, eyes squeezed into happy arcs (round eyes), for this long.
- `then`: something to run. **Call `grant` in the last beat**: that's what runs your `onSpecial`. Forget it and the
  special never does anything.

`again` is true if any bartender granted a special in the last two minutes: a chance to be put out about being asked
twice.

Leave about two seconds between lines, so each has time to be read.

## Models of its own

A bartender is three models, which the kit moves separately:

| Model | Origin | |
|---|---|---|
| `body` | On the floor under it | Everything that doesn't turn: body, arms, base. Faces +Z. Solid. |
| `head` | At the neck | Turns left and right (up to 70° each way) to look at you. Faces +Z. |
| `shaker` | Its middle | Held at `hand`; shaken up and down while a drink's made. |

Set `neck` to the head origin's height above the body's, and `hand` to where the shaker is held (in the bartender's own
frame: `+z` in front, `+x` to its right, `y` up). The kit's: BETA's neck 1.62 m, hand (0.3, 1.08, 0.36); BLIP's neck
1.44 m, hand (0.29, 1.03, 0.25).

Its readout floats 0.58 m over the neck (0.72 m for round eyes), so leave that space clear of ceilings.

### Eyes

Don't model eyes: the kit draws them, so they can blink and change with its mood. Leave room on the head's face for
them, in the head's own frame:

| `eyes` | Each eye's middle | Size (w × h) |
|---|---|---|
| `'visor'` | x ±0.065, y 0.15, z 0.2 | 0.06 × 0.035 m, glowing cyan bars |
| `'round'` | x ±0.065, y 0.2, z 0.222 | 0.1 × 0.124 m, glowing, with a white highlight |

So a visor face's front is about 0.2 m in front of the neck, 0.15 m up; a round face's 0.22 m in front, 0.2 m up. A
dark, flat face there shows the eyes off best.

### Building models like the kit's

`tools/build_bartender.py` builds BETA and BLIP in Blender, in code, from simple shapes: a good start for a bartender of
your own (change the colours, proportions, a bow tie for a badge).

```sh
blender -b --factory-startup --python node_modules/dcl-bar-kit/tools/build_bartender.py -- assets/models
```

It writes `bartender_body.glb`, `bartender_head.glb`, `bartender_shaker.glb`, `blip_body.glb` and `blip_head.glb`. It
builds facing Blender's −Y, which is the scene's +Z once exported, with the right hand at Blender −X. If you change
the neck or hand heights (`NECK`, `HAND`, `BLIP_NECK`, `BLIP_HAND`), change `neck` and `hand` in your personality to
match.

Or model one by hand in anything that exports glTF: keep to the origins above, face +Z (in Blender: −Y, with "+Y up"
on export), and keep it light (under 10,000 triangles all told).

## The readout's look

```ts
bubble: {
  tag: 'RUSTY // SAYS',                       // a small tag over the text
  edge: Color3.create(1, 0.6, 0.2),           // the glowing frame
  text: Color4.create(1, 0.92, 0.8, 1),       // the words
  panel: Color4.create(0.08, 0.04, 0.02, 1)   // behind them
}
```

## Other settings

| Field | |
|---|---|
| `name` | Unique among your bartenders. Shown in its hover text ("Order a drink from RUSTY") and on the menu. |
| `bob` | How far it bobs as it hovers, metres. `0` for one that stands still on the floor. |
| `jittery` | Glances about when it mutters. |
