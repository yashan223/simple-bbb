/**
 * Secure Admin Account Creation Script
 *
 * PulseEdu is an admin-only application.
 * Reads configuration from command line arguments or environment variables.
 *
 * Usage:
 *   npm run create-admin
 *   npm run create-admin -- --email=admin@pulseedu.com --password=AdminPassword123! --name="Administrator"
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import readline from 'readline'

const prisma = new PrismaClient()

function getArg(key: string): string | undefined {
  const prefix = `--${key}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  if (arg) return arg.substring(prefix.length)

  const idx = process.argv.indexOf(`--${key}`)
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1]
  }
  return undefined
}

function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close()
      resolve(ans.trim())
    })
  })
}

async function main() {
  console.log('\n==========================================')
  console.log('   PulseEdu Secure Admin Creation Tool   ')
  console.log('==========================================\n')

  let email = getArg('email') || process.env.DEFAULT_ADMIN_EMAIL
  let password = getArg('password') || process.env.DEFAULT_ADMIN_PASSWORD
  let name = getArg('name') || process.env.DEFAULT_ADMIN_NAME

  if (!email && process.stdin.isTTY) {
    email = await prompt('Enter Admin Email: ')
  }

  if (!password && process.stdin.isTTY) {
    password = await prompt('Enter Admin Password (min 8 characters): ')
  }

  if (!name && process.stdin.isTTY) {
    name = await prompt('Enter Admin Name: ')
  }

  if (!email || !email.includes('@')) {
    console.error('Error: A valid email address is required. Set DEFAULT_ADMIN_EMAIL or pass --email')
    process.exit(1)
  }

  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters long. Set DEFAULT_ADMIN_PASSWORD or pass --password')
    process.exit(1)
  }

  if (!name) {
    name = 'PulseEdu Administrator'
  }

  console.log(`Connecting to database and provisioning admin: ${email}...`)

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  const passwordHash = await bcrypt.hash(password, 12)

  if (existing) {
    console.log(`Admin account with email "${normalizedEmail}" already exists. Updating password and name...`)
    const updated = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        name,
        passwordHash,
      },
    })
    console.log(`\nSUCCESS: Admin account updated in database!`)
    console.log(`ID:    ${updated.id}`)
    console.log(`Email: ${updated.email}`)
    console.log(`Name:  ${updated.name}`)
  } else {
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
      },
    })
    console.log(`\nSUCCESS: Admin account successfully created in database!`)
    console.log(`ID:    ${user.id}`)
    console.log(`Email: ${user.email}`)
    console.log(`Name:  ${user.name}`)
  }

  console.log('\nYou can now log in at /login with these admin credentials.\n')
}

main()
  .catch((e) => {
    console.error('Error creating admin account:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
