# Your own drinks

A drink on the menu is a `Drink` object: its card, its glass, and its drinking emotes. The quickest drink of your own
reuses one of the kit's glasses and emotes; a drink in a new colour needs emotes built for it, which takes Blender and
a few minutes.

## A drink from the kit's parts

```ts
import { Drink, barAsset, mocktails } from 'dcl-bar-kit'
import { Color3, Color4 } from '@dcl/sdk/math'

const e = (file: string) => barAsset(`emotes/${file}`)

const blueMoon: Drink = {
  id: 'bluemoon',
  name: 'Blue Moon Tonic',
  tag: { text: 'HOUSE', color: Color4.create(0.3, 0.6, 1, 1) },
  blurb: 'Tonic, blueberry, and a slice of lime.',
  ingredients: ['1 cup (8 oz) tonic water', '2 tbsp blueberry syrup', 'A slice of lime', 'Ice'],
  method: 'Syrup over ice, top with tonic, lime on the rim.',
  color: Color3.create(0.3, 0.5, 1),
  glass: barAsset('models/glasses/lumen_rift_highball.glb'),
  // the Helium-3 Fizz's emotes: its glass is blue too
  emotes: { stand: e('helium3_emote.glb'), sit: e('helium3_sit_emote.glb'), couch: e('helium3_couch_emote.glb') },
  served: 'One Blue Moon. Don’t howl.'
}

setupBar({ drinks: [...mocktails(), blueMoon] })
```

The emote's glass is a plain highball in the emote's colour, not your `glass` model (an emote can only animate a prop
it carries itself), so pick emotes whose colour is close to your drink's. The three that come with the kit: blue
(`helium3`), purple (`plasma`) and pink (`mythic`).

A drink without `emotes` works too: it's held, it can be dropped and spilled, but it's never drunk.

## The menu card

| Field | On the card |
|---|---|
| `name` | The heading. |
| `tag` | A coloured badge by the name. The mocktails use rarities (COMMON, UNCOMMON, MYTHIC); use anything short. |
| `blurb` | One line under the name. |
| `ingredients` | Under "MAKE IT AT HOME", a line each; room for about five. Leave out for no recipe. |
| `method` | At the bottom, beside the ORDER button; two short lines at most. |

The menu shows two cards a row, in the order of `drinks`. Up to six fit on a 1080p screen comfortably.

## A glass of your own

The glass in the hand is any glTF model: `glass: 'models/my_glass.glb'` (a path in your scene). It's attached to the
avatar's right hand and shown at 0.15 of its model's size, with no turn. The kit's highballs are 1.58 units tall along
their Z axis (about 24 cm in the hand), and your glass will sit in the hand properly if it's modelled the same way: the
easiest start is one of the kit's glasses, reshaped. Keep it small: under 1,000 triangles, one or two materials.

## Building emotes

For a drink in a colour of its own, build its three emotes with `tools/build_drink_emote.py` (in the package:
`node_modules/dcl-bar-kit/tools/`). It makes all of them from scratch, in Blender, on Decentraland's avatar rig.

### What you need

- **Blender 3.6** (the script is tested with it; 4.x may work).
- **Decentraland's emote template**, `Avatar_File.blend`, from Decentraland's documentation repository:
  [github.com/decentraland/documentation](https://github.com/decentraland/documentation), under
  `static/images/emotes/`. It has the avatar's rig and the prop armature an emote's prop hangs off.

### Build

```sh
blender -b path/to/Avatar_File.blend --python node_modules/dcl-bar-kit/tools/build_drink_emote.py -- \
  assets/emotes '{"bluemoon": [0.3, 0.5, 1.0], "cherry": [0.9, 0.1, 0.2]}'
```

(On a Mac, `blender` is `/Applications/Blender.app/Contents/MacOS/Blender`.)

The arguments after `--` are the folder to write to, and the drinks: JSON of drink ids and the colour of the drink in
the glass (red, green, blue, 0 to 1). For each drink it writes:

```
<id>_emote.glb         standing: the glass at the chest, a sip every eight seconds, a club sway on a 120 bpm beat
<id>_sit_emote.glb     on a stool or bench: thighs forward, a gentle sway, a tapping heel
<id>_couch_emote.glb   on a couch: the same, sat further back
```

and three empty-handed ones (`empty_emote.glb`, `empty_sit_emote.glb`, `empty_couch_emote.glb`) that the kit already
has, used when a glass is handed back mid-drink. Then:

```ts
emotes: {
  stand: 'assets/emotes/bluemoon_emote.glb',
  sit: 'assets/emotes/bluemoon_sit_emote.glb',
  couch: 'assets/emotes/bluemoon_couch_emote.glb'
}
```

Scene emote files **must** end in `_emote.glb`, or Decentraland won't play them.

### Changing an emote

**Give the new version a new file name.** Decentraland's client keeps emotes by file name (and by their animations'
names), so a changed file under an old name goes on playing the old version, for you and for everyone who's already
seen it. Add a version: `bluemoon_v2_emote.glb`.

For the same reason, each drink's animations are named after its id (`Bluemoon_Avatar`, `BluemoonSit_Prop`…), and a
drink id should be distinctive: two different emotes with the same animation names, in one session, play whichever
loaded first.

### Changing how they move

The poses are in the script: `pose_standing`, `pose_sitting` and the `sip_at` curve. `LENGTH` is the loop (240 frames,
eight seconds at 30 fps: one sip). The sitting ones are laid out exactly like Decentraland's `sittingChair` emotes
(hips 0.641 m up and 0.365 m back from where the avatar stands), so they fit dcl-sittables' seats: keep `SEAT_HIPS`
and `SEAT_BACK` unless you're changing the seats to match. Decentraland's rules for emotes: at most 299 frames (10 s),
the avatar's animation and the prop's the same length, and a prop of at most 2 materials and 3,000 triangles.

Set `CHECK_BLEND=/tmp/check.blend` in the environment and the script also saves a `.blend` of each, for a look in
Blender.

## Specials

A menu item with `glass: null` isn't served. The bartender plays its personality's `special` routine instead, and then
your `onSpecial` runs: open a door, give a wearable, start a quest, teleport them somewhere.

```ts
const password: Drink = {
  id: 'password',
  name: 'Vacuum on the Rocks, hold the rocks',
  tag: { text: 'CLASSIFIED', color: Color4.create(0.55, 0.3, 1, 1) },
  blurb: 'The finest nothing in the quadrant.',
  ingredients: ['Nothing', 'Chilled'],
  method: 'Serve immediately, before it gets any emptier.',
  color: Color3.Black(),
  glass: null
}

setupBar({
  drinks: [...mocktails(), password],
  onSpecial: (bartender, item) => {
    if (item.id === 'password') openTheBackRoom()
  }
})
```

`onSpecial` runs only for the player who ordered, on their client: to open a door for everyone, sync it yourself. More
than one special? Tell them apart by `item.id`.

If it's a secret, don't give it away on the card. "Vacuum on the Rocks, hold the rocks" looks like a joke drink; that's
the point.
