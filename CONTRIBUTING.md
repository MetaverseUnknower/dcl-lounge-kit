# Contributing

Issues and pull requests are welcome: new furniture, fixes, better seats, more bartenders.

## Setting up

```sh
git clone https://github.com/MetaverseUnknower/dcl-lounge-kit.git
cd dcl-lounge-kit
npm install          # from the root: it's an npm workspace (packages/sittables, packages/bar-kit, example)
npm run example      # builds both packages, copies their assets into the example, and starts a preview
```

Node 20 is what the Decentraland SDK is tested on. Always run npm from the repository's root.

## Layout

```
packages/sittables/    dcl-sittables: src/ (seats.ts, furniture.ts), assets/models/, bin/copy-assets.mjs
packages/bar-kit/      dcl-bar-kit: src/ (bartender.ts, personalities.ts, drinks.ts, ui.tsx, speechBubble.ts),
                       assets/ (models, emotes, audio), tools/ (Blender and Python), bin/copy-assets.mjs
example/               a scene using both
docs/                  the documentation
```

## Guidelines

- **Test in-world.** Seats and emotes can only be judged in a preview (better, with two players): say what you tested
  in your pull request.
- **A changed emote gets a new file name.** Decentraland caches emotes by name.
- **New furniture** goes in `FURNITURE` (furniture.ts) with a comment giving the measurements behind its seats, its
  model in `assets/models/`, and a row in the reference's table.
- **Keep the public API small**, and document anything new in `docs/` and the package's README.
- Code style: Prettier with the settings in `package.json` (no semicolons, single quotes, 120 columns).

## Licences

By contributing you agree that your code is released under the [MIT licence](LICENSE), and models, emotes and sounds
under [CC BY 4.0](ASSETS-LICENSE.md).

## Releasing

```sh
npm run build
npm version <patch|minor|major> -w dcl-sittables     # and/or -w dcl-bar-kit; bump bar-kit's dcl-sittables range if needed
npm publish -w dcl-sittables
npm publish -w dcl-bar-kit
```

Add the release to `CHANGELOG.md`.
