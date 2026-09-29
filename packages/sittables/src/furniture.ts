// Sittable furniture, ready to place: each model in this package with its size, how to stand it up and face it, how
// it collides, and where its seats go, worked out and tested in The Silt, MetaPetal HQ and Stellar Station.
//
//   placeFurniture(FURNITURE.pedestalStool, { position: Vector3.create(8, 0, 8), facing: 180 })
//
// `facing` is the way people sitting on it face, in degrees (0: +Z, 90: +X). Seat numbers are in the furniture's own
// frame: `across` to the sitter's right, `forward` the way they face, `rise` up from the floor.
import { engine, Entity, Transform, GltfContainer, ColliderLayer, MeshCollider } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { addSeat, Seat, SeatKind } from './seats'
import { sittablesAsset } from './assets'

/** A seat on a piece of furniture, in its own frame (metres, before any extra scale you give it). */
export type SeatOffset = {
  /** To the sitter's right of the middle (negative: to their left). */
  across: number
  /** Where the player's moved to sit: this far forward of the furniture's origin, and this far up. */
  forward: number
  rise: number
  /** The orb: this far forward, and this far up. */
  orbForward: number
  orbRise: number
}

export type FurnitureModel = {
  /** The model, relative to the package's assets folder. */
  file: string
  scale: number
  /** Degrees about X that stand the model up (-90 for models exported Z-up; 0 if already Y-up). */
  uprightX: number
  /** Degrees to add to `facing` so the model's front faces that way. */
  yawOffset: number
  /**
   * How it collides:
   *  'model':     its visible meshes block players (and take clicks)
   *  'colliders': it carries its own invisible *_collider meshes, which block; its visible meshes take clicks
   *  'stool':     its visible meshes only take clicks; a collider round the bottom of the pole, and a small invisible
   *               step at the seat point to stand the sitter on. (The seat point is under the cushion's edge: had the
   *               cushion collided, it shoved the avatar off, a different way on every stool, so they sat off-centre.)
   */
  collision: 'model' | 'colliders' | 'stool'
  /** What sort of seat, or null for furniture you can't sit on (tables). */
  kind: SeatKind | null
  seats: SeatOffset[]
}

const stoolSeat: SeatOffset = { across: 0, forward: 0.3, rise: 0.5, orbForward: 0, orbRise: 1.15 }
const stool = (file: string): FurnitureModel => ({
  file: `models/stools/${file}`,
  scale: 0.75,
  uprightX: -90,
  yawOffset: 0,
  collision: 'stool',
  kind: 'stool',
  seats: [stoolSeat]
})
// The MetaPetal sofas: 3.12 m wide, cushions 0.838 m apart, their tops 0.547 m up and front edges 0.46 m forward. The
// player's placed 0.48 m under the cushion top and ~0.11 m past its front edge, the orb 0.17 m over it.
const sofaSeats = [-0.838, 0, 0.838].map((across) => ({ across, forward: 0.57, rise: 0.067, orbForward: 0.2, orbRise: 0.72 }))
const table = (file: string, scale: number): FurnitureModel => ({
  file: `models/tables/${file}`,
  scale,
  uprightX: -90,
  yawOffset: 0,
  collision: 'model',
  kind: null,
  seats: []
})

/** Every model in the package. */
export const FURNITURE = {
  // Bar stools (The Silt): pedestal stools in seven colourways, a round one, and one with a backrest
  pedestalStool: stool('pedestal_barstool.glb'),
  pedestalStoolCyanMagenta: stool('pedestal_barstool_cyan_magenta.glb'),
  pedestalStoolBluePurple: stool('pedestal_barstool_electric_blue_purple.glb'),
  pedestalStoolLimeTeal: stool('pedestal_barstool_lime_teal.glb'),
  pedestalStoolMonochrome: stool('pedestal_barstool_monochrome_ice.glb'),
  pedestalStoolPinkGold: stool('pedestal_barstool_pink_gold.glb'),
  pedestalStoolRedOrange: stool('pedestal_barstool_red_orange.glb'),
  roundStool: stool('round_barstool.glb'),
  backrestStool: stool('backrest_barstool.glb'),
  // Couches and benches
  siltCouch: {
    file: 'models/couches/silt-couch.glb',
    scale: 0.6,
    uprightX: -90,
    yawOffset: 0,
    collision: 'model',
    kind: 'couch',
    seats: [-1.25, 0, 1.25].map((across) => ({ across, forward: 0.7, rise: 0.2, orbForward: 0.3, orbRise: 0.85 }))
  } as FurnitureModel,
  petalSofa: { file: 'models/couches/metapetal-sofa.glb', scale: 1, uprightX: 0, yawOffset: 180, collision: 'colliders', kind: 'couch', seats: sofaSeats } as FurnitureModel,
  darkPetalSofa: { file: 'models/couches/metapetal-dark-sofa.glb', scale: 1, uprightX: 0, yawOffset: 180, collision: 'colliders', kind: 'couch', seats: sofaSeats } as FurnitureModel,
  // 1.8 m wide, the seat's top 0.45 m up and its front edge 0.24 m forward: two places
  gardenBench: {
    file: 'models/benches/metapetal-garden-bench.glb',
    scale: 1,
    uprightX: 0,
    yawOffset: 180,
    collision: 'colliders',
    kind: 'bench',
    seats: [-0.45, 0.45].map((across) => ({ across, forward: 0.35, rise: 0, orbForward: 0, orbRise: 0.62 }))
  } as FurnitureModel,
  // Tables (The Silt): not for sitting on
  highBarTable: table('high_bar_table.glb', 0.9),
  circularHighBarTable: table('circular_high_bar_table.glb', 0.9),
  squareHighBarTable: table('square_high_bar_table.glb', 0.9),
  coffeeTable: table('coffee_table.glb', 0.7)
}

export type PlaceOptions = {
  position: Vector3
  /** The way people sitting on it face, degrees (0: +Z, 90: +X). */
  facing?: number
  /** Extra scale on top of the model's own (seats move with it). */
  scale?: number
  /** Hover text for its seats. */
  hoverText?: string
}

export type PlacedFurniture = { entity: Entity; seats: Seat[] }

const POLE_R = 0.08 // a stool's pole collider (the pole's 0.05 m across the middle at 0.75; the base 0.25)
const POLE_TOP = 0.45 // below the step, so it never meets a sitter standing on it
const STEP = 0.3 // the step under a stool's seat point: this wide, its top at the seat point

/** Place a piece of furniture, and its seats. */
export function placeFurniture(model: FurnitureModel, options: PlaceOptions): PlacedFurniture {
  const facing = options.facing ?? 0
  const k = options.scale ?? 1
  const s = model.scale * k
  const entity = engine.addEntity()
  Transform.create(entity, {
    position: options.position,
    scale: Vector3.create(s, s, s),
    rotation: Quaternion.multiply(Quaternion.fromEulerDegrees(0, facing + model.yawOffset, 0), Quaternion.fromEulerDegrees(model.uprightX, 0, 0))
  })
  GltfContainer.create(entity, {
    src: sittablesAsset(model.file),
    visibleMeshesCollisionMask:
      model.collision === 'model' ? ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER : ColliderLayer.CL_POINTER,
    invisibleMeshesCollisionMask: model.collision === 'colliders' ? ColliderLayer.CL_PHYSICS : ColliderLayer.CL_NONE
  })

  const turn = Quaternion.fromEulerDegrees(0, facing, 0)
  const fwd = Vector3.rotate(Vector3.create(0, 0, 1), turn)
  const side = Vector3.rotate(Vector3.create(1, 0, 0), turn)
  const at = (across: number, forward: number, rise: number) =>
    Vector3.create(
      options.position.x + (side.x * across + fwd.x * forward) * k,
      options.position.y + rise * k,
      options.position.z + (side.z * across + fwd.z * forward) * k
    )

  if (model.collision === 'stool') {
    const pole = engine.addEntity()
    Transform.create(pole, {
      position: Vector3.add(options.position, Vector3.create(0, (POLE_TOP * k) / 2, 0)),
      scale: Vector3.create(POLE_R * 2 * k, POLE_TOP * k, POLE_R * 2 * k)
    })
    MeshCollider.setCylinder(pole, 0.5, 0.5, ColliderLayer.CL_PHYSICS)
  }

  const seats: Seat[] = []
  if (model.kind) {
    for (const seat of model.seats) {
      const position = at(seat.across, seat.forward, seat.rise)
      if (model.collision === 'stool') {
        const step = engine.addEntity()
        Transform.create(step, {
          position: Vector3.subtract(position, Vector3.create(0, 0.05, 0)),
          scale: Vector3.create(STEP * k, 0.1, STEP * k),
          rotation: turn
        })
        MeshCollider.setBox(step, ColliderLayer.CL_PHYSICS)
      }
      seats.push(
        addSeat({
          position,
          lookAt: Vector3.add(at(seat.across, seat.forward + 4, 0), Vector3.create(0, 1.5, 0)),
          orbPosition: at(seat.across, seat.orbForward, seat.orbRise),
          hoverText: options.hoverText,
          clickTargets: model.seats.length === 1 ? [entity] : [],
          kind: model.kind
        })
      )
    }
  }
  return { entity, seats }
}
