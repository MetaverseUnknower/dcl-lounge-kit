# Your own furniture

Anything can be sat on: a chair of your own, a sofa from a marketplace, a ledge that's part of your building. This guide
covers where to put its seats so people sit on it properly, and how to tune them.

## Where a seat goes

This is the one thing to understand. dcl-sittables sits people down with Decentraland's own sitting emotes,
`sittingChair1` and `sittingChair2`. Those emotes don't know about your chair: they were made for an avatar **standing
on the floor just in front of a chair**, and they move the hips from there:

- **up 0.64 m** from the avatar's feet, and
- **back 0.37 m** from where it stands, the opposite way to the way it faces.

So a seat's `position` isn't the seat. It's where someone would stand if they were about to sit on it: on the floor
(or whatever's under their feet), about 0.37 m in front of where their hips will end up. And the avatar has to be
facing away from the seat, which is what `lookAt` is for.

```
            side view, the sitter facing right →

      ● ─ ─ ─ ─ ─ ─ ┐   the hips end up here: 0.64 m above `position`, 0.37 m behind it
   ██████████       ┆
   █  the seat      ┆   its top about 0.47 m above `position`
   █                ○   `position`: where the avatar stands, just before it sits
  ─┴────────────────┴──  floor
      ←── 0.37 m ──→
```

For a seat whose top is `h` metres above the floor under it, and whose middle is at `m`:

- `position` is on the floor if `h` is about 0.47 m (a typical chair). If the seat's higher, lift `position` by the
  difference: a bar stool's top is about 0.97 m up, so its `position` is about 0.5 m up, standing on something.
- `position` is about 0.3–0.45 m in front of `m`, the way the sitter faces.
- `lookAt` is a few metres further forward, at about eye height.
- `orbPosition` is over the seat, a little above it.

On a couch, where people sit back into a deep cushion, put `position` just past the cushion's front edge (the kit's
sofas: about 0.1 m past it). dcl-bar-kit's couch drinking emotes carry the hips further back and a little lower than
Decentraland's sit does, for just that.

## Why stools are special

A stool's `position` is high up (0.5 m), right under the front edge of its cushion. Something has to hold the avatar
up there: if it's the stool's own mesh, the avatar ends up overlapping it, and Decentraland's physics shoves the
avatar out of the overlap, a different way every time. People then sit off-centre, or on the edge, or behind the stool.

So `collision: 'stool'`:

- the stool model takes clicks but doesn't block;
- a thin cylinder collider stands round the bottom of its pole, so you can't walk through it;
- a small invisible step, 0.3 m square, sits exactly at the seat's `position`, for the sitter to stand on.

Use it for anything tall and thin that people sit up on. For your own chair-height furniture, `'model'` (the visible
mesh collides) or `'colliders'` (the model's own invisible `*_collider` meshes collide) are fine, **as long as nothing
collides where the avatar stands at `position`**: a chair's seat collider that reaches forward to its front edge will
push people off. Trim it back, or use `'colliders'` with a collider that stops short.

## Describing a model

A `FurnitureModel` says everything `placeFurniture` needs:

```ts
import { placeFurniture, FurnitureModel } from 'dcl-sittables'

const armchair: FurnitureModel = {
  file: 'models/armchair.glb',
  scale: 1,
  uprightX: 0,      // a Y-up model (-90 if it was exported Z-up and lies on its back)
  yawOffset: 0,     // 180 if it faces -Z when placed with facing 0
  collision: 'colliders',
  kind: 'stool',    // 'stool' | 'couch' | 'bench' (bar-kit picks its sitting emote by this)
  seats: [{ across: 0, forward: 0.38, rise: 0, orbForward: 0, orbRise: 0.7 }]
}

placeFurniture(armchair, { position: Vector3.create(8, 0, 8), facing: 90 })
```

Seat numbers are in the furniture's frame, as a sitter sees it: `across` to their right, `forward` the way they face,
`rise` up. The model's origin should be on the floor under its middle.

### Your own model file

`file` is looked up under the sittables asset root (`assets/dcl-sittables/` unless you changed it), so put your model
in there too: `assets/dcl-sittables/models/mine/armchair.glb` is `file: 'models/mine/armchair.glb'`. Re-running
`dcl-sittables-copy-assets` adds to the folder without deleting what's already in it. Or place the model yourself,
wherever it is, and add its seats with `addSeat` (next).

## Seats on your own build

For seating that's part of a model you've already placed (a bench built into a wall, the steps of an amphitheatre),
skip `placeFurniture` and add the seats:

```ts
import { addSeat } from 'dcl-sittables'

// Five places along a ledge 0.45 m high, running along x from 4 to 12 at z 10, the sitters facing -Z
for (let i = 0; i < 5; i++) {
  const x = 4.8 + i * 1.6
  addSeat({
    position: Vector3.create(x, 0, 9.62),        // on the floor, 0.38 m in front of the ledge's middle at z 10
    lookAt: Vector3.create(x, 1.5, 5),
    orbPosition: Vector3.create(x, 0.62, 10),
    kind: 'bench'
  })
}
```

To make your own model clickable too, pass its entity in `clickTargets` (it needs a collider on the pointer layer,
e.g. `visibleMeshesCollisionMask: ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS`). Best for single seats: with
several seats on one model, clicking it would always pick the same one.

## Tuning

Getting a seat right takes a few tries. What to look for, and what to change:

| You see | Change |
|---|---|
| Sitting in mid-air in front of the seat | `forward` smaller (or the `position` closer to the seat) |
| Sitting inside the seat's back | `forward` bigger |
| Sitting above the seat | `rise` smaller |
| Sitting sunk into the seat | `rise` bigger |
| Off to one side | `across`; or, if it's a different side every time, something's colliding at `position` (see above) |
| Facing the wrong way | `facing`, or the model's `yawOffset` |
| Sitting, then shoved off | a collider where the avatar stands: see [Why stools are special](#why-stools-are-special) |

Tips:

- Test with two different avatars, tall and short: the emote places the hips, so everyone's hips land in the same place,
  but long legs show a mistake in `rise` sooner.
- Decentraland's physics settles the avatar for a moment after moving it. Judge the seat once it's still.
- Look from the side, at the hips, not the head or feet.
- The kit's own furniture in `packages/sittables/src/furniture.ts` has comments with the measurements behind each seat,
  if you want worked examples.

## Your own sitting emote

Want people to sit differently (cross-legged, lounging, on the floor)? Use `setSitHandler` to play your own emote
instead of Decentraland's. Lay it out the same way (the avatar starts on the floor in front of the seat, facing away;
the emote moves the hips up and back onto it) and your seats' numbers stay the same. dcl-bar-kit's
`tools/build_drink_emote.py` builds sitting emotes on exactly that layout; its `pose_sitting` is a good starting point.
See [custom drinks](custom-drinks.md#building-emotes) for the Blender setup.
