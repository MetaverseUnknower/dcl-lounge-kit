# dcl-lounge-kit

Sittable furniture, and a bar with robot bartenders and drinks, for [Decentraland](https://decentraland.org) SDK7
scenes. From MetaPetal's builds: The Silt, MetaPetal HQ and Galaxy Gardeners' Stellar Station.

| Package | |
|---|---|
| [**dcl-sittables**](packages/sittables) | Click-to-sit seats, shared between players, and ready-to-place stools, couches, a bench and tables, each with its seats worked out. |
| [**dcl-bar-kit**](packages/bar-kit) | Bartenders (BETA and BLIP, or your own), a drinks menu with at-home recipes, drinks you hold, sip (standing or sitting), spill and smash, seen by everyone, and a "special" hook for secrets. Uses dcl-sittables. |

```sh
npm install dcl-bar-kit          # or just dcl-sittables
npx dcl-sittables-copy-assets
npx dcl-bar-kit-copy-assets
```

**[Getting started](docs/getting-started.md)** takes you from an empty folder to a working bar. Then:

| Documentation | |
|---|---|
| [dcl-sittables reference](docs/sittables-reference.md) | Every function, type and model. |
| [dcl-bar-kit reference](docs/bar-kit-reference.md) | Every function, type, bartender and drink. |
| [Your own furniture](docs/custom-furniture.md) | Where a seat goes, and why; describing a model; tuning. |
| [Your own drinks](docs/custom-drinks.md) | Glasses, building drinking emotes in Blender, specials. |
| [Your own bartender](docs/custom-bartenders.md) | Words, routines, models. |
| [How it works](docs/how-it-works.md) | What other players see, and how. |
| [Troubleshooting](docs/troubleshooting.md) | |

## The example

`example/` is a little bar using both: a counter with a row of stools, BETA and BLIP behind it, sofas, a couch and a
bench, and a special on the menu that opens a panel behind the bar.

```sh
npm install
npm run example        # builds the packages, copies their assets into the example, and starts a preview
```

## Working on the kit

See [CONTRIBUTING.md](CONTRIBUTING.md). In short:

```sh
npm install
npm run build          # both packages (TypeScript into dist/)
```

- `packages/bar-kit/tools/` has the Blender and Python scripts that made the bartenders (`build_bartender.py`), the
  drinking emotes (`build_drink_emote.py`, on Decentraland's emote rig template) and the glass-break sound
  (`make_glass_break.py`).
- Seat layouts are tuned to Decentraland's own sitting emotes: see "Where a seat goes" in the sittables README.

## Licence

Code: [MIT](LICENSE). Models, emotes and sounds: [CC BY 4.0](ASSETS-LICENSE.md), by MetaPetal (credit required).
