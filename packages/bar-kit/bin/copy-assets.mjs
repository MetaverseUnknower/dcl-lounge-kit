#!/usr/bin/env node
// Copies this package's models, emotes and sounds into your scene, where Decentraland can load them: <scene>/assets/dcl-bar-kit/.
// (A scene can only load files inside its own folder, so models in node_modules have to be copied in.) Run it from
// your scene's folder after installing or updating the package:
//
//   npx dcl-bar-kit-copy-assets [destination]      (default: assets/dcl-bar-kit)
//
// If you copy them somewhere else, tell the package: setBarAssetRoot('your/folder/').
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const from = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')
const to = resolve(process.argv[2] ?? 'assets/dcl-bar-kit')
mkdirSync(to, { recursive: true })
cpSync(from, to, { recursive: true })
console.log(`dcl-bar-kit: assets copied to ${to}`)
