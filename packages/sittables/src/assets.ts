// Where this package's models are in your scene. `npx dcl-sittables-copy-assets` copies them to the default.
let root = 'assets/dcl-sittables/'

/** If you copied the models somewhere other than assets/dcl-sittables/, say where (relative to the scene). */
export function setSittablesAssetRoot(path: string): void {
  root = path.endsWith('/') ? path : path + '/'
}

export const sittablesAsset = (file: string): string => root + file
