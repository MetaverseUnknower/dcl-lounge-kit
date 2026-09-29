// Where this package's models, emotes and sounds are in your scene. `npx dcl-bar-kit-copy-assets` copies them to the
// default.
let root = 'assets/dcl-bar-kit/'

/** If you copied the assets somewhere other than assets/dcl-bar-kit/, say where (relative to the scene). Call it
 *  before building your bar (mocktails() and the personalities read it). */
export function setBarAssetRoot(path: string): void {
  root = path.endsWith('/') ? path : path + '/'
}

export const barAsset = (file: string): string => root + file
