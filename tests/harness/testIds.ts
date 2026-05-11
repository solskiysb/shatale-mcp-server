import { randomBytes } from 'crypto'

/** Generate a unique test ID to isolate test data across CI runs */
export function testId(prefix = 'test'): string {
  const suffix = randomBytes(6).toString('hex')
  const ci = process.env.CI ? `ci-${process.env.GITHUB_RUN_ID ?? '0'}` : 'local'
  return `${prefix}-${ci}-${suffix}`
}

/** Generate a unique test email */
export function testEmail(): string {
  return `${testId('e2e')}@test.shatale.com`
}
