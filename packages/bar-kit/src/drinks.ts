// Drinks: a glass in your hand, and drinking it.
//
//  - Handed a drink, you hold its glass in your right hand (walking about too). Everyone in the scene sees it: it's a
//    synced AvatarAttach naming your avatar, which each client attaches to your hand.
//  - Stand still for a second and you drink it: a looping emote (made with tools/build_drink_emote.py: the glass held
//    at the chest, a sip every eight seconds, a little club sway), with its own glass as the emote's prop, so the
//    hand's glass hides meanwhile. Sit in a dcl-sittables seat and it's the sitting version (a couch has its own).
//    Scene emotes are seen by everyone near. Moving ends it (Decentraland ends emotes on movement).
//  - Play any other emote, sprint, or jump, and you drop it: it falls and smashes, with a crash, for everyone.
//  - Hand it back to a bartender (bartender.ts) and a drinking emote in progress is ended with an empty-handed one.
import {
  engine, Entity, Transform, GltfContainer, AvatarAttach, AvatarAnchorPointType, AvatarEmoteCommand, AudioSource,
  VisibilityComponent, PlayerIdentityData, Schemas, MeshRenderer, Material, MaterialTransparencyMode, Tween,
  EasingFunction
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color3, Color4 } from '@dcl/sdk/math'
import { triggerSceneEmote, movePlayerTo } from '~system/RestrictedActions'
import { getPlayer } from '@dcl/sdk/players'
import { syncEntity, parentEntity, getParent } from '@dcl/sdk/network'
import { isSeated, currentSeat, setSitHandler, SeatKind } from 'dcl-sittables'
import { barAsset } from './assets'

export type Drink = {
  id: string
  name: string
  /** A line about it, on the menu. */
  blurb?: string
  /** A badge on the menu (a rarity, say). */
  tag?: { text: string; color: Color4 }
  /** What's in it and how to make it (at home, say), on the menu. */
  ingredients?: string[]
  method?: string
  /** The drink's colour (the splash when it's dropped). */
  color: Color3
  /** Its glass: a model path in your scene. null for a menu item that isn't a drink (see bartender.ts `special`). */
  glass: string | null
  /** Its drinking emotes (scene paths; names must end in _emote.glb): standing, sitting, and on a couch. */
  emotes?: { stand: string; sit: string; couch: string }
  /** What the bartender says handing it over. */
  served?: string
}

export type DrinksOptions = {
  /**
   * Whose drinks (glasses and drops) to show, by wallet address. Default: anyone in the scene. A scene where some
   * players' avatars are hidden from others can hide their drinks too.
   */
  visibleTo?: (address: string) => boolean
  /** How long a drink lasts, seconds. Default 300. */
  holdSeconds?: number
  /** Sprinting or jumping with a drink spills it. Default true. */
  spill?: boolean
  /** Any emote but a drinking or sitting one drops it. Default true. */
  dropOnEmote?: boolean
}

// The glasses (from The Silt) are modelled lying along +Z with the base at the origin (0.24 m long at GLASS_SCALE). In
// the hand at rest (walking about, arm down) the glass sticks out of the fist at right angles to the arm, its base in
// the grip. The hand's anchor point is at the wrist, so the glass goes down the hand (its +Y) into the fist.
const GLASS_SCALE = 0.15
const IN_HAND = { position: Vector3.create(0, 0.09, -0.03), rotation: Quaternion.Identity() }

const STILL_SECONDS = 1.0 // standing (or sitting) still this long starts the drinking emote
const STILL_METRES = 0.03
const MOVED_METRES = 0.12 // moved this far from where the emote started: it's over (Decentraland stopped it)
const OURS_SECONDS = 2 // an emote command this soon after we triggered ours is ours
const NOTICE_SECONDS = 3.5
const DROP_SECONDS = 10 // a shared drop lives this long (to reach everyone), then goes
const SIT_SETTLE = 0.6 // seconds for a seat's move to land
// Spilling: a sprint (Decentraland's walk is 1.5 m/s, jog 8, run 10), or a jump (up faster than a lift, ~2.5)
const SPILL_SPEED = 9
const SPILL_SECONDS = 0.3
const JUMP_SPEED = 3.2
const JUMP_WINDOW = 0.2
const TELEPORT_METRES = 2

/** The three Refinery mocktails from the Galaxy Gardeners launch party (and how to make them), with their glasses and
 *  emotes from this package. Call after setBarAssetRoot if you moved the assets. */
export function mocktails(): Drink[] {
  const emotes = (id: string) => ({
    stand: barAsset(`emotes/${id}_emote.glb`),
    sit: barAsset(`emotes/${id}_sit_emote.glb`),
    couch: barAsset(`emotes/${id}_couch_emote.glb`)
  })
  return [
    {
      id: 'helium3',
      name: 'Helium-3 Fizz',
      tag: { text: 'COMMON', color: Color4.create(0.6, 0.6, 0.6, 1) },
      blurb: 'Clear, blue and bubbly. Refined fresh from the belt.',
      ingredients: ['1 cup (8 oz) lemon-lime soda', '1 tbsp blue curaçao syrup (non-alcoholic)', 'Ice'],
      method: 'Syrup over ice, top with the soda, stir once.',
      color: Color3.create(0.2, 0.75, 1),
      glass: barAsset('models/glasses/lumen_rift_highball.glb'),
      emotes: emotes('helium3'),
      served: 'One Helium-3 Fizz. Mind the bubbles.'
    },
    {
      id: 'plasma',
      name: 'Plasma Crystal',
      tag: { text: 'UNCOMMON', color: Color4.create(0.2, 0.8, 0.3, 1) },
      blurb: 'Deep purple, sparkling, and it glows.',
      ingredients: ['½ cup (4 oz) purple grape juice', '½ cup (4 oz) sparkling water', 'Ice', 'A glow stick (outside the glass)'],
      method: 'Juice over ice, top with sparkling water. Wrap the glow stick round the glass.',
      color: Color3.create(0.55, 0.2, 0.95),
      glass: barAsset('models/glasses/nebula_tear_highball.glb'),
      emotes: emotes('plasma'),
      served: 'One Plasma Crystal. Do not look directly at it.'
    },
    {
      id: 'mythic',
      name: 'Mythic Bloom',
      tag: { text: 'MYTHIC', color: Color4.create(1, 0.3, 0.5, 1) },
      blurb: 'Like a holographic specimen in a glass. Rarely seen.',
      ingredients: ['1 cup (8 oz) pink lemonade', '1 tbsp grenadine', 'Cotton candy for the rim', 'A pinch of edible glitter', 'Ice'],
      method: 'Glitter into the lemonade, pour over ice, let the grenadine sink. Cotton candy on the rim.',
      color: Color3.create(1, 0.35, 0.7),
      glass: barAsset('models/glasses/synapse_highball.glb'),
      emotes: emotes('mythic'),
      served: 'One Mythic Bloom. Very rare. Please don’t trade it.'
    }
  ]
}

/** A dropped drink, shared: every client smashes one where it fell. */
const DrinkDrop = engine.defineComponent('dcl-bar-kit::DrinkDrop', {
  glass: Schemas.String,
  r: Schemas.Number,
  g: Schemas.Number,
  b: Schemas.Number,
  by: Schemas.String,
  x: Schemas.Number,
  y: Schemas.Number,
  z: Schemas.Number
})

let options: Required<DrinksOptions> = { visibleTo: () => true, holdSeconds: 300, spill: true, dropOnEmote: true }
let holding: Drink | null = null
let anchor: Entity | null = null
let glass: Entity | null = null
let left = 0
let drinkingAt: Vector3 | null = null // where the drinking emote started, while it plays
let triggeredAt = -Infinity
let clock = 0
let sitStartedAt = -1 // when the sit handler sat me down drinking, until the move's landed
let started = false

/** "You dropped your drink..." while it's showing (ui.tsx draws it). */
export const dropNotice = { text: '', left: 0 }

const myAddress = () => (getPlayer()?.userId ?? '').toLowerCase()
const emptyEmote = (seat: SeatKind | null) =>
  seat === null ? barAsset('emotes/empty_emote.glb') : barAsset(seat === 'couch' ? 'emotes/empty_couch_emote.glb' : 'emotes/empty_sit_emote.glb')

/** Whether I'm holding a drink. */
export const holdingDrink = (): boolean => holding !== null
/** The drink I'm holding, if any. */
export const heldDrink = (): Drink | null => holding

/** Hand me a drink (replacing any I'm holding). */
export function holdDrink(drink: Drink): void {
  if (!drink.glass) return
  finishDrink()
  holding = drink
  anchor = engine.addEntity()
  AvatarAttach.create(anchor, { avatarId: myAddress() || undefined, anchorPointId: AvatarAnchorPointType.AAPT_RIGHT_HAND })
  syncEntity(anchor, [AvatarAttach.componentId])
  glass = engine.addEntity()
  Transform.create(glass, { parent: anchor, ...IN_HAND, scale: Vector3.create(GLASS_SCALE, GLASS_SCALE, GLASS_SCALE) })
  GltfContainer.create(glass, { src: drink.glass })
  syncEntity(glass, [Transform.componentId, GltfContainer.componentId])
  parentEntity(glass, anchor)
  left = options.holdSeconds
  drinkingAt = null
}

/** The drink's gone (finished, dropped, or replaced). */
export function finishDrink(): void {
  if (glass) engine.removeEntity(glass)
  if (anchor) engine.removeEntity(anchor)
  glass = anchor = null
  holding = null
  drinkingAt = null
}

/** Hand the glass back (to a bartender). Mid-drink, the drinking emote would carry on with its own glass until I
 *  moved, so it's ended with an empty-handed one: standing, a moment and then Decentraland's idle; sitting, sat as
 *  before, hands on the thighs. */
export function handBack(): void {
  const wasDrinking = drinkingAt !== null
  const seat = currentSeat()
  finishDrink()
  if (!wasDrinking) return
  triggeredAt = clock
  void triggerSceneEmote({ src: emptyEmote(seat ? seat.kind : null), loop: seat !== null })
}

const sittingEmote = (d: Drink | null, kind: SeatKind | undefined) => (d?.emotes ? (kind === 'couch' ? d.emotes.couch : d.emotes.sit) : null)

function showHandGlass(show: boolean): void {
  if (!glass) return
  const s = show ? GLASS_SCALE : 0
  if (Transform.get(glass).scale.x !== s) Transform.getMutable(glass).scale = Vector3.create(s, s, s)
}

/** Whether a player's drinks show here: they're in the scene (a glass isn't cleaned up if its owner leaves holding
 *  it), and your visibleTo says so. */
function shown(address: string): boolean {
  const a = address.toLowerCase()
  if (a === myAddress()) return true
  let present = false
  for (const [, id] of engine.getEntitiesWith(PlayerIdentityData)) if (id.address.toLowerCase() === a) present = true
  return present && options.visibleTo(a)
}

/** Drop mine: tell everyone (they smash it their end), smash it here, and say so. */
export function dropDrink(why = 'You dropped your drink…'): void {
  const drink = holding
  const me = Transform.getOrNull(engine.PlayerEntity)
  finishDrink()
  if (!drink?.glass || !me) return
  dropNotice.text = why
  dropNotice.left = NOTICE_SECONDS
  // Where the hand would be: a little to my right and forward, at about waist height
  const right = Vector3.rotate(Vector3.create(0.25, 0, 0.2), me.rotation)
  const at = Vector3.add(me.position, Vector3.create(right.x, 0.15, right.z))
  const shared = engine.addEntity()
  DrinkDrop.create(shared, { glass: drink.glass, r: drink.color.r, g: drink.color.g, b: drink.color.b, by: myAddress(), x: at.x, y: at.y, z: at.z })
  syncEntity(shared, [DrinkDrop.componentId])
  seenDrops.add(shared)
  cleanup.push({ e: shared, at: clock + DROP_SECONDS })
  smash(drink.glass, drink.color, at, me.position.y - 0.85, true)
}

type Piece = { e: Entity; at: number; color: Color3; floor: Vector3 }
const pieces: Piece[] = []
const cleanup: { e: Entity; at: number }[] = []
const seenDrops = new Set<Entity>()

/** A glass falls from `from` to the floor and shatters, with the crash (heard everywhere if it's mine, nearby if not). */
function smash(glassSrc: string, color: Color3, from: Vector3, floorY: number, mine: boolean): void {
  const speaker = engine.addEntity()
  Transform.create(speaker, { position: from })
  AudioSource.create(speaker, { audioClipUrl: barAsset('audio/glass_break.mp3'), playing: true, loop: false, volume: 1, global: mine })
  cleanup.push({ e: speaker, at: clock + 3 })
  const falling = engine.addEntity()
  Transform.create(falling, { position: from, rotation: Quaternion.fromEulerDegrees(-90, 0, 0), scale: Vector3.create(GLASS_SCALE, GLASS_SCALE, GLASS_SCALE) })
  GltfContainer.create(falling, { src: glassSrc })
  Tween.create(falling, {
    mode: Tween.Mode.Move({ start: from, end: Vector3.create(from.x, floorY + 0.02, from.z) }),
    duration: 280,
    easingFunction: EasingFunction.EF_EASEINQUAD
  })
  pieces.push({ e: falling, at: clock, color, floor: Vector3.create(from.x, floorY, from.z) })
}

/** The glass has hit the floor: shards skittering out, and a splash of the drink, all cleared away after a while. */
function shatter(p: Piece): void {
  engine.removeEntity(p.e)
  const splash = engine.addEntity()
  Transform.create(splash, { position: Vector3.add(p.floor, Vector3.create(0, 0.012, 0)), rotation: Quaternion.fromEulerDegrees(90, 0, 0), scale: Vector3.create(0.4, 0.3, 1) })
  MeshRenderer.setPlane(splash)
  Material.setPbrMaterial(splash, {
    albedoColor: Color4.create(p.color.r, p.color.g, p.color.b, 0.6),
    emissiveColor: p.color,
    emissiveIntensity: 0.6,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  cleanup.push({ e: splash, at: clock + 6 })
  for (let i = 0; i < 9; i++) {
    const shard = engine.addEntity()
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5
    const r = 0.25 + Math.random() * 0.45
    const start = Vector3.add(p.floor, Vector3.create(0, 0.03, 0))
    const end = Vector3.add(p.floor, Vector3.create(Math.cos(a) * r, 0.01, Math.sin(a) * r))
    const size = 0.015 + Math.random() * 0.025
    Transform.create(shard, { position: start, scale: Vector3.create(size, 0.004, size * 1.6), rotation: Quaternion.fromEulerDegrees(0, Math.random() * 360, 0) })
    MeshRenderer.setBox(shard)
    Material.setPbrMaterial(shard, {
      albedoColor: Color4.create(0.85, 0.95, 1, 0.55),
      emissiveColor: Color3.create(0.5, 0.6, 0.7),
      emissiveIntensity: 0.4,
      metallic: 0.2,
      roughness: 0.05,
      transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
    })
    Tween.create(shard, { mode: Tween.Mode.Move({ start, end }), duration: 220 + Math.random() * 260, easingFunction: EasingFunction.EF_EASEOUTQUAD })
    cleanup.push({ e: shard, at: clock + 6 })
  }
}

/** Other people's drinks: hide the glasses of anyone not shown to me, and smash the drops of those who are. */
function othersDrinks(): void {
  for (const [e, attach] of engine.getEntitiesWith(AvatarAttach)) {
    if (e === anchor || !attach.avatarId) continue
    const show = shown(attach.avatarId)
    for (const [g] of engine.getEntitiesWith(GltfContainer)) {
      if (getParent(g) !== e) continue
      const v = VisibilityComponent.getOrNull(g)
      if (!v || v.visible !== show) VisibilityComponent.createOrReplace(g, { visible: show })
    }
  }
  for (const [e, drop] of engine.getEntitiesWith(DrinkDrop)) {
    if (seenDrops.has(e)) continue
    seenDrops.add(e)
    if (drop.by === myAddress() || !shown(drop.by)) continue
    smash(drop.glass, Color3.create(drop.r, drop.g, drop.b), Vector3.create(drop.x, drop.y, drop.z), drop.y - 1.0, false)
  }
}

/** Load the drinking emotes up front (as hidden models), so none has to be fetched the moment it's played. */
function preload(drinks: Drink[]): void {
  const files = [emptyEmote(null), emptyEmote('stool'), emptyEmote('couch'), ...drinks.flatMap((d) => (d.emotes ? [d.emotes.stand, d.emotes.sit, d.emotes.couch] : []))]
  for (const src of files) {
    const e = engine.addEntity()
    Transform.create(e, { position: Vector3.create(8, -50, 8), scale: Vector3.Zero() })
    GltfContainer.create(e, { src, visibleMeshesCollisionMask: 0, invisibleMeshesCollisionMask: 0 })
  }
}

/** Start the drinks: holding, drinking, sitting with one, dropping and spilling, and everyone else's. */
export function startDrinks(drinks: Drink[], opts: DrinksOptions = {}): void {
  options = { ...options, ...opts }
  if (started) return
  started = true
  preload(drinks)
  // Sitting down with a drink: the seat's own move, then the sitting drinking emote rather than its sit (the emote's
  // laid out like Decentraland's sittingChair, so nothing moves in between)
  setSitHandler((seat) => {
    const sitting = sittingEmote(holding, seat.kind)
    if (!sitting) return false
    void movePlayerTo({ newRelativePosition: seat.position, cameraTarget: seat.lookAt, avatarTarget: seat.lookAt })
    triggeredAt = clock
    drinkingAt = null
    sitStartedAt = clock
    void triggerSceneEmote({ src: sitting, loop: true })
    return true
  })

  let lastPos: Vector3 | null = null
  let still = 0
  let lastEmote = -1
  let othersCheck = 0
  // Where I've been lately, to measure speed over a moment rather than a frame (my position doesn't change every
  // frame, and a frame-by-frame speed kept dropping to nothing)
  let trail: { t: number; p: Vector3 }[] = []
  engine.addSystem((dt) => {
    clock += dt
    for (let i = pieces.length - 1; i >= 0; i--) if (clock - pieces[i].at > 0.3) shatter(pieces.splice(i, 1)[0])
    for (let i = cleanup.length - 1; i >= 0; i--) if (clock >= cleanup[i].at) engine.removeEntity(cleanup.splice(i, 1)[0].e)
    if (dropNotice.left > 0) {
      dropNotice.left -= dt
      if (dropNotice.left <= 0) dropNotice.text = ''
    }
    othersCheck -= dt
    if (othersCheck <= 0) {
      othersCheck = 0.5
      othersDrinks()
    }

    // Emotes I play: ours (a drinking one, just triggered) or sitting down are fine; anything else drops the drink
    for (const cmd of AvatarEmoteCommand.get(engine.PlayerEntity)) {
      if (cmd.timestamp <= lastEmote) continue
      lastEmote = cmd.timestamp
      const ours = clock - triggeredAt < OURS_SECONDS || /scene-emote|_emote\.glb/i.test(cmd.emoteUrn)
      const sitting = /sitting/i.test(cmd.emoteUrn)
      if (holding && options.dropOnEmote && !ours && !sitting) dropDrink()
    }

    if (!holding || !glass) {
      trail = []
      return
    }
    const me = Transform.getOrNull(engine.PlayerEntity)
    if (!me) return

    // Sprinting or jumping with it: spilled. (Not while seated; a jump in position, such as a seat's move, starts the
    // measuring afresh.)
    if (options.spill) {
      const last = trail[trail.length - 1]
      if (isSeated() || (last && Vector3.distance(last.p, me.position) > TELEPORT_METRES)) trail = []
      trail.push({ t: clock, p: me.position })
      while (trail.length > 1 && clock - trail[1].t >= SPILL_SECONDS) trail.shift()
      const first = trail[0]
      const span = clock - first.t
      const sprint = span >= SPILL_SECONDS * 0.8 && Math.hypot(me.position.x - first.p.x, me.position.z - first.p.z) / span > SPILL_SPEED
      const low = trail.find((s) => clock - s.t <= JUMP_WINDOW)
      const jump = !!low && clock - low.t >= JUMP_WINDOW * 0.6 && (me.position.y - low.p.y) / (clock - low.t) > JUMP_SPEED
      if (sprint || jump) {
        trail = []
        dropDrink(jump ? 'You spilled your drink… (no jumping with a drink!)' : 'You spilled your drink… (no sprinting with a drink!)')
        return
      }
    }

    const moved = lastPos ? Vector3.distance(me.position, lastPos) : 0
    lastPos = me.position
    if (drinkingAt && Vector3.distance(me.position, drinkingAt) > MOVED_METRES) drinkingAt = null

    // Finished: once the time's up and I'm not mid-emote (it would carry on with its glass until I moved)
    left -= dt
    if (left <= 0 && !drinkingAt) {
      finishDrink()
      return
    }

    // Still (standing, or sitting): drink. Moving: hold it.
    still = moved < STILL_METRES * Math.max(1, dt * 60) ? still + dt : 0
    const seat = currentSeat()
    const emote = seat ? sittingEmote(holding, seat.kind) : holding.emotes?.stand ?? null
    // Just sat down with a drink (the sit handler started the emote as the seat moved me): count it as playing once
    // I'm there, rather than starting it again
    if (sitStartedAt >= 0) {
      if (clock - sitStartedAt > SIT_SETTLE) {
        sitStartedAt = -1
        drinkingAt = me.position
      }
      showHandGlass(false)
      return
    }
    if (!drinkingAt && still >= STILL_SECONDS && emote) {
      drinkingAt = me.position
      triggeredAt = clock
      void triggerSceneEmote({ src: emote, loop: true })
    }
    showHandGlass(!drinkingAt)
  })
}
