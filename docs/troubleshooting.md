# Troubleshooting

## Seats

**Clicking a seat does nothing.**
- `scene.json` needs `"ALLOW_TO_MOVE_PLAYER_INSIDE_SCENE"` and `"ALLOW_TO_TRIGGER_AVATAR_EMOTE"` in
  `requiredPermissions`.
- Someone else is in it (its orb is gone). A seat is only taken while its sitter is in the scene, so if the orb's gone
  and nobody's there, see "Seats look taken" below.
- You're more than 5 m away (4 m for the click box and the furniture).
- Something with a pointer collider is in front of it: a glass wall, an invisible trigger box. Put that on
  `CL_PHYSICS` only.

**The furniture's there but grey, or missing.** The models haven't been copied into the scene: run
`npx dcl-sittables-copy-assets` (and `npx dcl-bar-kit-copy-assets`). The preview's console shows the path it tried to
load. Copied them somewhere else? `setSittablesAssetRoot(...)` / `setBarAssetRoot(...)`.

**People sit off-centre, or a different way each time, or get shoved off.** Something collides where the avatar stands
at the seat's `position`, and physics pushes it out. Use `collision: 'stool'` for stools, and trim your own models'
colliders back from the seat's front edge. See [Why stools are special](custom-furniture.md#why-stools-are-special).

**People sit in mid-air, or inside the seat.** The seat's numbers need tuning: see the
[tuning table](custom-furniture.md#tuning).

**People face the wrong way.** `facing` is the way the sitter faces, not the way the model's front faces. If the model
itself faces the wrong way, set its `yawOffset` (often 180).

**Seats look taken to one player and free to another.** The players' clients have given the seats different ids: your
scene adds seats in a different order on different clients. Give each a fixed `syncId`. See
[Seat ids](how-it-works.md#seat-ids). Or another synced entity of yours uses an id of 7000 or more.

**A seat stays taken after its sitter stood up.** Their client didn't get to say so (it crashed, say). It frees itself
once they've left the scene.

## Drinks

**The drink's held but never drunk.** The drink has no `emotes`, or they didn't load: scene emote files must end in
`_emote.glb`, and the paths must be right (the preview's console shows failed loads). Or `ALLOW_TO_TRIGGER_AVATAR_EMOTE`
is missing.

**I changed an emote and it still plays the old one.** Decentraland keeps emotes by file name. Give the new version a
new name (`lemonade_v2_emote.glb`) and point the drink at it. See [Changing an emote](custom-drinks.md#changing-an-emote).

**Two different drinks play the same emote.** Their emotes' animations share names, and the client plays whichever
loaded first. Build each drink's emotes with its own id (`build_drink_emote.py` names the animations after it).

**The drink drops as soon as I sit down.** Your own sit handler plays a built-in emote whose name doesn't have
"sitting" in it, and bar-kit takes it for any other emote. Scene emotes (`…_emote.glb` files) and Decentraland's
sitting emotes never drop a drink; use one of those.

**Others don't see my drink.** They're not in the scene (or not yet synced: joining takes a moment), or your
`visibleTo` says no.

**It spills when I'm just walking.** Walking is 1.5 m/s, jogging 8, running 10: only running should spill it. If a
lift or moving platform carries players fast, turn spilling off (`spill: false`), since speed is measured from the
player's position.

## Bartenders

**Clicking a bartender does nothing.** You're more than 6 m away, or something with a pointer collider is in the way
(the counter's top, if it's tall: put it on `CL_PHYSICS`), or `setupBar` wasn't called.

**The menu doesn't appear.** `<BarUi />` isn't in your UI, or a later `ReactEcsRenderer.setUiRenderer` replaced the one
it was in (a scene has one UI renderer).

**The special doesn't do anything.** Its routine never calls `grant`: put `then: grant` on the last beat. Or
`onSpecial` isn't set.

**The bartender floats, sinks, or its head is in the wrong place.** Its `position` should be on the floor. With your
own models, check their origins and `neck`: see [Models of its own](custom-bartenders.md#models-of-its-own).

## Building

**`npm install` fails with ENOWORKSPACES** (working on the kit itself). Run npm from the repository's root, not from
inside `packages/…` or `example/`.

**Building emotes fails straight away in Blender.** The script needs Decentraland's `Avatar_File.blend` opened, before
`--python`: `blender -b Avatar_File.blend --python …`. See [What you need](custom-drinks.md#what-you-need).
