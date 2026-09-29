// The bar's HUD: the menu (each drink with its tag, what's in it and how to make it, and ORDER), "would you like
// another?" when you click a bartender holding a drink, and "You dropped your drink..." after a drop. Render BarUi()
// somewhere in your scene's UI (ReactEcsRenderer.setUiRenderer): it draws nothing until it's needed.
import ReactEcs, { UiEntity, Label } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'
import { Drink, dropNotice } from './drinks'
import { barMenu, closeBarMenu, order, wantAnother, doneDrinking, barDrinks, barTitle, barSubtitle } from './bartender'

const NAVY = Color4.create(0.03, 0.06, 0.16, 0.96)
const CARD = Color4.create(0.05, 0.1, 0.24, 1)
const BRASS = Color4.create(0.85, 0.62, 0.28, 1)
const CREAM = Color4.create(1, 0.95, 0.85, 1)
const DIM = Color4.create(0.62, 0.68, 0.8, 1)
const CYAN = Color4.create(0.2, 0.9, 1, 1)
const PINK = Color4.create(1, 0.22, 0.7, 1)
const INK = Color4.create(0.02, 0.04, 0.1, 1)

const CARD_W = 400
const CARD_H = 222
const PANEL_W = 2 * (CARD_W + 12) + 36 // two cards a row, their margins, the panel's padding

// Sized for a 1080-tall screen, and shrunk further if the window's too narrow for the panel
const REFERENCE_HEIGHT = 1080
function canvas() {
  return UiCanvasInformation.getOrNull(engine.RootEntity)
}
const scaled = (n: number) => {
  const c = canvas()
  return Math.round(n * (c && c.height > 0 ? c.height / REFERENCE_HEIGHT : 1))
}
let fitK = 1
const px = (n: number) => Math.round(scaled(n) * fitK)
function fitToWindow(): void {
  const c = canvas()
  const room = c && c.width > 0 ? c.width * 0.94 : Infinity
  fitK = Math.min(1, room / scaled(PANEL_W))
}

function DrinkCard(props: { key?: string; drink: Drink }) {
  const { drink } = props
  return (
    <UiEntity
      uiTransform={{ width: px(CARD_W), height: px(CARD_H), flexDirection: 'column', padding: px(12), margin: px(6), borderWidth: px(1), borderColor: BRASS, borderRadius: px(8) }}
      uiBackground={{ color: CARD }}
    >
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center', height: px(30) }}>
        <Label value={drink.name} fontSize={px(16)} color={CREAM} textAlign="middle-left" uiTransform={{ flexGrow: 1, flexShrink: 1 }} />
        {drink.tag && (
          <UiEntity uiTransform={{ height: px(22), padding: { left: px(8), right: px(8) }, justifyContent: 'center', borderRadius: px(11) }} uiBackground={{ color: drink.tag.color }}>
            <Label value={drink.tag.text} fontSize={px(11)} color={INK} />
          </UiEntity>
        )}
      </UiEntity>
      <Label value={drink.blurb ?? ''} fontSize={px(12)} color={DIM} textAlign="top-left" textWrap="wrap" uiTransform={{ width: '100%', height: px(20) }} />
      {drink.ingredients && <Label value="MAKE IT AT HOME" fontSize={px(11)} color={BRASS} textAlign="middle-left" uiTransform={{ height: px(20), margin: { top: px(4) } }} />}
      <Label value={(drink.ingredients ?? []).map((i) => `·  ${i}`).join('\n')} fontSize={px(12)} color={CREAM} textAlign="top-left" uiTransform={{ width: '100%', height: px(76) }} />
      <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'flex-end', flexGrow: 1 }}>
        <Label value={drink.method ?? ''} fontSize={px(11)} color={DIM} textAlign="bottom-left" textWrap="wrap" uiTransform={{ flexGrow: 1, flexShrink: 1, height: '100%', margin: { right: px(10) } }} />
        <UiEntity
          uiTransform={{ height: px(30), padding: { left: px(16), right: px(16) }, justifyContent: 'center', alignItems: 'center', borderRadius: px(15), flexShrink: 0 }}
          uiBackground={{ color: drink.glass ? PINK : CYAN }}
          onMouseDown={() => order(drink)}
        >
          <Label value="ORDER" fontSize={px(14)} color={INK} />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

/** The drinks menu, when a bartender's handed it over. */
export function BarMenu() {
  if (!barMenu.open) return null
  fitToWindow()
  return (
    <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <UiEntity
        uiTransform={{ width: px(PANEL_W), flexDirection: 'column', alignItems: 'center', padding: px(16), borderWidth: px(2), borderColor: BRASS, borderRadius: px(12) }}
        uiBackground={{ color: NAVY }}
      >
        <UiEntity uiTransform={{ width: '100%', flexDirection: 'row', alignItems: 'center', height: px(44), padding: { left: px(6), right: px(6) } }}>
          <UiEntity uiTransform={{ flexDirection: 'column', flexGrow: 1 }}>
            <Label value={barTitle()} fontSize={px(22)} color={PINK} textAlign="middle-left" uiTransform={{ height: px(30) }} />
            <Label value={barSubtitle()} fontSize={px(13)} color={CYAN} textAlign="middle-left" uiTransform={{ height: px(18) }} />
          </UiEntity>
          <UiEntity uiTransform={{ width: px(40), height: px(40), justifyContent: 'center', alignItems: 'center', borderWidth: px(1), borderColor: BRASS, borderRadius: px(20) }} onMouseDown={closeBarMenu}>
            <Label value="X" fontSize={px(16)} color={CREAM} />
          </UiEntity>
        </UiEntity>
        <UiEntity uiTransform={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: px(2 * (CARD_W + 12)), margin: { top: px(6) } }}>
          {barDrinks().map((d) => <DrinkCard key={d.id} drink={d} />)}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

function DialogButton(props: { label: string; colour: Color4; onClick: () => void; filled?: boolean }) {
  return (
    <UiEntity
      uiTransform={{ height: px(38), padding: { left: px(18), right: px(18) }, margin: { left: px(6), right: px(6) }, justifyContent: 'center', alignItems: 'center', borderRadius: px(19), borderWidth: px(1), borderColor: props.colour }}
      uiBackground={{ color: props.filled ? props.colour : CARD }}
      onMouseDown={props.onClick}
    >
      <Label value={props.label} fontSize={px(14)} color={props.filled ? INK : CREAM} />
    </UiEntity>
  )
}

/** Holding a drink, a bartender asks: another (the menu), done (they take the glass), or not now. */
export function AnotherDialog() {
  if (!barMenu.asking) return null
  fitToWindow()
  return (
    <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <UiEntity uiTransform={{ flexDirection: 'column', alignItems: 'center', padding: px(22), borderWidth: px(2), borderColor: BRASS, borderRadius: px(12) }} uiBackground={{ color: NAVY }}>
        <Label value={barMenu.from} fontSize={px(13)} color={CYAN} uiTransform={{ height: px(20) }} />
        <Label value="Would you like another?" fontSize={px(22)} color={CREAM} uiTransform={{ height: px(36), margin: { bottom: px(14) } }} />
        <UiEntity uiTransform={{ flexDirection: 'row', alignItems: 'center' }}>
          <DialogButton label="ANOTHER, PLEASE" colour={PINK} filled onClick={wantAnother} />
          <DialogButton label="I'M DONE" colour={CYAN} onClick={doneDrinking} />
          <DialogButton label="NEVER MIND" colour={BRASS} onClick={closeBarMenu} />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

/** "You dropped your drink..." for a few seconds after a drop. */
export function DropNotice() {
  if (!dropNotice.text) return null
  return (
    <UiEntity uiTransform={{ positionType: 'absolute', position: { top: '22%', left: 0 }, width: '100%', justifyContent: 'center' }}>
      <UiEntity uiTransform={{ padding: { left: scaled(22), right: scaled(22), top: scaled(10), bottom: scaled(10) }, borderWidth: scaled(1), borderColor: PINK, borderRadius: scaled(8) }} uiBackground={{ color: NAVY }}>
        <Label value={dropNotice.text} fontSize={scaled(22)} color={CREAM} />
      </UiEntity>
    </UiEntity>
  )
}

/** All of the bar's HUD: put this in your UI. */
export function BarUi() {
  return (
    <UiEntity uiTransform={{ positionType: 'absolute', position: { top: 0, left: 0 }, width: '100%', height: '100%' }}>
      <BarMenu />
      <AnotherDialog />
      <DropNotice />
    </UiEntity>
  )
}
