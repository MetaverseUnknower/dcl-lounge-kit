# dcl-sittables reference

Everything the package exports. For a first scene, see [Getting started](getting-started.md).

```ts
import {
  placeFurniture, FURNITURE, addSeat,
  isSeated, currentSeat, onSitDown, onStandUp, setSitHandler,
  setSeatOrbStyle, setSittablesAssetRoot, sittablesAsset
} from 'dcl-sittables'
import type { FurnitureModel, SeatOffset, PlaceOptions, PlacedFurniture, Seat, SeatSpec, SeatKind, SeatOrbStyle } from 'dcl-sittables'
```

**Directions.** Everywhere in the kit, a direction in degrees is a turn about the vertical: `0` faces scene +Z (north),
`90` faces +X (east), `180` faces −Z, `-90` (or `270`) faces −X.

---

## Furniture

### `placeFurniture(model, options): PlacedFurniture`

Adds a model to the scene with its seats.

```ts
const { entity, seats } = placeFurniture(FURNITURE.petalSofa, { position: Vector3.create(8, 0, 8), facing: 90 })
```

| `options` | Type | Default | |
|---|---|---|---|
| `position` | `Vector3` | (required) | Where the furniture's origin goes: on the floor, under its middle (stools: under the pole). |
| `facing` | `number` | `0` | The way people sitting on it face, degrees. |
| `scale` | `number` | `1` | Extra scale on top of the model's own. Its seats, orbs, collider and step scale with it. |
| `hoverText` | `string` | `'Sit'` | The hover text on its seats. |

Returns `{ entity, seats }`: the furniture's entity (to parent it, hide it, or remove it) and its seats (`Seat[]`, empty
for tables).

`placeFurniture` sets the entity's `Transform` and `GltfContainer`. You can move the entity afterwards, but its seats
won't follow, so place furniture where it's going to stay. Seats can't be removed once added (see
[Limits](#limits)).

### `FURNITURE`

Every model in the package, ready to pass to `placeFurniture`.

| Key | What | Seats | Kind | Collision |
|---|---|---|---|---|
| `pedestalStool` | Pedestal bar stool | 1 | stool | stool |
| `pedestalStoolCyanMagenta` | … cyan and magenta | 1 | stool | stool |
| `pedestalStoolBluePurple` | … electric blue and purple | 1 | stool | stool |
| `pedestalStoolLimeTeal` | … lime and teal | 1 | stool | stool |
| `pedestalStoolMonochrome` | … monochrome ice | 1 | stool | stool |
| `pedestalStoolPinkGold` | … pink and gold | 1 | stool | stool |
| `pedestalStoolRedOrange` | … red and orange | 1 | stool | stool |
| `roundStool` | Round bar stool | 1 | stool | stool |
| `backrestStool` | Bar stool with a backrest | 1 | stool | stool |
| `siltCouch` | The Silt's couch | 3 | couch | model |
| `petalSofa` | MetaPetal's petal sofa, 3.12 m wide | 3 | couch | colliders |
| `darkPetalSofa` | … in dark | 3 | couch | colliders |
| `gardenBench` | Garden bench, 1.8 m wide | 2 | bench | colliders |
| `highBarTable` | High bar table | 0 | — | model |
| `circularHighBarTable` | Round high bar table | 0 | — | model |
| `squareHighBarTable` | Square high bar table | 0 | — | model |
| `coffeeTable` | Coffee table | 0 | — | model |

The bar stools suit a counter about 1.2–1.3 m high. Place a row of them about 1.4 m apart, their origins about 0.7 m
out from the counter's face (the example scene and Stellar Station both do).

The entries are plain `FurnitureModel` objects: copy one and change it to make a variant (`{ ...FURNITURE.roundStool,
scale: 0.9 }`).

### `FurnitureModel`

Describes a model for `placeFurniture`: your own, or one of `FURNITURE`. See [Your own furniture](custom-furniture.md)
for how to work the numbers out.

| Field | Type | |
|---|---|---|
| `file` | `string` | The model's path, relative to the asset root (`sittablesAsset(file)`). For a model of your own outside the package's folder, see [custom furniture](custom-furniture.md#your-own-model-file). |
| `scale` | `number` | The model's own scale (the kit's stools are modelled large and shown at 0.75). |
| `uprightX` | `number` | Degrees about X to stand it up: `-90` for models exported Z-up, `0` for Y-up. |
| `yawOffset` | `number` | Degrees added to `facing` so the model's front faces that way (`180` if it was modelled facing −Z). |
| `collision` | `'model' \| 'colliders' \| 'stool'` | How it collides; below. |
| `kind` | `SeatKind \| null` | The sort of seat, or `null` for furniture you can't sit on. |
| `seats` | `SeatOffset[]` | Its seats, in its own frame. |

**`collision`:**

- `'model'`: its visible meshes block players and take clicks.
- `'colliders'`: it carries its own invisible collision meshes (named `*_collider` in the glTF), which block; its
  visible meshes only take clicks. Best for anything whose visible mesh is detailed.
- `'stool'`: its visible meshes only take clicks. A thin cylinder collider (0.16 m across, 0.45 m high) stands round
  the bottom of its pole, and a small invisible step (0.3 m square) sits at each seat's `position`, at exactly the seat
  height, so the sitter stands on it. See [why](custom-furniture.md#why-stools-are-special).

### `SeatOffset`

A seat on a piece of furniture, in the furniture's own frame, in metres, before `PlaceOptions.scale`.

| Field | |
|---|---|
| `across` | To the sitter's right of the furniture's origin (negative: their left). |
| `forward` | The seat's `position` (where the player is moved to): this far forward of the origin, the way the sitter faces… |
| `rise` | …and this far up from the floor. |
| `orbForward`, `orbRise` | The orb: this far forward, and this far up. |

The seated player faces a point 4 m further forward, 1.5 m up.

---

## Seats

### `addSeat(spec): Seat`

A seat anywhere, without a furniture model: on a model that's part of your scene's build, on a ledge, on a rock.

```ts
addSeat({
  position: Vector3.create(8, 0, 8.4),     // where the player's moved to sit
  lookAt: Vector3.create(8, 1.5, 12),      // what they face
  orbPosition: Vector3.create(8, 0.65, 8), // the orb, over the seat
  clickTargets: [myChairEntity],           // optional: more things to click
  kind: 'stool'
})
```

| `SeatSpec` | Type | Default | |
|---|---|---|---|
| `position` | `Vector3` | (required) | Where the player is moved to sit. Not the seat itself: see [Where a seat goes](custom-furniture.md#where-a-seat-goes). |
| `lookAt` | `Vector3` | (required) | A point the seated player faces, and the camera looks at: a few metres ahead, at eye height. |
| `orbPosition` | `Vector3` | (required) | Where the orb floats: over the seat, a little above it. |
| `hoverText` | `string` | `'Sit'` | Hover text on the orb and click targets. |
| `clickTargets` | `Entity[]` | `[]` | More entities that sit you here when clicked (they need a collider on the pointer layer). Their `PointerEvents` are replaced. |
| `kind` | `SeatKind` | `'stool'` | The sort of seat. |
| `syncId` | `number` | the order added | Identifies the seat between players; see [Sharing seats](#sharing-seats-between-players). |

Each seat gets:

- an **orb**, a small glowing cube that grows and spins when hovered, and disappears for everyone while someone's in the
  seat;
- an invisible **click box** on the seat (0.6 × 0.5 × 0.6 m, its bottom 0.15 m above `position`), since the orb alone is
  a small target;
- its `clickTargets`.

Clicking any of them sits the player: they're moved to `position`, turned to face `lookAt`, and play one of
Decentraland's two chair-sitting emotes (`sittingChair1` and `sittingChair2`, taking turns). Clicking a seat someone
else is in does nothing.

The player **stands up** when they move more than 1 m (across the floor) from `position`, or if they never reach it
within three seconds. Any movement key ends Decentraland's sitting emote, so in practice: press a key and you're up.
Sitting in another seat while seated gives up the first.

### `Seat`

| Field | Type | |
|---|---|---|
| `id` | `number` | Its index among the scene's seats, in the order they were added. |
| `position`, `lookAt` | `Vector3` | As given. |
| `kind` | `SeatKind` | |

### `SeatKind`

`'stool' | 'couch' | 'bench'`. It changes nothing in dcl-sittables itself; it's there for code that sits people down
differently depending on the seat. dcl-bar-kit uses it to pick the right sitting drinking emote: a couch's cushion is
deeper, so a couch has its own. (Stools and benches share one.)

---

## Hooks

### `isSeated(): boolean`, `currentSeat(): Seat | null`

Whether the local player is in one of the scene's seats, and which.

### `onSitDown(fn)`, `onStandUp(fn)`

Called with the `Seat` whenever the local player sits in or gets up from a seat. Any number of listeners.

```ts
onSitDown((seat) => {
  if (seat.kind === 'couch') showTheTvRemote()
})
onStandUp(() => hideTheTvRemote())
```

### `setSitHandler(fn | null)`

Take over sitting down. Called when the player clicks a free seat, before the usual move and emote. Return `true` if
you've sat them down yourself, `false` to have the usual happen. The seat is marked taken and `onSitDown` runs either
way.

```ts
setSitHandler((seat) => {
  if (!wearingTheCrown()) return false
  movePlayerTo({ newRelativePosition: seat.position, cameraTarget: seat.lookAt, avatarTarget: seat.lookAt })
  triggerSceneEmote({ src: 'assets/emotes/throne_emote.glb', loop: true })
  return true
})
```

There's **one** sit handler: setting it replaces the last. **dcl-bar-kit sets one** in `setupBar` (to sit someone
holding a drink straight into the sitting drinking emote). Set yours before `setupBar` and bar-kit's replaces it; set it after
and yours replaces bar-kit's. That still works, a little less smoothly: someone sitting with a drink sits down with
Decentraland's plain sit, and a second later, sitting still, starts the sitting drinking emote.

Your emote must be laid out like Decentraland's chair sits (it plays from the floor in front of the seat), or the player
will sit in mid-air: see [Where a seat goes](custom-furniture.md#where-a-seat-goes).

---

## Orbs

### `setSeatOrbStyle(style)`

How seat orbs look. Call it before adding seats; orbs already added keep the old look. Give any of:

| `SeatOrbStyle` | Default | |
|---|---|---|
| `color` | `Color4(0.1, 0.5, 0.8, 0.4)` | The orb's colour (and see-through-ness). |
| `glow` | `Color4(0.2, 0.7, 1, 1)` | Its emissive glow. |
| `size` | `0.03` | Its size at rest, metres. |
| `hoverSize` | `0.14` | Its size when hovered. |

```ts
setSeatOrbStyle({ color: Color4.create(1, 0.4, 0.8, 0.4), glow: Color4.create(1, 0.4, 0.8, 1) })
```

To hide orbs until hovered, `size: 0`.

---

## Asset folders

### `setSittablesAssetRoot(path)`, `sittablesAsset(file): string`

`npx dcl-sittables-copy-assets` copies the models to `assets/dcl-sittables/`, and the package looks for them there. If
you copied them elsewhere (`npx dcl-sittables-copy-assets art/furniture`), say so before placing anything:

```ts
setSittablesAssetRoot('art/furniture/')
```

`sittablesAsset('models/stools/round_barstool.glb')` gives a model's full scene path under the root.

---

## Sharing seats between players

Whether a seat is taken is shared with everyone in the scene, with the SDK's `syncEntity`. Each seat's orb is a synced
entity with the id `7000 + syncId`, where `syncId` defaults to the order the seat was added in (0, 1, 2…).

For that to work, **every player's client has to give each seat the same id.** It does if your scene adds its seats in
the same order every time, in `main()`, which is the usual case. If seats are added in an order that can vary between
players (after fetching something from a server, say, or on a timer), give each one a fixed `syncId`:

```ts
addSeat({ ...spec, syncId: 40 })
```

If your scene uses `syncEntity` with its own fixed ids, keep them clear of 7000 upward.

A seat whose sitter leaves the scene (logs off, teleports away) is free again: a seat only counts as taken while its
sitter is in the scene.

See [How it works](how-it-works.md) for more.

## Limits

- Seats can't be removed or moved once added, and furniture's seats don't follow it if you move its entity.
- One sit handler per scene.
- A seat is either taken or free: two players can't share one, and there's no queue.
- The standing-up check assumes the seat is on (or near) the floor the player stands on to sit.
