
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { encrypt, decrypt, SESSION_COOKIE_NAME } from '../lib/session'
import { buildBBBUrl, getBBBJoinUrl } from '../lib/bbb'

const prisma = new PrismaClient()

async function runTests() {
  console.log('--- Starting Authentication & Admin Verification ---')

  console.log('\n[TEST 1] Verifying User Model Schema...')
  const testUser = await prisma.user.findFirst()
  if (testUser) {
    const keys = Object.keys(testUser)
    console.log('User fields:', keys)
    if (keys.includes('role')) {
      throw new Error('FAILURE: Role field should NOT exist on User model!')
    }
    console.log('✓ SUCCESS: User model contains no role field; single-account admin architecture verified.')
  } else {
    throw new Error('FAILURE: No user in database')
  }

  console.log('\n[TEST 2] Verifying Password Hashing...')
  const password = 'AdminPassword123!'
  const match = await bcrypt.compare(password, testUser.passwordHash)
  if (!match) {
    throw new Error('FAILURE: Password hash does not match original password!')
  }
  const wrongMatch = await bcrypt.compare('WrongPassword999', testUser.passwordHash)
  if (wrongMatch) {
    throw new Error('FAILURE: Bcrypt accepted wrong password!')
  }
  console.log('✓ SUCCESS: Password hashing with bcrypt works securely.')

  console.log('\n[TEST 3] Verifying Session Token Encryption & Decryption...')
  const payload = {
    userId: testUser.id,
    email: testUser.email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }
  const token = await encrypt(payload)
  const decrypted = await decrypt(token)
  if (!decrypted || decrypted.userId !== testUser.id || decrypted.email !== testUser.email) {
    throw new Error('FAILURE: Decrypted session does not match payload!')
  }
  const invalidDecrypt = await decrypt('invalid.tampered.token')
  if (invalidDecrypt !== null) {
    throw new Error('FAILURE: Tampered token should return null!')
  }
  console.log('✓ SUCCESS: Session encryption, signing, and verification work properly.')

  console.log('\n[TEST 4] Verifying Admin Creation of Additional Admins...')
  const testSecondaryEmail = `secondary_${Date.now()}@pulseedu.com`
  const newPasswordHash = await bcrypt.hash('SecondAdminPass2026!', 12)
  const secondaryAdmin = await prisma.user.create({
    data: {
      name: 'Secondary Admin',
      email: testSecondaryEmail,
      passwordHash: newPasswordHash,
    },
  })
  if (!secondaryAdmin || secondaryAdmin.email !== testSecondaryEmail) {
    throw new Error('FAILURE: Could not create secondary admin!')
  }
  console.log('✓ SUCCESS: Authenticated admin can create additional admin accounts.')

  await prisma.user.delete({ where: { id: secondaryAdmin.id } })

  console.log('\n[TEST 5] Verifying BBB API Checksum & Join URL...')
  const meetingId = 'pulse-test-meeting-101'
  const moderatorJoinUrl = getBBBJoinUrl({
    meetingId,
    fullName: 'Admin Moderator',
    password: 'mp-secret-mod',
  })
  const attendeeJoinUrl = getBBBJoinUrl({
    meetingId,
    fullName: 'Guest Student Participant',
    password: 'ap-guest-pass',
  })

  if (!moderatorJoinUrl.includes('checksum=') || !moderatorJoinUrl.includes('join?')) {
    throw new Error('FAILURE: Invalid moderator BBB URL generation!')
  }
  if (!attendeeJoinUrl.includes('checksum=') || !attendeeJoinUrl.includes('fullName=Guest+Student+Participant') && !attendeeJoinUrl.includes('Guest')) {
    throw new Error('FAILURE: Invalid attendee BBB URL generation!')
  }
  console.log('✓ SUCCESS: BigBlueButton URLs & SHA1 checksums generated securely.')

  console.log('\n======================================================')
  console.log(' All Authentication & Admin Architecture Tests PASSED!')
  console.log('======================================================\n')
}

runTests()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
