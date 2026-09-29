#!/usr/bin/env node
// Copies this package's models into your scene, where Decentraland can load them: <scene>/assets/dcl-sittables/.
// (A scene can only load files inside its own folder, so models in node_modules have to be copied in.) Run it from
// your scene's folder after installing or updating the package:
//
//   npx dcl-sittables-copy-assets [destination]      (default: assets/dcl-sittables)
//
// If you copy them somewhere else, tell the package: setSittablesAssetRoot('your/folder/').
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const from = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')
const to = resolve(process.argv[2] ?? 'assets/dcl-sittables')
mkdirSync(to, { recursive: true })
cpSync(from, to, { recursive: true })
console.log(`dcl-sittables: models copied to ${to}`)
