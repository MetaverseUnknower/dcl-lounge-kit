// Two bartenders, ready to use (or copy and change: a Personality is plain data, see bartender.ts).
//   BETA: a mid-century hover-bot in ivory, brass and navy, with a bow tie. Dry. Asked for the special, he gives you a
//         dirty look, checks nobody's watching, drops his voice, asks if you were followed, and only then obliges;
//         afterwards he doesn't know what you're talking about.
//   BLIP: small, round and pastel, with big eyes, blushing cheeks and a heart on her antenna. Delighted by everything,
//         the special most of all, and she all but tells everyone about it.
// Their models are in this package's assets (tools/build_bartender.py builds them). Call these after setBarAssetRoot
// if you moved the assets.
import { Vector3, Color3, Color4 } from '@dcl/sdk/math'
import { Personality } from './bartender'
import { whisper } from './speechBubble'
import { barAsset } from './assets'

export function BETA(): Personality {
  return {
    name: 'BETA',
    body: barAsset('models/bartender_body.glb'),
    head: barAsset('models/bartender_head.glb'),
    shaker: barAsset('models/bartender_shaker.glb'),
    neck: 1.62,
    hand: Vector3.create(0.3, 1.08, 0.36),
    eyes: 'visor',
    bubble: { tag: 'BETA-7 // VOX', edge: Color3.create(0.2, 0.9, 1), text: Color4.create(0.75, 0.97, 1, 1), panel: Color4.create(0.015, 0.035, 0.08, 1) },
    bob: 0.02,
    greetings: ['What can I get you?', 'What’ll it be?', 'Evening. Drink?', 'Name your poison. Non-toxic, obviously.'],
    preparing: 'Coming right up.',
    another: 'Another?',
    tookGlass: 'I’ll take that.',
    mutters: [
      'Nothing unusual going on here.',
      'Don’t lean on the bar.',
      'Lovely evening. Nothing unusual.',
      'Don’t listen to BLIP. She tells everyone everything.'
    ],
    jittery: true,
    special: (grant, again) =>
      again
        ? [
            { at: 0, say: '…Again?', glare: 1.8 },
            { at: 1.8, say: whisper('Fine. Quick. Nobody’s looking.'), nervous: 1.2, then: grant }
          ]
        : [
            { at: 0, say: '…', glare: 2.4 },
            { at: 2.4, say: whisper('Keep your voice down.'), nervous: 2 },
            { at: 4.6, say: whisper('Right. That one.') },
            { at: 7.0, say: whisper('Nobody followed you?'), nervous: 2.2 },
            { at: 9.2, say: whisper('…Be quick.'), then: grant }
          ],
    afterSpecial: ['I don’t know what you’re talking about.', 'Never saw you.', 'I didn’t see a thing.']
  }
}

const BLIP_SERVED: Record<string, string> = {
  helium3: 'One Helium-3 Fizz! Extra bubbles, just for you.',
  plasma: 'A Plasma Crystal! It glows, see?',
  mythic: 'A Mythic Bloom! I put extra glitter in it.'
}

export function BLIP(): Personality {
  return {
    name: 'BLIP',
    body: barAsset('models/blip_body.glb'),
    head: barAsset('models/blip_head.glb'),
    shaker: barAsset('models/bartender_shaker.glb'),
    neck: 1.44,
    hand: Vector3.create(0.29, 1.03, 0.25),
    eyes: 'round',
    bubble: { tag: 'BLIP // hi!!', edge: Color3.create(1, 0.45, 0.65), text: Color4.create(1, 0.93, 0.96, 1), panel: Color4.create(0.1, 0.03, 0.08, 1) },
    bob: 0.035,
    greetings: ['Hi hi! What can I get you?', 'Welcome to the bar!', 'Hello, friend! Thirsty?', 'Ooh, a customer! Hi!'],
    preparing: 'Ooh, good choice!',
    served: (d) => BLIP_SERVED[d.id] ?? d.served ?? 'Here you go!',
    another: 'Ooh, ready for another?',
    tookGlass: 'Thank you! Did you like it?',
    mutters: [
      'Have you tried the Mythic Bloom? It sparkles!',
      'I polished every glass today!',
      'Psst. There’s a secret on the menu.',
      'BETA is a sweetie really. Just very private.',
      'I love it here!'
    ],
    jittery: false,
    special: (grant, again) =>
      again
        ? [{ at: 0, say: 'Back for more? Okay!', happy: 1.5, then: grant }]
        : [
            { at: 0, say: 'Ooh! The special!!', happy: 1.8 },
            { at: 1.8, say: 'Nobody ever orders it. I love it.' },
            { at: 3.8, say: 'There you go! Have fun!', happy: 1.5, then: grant }
          ],
    afterSpecial: ['Wasn’t that fun?', 'Did you bring me anything back?']
  }
}
