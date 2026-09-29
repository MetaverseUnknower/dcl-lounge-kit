# dcl-bar-kit

Robot bartenders and drinks for [Decentraland](https://decentraland.org) SDK7 scenes, built on
[dcl-sittables](../sittables).

- **Bartenders** that hover behind your bar, follow you with their heads, blink, talk in a holographic readout, hand
  over a menu, and shake your drink before serving it. Two come ready: **BETA** (a mid-century bot with a bow tie, dry
  and a little paranoid) and **BLIP** (small, round and pastel, delighted by everything). Or write your own personality.
- **A drinks menu** with a make-it-at-home recipe for each drink. Three mocktails come with it.
- **Drinks you hold.** Your glass is in your hand, and everyone in the scene sees it. Stand still and you drink it: a
  looping emote with the glass at your chest, a sip every eight seconds and a little club sway. Sit in a dcl-sittables
  seat and you drink sitting (a couch has its own version).
- **Dropping and spilling.** Play another emote, sprint or jump, and your drink falls and smashes (with a crash), for
  everyone nearby.
- **"Would you like another?"** Click a bartender with a drink in hand: another, or hand the glass back.
- **A special.** Put something on the menu that isn't a drink (a password, say), and when it's ordered the bartender
  plays a little routine and calls your code: open a door, give an item.

## Install

```sh
npm install dcl-bar-kit          # brings dcl-sittables with it
npx dcl-sittables-copy-assets    # the furniture, into assets/dcl-sittables/
npx dcl-bar-kit-copy-assets      # the bartenders, glasses, emotes and sound, into assets/dcl-bar-kit/
```

Re-run the copy commands after updating. Your `scene.json` needs `"ALLOW_TO_MOVE_PLAYER_INSIDE_SCENE"` and
`"ALLOW_TO_TRIGGER_AVATAR_EMOTE"` in `requiredPermissions`.

## A bar in a few lines

```ts
import { Vector3 } from '@dcl/sdk/math'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { FURNITURE, placeFurniture } from 'dcl-sittables'
import { setupBar, addBartender, BETA, BLIP, mocktails } from 'dcl-bar-kit'
import { ui } from './ui' // renders <BarUi />

export function main() {
  setupBar({ drinks: mocktails() })
  // facing: the way the bartender faces (toward the customers), degrees (0: +Z, 90: +X)
  addBartender(BETA(), { position: Vector3.create(14, 0, 21), facing: 180 })
  addBartender(BLIP(), { position: Vector3.create(18, 0, 21), facing: 180 })
  for (let i = 0; i < 6; i++) {
    placeFurniture(FURNITURE.pedestalStoolCyanMagenta, { position: Vector3.create(12 + i * 1.4, 0, 18.9), facing: 0 })
  }
  ReactEcsRenderer.setUiRenderer(ui)
}
```

```tsx
// ui.tsx
import ReactEcs from '@dcl/sdk/react-ecs'
import { BarUi } from 'dcl-bar-kit'
export const ui = () => <BarUi />
```

`BarUi` draws the menu, the "would you like another?" dialog and the "You dropped your drink..." notice, only when
they're needed. (Or place `BarMenu`, `AnotherDialog` and `DropNotice` yourself.)

The bartenders need a counter in front of them: the example scene (`example/` in the repository) has one.

## setupBar options

| Option | |
|---|---|
| `drinks` | The menu (`Drink[]`). `mocktails()` gives the three that come with the kit. |
| `title`, `subtitle` | The menu's heading. In the subtitle, `{bartender}` is who handed it over. |
| `onSpecial(bartender, drink)` | Called when a special (a menu item with `glass: null`) has been ordered and the bartender's done its routine. |
| `visibleTo(address)` | Whose drinks (glasses and drops) to show, by wallet address. Default: everyone in the scene. |
| `holdSeconds` | How long a drink lasts (default 300; mid-emote, until you next move). |
| `spill` | Sprinting or jumping with a drink spills it (default true). |
| `dropOnEmote` | Any other emote drops it (default true). |

## Drinks

```ts
import { Drink, barAsset } from 'dcl-bar-kit'
import { Color3, Color4 } from '@dcl/sdk/math'

const lemonade: Drink = {
  id: 'lemonade',
  name: 'Solar Lemonade',
  tag: { text: 'COMMON', color: Color4.create(1, 0.9, 0.3, 1) },
  blurb: 'Sunshine in a glass.',
  ingredients: ['1 cup lemonade', 'A sprig of mint', 'Ice'],
  method: 'Over ice, mint on top.',
  color: Color3.create(1, 0.9, 0.3),
  glass: barAsset('models/glasses/lumen_rift_highball.glb'),
  emotes: {
    stand: 'assets/emotes/lemonade_emote.glb',
    sit: 'assets/emotes/lemonade_sit_emote.glb',
    couch: 'assets/emotes/lemonade_couch_emote.glb'
  },
  served: 'One Solar Lemonade.'
}
```

The emotes' glass is part of each emote file, so a drink in a new colour needs its own emotes. Build them with
`tools/build_drink_emote.py` (Blender 3.6 and Decentraland's emote rig template; see the top of the script):

```sh
blender -b Avatar_File.blend --python node_modules/dcl-bar-kit/tools/build_drink_emote.py -- assets/emotes '{"lemonade": [1, 0.9, 0.3]}'
```

Decentraland caches emotes by file name: if you change one, give it a new name.

## The special

A menu item with `glass: null` isn't served; the bartender plays its personality's `special` routine and then your
`onSpecial` runs. BETA gives you a dirty look, checks nobody's watching and whispers; BLIP is thrilled.

```ts
setupBar({
  drinks: [...mocktails(), { id: 'vacuum', name: 'Vacuum on the Rocks, hold the rocks', color: Color3.Black(), glass: null }],
  onSpecial: (bartender) => openTheBackRoom()
})
```

## Your own bartender

A `Personality` is plain data: its models (body, head, shaker), where its neck and hand are, its eyes (`'visor'` bars
or `'round'`), its speech readout's colours and tag, how it bobs, and what it says (greetings, serving, "another?",
taking the glass back, mutters, and its routine for the special, as timed `Beat`s with moods: `nervous`, `glare`,
`happy`). Copy `BETA()` or `BLIP()` from `src/personalities.ts` and change what you like. `tools/build_bartender.py`
builds their models in Blender, if you want to start from those.

## How everyone sees your drink

- **Drinking**: a scene emote, which Decentraland plays on your avatar for everyone near, glass and all.
- **The glass in your hand**: a synced `AvatarAttach` naming your avatar (every client attaches it to your hand), and
  the glass parented to it with `parentEntity`.
- **A drop**: a small synced record (which glass, where); every client plays the smash there, with the crash nearby.

## Licence

Code: MIT. Models, emotes and sound: CC BY 4.0, by MetaPetal: credit "Bartender and drink assets by MetaPetal
(dcl-lounge-kit), CC BY 4.0". See the repository's `ASSETS-LICENSE.md`.
