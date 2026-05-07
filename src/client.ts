import type { PurchaseInput, CredentialInput, SandboxUserInput } from './types.js'

const CLIENT_VERSION = '0.1.0'

export class ShataleClient {
  constructor(
    private readonly baseURL: string,
    private readonly apiKey: string,
  ) {}

  async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Shatale-Client': 'mcp-server',
      'X-Shatale-Client-Version': CLIENT_VERSION,
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const res = await fetch(`${this.baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      throw new Error(err.error ?? `API error: ${res.status}`)
    }

    return res.json()
  }

  // ---- Purchase flow ----

  async requestPurchase(input: PurchaseInput): Promise<unknown> {
    return this.request('POST', '/v1/purchases', input)
  }

  async previewPurchase(input: PurchaseInput): Promise<unknown> {
    return this.request('POST', '/v1/purchases/preview', input)
  }

  async getPurchaseStatus(id: string): Promise<unknown> {
    return this.request('GET', `/v1/purchases/${encodeURIComponent(id)}`)
  }

  async cancelPurchase(id: string, reason?: string): Promise<unknown> {
    return this.request('DELETE', `/v1/purchases/${encodeURIComponent(id)}`, { reason })
  }

  // ---- Credentials ----

  async requestCredentials(input: CredentialInput): Promise<unknown> {
    return this.request('POST', '/v1/credentials', input)
  }

  async getCredentialStatus(id: string): Promise<unknown> {
    return this.request('GET', `/v1/credentials/${encodeURIComponent(id)}`)
  }

  // ---- Onboarding / User Resolution ----

  async registerUserProfile(input: {
    publisher_user_id: string
    user_claims: { email: string; name?: string; phone?: string; country?: string }
    intended_use?: string
    idempotency_key?: string
  }): Promise<unknown> {
    return this.request('POST', '/v1/onboarding/register', input)
  }

  async getOnboardingStatus(sessionId: string): Promise<unknown> {
    return this.request('GET', `/v1/onboarding/sessions/${encodeURIComponent(sessionId)}`)
  }

  // ---- Common ----

  async listMCCCodes(query?: string): Promise<unknown> {
    const qs = query ? `?q=${encodeURIComponent(query)}` : ''
    return this.request('GET', `/v1/mcc-codes${qs}`)
  }

  // ---- Sandbox ----

  async sandboxCreateTestUser(input?: SandboxUserInput): Promise<unknown> {
    return this.request('POST', '/v1/sandbox/users', input ?? {})
  }

  async sandboxCompleteOnboarding(userId: string): Promise<unknown> {
    return this.request('POST', `/v1/sandbox/users/${encodeURIComponent(userId)}/onboarding`)
  }

  async sandboxApproveRequest(requestId: string): Promise<unknown> {
    return this.request('POST', `/v1/sandbox/requests/${encodeURIComponent(requestId)}/approve`)
  }

  async sandboxDeclineRequest(requestId: string, reason?: string): Promise<unknown> {
    return this.request('POST', `/v1/sandbox/requests/${encodeURIComponent(requestId)}/decline`, { reason })
  }

  async sandboxReset(): Promise<unknown> {
    return this.request('POST', '/v1/sandbox/reset')
  }
}
