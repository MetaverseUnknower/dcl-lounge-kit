// dcl-sittables: click-to-sit seats, and sittable furniture ready to place. See README.md.
export { addSeat, isSeated, currentSeat, onSitDown, onStandUp, setSitHandler, setSeatOrbStyle } from './seats'
export type { Seat, SeatSpec, SeatKind, SeatOrbStyle } from './seats'
export { FURNITURE, placeFurniture } from './furniture'
export type { FurnitureModel, SeatOffset, PlaceOptions, PlacedFurniture } from './furniture'
export { setSittablesAssetRoot, sittablesAsset } from './assets'
