// Bartenders. Each hovers behind your bar, follows whoever's nearest with its head, blinks, talks in a readout over its
// head (speechBubble.ts), and, clicked, hands over the menu (ui.tsx). It shakes each drink before serving it into your
// hand (drinks.ts). Clicked while you're holding a drink, it asks whether you'd like another (or takes the glass).
//
// What it looks like and how it behaves is a Personality: personalities.ts has two, BETA (a mid-century bot with a
// bow tie, dry, and paranoid about the special) and BLIP (small, round and pastel, delighted by everything).
//
// The special: a menu item that isn't a drink (a Drink with `glass: null`), such as a password for a back room. The
// bartender plays its personality's routine for it, then calls your `onSpecial` (open the door, give the item...).
import { engine, Entity, Transform, GltfContainer, ColliderLayer, MeshRenderer, Material, pointerEventsSystem, InputAction } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color3, Color4 } from '@dcl/sdk/math'
import { Drink, holdDrink, holdingDrink, handBack, startDrinks, DrinksOptions } from './drinks'
import { createBubble, whisper, Line, BubbleStyle } from './speechBubble'

/** A little scene: lines at set times, moods for a while, and something to do at the end. */
export type Beat = { at: number; say?: Line; nervous?: number; glare?: number; happy?: number; then?: () => void }

export type Personality = {
  name: string
  /** Models (scene paths): the body (origin on the floor under it, facing +Z) and the head (origin at the neck). */
  body: string
  head: string
  /** The cocktail shaker it holds (and shakes). */
  shaker: string
  /** The head's height above the body's origin, and the right hand's position (where the shaker's held). */
  neck: number
  hand: Vector3
  /** Drawn eyes: bars on a visor, or big round glowing ones with a highlight. */
  eyes: 'visor' | 'round'
  bubble: BubbleStyle
  /** How far it bobs as it hovers, metres. */
  bob: number
  greetings: string[]
  /** Said as it starts making a drink. */
  preparing: string
  /** Said as it hands one over (default: the drink's own `served`). */
  served?: (drink: Drink) => string
  /** Holding a drink, clicked: would you like another? */
  another: string
  /** Taking the glass back. */
  tookGlass: string
  /** Now and then, to anyone close enough to hear. */
  mutters: string[]
  /** Glances about when it mutters. */
  jittery: boolean
  /** Its routine for the special item. `again`: it granted one in the last two minutes. Call `grant` at the end. */
  special?: (grant: () => void, again: boolean) => Beat[]
  /** Clicked soon after granting the special. */
  afterSpecial?: string[]
}

export type BarOptions = DrinksOptions & {
  /** The menu. */
  drinks: Drink[]
  /** Someone's ordered the special (a menu item with no glass) and the bartender's done its routine. */
  onSpecial?: (bartender: string, drink: Drink) => void
  /** The menu's title (default "THE BAR") and subtitle ({bartender}: who handed it over; default "mixed by {bartender}"). */
  title?: string
  subtitle?: string
}

const LOOK_RANGE = 9
const MAX_TURN = 70 // degrees the head turns either way
const SHAKE_SECONDS = 1.6
const RECENT_SECONDS = 120
const MUTTER_NEAR = 6
const SCOWL = 20 // degrees each visor eye tilts, inner end down, for a dirty look
const LEAN = 0.08 // metres it leans in when it's glaring

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

/** The menu (or, holding a drink, "would you like another?" first), and which bartender it's from. ui.tsx draws them. */
export const barMenu = { open: false, asking: false, from: '' }

let bar: BarOptions = { drinks: [] }
const bartenders = new Map<string, { order: (drink: Drink) => void; takeGlass: () => void }>()
let lastSpecial = -Infinity
let clock = 0
let started = false

/** Set up the bar: its menu, what the special does, and how drinks behave. Call once, before adding bartenders. */
export function setupBar(options: BarOptions): void {
  bar = options
  if (started) return
  started = true
  startDrinks(options.drinks, options)
  engine.addSystem((dt) => {
    clock += dt
  })
}

export const barDrinks = (): Drink[] => bar.drinks
export const barTitle = (): string => bar.title ?? 'THE BAR'
export const barSubtitle = (): string => (bar.subtitle ?? 'mixed by {bartender}').replace('{bartender}', barMenu.from)

export function closeBarMenu(): void {
  barMenu.open = false
  barMenu.asking = false
}

/** Order from the menu: the bartender who handed it over makes it. */
export function order(drink: Drink): void {
  barMenu.open = false
  bartenders.get(barMenu.from)?.order(drink)
}

/** "Would you like another?": yes, the menu. */
export function wantAnother(): void {
  barMenu.asking = false
  barMenu.open = true
}

/** "Would you like another?": no, I'm done. The bartender takes the glass. */
export function doneDrinking(): void {
  barMenu.asking = false
  bartenders.get(barMenu.from)?.takeGlass()
}

export type BartenderPlacement = {
  position: Vector3
  /** The way it faces, degrees (0: +Z, 90: +X): toward the customers. */
  facing: number
}

/** Put a bartender behind the bar. */
export function addBartender(p: Personality, place: BartenderPlacement): void {
  const base = place.position
  const facing = place.facing
  const fwd = Vector3.rotate(Vector3.create(0, 0, 1), Quaternion.fromEulerDegrees(0, facing, 0))

  const root = engine.addEntity() // bobs up and down; everything hangs off it
  Transform.create(root, { position: base, rotation: Quaternion.fromEulerDegrees(0, facing, 0) })
  const body = engine.addEntity()
  Transform.create(body, { parent: root })
  GltfContainer.create(body, { src: p.body, visibleMeshesCollisionMask: ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS })
  const head = engine.addEntity()
  Transform.create(head, { parent: root, position: Vector3.create(0, p.neck, 0) })
  GltfContainer.create(head, { src: p.head, visibleMeshesCollisionMask: ColliderLayer.CL_POINTER })
  const shaker = engine.addEntity()
  Transform.create(shaker, { parent: root, position: p.hand })
  GltfContainer.create(shaker, { src: p.shaker })

  // Eyes, drawn so they can blink (and scowl, or squint with joy)
  const EYE = p.eyes === 'visor'
    ? { y: 0.15, z: 0.2, x: 0.065, w: 0.06, h: 0.035, d: 0.01 }
    : { y: 0.2, z: 0.222, x: 0.065, w: 0.1, h: 0.124, d: 0.024 }
  const glow = p.eyes === 'visor' ? Color3.create(0.3, 0.95, 1) : Color3.create(0.45, 0.95, 1)
  const eyes: Entity[] = [-1, 1].map((sgn) => {
    const e = engine.addEntity()
    Transform.create(e, { parent: head, position: Vector3.create(sgn * EYE.x, EYE.y, EYE.z), scale: Vector3.create(EYE.w, EYE.h, EYE.d) })
    if (p.eyes === 'visor') MeshRenderer.setBox(e)
    else MeshRenderer.setSphere(e)
    Material.setPbrMaterial(e, { albedoColor: Color4.create(glow.r, glow.g, glow.b, 1), emissiveColor: glow, emissiveIntensity: 4 })
    if (p.eyes === 'round') {
      const shine = engine.addEntity()
      Transform.create(shine, { parent: head, position: Vector3.create(sgn * EYE.x + 0.018, EYE.y + 0.025, EYE.z + 0.012), scale: Vector3.create(0.024, 0.024, 0.01) })
      MeshRenderer.setSphere(shine)
      Material.setPbrMaterial(shine, { albedoColor: Color4.White(), emissiveColor: Color3.White(), emissiveIntensity: 5 })
    }
    return e
  })

  const bubble = createBubble(root, Vector3.create(0, p.neck + (p.eyes === 'round' ? 0.72 : 0.58), 0), p.bubble)
  const say = bubble.say

  let shaking = 0
  let pending: Drink | null = null
  let script: Beat[] = []
  let scriptT = 0
  let nervous = 0
  let glare = 0
  let happy = 0
  let grantedHere = -Infinity
  const run = (beats: Beat[]) => {
    script = beats
    scriptT = 0
  }

  for (const e of [body, head]) {
    pointerEventsSystem.onPointerDown(
      { entity: e, opts: { button: InputAction.IA_POINTER, hoverText: `Order a drink from ${p.name}`, maxDistance: 6, showHighlight: false } },
      () => {
        if (holdingDrink()) {
          if (!barMenu.asking || barMenu.from !== p.name) say(p.another)
          if (p.eyes === 'round') happy = 0.8
          barMenu.open = false
          barMenu.asking = true
          barMenu.from = p.name
          return
        }
        if (!barMenu.open || barMenu.from !== p.name) {
          if (clock - grantedHere < RECENT_SECONDS && p.afterSpecial?.length) say(pick(p.afterSpecial))
          else say(pick(p.greetings))
          if (p.eyes === 'round') happy = 0.8
        }
        barMenu.open = true
        barMenu.from = p.name
      }
    )
  }

  let t = Math.random() * 10
  let blink = 3
  let headYaw = 0
  let mutter = 30 + Math.random() * 40
  let lean = 0
  let scowling = false
  engine.addSystem((dt) => {
    t += dt
    // Hovering (a happy hop when delighted), leaning in when glaring
    lean += ((glare > 0 ? LEAN : 0) - lean) * Math.min(1, dt * 6)
    const hop = happy > 0 ? Math.abs(Math.sin(t * 9)) * 0.05 : 0
    Transform.getMutable(root).position = Vector3.create(base.x + fwd.x * lean, base.y + Math.sin(t * 1.7) * p.bob + hop, base.z + fwd.z * lean)

    // The head turns toward me when I'm near and wanders when I'm not; darts about when nervous; stares me down when
    // glaring; wiggles when happy
    const me = Transform.getOrNull(engine.PlayerEntity)
    let want = Math.sin(t * 0.3) * 25
    if (me && Vector3.distance(me.position, base) < LOOK_RANGE) {
      const toMe = (Math.atan2(me.position.x - base.x, me.position.z - base.z) * 180) / Math.PI
      want = ((toMe - facing + 540) % 360) - 180
    }
    if (glare > 0) glare -= dt
    else if (nervous > 0) {
      nervous -= dt
      want = Math.sin(t * 5) > 0 ? MAX_TURN : -MAX_TURN
    }
    if (happy > 0) happy -= dt
    want = Math.max(-MAX_TURN, Math.min(MAX_TURN, want))
    headYaw += (want - headYaw) * Math.min(1, dt * (nervous > 0 || glare > 0 ? 9 : 4))
    const roll = happy > 0 ? Math.sin(t * 7) * 12 : p.eyes === 'round' ? Math.sin(t * 0.8) * 5 : 0
    Transform.getMutable(head).rotation = Quaternion.fromEulerDegrees(0, headYaw, roll)

    // Eyes: blinks; visor eyes narrow when shifty, narrow and tilt for a dirty look; round ones squeeze with joy
    blink -= dt
    const shut = blink < 0.12
    if (blink < 0) blink = 2.5 + Math.random() * 3
    const h = shut ? EYE.h * 0.15 : glare > 0 ? EYE.h * 0.57 : nervous > 0 ? EYE.h * 0.46 : happy > 0 ? EYE.h * 0.3 : EYE.h
    for (const e of eyes) if (Transform.get(e).scale.y !== h) Transform.getMutable(e).scale = Vector3.create(EYE.w, h, EYE.d)
    if ((glare > 0) !== scowling) {
      scowling = glare > 0
      // Seen from the front, a positive roll turns an eye clockwise; the eye at +x is on the viewer's left
      eyes.forEach((e, i) => {
        Transform.getMutable(e).rotation = Quaternion.fromEulerDegrees(0, 0, scowling ? (i === 0 ? -1 : 1) * SCOWL : 0)
      })
    }

    // Shake the drink, then serve it
    if (pending) {
      shaking -= dt
      Transform.getMutable(shaker).position = Vector3.add(p.hand, Vector3.create(0, Math.sin(t * 40) * 0.06, 0))
      if (shaking <= 0) {
        Transform.getMutable(shaker).position = p.hand
        holdDrink(pending)
        say(p.served ? p.served(pending) : pending.served ?? 'Here you go.')
        if (p.eyes === 'round') happy = 1
        pending = null
      }
    }

    // Play out a script, beat by beat
    if (script.length) {
      scriptT += dt
      while (script.length && script[0].at <= scriptT) {
        const beat = script.shift() as Beat
        if (beat.say !== undefined) say(beat.say)
        if (beat.nervous) nervous = beat.nervous
        if (beat.glare) glare = beat.glare
        if (beat.happy) happy = beat.happy
        beat.then?.()
      }
    }

    // Now and then, to anyone close enough to hear
    mutter -= dt
    if (mutter <= 0) {
      mutter = 40 + Math.random() * 40
      if (me && Vector3.distance(me.position, base) < MUTTER_NEAR && !bubble.speaking() && !script.length && Math.random() < 0.6) {
        say(pick(p.mutters))
        if (p.jittery) nervous = 1.2
      }
    }

    // Walk away and the menu goes back behind the bar
    if ((barMenu.open || barMenu.asking) && barMenu.from === p.name && me && Vector3.distance(me.position, base) > LOOK_RANGE) closeBarMenu()
  })

  bartenders.set(p.name, {
    takeGlass() {
      handBack()
      say(p.tookGlass)
      if (p.eyes === 'round') happy = 1
    },
    order(drink: Drink) {
      if (!drink.glass) {
        // The special
        const grant = () => {
          lastSpecial = clock
          grantedHere = clock
          bar.onSpecial?.(p.name, drink)
        }
        if (p.special) run(p.special(grant, clock - lastSpecial < RECENT_SECONDS))
        else {
          say('Coming right up.')
          grant()
        }
        return
      }
      say(p.preparing)
      if (p.eyes === 'round') happy = 0.8
      shaking = SHAKE_SECONDS
      pending = drink
    }
  })
}

export { whisper }
