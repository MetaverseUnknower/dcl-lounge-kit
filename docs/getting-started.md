# Getting started

From an empty folder to a bar with stools, two robot bartenders and drinks you can hold, in about ten minutes. You need
Node.js 18 or later (the Decentraland SDK is happiest on Node 20).

## 1. A scene

If you already have an SDK7 scene, skip to step 2. Otherwise:

```sh
mkdir my-bar && cd my-bar
npx @dcl/sdk-commands init
```

That makes `scene.json`, `package.json` and `src/index.ts` with a `main()` in it.

## 2. Install the kit

```sh
npm install dcl-bar-kit          # brings dcl-sittables with it
```

Just want seats and furniture, no bar? `npm install dcl-sittables` instead, and skip the bar-kit steps below.

## 3. Copy the assets in

A Decentraland scene can only load files inside its own folder, and `node_modules` doesn't count, so the models, emotes
and sounds have to be copied into your scene:

```sh
npx dcl-sittables-copy-assets    # → assets/dcl-sittables/
npx dcl-bar-kit-copy-assets      # → assets/dcl-bar-kit/
```

Run these again whenever you update the packages. (To put them somewhere else, pass a folder, e.g.
`npx dcl-bar-kit-copy-assets art/bar`, and tell the package in code: see
[Asset folders](sittables-reference.md#asset-folders).)

It's worth adding them to your `package.json` so they never get forgotten:

```json
"scripts": {
  "copy-assets": "dcl-sittables-copy-assets && dcl-bar-kit-copy-assets",
  "start": "npm run copy-assets && sdk-commands start"
}
```

## 4. Permissions

Seats move the player onto them, and drinks play emotes on the player's avatar. Both need permission, in `scene.json`:

```json
"requiredPermissions": ["ALLOW_TO_MOVE_PLAYER_INSIDE_SCENE", "ALLOW_TO_TRIGGER_AVATAR_EMOTE"]
```

Without these, clicking a seat does nothing and drinks are never drunk.

## 5. Some furniture

In `src/index.ts`:

```ts
import { Vector3 } from '@dcl/sdk/math'
import { FURNITURE, placeFurniture } from 'dcl-sittables'

export function main() {
  // facing: the way someone sitting on it faces, degrees (0: +Z, 90: +X, 180: -Z, -90: -X)
  placeFurniture(FURNITURE.petalSofa, { position: Vector3.create(8, 0, 6), facing: 0 })
  placeFurniture(FURNITURE.coffeeTable, { position: Vector3.create(8, 0, 8), facing: 0 })
}
```

Run `npm start`, walk up to the sofa and click it, or one of the three glowing orbs over its cushions. You sit. Walk
off (any movement key) and you're up. Open a second preview window (or have a friend join) and you'll see the orb over
a taken cushion disappear for the other player.

## 6. A bar

Bartenders need a counter to stand behind; the kit doesn't include one, since yours will be part of your scene's own
build. For now, a box will do:

```ts
import { engine, Transform, MeshRenderer, MeshCollider } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { FURNITURE, placeFurniture } from 'dcl-sittables'
import { setupBar, addBartender, BETA, BLIP, mocktails } from 'dcl-bar-kit'
import { ui } from './ui'

export function main() {
  // The counter: 6 m long, 1.2 m high, its customers' side at z 11.6
  const counter = engine.addEntity()
  Transform.create(counter, { position: Vector3.create(8, 0.6, 12), scale: Vector3.create(6, 1.2, 0.8) })
  MeshRenderer.setBox(counter)
  MeshCollider.setBox(counter)

  // The menu, then the bartenders behind the counter, facing the customers (-Z is 180)
  setupBar({ drinks: mocktails() })
  addBartender(BETA(), { position: Vector3.create(6.5, 0, 13), facing: 180 })
  addBartender(BLIP(), { position: Vector3.create(9.5, 0, 13), facing: 180 })

  // Stools along the customers' side, facing the counter (+Z is 0)
  for (let i = 0; i < 4; i++) {
    placeFurniture(FURNITURE.pedestalStoolCyanMagenta, { position: Vector3.create(6 + i * 1.4, 0, 10.9), facing: 0 })
  }

  ReactEcsRenderer.setUiRenderer(ui)
}
```

And `src/ui.tsx`:

```tsx
import ReactEcs from '@dcl/sdk/react-ecs'
import { BarUi } from 'dcl-bar-kit'

export const ui = () => <BarUi />
```

If your scene already has a UI, put `<BarUi />` inside it rather than calling `setUiRenderer` twice (a scene has one UI
renderer; a second call replaces the first). `BarUi` draws nothing until it's needed.

## 7. Try it

- **Click a bartender.** It greets you and hands over the menu: three mocktails, each with a recipe to make at home.
- **Order one.** The bartender shakes it and hands it over. It's in your right hand.
- **Stand still for a second.** You start drinking: glass at your chest, a little sway, a sip every eight seconds.
- **Sit on a stool with it.** You drink sitting down.
- **Sprint, jump, or play an emote.** You drop it, and it smashes.
- **Click a bartender while holding one.** "Would you like another?" Say no and the bartender takes the glass.

## 8. Publishing

Nothing special: `npx sdk-commands deploy` (or `npm run deploy`) as usual. The copied assets are part of your scene, so
they're uploaded with it. The bar-kit's assets come to about 2 MB and the sittables' to about 3.7 MB (most of that the
three couches). If space is tight, delete the models you don't use from `assets/`, keeping the folder layout.

## Where next

- [The example scene](../example): a finished little bar, with a secret panel that opens for the special.
- [dcl-sittables reference](sittables-reference.md) and [dcl-bar-kit reference](bar-kit-reference.md): everything.
- [Your own furniture](custom-furniture.md), [your own drinks](custom-drinks.md), [your own bartender](custom-bartenders.md).
- [How it works in multiplayer](how-it-works.md), and [troubleshooting](troubleshooting.md).

Credit the models if you use them: "Furniture by MetaPetal (dcl-lounge-kit), CC BY 4.0" and "Bartender and drink assets
by MetaPetal (dcl-lounge-kit), CC BY 4.0" (in your scene's description, say). See [ASSETS-LICENSE.md](../ASSETS-LICENSE.md).
