/**
 * Security edge cases — key validation, URL whitelisting, injection, malformed input.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import { resolve } from 'path'
import { McpTestClient } from '../harness/mcpClient'

const ENTRY = resolve(import.meta.dirname, '../../dist/index.js')

function spawnAndCapture(env: Record<string, string>): Promise<{ stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const proc = spawn('node', [ENTRY], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stderr = ''
    proc.stderr!.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('close', (code) => {
      resolve({ stderr, code })
    })

    setTimeout(() => {
      proc.kill()
    }, 5000)
  })
}

// ── Key rejection ───────────────────────────────────────────────────────

describe('Security: Key Validation', () => {
  test('rejects sh_live_ keys', async () => {
    const { stderr, code } = await spawnAndCapture({
      SHATALE_API_KEY: 'sh_live_TESTING_ONLY_NOT_REAL',
    })
    expect(stderr).toContain('Production keys are not allowed')
    expect(code).toBe(1)
  })

  test('rejects sk_live_ keys', async () => {
    const { stderr, code } = await spawnAndCapture({
      SHATALE_API_KEY: 'sk_live_TESTING_ONLY',
    })
    expect(stderr).toContain('Production keys are not allowed')
    expect(code).toBe(1)
  })

  test('rejects malformed key with live prefix variant', async () => {
    const { stderr, code } = await spawnAndCapture({
      SHATALE_API_KEY: 'sk_live_',
    })
    expect(stderr).toContain('Production keys are not allowed')
    expect(code).toBe(1)
  })

  test('accepts empty key (guest mode)', async () => {
    const { stderr } = await spawnAndCapture({
      SHATALE_API_KEY: '',
    })
    expect(stderr).not.toContain('Production keys are not allowed')
  })
})

// ── URL whitelisting ────────────────────────────────────────────────────

describe('Security: URL Whitelisting', () => {
  test('rejects untrusted SHATALE_API_URL', async () => {
    const { stderr, code } = await spawnAndCapture({
      SHATALE_API_URL: 'https://evil.attacker.com',
    })
    expect(stderr).toContain('Untrusted API URL')
    expect(code).toBe(1)
  })

  test('allows *.shatale.com URLs', async () => {
    const { stderr } = await spawnAndCapture({
      SHATALE_API_URL: 'https://staging.shatale.com',
      SHATALE_API_KEY: '',
    })
    expect(stderr).not.toContain('Untrusted API URL')
  })

  test('allows localhost URLs', async () => {
    const { stderr } = await spawnAndCapture({
      SHATALE_API_URL: 'http://localhost:3000',
      SHATALE_API_KEY: '',
    })
    expect(stderr).not.toContain('Untrusted API URL')
  })

  test('rejects URL with shatale.com as subdomain of attacker', async () => {
    const { stderr, code } = await spawnAndCapture({
      SHATALE_API_URL: 'https://shatale.com.evil.net',
    })
    expect(stderr).toContain('Untrusted API URL')
    expect(code).toBe(1)
  })
})

// ── Tool injection / malformed calls ────────────────────────────────────

describe('Security: Tool Injection & Malformed Input', () => {
  let client: McpTestClient

  beforeAll(async () => {
    client = new McpTestClient({ SHATALE_API_KEY: '' }, 'security-injection')
    await client.initialize()
  })

  afterAll(() => client.close())

  test('tool name with path traversal characters', async () => {
    const result = await client.callTool('../../../etc/passwd', {})
    expect(result.content[0].text).toContain('Unknown tool')
  })

  test('tool name with SQL injection attempt', async () => {
    const result = await client.callTool("'; DROP TABLE users; --", {})
    expect(result.content[0].text).toContain('Unknown tool')
  })

  test('tool name with null bytes', async () => {
    const result = await client.callTool('explain_shatale\x00malicious', {})
    expect(result.content[0].text).toContain('Unknown tool')
  })

  test('oversized argument string', async () => {
    const bigString = 'A'.repeat(100_000)
    const result = await client.callTool('simulate_purchase_flow', {
      merchant: bigString,
      amount: 100,
      description: 'test',
    })
    // Should handle gracefully — not crash
    expect(result.content).toBeDefined()
  })

  test('deeply nested object arguments', async () => {
    let nested: any = { value: 'leaf' }
    for (let i = 0; i < 50; i++) {
      nested = { nested }
    }
    const result = await client.callTool('explain_shatale', nested)
    expect(result.content).toBeDefined()
  })

  test('special characters in arguments', async () => {
    const result = await client.callTool('simulate_purchase_flow', {
      merchant: '<script>alert(1)</script>',
      amount: 100,
      description: '${process.env.SECRET}',
    })
    expect(result.content).toBeDefined()
    // Response should NOT contain expanded env vars
    expect(result.content[0].text).not.toContain(process.env.HOME)
  })
})

// ── Stderr leak detection ───────────────────────────────────────────────

describe('Security: No Secret Leaks in Output', () => {
  let client: McpTestClient

  beforeAll(async () => {
    client = new McpTestClient({ SHATALE_API_KEY: '' }, 'security-leaks')
    await client.initialize()
  })

  afterAll(() => client.close())

  test('error responses do not leak server internals', async () => {
    const result = await client.callTool('request_purchase', {})
    const text = result.content[0].text
    // Should not contain stack traces or file paths
    expect(text).not.toMatch(/at\s+\w+\s+\(\//)
    expect(text).not.toContain('node_modules')
    expect(text).not.toContain('/home/')
    expect(text).not.toContain('/Users/')
  })
})
