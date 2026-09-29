// A little bar, to show dcl-sittables and dcl-bar-kit together: a counter with a row of stools, BETA and BLIP behind
// it, and couches and a bench to sit on with your drink. The special on the menu opens a panel behind the bar.
//
// Run `npm run copy-assets` first (the packages' models, emotes and sound into assets/), then `npm start`.
import { engine, Transform, MeshRenderer, MeshCollider, Material, Tween, EasingFunction, ColliderLayer } from '@dcl/sdk/ecs'
import { Vector3, Color3, Color4 } from '@dcl/sdk/math'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { FURNITURE, placeFurniture } from 'dcl-sittables'
import { setupBar, addBartender, BETA, BLIP, mocktails, Drink } from 'dcl-bar-kit'
import { ui } from './ui'

const box = (position: Vector3, scale: Vector3, color: Color4, emissive = 0) => {
  const e = engine.addEntity()
  Transform.create(e, { position, scale })
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e, ColliderLayer.CL_PHYSICS)
  Material.setPbrMaterial(e, { albedoColor: color, emissiveColor: Color3.create(color.r, color.g, color.b), emissiveIntensity: emissive, roughness: 0.4 })
  return e
}

export function main() {
  // The room: a dark floor and a back wall
  box(Vector3.create(16, -0.05, 16), Vector3.create(32, 0.1, 32), Color4.create(0.05, 0.05, 0.08, 1))
  box(Vector3.create(16, 2, 24), Vector3.create(16, 4, 0.2), Color4.create(0.08, 0.06, 0.12, 1))

  // The bar: a counter (its customers' side at z 19.6), a neon strip, and the bartenders behind it facing the room
  box(Vector3.create(16, 0.62, 20), Vector3.create(12, 1.24, 0.8), Color4.create(0.03, 0.06, 0.16, 1))
  box(Vector3.create(16, 1.3, 20), Vector3.create(12.2, 0.08, 1), Color4.create(0.22, 0.11, 0.05, 1))
  box(Vector3.create(16, 1.15, 19.59), Vector3.create(12, 0.03, 0.02), Color4.create(0.2, 0.9, 1, 1), 3)
  addBartender(BETA(), { position: Vector3.create(14, 0, 21), facing: 180 })
  addBartender(BLIP(), { position: Vector3.create(18, 0, 21), facing: 180 })

  // A secret panel behind the bar, for the special
  const panel = box(Vector3.create(16, 1.5, 23.8), Vector3.create(1.6, 3, 0.25), Color4.create(0.4, 0.2, 0.8, 1), 1)

  const special: Drink = {
    id: 'vacuum',
    name: 'Vacuum on the Rocks, hold the rocks',
    tag: { text: 'CLASSIFIED', color: Color4.create(0.55, 0.3, 1, 1) },
    blurb: 'The finest nothing in the quadrant.',
    ingredients: ['Nothing', 'Chilled'],
    method: 'Serve immediately, before it gets any emptier.',
    color: Color3.Black(),
    glass: null
  }
  setupBar({
    drinks: [...mocktails(), special],
    title: 'THE LOUNGE',
    subtitle: 'Mocktails, mixed by {bartender}  ·  on the house',
    onSpecial: () => {
      // Open the panel (it slides up), and close it again after a while
      const at = Transform.get(panel).position
      const open = Vector3.create(at.x, 4.6, at.z)
      Tween.createOrReplace(panel, { mode: Tween.Mode.Move({ start: at, end: open }), duration: 1500, easingFunction: EasingFunction.EF_EASEOUTQUAD })
      let t = 0
      engine.addSystem(function close(dt) {
        t += dt
        if (t < 15) return
        engine.removeSystem(close)
        Tween.createOrReplace(panel, { mode: Tween.Mode.Move({ start: open, end: Vector3.create(at.x, 1.5, at.z) }), duration: 1500, easingFunction: EasingFunction.EF_EASEINQUAD })
      })
    }
  })

  // Stools along the bar, in their different colourways, facing it
  const stools = [
    FURNITURE.pedestalStoolCyanMagenta,
    FURNITURE.pedestalStoolBluePurple,
    FURNITURE.pedestalStoolLimeTeal,
    FURNITURE.pedestalStoolPinkGold,
    FURNITURE.pedestalStoolRedOrange,
    FURNITURE.pedestalStoolMonochrome,
    FURNITURE.roundStool,
    FURNITURE.backrestStool
  ]
  stools.forEach((model, i) => placeFurniture(model, { position: Vector3.create(11 + i * 1.4, 0, 18.9), facing: 0 }))

  // Somewhere to sit with your drink: the sofas facing each other across a coffee table, the Silt couch, and a bench
  placeFurniture(FURNITURE.petalSofa, { position: Vector3.create(9, 0, 10), facing: 90 })
  placeFurniture(FURNITURE.darkPetalSofa, { position: Vector3.create(15, 0, 10), facing: -90 })
  placeFurniture(FURNITURE.coffeeTable, { position: Vector3.create(12, 0, 10), facing: 90 })
  placeFurniture(FURNITURE.siltCouch, { position: Vector3.create(24, 0, 9), facing: 0 })
  placeFurniture(FURNITURE.gardenBench, { position: Vector3.create(12, 0, 4), facing: 0 })
  placeFurniture(FURNITURE.circularHighBarTable, { position: Vector3.create(24, 0, 14), facing: 0 })

  ReactEcsRenderer.setUiRenderer(ui)
}
