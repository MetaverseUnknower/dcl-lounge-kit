# How it works

What happens under the hood, mostly so you know what other players see, and what to watch for if your scene does its
own syncing.

## What's shared between players

| | Shared? | How |
|---|---|---|
| Whether a seat is taken | Yes | Each seat's orb is a synced entity (`syncEntity`, id `7000 + syncId`) carrying who's in it. |
| Sitting | Yes | Decentraland's own sitting emotes (or bar-kit's), played on your avatar, which everyone near sees. |
| The glass in your hand | Yes | A synced `AvatarAttach` naming your avatar (every client attaches it to your right hand), with the glass parented to it (`parentEntity`). |
| Drinking | Yes | A scene emote (`triggerSceneEmote`) with the glass as its prop. |
| Dropping or spilling | Yes | A small synced record (which glass, what colour, where); every client plays the smash there. It's removed after ten seconds. |
| The bartenders | No | Each player's client runs its own: they follow *you* with their heads and talk to *you*. |
| The menu, the dialogs | No | On your screen only. |
| A special's `onSpecial` | No | Runs for the player who ordered it. Share what it does yourself if others should see it. |

### Seat ids

A synced entity needs the same id on every player's client. Seats take theirs from the order they're added in (seat 0
is 7000, seat 1 is 7001…), which is the same everywhere as long as your scene adds them the same way every time. If it
doesn't (seats added after fetching something, or depending on who's in the scene), give each seat a fixed `syncId`.

Keep your own fixed `syncEntity` ids clear of 7000 and up. bar-kit's glasses and drops don't use fixed ids.

### A seat whose sitter left

A seat counts as taken only while its sitter is in the scene: if they log off or teleport away while seated, the seat
frees itself for everyone, without anyone having to clean up.

### A glass whose owner left

The same: a glass is only drawn while its owner is in the scene.

## Sitting

1. You click a seat (its orb, its click box, or the furniture).
2. If someone else is in it, nothing happens.
3. If you were in another seat, it's freed.
4. The sit handler, if one's set, gets the first go (bar-kit's: if you're holding a drink, it sits you straight into the
   sitting drinking emote).
5. Otherwise: you're moved to the seat's `position`, turned to face `lookAt`, and play `sittingChair1` or
   `sittingChair2`.
6. The seat's marked taken (the orb disappears for everyone else), and `onSitDown` runs.
7. Once you've arrived, moving more than 1 m from `position` stands you up: the seat's freed and `onStandUp` runs. If
   you never arrive (the move didn't happen), it gives up after three seconds.

Clicks are read with `inputSystem.isTriggered` on raw `PointerEvents`, which proved more reliable on overlapping
targets than `pointerEventsSystem` callbacks.

## Drinking

A system watches the local player every frame while they hold a drink:

- **Still for a second** (moving less than 3 cm): it triggers the drinking emote, looped: the standing one, or if
  seated, the sitting one for that kind of seat. The glass in the hand hides meanwhile, since the emote carries its own.
- **Moved 12 cm from where the emote started**: Decentraland has ended the emote (it ends them on movement); the hand's
  glass shows again.
- **Another emote**: Decentraland reports every emote the avatar plays (`AvatarEmoteCommand`). One that isn't a scene
  emote (bar-kit's, or your scene's own), a sit, or something bar-kit triggered in the last two seconds drops the drink.
- **Speed**: measured over 0.3 s, not a frame (positions don't update every frame, so per-frame speed flickers to
  zero). Over 9 m/s spills it; so does rising at 3.2 m/s (a jump). A jump in position of over 2 m (a teleport, a seat's
  move) restarts the measuring rather than counting as speed.
- **Time**: after `holdSeconds` (300), the drink's gone, once you're not mid-emote.

## Why the emotes are laid out as they are

Decentraland's chair-sitting emotes start from standing on the floor in front of a chair and move the hips 0.641 m up
and 0.365 m back. dcl-sittables' seats are placed for exactly that, and bar-kit's sitting drinking emotes copy it to
the millimetre, so switching from Decentraland's sit to the drinking one (or back to the empty-handed one) moves
nothing. The measurements came from Decentraland's own `SittingChair_v01.glb` and `SittingChair_v02.glb`
(github.com/decentraland/avatar-assets).
