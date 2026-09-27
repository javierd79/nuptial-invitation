#!/usr/bin/env node
// Generates the salt/hash pair for one entry in data/usuarios.json.
//
//   node scripts/hash-password.mjs
//   node scripts/hash-password.mjs "mi clave" admin
//
// Without arguments it prompts for the password so it never lands in shell history.

import { randomBytes, scrypt } from 'node:crypto'
import { createInterface } from 'node:readline/promises'

const KEY_LENGTH = 64
const OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

const derive = (password, salt) =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, OPTIONS, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(question)
  rl.close()
  return answer
}

const [passwordArg, usernameArg] = process.argv.slice(2)

const password = passwordArg ?? (await prompt('Contraseña: '))
if (!password) {
  console.error('Falta la contraseña.')
  process.exit(1)
}

const username = usernameArg ?? (await prompt('Usuario: '))
if (!username) {
  console.error('Falta el usuario.')
  process.exit(1)
}

const salt = randomBytes(16).toString('hex')
const passHash = (await derive(password, salt)).toString('hex')

console.log('\nAgrega esto a data/usuarios.json:\n')
console.log(
  JSON.stringify(
    { username, role: 'ADMIN', salt, passHash },
    null,
    2,
  ),
)
console.log('')
