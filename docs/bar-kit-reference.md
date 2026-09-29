# dcl-bar-kit reference

Everything the package exports. For a first bar, see [Getting started](getting-started.md).

```ts
import {
  setupBar, addBartender, closeBarMenu, barMenu,
  BETA, BLIP, mocktails,
  holdDrink, handBack, finishDrink, dropDrink, holdingDrink, heldDrink,
  BarUi, BarMenu, AnotherDialog, DropNotice,
  whisper, setBarAssetRoot, barAsset
} from 'dcl-bar-kit'
import type { Personality, Beat, BarOptions, BartenderPlacement, Drink, DrinksOptions, Line, BubbleStyle } from 'dcl-bar-kit'
```

dcl-bar-kit is built on [dcl-sittables](sittables-reference.md), which it installs: its sitting drinking emotes are
played in dcl-sittables' seats.

---

## The bar

### `setupBar(options: BarOptions)`

Sets up the menu, what the special does, and how drinks behave. Call it once, in `main()`, before `addBartender`.

```ts
setupBar({
  drinks: [...mocktails(), myLemonade],
  title: 'THE LOUNGE',
  subtitle: 'mixed by {bartender}  ·  on the house',
  onSpecial: (bartender, item) => openTheBackRoom()
})
```

| `BarOptions` | Type | Default | |
|---|---|---|---|
| `drinks` | `Drink[]` | (required) | The menu, in order. Two cards a row. |
| `title` | `string` | `'THE BAR'` | The menu's heading. |
| `subtitle` | `string` | `'mixed by {bartender}'` | Under it. `{bartender}` becomes the name of the bartender who handed the menu over. |
| `onSpecial` | `(bartender: string, drink: Drink) => void` | — | Someone's ordered a special (a menu item with `glass: null`) and the bartender's played its routine for it. Only runs for the player who ordered it. |
| `visibleTo` | `(address: string) => boolean` | everyone | Whose glasses and drops to show, by lower-case wallet address. See [below](#hiding-some-players-drinks). |
| `holdSeconds` | `number` | `300` | How long a drink lasts. When it's up, it's gone (not dropped); mid-emote, it waits until you next move. |
| `spill` | `boolean` | `true` | Sprinting or jumping with a drink spills it. |
| `dropOnEmote` | `boolean` | `true` | Playing any other emote drops it. |

`setupBar` also takes over dcl-sittables' [sit handler](sittables-reference.md#setsithandlerfn--null), and loads every
drink's glass and emotes up front so the first of each isn't slow.

### `addBartender(personality, placement)`

Puts a bartender behind your bar.

```ts
addBartender(BETA(), { position: Vector3.create(14, 0, 21), facing: 180 })
```

| `BartenderPlacement` | | |
|---|---|---|
| `position` | `Vector3` | On the floor behind the counter (the models hover by themselves). |
| `facing` | `number` | The way it faces, degrees (0: +Z, 90: +X): toward the customers. |

Give each bartender a different `name`: the scene keeps track of them by name. The kit's bartenders hold the shaker
0.25–0.36 m in front of them, so put the counter's back edge about 0.6–1 m in front of `position` (the example has it
0.6 m). Their bodies are solid, and they take clicks from up to 6 m away.

What a bartender does:

- **Its head follows you** when you're within 9 m, and wanders a little when nobody is. It blinks.
- **Clicked**, it says a greeting and hands you the menu. Walk more than 9 m away and the menu goes back.
- **Ordered a drink**, it says its `preparing` line, shakes the shaker for 1.6 s, and hands the drink over: it's in your
  hand, and it says its `served` line.
- **Clicked while you hold a drink**, it asks its `another` line and shows "Would you like another?": yes opens the
  menu, no hands the glass back (it says `tookGlass`).
- **Ordered a special**, it plays its `special` routine, then your `onSpecial` runs.
- **Now and then** (every 40–80 s, if you're within 6 m and it isn't busy talking) it mutters one of its `mutters`.

It talks in a holographic readout over its head, typed out a character at a time, that turns to face you and clears
itself a few seconds after it's finished.

### `barMenu`, `closeBarMenu()`

`barMenu` is the menu's state: `{ open: boolean, asking: boolean, from: string }`. `open` while the menu's showing,
`asking` while "Would you like another?" is, and `from` the bartender who handed it over. Read it to hide your own UI
while the menu's up, say. `closeBarMenu()` closes both.

---

## The bartenders

### `BETA()`, `BLIP()`

The two that come with the kit. Each call returns a new `Personality` (plain data), so you can change it:

```ts
addBartender({ ...BETA(), name: 'GAMMA', greetings: ['Welcome to the Rusty Nail.'] }, { position, facing: 180 })
```

- **BETA**: a mid-century hover-bot in ivory, brass and navy, with a bow tie. Dry, a little paranoid. Asked for the
  special, he gives you a dirty look, checks nobody's watching, drops his voice, asks if you were followed, and only
  then obliges. Afterwards he doesn't know what you're talking about.
- **BLIP**: small, round and pastel, with big eyes, blushing cheeks and a heart on her antenna. Delighted by everything,
  the special most of all.

Their models live in the bar-kit assets (`models/bartender_*.glb`, `models/blip_*.glb`). If you've moved the assets,
call `setBarAssetRoot` before `BETA()` and `BLIP()`.

### `Personality`

What a bartender looks like and how it behaves. See [Your own bartender](custom-bartenders.md) for a walkthrough.

| Field | Type | |
|---|---|---|
| `name` | `string` | Unique among your bartenders. Shown in its hover text ("Order a drink from BETA") and the menu's subtitle. |
| `body` | `string` | Model path: the body, its origin on the floor under it, facing +Z. Solid, and takes clicks. |
| `head` | `string` | Model path: the head, its origin at the neck. Turns to follow you. |
| `shaker` | `string` | Model path: the cocktail shaker it holds, its origin at its middle. |
| `neck` | `number` | The head's height above the body's origin, metres. |
| `hand` | `Vector3` | Where the shaker's held, relative to the body's origin, in the bartender's own frame: `+z` in front of it, `+x` to its right. |
| `eyes` | `'visor' \| 'round'` | Drawn eyes that blink: two bars on a visor, or big round glowing ones with a highlight. |
| `bubble` | `BubbleStyle` | Its speech readout's look. |
| `bob` | `number` | How far it bobs as it hovers, metres (BETA 0.02, BLIP 0.035). |
| `greetings` | `string[]` | Said when clicked (one at random). |
| `preparing` | `string` | Said as it starts on a drink. |
| `served` | `(drink: Drink) => string` | Said handing it over. Default: the drink's own `served`, or "Here you go." |
| `another` | `string` | Said when clicked by someone holding a drink. |
| `tookGlass` | `string` | Said taking the glass back. |
| `mutters` | `string[]` | Said now and then to anyone nearby. |
| `jittery` | `boolean` | Glances about when it mutters. |
| `special` | `(grant: () => void, again: boolean) => Beat[]` | Its routine for a special: the beats to play. Call `grant` in the last beat's `then`: that's when `onSpecial` runs. `again` is true if a special was granted in the last two minutes. Without one: "Coming right up." and straight to `onSpecial`. |
| `afterSpecial` | `string[]` | Said, instead of a greeting, when clicked within two minutes of granting a special. |

Eyes: `'visor'` eyes narrow when it's nervous and narrow and tilt into a scowl when it glares; `'round'` eyes squeeze
into happy arcs, and the head tilts and wiggles when it's happy. BLIP-style (`'round'`) bartenders also look delighted
whenever they're clicked or hand something over.

### `Beat`

One moment in a routine.

| Field | Type | |
|---|---|---|
| `at` | `number` | Seconds from the start of the routine. |
| `say` | `Line` | A line to say (a string, or `whisper('…')`). |
| `nervous` | `number` | Glance about for this many seconds. |
| `glare` | `number` | Lean in and stare the customer down for this many seconds. |
| `happy` | `number` | Look delighted (hop, wiggle) for this many seconds. |
| `then` | `() => void` | Run this. |

```ts
special: (grant, again) => again
  ? [{ at: 0, say: 'Again? Go on then.', then: grant }]
  : [
      { at: 0, say: '…', glare: 2 },
      { at: 2, say: whisper('Not so loud.'), nervous: 2 },
      { at: 4.5, say: whisper('Through the back. Quick.'), then: grant }
    ]
```

Leave a couple of seconds between lines: each is typed out at 45 characters a second and then held for 4.5 s, and a
new line replaces the last.

### `BubbleStyle`, `Line`, `whisper(text)`

`BubbleStyle` is the speech readout's look:

| Field | Type | |
|---|---|---|
| `tag` | `string` | A small tag over the text (BETA's "BETA-7 // VOX"). |
| `edge` | `Color3` | The glowing frame. |
| `text` | `Color4` | The words. |
| `panel` | `Color4` | The panel behind them. |

A `Line` is a string, or `whisper(text)`: in italics, dimmer. Lines wrap at about 24 characters.

---

## Drinks

### `Drink`

A menu item. Most are drinks; one with `glass: null` is a special (a password, say).

| Field | Type | |
|---|---|---|
| `id` | `string` | Unique on the menu. Used in emote file and animation names: see [custom drinks](custom-drinks.md). |
| `name` | `string` | On its menu card. |
| `blurb` | `string` | A line about it (keep it to one line on the card). |
| `tag` | `{ text: string, color: Color4 }` | A badge on the card (the mocktails' rarity). |
| `ingredients` | `string[]` | Under "MAKE IT AT HOME", one per line (room for about five). Leave out to hide the heading. |
| `method` | `string` | How to make it, at the bottom of the card (two short lines). |
| `color` | `Color3` | The drink's colour: the splash when it's dropped. |
| `glass` | `string \| null` | The glass's model path, held in the hand. `null` for a special. |
| `emotes` | `{ stand, sit, couch }` | Its drinking emotes (model paths ending `_emote.glb`): standing, sitting on a stool or bench, and on a couch. Without them, the glass is held but never drunk. |
| `served` | `string` | What the bartender says handing it over (unless its personality says otherwise). |

### `mocktails(): Drink[]`

The three that come with the kit, each with its glass and emotes:

| `id` | Name | Tag | Glass |
|---|---|---|---|
| `helium3` | Helium-3 Fizz | COMMON | clear blue highball |
| `plasma` | Plasma Crystal | UNCOMMON | purple highball |
| `mythic` | Mythic Bloom | MYTHIC | pink highball |

All three are non-alcoholic, with real at-home recipes on their cards. Call `setBarAssetRoot` first if you moved the
assets.

The glasses are `barAsset('models/glasses/lumen_rift_highball.glb')`, `nebula_tear_highball.glb` and
`synapse_highball.glb`, and you're welcome to use them for drinks of your own.

### Holding and drinking

What happens once you've a drink, all by itself:

- **Held**: the glass is in your right hand, walking about too. Everyone in the scene sees it.
- **Drunk**: stand still for a second (or sit) and your drinking emote starts: the glass at your chest, a sip every
  eight seconds, a little club sway standing, a gentle sway and a tapping heel sitting. Everyone near sees it. Move and
  it stops; stand still again and it starts again.
- **Dropped**: play any other emote and it falls from your hand and smashes, with a crash and a splash of its colour,
  for everyone near: "You dropped your drink…". Sitting down and your scene's own emotes (`triggerSceneEmote`) don't
  count.
- **Spilled**: sprint (faster than 9 m/s for a moment) or jump with it, and the same: "You spilled your drink… (no
  sprinting with a drink!)". Not while seated.
- **Handed back**: tell the bartender you're done and it's gone.
- **Finished**: after `holdSeconds` it's gone.

A teleport (or a seat moving you) doesn't count as sprinting.

### `holdDrink(drink)`, `heldDrink()`, `holdingDrink()`

Hand the local player a drink yourself (a free round when someone walks in; a quest reward), replacing any they hold;
`holdDrink` ignores a special. `heldDrink()` is the one they're holding, or `null`; `holdingDrink()` whether they are.

```ts
const [welcome] = mocktails()
holdDrink(welcome)   // from a button, a quest's reward, a timer…
```

### `finishDrink()`, `handBack()`, `dropDrink(why?)`

- `finishDrink()`: the drink's gone, quietly. If they were mid-drinking-emote, it carries on (with the emote's own
  glass) until they move.
- `handBack()`: the same, but a drinking emote in progress is ended properly (standing, with a moment and then
  Decentraland's idle; sitting, sat as before with hands on the thighs). What the bartender does when you say you're
  done.
- `dropDrink(why)`: they drop it: it smashes for everyone, and `why` is shown (default "You dropped your drink…").

### Hiding some players' drinks

If your scene hides some players' avatars from others (a private room; players in different instances of a game), hide
their drinks too:

```ts
setupBar({ drinks, visibleTo: (address) => sameRoomAsMe(address) })
```

`visibleTo` is asked about every other player's glass and dropped drinks, often, so keep it cheap. Your own always show.

---

## The UI

### `BarUi`

Everything the bar draws on screen, each only when it's needed: the menu, the "Would you like another?" dialog, and
the "You dropped your drink…" notice. Put it in your scene's UI:

```tsx
export const ui = () => (
  <UiEntity uiTransform={{ width: '100%', height: '100%' }}>
    <MyHud />
    <BarUi />
  </UiEntity>
)
```

It sizes itself for the window, from a 1080-pixel-high reference.

### `BarMenu`, `AnotherDialog`, `DropNotice`

The three parts, to place yourself instead of `BarUi` (in a different order among your own UI, say).

- `BarMenu`: the menu, in the middle of the screen: a card for each drink, two to a row, and a close button.
- `AnotherDialog`: "Would you like another?", with YES, PLEASE and NO, THANKS.
- `DropNotice`: the drop message, near the top, for a few seconds.

---

## Asset folders

### `setBarAssetRoot(path)`, `barAsset(file): string`

`npx dcl-bar-kit-copy-assets` copies the models, emotes and sound to `assets/dcl-bar-kit/`. Copied elsewhere? Say so
first thing in `main()`, before `mocktails()`, `BETA()` or `BLIP()` (which read it):

```ts
setBarAssetRoot('art/bar/')
```

`barAsset(file)` gives a file's scene path under the root: `barAsset('models/glasses/synapse_highball.glb')`.

What's in the folder:

```
models/  bartender_body.glb bartender_head.glb bartender_shaker.glb blip_body.glb blip_head.glb
         glasses/lumen_rift_highball.glb nebula_tear_highball.glb synapse_highball.glb
emotes/  <id>_emote.glb <id>_sit_emote.glb <id>_couch_emote.glb   for helium3, plasma and mythic
         empty_emote.glb empty_sit_emote.glb empty_couch_emote.glb
audio/   glass_break.mp3
```

## Limits

- One bar per scene: `setupBar` is called once, and every bartender serves the same menu.
- A player holds one drink at a time.
- A drink's emotes carry their own glass (the emote's prop, since an emote can't hold a scene's model), a plain
  highball in the drink's colour; the glass in the hand is the drink's `glass` model. See [custom drinks](custom-drinks.md).
- The bartenders aren't shared between players: each player's client runs its own, so nobody else sees a bartender
  talking to you, or shaking your drink. (Your drink itself, and drinking it, everyone sees.)
