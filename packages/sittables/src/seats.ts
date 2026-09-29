// Click-to-sit seats. Each seat is a small glowing orb over it and an invisible click box on it (and, optionally, the
// furniture itself as a click target); clicking one moves the player to the seat and plays one of Decentraland's
// sitting emotes. Walking away frees it. Which seats are taken is shared between players, so an occupied seat's orb
// disappears for everyone.
//
// Where a seat's `position` goes: Decentraland's sitting emotes (sittingChair1 and 2) are made for the player standing
// on the floor just in front of the seat, and raise the hips 0.64 m and move them back 0.37 m onto it. So a seat's
// position is on the floor (or a step at seat height minus ~0.47 m), about 0.3-0.45 m in front of the middle of its
// seat, facing out. furniture.ts has the numbers worked out for each model.
//
// Two SDK details this depends on (from The Silt, where the mechanism was first worked out and tested):
//  - clicks are read with inputSystem.isTriggered on raw PointerEvents, not pointerEventsSystem callbacks;
//  - the orb gets PointerEvents before its MeshCollider; the click box gets its MeshCollider first.
import {
  engine,
  Entity,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  MaterialTransparencyMode,
  PointerEvents,
  PointerEventType,
  InputAction,
  inputSystem,
  ColliderLayer,
  PlayerIdentityData,
  Schemas
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'
import { movePlayerTo, triggerEmote } from '~system/RestrictedActions'
import { getPlayer } from '@dcl/sdk/players'
import { syncEntity } from '@dcl/sdk/network'

/** What sort of seat: bar-kit's sitting drinking emotes have a version for a couch's deeper cushion. */
export type SeatKind = 'stool' | 'couch' | 'bench'

export type SeatSpec = {
  /** Where the player is moved to sit: on the floor just in front of the seat (see the top of this file). */
  position: Vector3
  /** A point the seated player faces (and the camera looks at): a few metres ahead of the seat, at eye height. */
  lookAt: Vector3
  /** Where the seat's orb floats: over the seat, a little above it. */
  orbPosition: Vector3
  /** Hover text on the orb and click targets. Default "Sit". */
  hoverText?: string
  /** More things to click to sit here, such as the furniture's own entity. */
  clickTargets?: Entity[]
  kind?: SeatKind
  /**
   * A number unique to this seat among the scene's seats, the same on every player's client, used to share whether
   * it's taken. Default: the order seats are added in, which is the same everywhere as long as your scene always adds
   * them in the same order (the usual case).
   */
  syncId?: number
}

/** A seat, as the rest of the scene sees it. */
export type Seat = {
  id: number
  position: Vector3
  lookAt: Vector3
  kind: SeatKind
}

export type SeatOrbStyle = { color: Color4; glow: Color4; size: number; hoverSize: number }

/** Whether a seat is taken: who's in it ('' free). Shared between players. */
const SeatState = engine.defineComponent('dcl-sittables::SeatState', { occupant: Schemas.String })

const SIT_EMOTES = ['sittingChair2', 'sittingChair1'] // Decentraland's own, alternated
const RELEASE_DISTANCE = 1.0 // metres from the seat: stood up
// movePlayerTo lands a frame or more later, so the stand-up check waits until the player has reached the seat (run at
// once, it saw them still where they clicked from and let the seat go). A seat never reached is given up after this.
const ARRIVE_SECONDS = 3
const GROW_SPEED = 8
const SYNC_BASE = 7000 // syncEntity ids for the seats' shared state: SYNC_BASE + syncId

let orbStyle: SeatOrbStyle = {
  color: Color4.create(0.1, 0.5, 0.8, 0.4),
  glow: Color4.create(0.2, 0.7, 1.0, 1),
  size: 0.03,
  hoverSize: 0.14
}

type Spot = Seat & { orb: Entity; emoteIndex: number; hover: boolean; spin: number; baseYaw: number }

const spots: Spot[] = []
const clickTargetToSpot = new Map<Entity, number>()
let mine = -1 // the seat I'm in (-1: none)
let arrived = false
let sittingFor = 0
let installed = false
let sitHandler: ((seat: Seat) => boolean) | null = null
const sitListeners: ((seat: Seat) => void)[] = []
const standListeners: ((seat: Seat) => void)[] = []

const myAddress = () => (getPlayer()?.userId ?? '').toLowerCase()
const seatOf = (s: Spot): Seat => ({ id: s.id, position: s.position, lookAt: s.lookAt, kind: s.kind })

/** Set how seat orbs look (before adding seats). */
export function setSeatOrbStyle(style: Partial<SeatOrbStyle>): void {
  orbStyle = { ...orbStyle, ...style }
}

/** Add a seat. Returns it. */
export function addSeat(spec: SeatSpec): Seat {
  const hoverText = spec.hoverText ?? 'Sit'
  const id = spots.length
  const toLook = Vector3.subtract(spec.lookAt, spec.position)

  // The orb: PointerEvents first, then MeshCollider
  const orb = engine.addEntity()
  Transform.create(orb, {
    position: spec.orbPosition,
    scale: Vector3.create(orbStyle.size, orbStyle.size, orbStyle.size),
    rotation: Quaternion.Identity()
  })
  MeshRenderer.setBox(orb)
  Material.setPbrMaterial(orb, {
    albedoColor: orbStyle.color,
    emissiveColor: orbStyle.glow,
    emissiveIntensity: 4,
    metallic: 0,
    roughness: 1,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND
  })
  PointerEvents.create(orb, { pointerEvents: pointerEvents(hoverText, 5) })
  MeshCollider.setBox(orb, ColliderLayer.CL_POINTER)
  SeatState.create(orb, { occupant: '' })
  syncEntity(orb, [SeatState.componentId], SYNC_BASE + (spec.syncId ?? id))

  const spot: Spot = {
    id,
    position: spec.position,
    lookAt: spec.lookAt,
    kind: spec.kind ?? 'stool',
    orb,
    emoteIndex: 0,
    hover: false,
    spin: 0,
    baseYaw: (Math.atan2(toLook.x, toLook.z) * 180) / Math.PI
  }
  spots.push(spot)

  // An invisible click box on the seat itself (the orb alone is a tiny target): MeshCollider first, then PointerEvents
  const box = engine.addEntity()
  Transform.create(box, {
    position: Vector3.create(spec.orbPosition.x, spec.position.y + 0.4, spec.orbPosition.z),
    scale: Vector3.create(0.6, 0.5, 0.6),
    rotation: Quaternion.Identity()
  })
  MeshCollider.setBox(box, ColliderLayer.CL_POINTER)
  PointerEvents.create(box, { pointerEvents: pointerEvents(hoverText, 4) })
  clickTargetToSpot.set(box, id)

  for (const e of spec.clickTargets ?? []) {
    PointerEvents.createOrReplace(e, { pointerEvents: pointerEvents(hoverText, 4) })
    clickTargetToSpot.set(e, id)
  }

  if (!installed) {
    installed = true
    engine.addSystem(tick)
  }
  return seatOf(spot)
}

function pointerEvents(hoverText: string, maxDistance: number) {
  return [
    { eventType: PointerEventType.PET_DOWN, eventInfo: { button: InputAction.IA_POINTER, hoverText, maxDistance } },
    { eventType: PointerEventType.PET_HOVER_ENTER, eventInfo: { button: InputAction.IA_POINTER, maxDistance, showFeedback: false } },
    { eventType: PointerEventType.PET_HOVER_LEAVE, eventInfo: { button: InputAction.IA_POINTER, maxDistance, showFeedback: false } }
  ]
}

/** Whether I'm sitting in one of the scene's seats. */
export const isSeated = (): boolean => mine >= 0

/** The seat I'm in, or null. */
export const currentSeat = (): Seat | null => (mine >= 0 ? seatOf(spots[mine]) : null)

/** Called when I sit down (in any seat). */
export function onSitDown(fn: (seat: Seat) => void): void {
  sitListeners.push(fn)
}

/** Called when I get up. */
export function onStandUp(fn: (seat: Seat) => void): void {
  standListeners.push(fn)
}

/**
 * Take over sitting down: called when the player sits, before the usual move and sitting emote. Return true if you've
 * sat them down yourself (moved them to the seat and played your own emote), false for the usual. bar-kit uses it to
 * sit people holding a drink straight into its sitting drinking emote.
 */
export function setSitHandler(fn: ((seat: Seat) => boolean) | null): void {
  sitHandler = fn
}

/** Whether someone other than me is in a seat (and still here: a seat whose sitter has left the scene is free). */
function takenByOther(spot: Spot): boolean {
  const who = SeatState.get(spot.orb).occupant
  if (!who || who === myAddress()) return false
  for (const [, p] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (p.address.toLowerCase() === who) return true
  }
  return false
}

function sitIn(index: number): void {
  if (takenByOther(spots[index])) return
  // Moving seat to seat without standing up: let the one I was in go
  if (mine >= 0 && mine !== index) leave(mine)
  const spot = spots[index]
  if (!sitHandler?.(seatOf(spot))) {
    movePlayerTo({
      newRelativePosition: spot.position,
      cameraTarget: spot.lookAt,
      // Facing the way the seat faces: the sit emote moves back from however the avatar faces
      avatarTarget: spot.lookAt
    })
    triggerEmote({ predefinedEmote: SIT_EMOTES[spot.emoteIndex] })
    spot.emoteIndex = (spot.emoteIndex + 1) % SIT_EMOTES.length
  }
  SeatState.getMutable(spot.orb).occupant = myAddress() || 'me'
  mine = index
  arrived = false
  sittingFor = 0
  for (const fn of sitListeners) fn(seatOf(spot))
}

function leave(index: number): void {
  const spot = spots[index]
  SeatState.getMutable(spot.orb).occupant = ''
  if (mine === index) mine = -1
  for (const fn of standListeners) fn(seatOf(spot))
}

function tick(dt: number): void {
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i]
    const t = Transform.getMutable(spot.orb)

    // Someone else's seat: no orb
    if (takenByOther(spot)) {
      if (t.scale.x !== 0) t.scale = Vector3.Zero()
      continue
    }

    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_HOVER_ENTER, spot.orb)) spot.hover = true
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_HOVER_LEAVE, spot.orb)) spot.hover = false

    // Grow on hover, and turn
    const target = spot.hover ? orbStyle.hoverSize : orbStyle.size
    const size = t.scale.x + (target - t.scale.x) * Math.min(1, GROW_SPEED * dt)
    spot.spin = spot.hover ? spot.spin + dt * 72 : 0
    t.scale = Vector3.create(size, size, size)
    t.rotation = Quaternion.fromEulerDegrees(0, spot.baseYaw + spot.spin, 0)

    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, spot.orb)) sitIn(i)
  }

  for (const [entity, index] of clickTargetToSpot) {
    const spot = spots[index]
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_HOVER_ENTER, entity)) spot.hover = true
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_HOVER_LEAVE, entity)) spot.hover = false
    if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, entity)) sitIn(index)
  }

  // Stood up: walked away from the seat (once I'd reached it), or never got there
  if (mine >= 0) {
    const me = Transform.getOrNull(engine.PlayerEntity)
    if (me) {
      const spot = spots[mine]
      const away = Math.hypot(me.position.x - spot.position.x, me.position.z - spot.position.z)
      sittingFor += dt
      if (!arrived && away <= RELEASE_DISTANCE) arrived = true
      if ((arrived && away > RELEASE_DISTANCE) || (!arrived && sittingFor > ARRIVE_SECONDS)) leave(mine)
    }
  }
}
