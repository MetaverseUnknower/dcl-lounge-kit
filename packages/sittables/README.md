# dcl-sittables

Click-to-sit seats and sittable furniture for [Decentraland](https://decentraland.org) SDK7 scenes.

- **Seats**: a glowing orb over each seat and a click box on it (and the furniture itself, for single seats). Click, and
  your avatar sits with one of Decentraland's own sitting emotes; walk away and you're up. Which seats are taken is
  shared between players, so a taken seat's orb disappears for everyone (and frees itself if its sitter leaves).
- **Furniture, ready to place**: bar stools (seven colourways, round, backrest), couches, a garden bench and tables,
  each with its seats already worked out and tested in-world.
- **Hooks** for other code: know when someone sits or stands, and take over sitting down (dcl-bar-kit uses this to
  sit you straight into a drinking emote).


**Documentation:** [Getting started](https://github.com/MetaverseUnknower/dcl-lounge-kit/blob/main/docs/getting-started.md) · [Full reference](https://github.com/MetaverseUnknower/dcl-lounge-kit/blob/main/docs/sittables-reference.md) · [Your own furniture](https://github.com/MetaverseUnknower/dcl-lounge-kit/blob/main/docs/custom-furniture.md) · [How it works](https://github.com/MetaverseUnknower/dcl-lounge-kit/blob/main/docs/how-it-works.md) · [Troubleshooting](https://github.com/MetaverseUnknower/dcl-lounge-kit/blob/main/docs/troubleshooting.md)

## Install

```sh
npm install dcl-sittables
npx dcl-sittables-copy-assets        # the models, into assets/dcl-sittables/ (re-run after updating)
```

A Decentraland scene can only load files inside its own folder, so the models have to be copied in. If you put them
somewhere else, call `setSittablesAssetRoot('your/folder/')` first.

Your `scene.json` needs `"ALLOW_TO_MOVE_PLAYER_INSIDE_SCENE"` and `"ALLOW_TO_TRIGGER_AVATAR_EMOTE"` in
`requiredPermissions`.

## Place furniture

```ts
import { Vector3 } from '@dcl/sdk/math'
import { FURNITURE, placeFurniture } from 'dcl-sittables'

export function main() {
  // facing: the way people sitting on it face, in degrees (0: +Z, 90: +X)
  placeFurniture(FURNITURE.pedestalStoolPinkGold, { position: Vector3.create(8, 0, 8), facing: 0 })
  placeFurniture(FURNITURE.petalSofa, { position: Vector3.create(12, 0, 6), facing: 90 })
}
```

`placeFurniture` returns `{ entity, seats }`. Options: `position`, `facing`, `scale` (extra, on top of the model's
own; seats move with it) and `hoverText`.

| `FURNITURE.` | What | Seats |
|---|---|---|
| `pedestalStool`, `pedestalStoolCyanMagenta`, `pedestalStoolBluePurple`, `pedestalStoolLimeTeal`, `pedestalStoolMonochrome`, `pedestalStoolPinkGold`, `pedestalStoolRedOrange` | Pedestal bar stools, seven colourways | 1 |
| `roundStool`, `backrestStool` | Round bar stool; bar stool with a backrest | 1 |
| `siltCouch` | The Silt's couch | 3 |
| `petalSofa`, `darkPetalSofa` | MetaPetal's petal sofa, light and dark | 3 |
| `gardenBench` | Garden bench | 2 |
| `highBarTable`, `circularHighBarTable`, `squareHighBarTable`, `coffeeTable` | Tables (not for sitting on) | 0 |

## Make anything sittable

Your own furniture: describe it as a `FurnitureModel` and place it the same way:

```ts
import { placeFurniture, FurnitureModel } from 'dcl-sittables'

const myChair: FurnitureModel = {
  file: 'models/my-chair.glb', // relative to the assets root; or set up your own seats with addSeat (below)
  scale: 1,
  uprightX: 0,     // -90 for models exported Z-up
  yawOffset: 0,    // degrees to turn the model so its front faces `facing`
  collision: 'model',
  kind: 'stool',
  seats: [{ across: 0, forward: 0.35, rise: 0, orbForward: 0, orbRise: 0.65 }]
}
```

Or add seats yourself, anywhere:

```ts
import { addSeat } from 'dcl-sittables'

addSeat({
  position: Vector3.create(8, 0, 8.4),     // where the player's moved to sit (see "Where a seat goes")
  lookAt: Vector3.create(8, 1.5, 12),      // what they face
  orbPosition: Vector3.create(8, 0.65, 8), // the orb, over the seat
  clickTargets: [myChairEntity],           // optional: more things to click
  kind: 'stool'                            // 'stool' | 'couch' | 'bench'
})
```

### Where a seat goes

Decentraland's sitting emotes (`sittingChair1`, `sittingChair2`) are made for the player **standing on the floor just
in front of the seat**: they raise the hips 0.64 m and move them back 0.37 m onto it. So a seat's `position` is at
floor level (or on something whose top is ~0.47 m below the seat's top), about 0.3–0.45 m in front of the middle of the
seat, and the seated player faces `lookAt`. Two things that matter, learned the hard way:

- **Nothing may overlap the player at the seat position.** A stool's seat position is under its cushion's edge; had the
  cushion collided, the avatar would be shoved off it, a different way on every stool, and sit off-centre. That's why
  stools use `collision: 'stool'`: the model only takes clicks, a collider stands round the bottom of the pole, and a
  small invisible step at the seat position holds the sitter at exactly the right height.
- **The avatar is turned to face `lookAt`** as it's moved, because the emote moves back from however it's facing.

### Orbs

```ts
import { setSeatOrbStyle } from 'dcl-sittables'
import { Color4 } from '@dcl/sdk/math'

setSeatOrbStyle({ color: Color4.create(1, 0.4, 0.8, 0.4), glow: Color4.create(1, 0.4, 0.8, 1) }) // before adding seats
```

## Hooks

```ts
import { isSeated, currentSeat, onSitDown, onStandUp, setSitHandler } from 'dcl-sittables'

onSitDown((seat) => console.log('sat in', seat.id, seat.kind))
onStandUp((seat) => console.log('got up from', seat.id))

// Take over sitting down: return true if you've sat the player down yourself
setSitHandler((seat) => false)
```

## Sharing seats between players

Seat occupancy uses `syncEntity`, keyed by each seat's order (or its `syncId`). Every player's client must add seats in
the same order, which is the case when your scene adds them in its `main()`. If seats are added in varying orders (say,
after fetching something), give each a `syncId` that's the same on every client.

## Licence

Code: MIT. Models: CC BY 4.0, by MetaPetal: credit "Furniture by MetaPetal (dcl-lounge-kit), CC BY 4.0". See the
repository's `ASSETS-LICENSE.md`.
