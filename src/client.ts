/**
 * Shatale API Client — trimmed for MCP server (sandbox-safe methods only).
 *
 * Changes from the full client:
 * - Uses crypto.randomUUID() instead of uuid package
 * - Adds X-Shatale-Client and X-Shatale-Client-Version headers
 * - Rejects sh_live_* keys in constructor
 * - Only sandbox-safe methods are exposed
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShataleAgent {
  id: string;
  name: string;
  status: "active" | "suspended" | "terminated";
  publisher_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ShataleCard {
  id: string;
  agent_id: string;
  last_four: string;
  status: "active" | "frozen" | "terminated";
  currency: string;
  spend_limit_cents: number;
  balance_cents: number;
  created_at: string;
  updated_at: string;
}

export interface ShatalePolicy {
  id: string;
  agent_id: string;
  name: string;
  rules: PolicyRule[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicyRule {
  type: string;
  params: Record<string, unknown>;
}

export interface ShataleAuthorization {
  id: string;
  agent_id: string;
  card_id: string;
  amount_cents: number;
  currency: string;
  merchant_name: string;
  mcc: string;
  status: "approved" | "declined" | "reversed";
  decision_reason?: string;
  rule_traces?: RuleTrace[];
  created_at: string;
}

export interface RuleTrace {
  rule: string;
  passed: boolean;
  detail?: string;
}

export interface SimulatePolicyResult {
  decision: "approved" | "declined";
  rule_traces: RuleTrace[];
  matched_policy_id?: string;
}

export interface SandboxSimulateResult {
  authorization_id: string;
  decision: "approved" | "declined";
  amount_cents: number;
  currency: string;
  merchant_name: string;
  mcc: string;
  rule_traces: RuleTrace[];
}

export class ShataleApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ShataleApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

const CLIENT_NAME = "mcp-server";
const CLIENT_VERSION = "0.1.0";

export class ShataleClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: { apiKey: string; baseUrl?: string }) {
    if (options.apiKey.startsWith("sh_live_")) {
      throw new Error(
        "Live API keys are not allowed in the MCP server. Use a sandbox key (sh_test_* or sh_sandbox_*)."
      );
    }

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.sandbox.shatale.eu/v1";
  }

  // ─── HTTP helpers ────────────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
      "X-Shatale-Client": CLIENT_NAME,
      "X-Shatale-Client-Version": CLIENT_VERSION,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ShataleApiError(
        response.status,
        (errorBody as Record<string, string>).code ?? "unknown_error",
        (errorBody as Record<string, string>).message ?? `HTTP ${response.status}`,
        (errorBody as Record<string, unknown>).details as Record<string, unknown> | undefined
      );
    }

    return response.json() as Promise<T>;
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  // ─── Agents ──────────────────────────────────────────────────────────────

  async createAgent(params: {
    name: string;
    metadata?: Record<string, unknown>;
  }): Promise<ShataleAgent> {
    return this.post<ShataleAgent>("/agents", params);
  }

  async getAgent(agentId: string): Promise<ShataleAgent> {
    return this.get<ShataleAgent>(`/agents/${agentId}`);
  }

  async listAgents(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ShataleAgent[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    return this.get(`/agents${qs ? `?${qs}` : ""}`);
  }

  // ─── Cards ───────────────────────────────────────────────────────────────

  async issueCard(params: {
    agent_id: string;
    currency?: string;
    spend_limit_cents?: number;
  }): Promise<ShataleCard> {
    return this.post<ShataleCard>("/cards", params);
  }

  async getCard(cardId: string): Promise<ShataleCard> {
    return this.get<ShataleCard>(`/cards/${cardId}`);
  }

  async freezeCard(cardId: string): Promise<ShataleCard> {
    return this.post<ShataleCard>(`/cards/${cardId}/freeze`);
  }

  async unfreezeCard(cardId: string): Promise<ShataleCard> {
    return this.post<ShataleCard>(`/cards/${cardId}/unfreeze`);
  }

  // ─── Policies ────────────────────────────────────────────────────────────

  async listPolicies(params?: {
    agent_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ShatalePolicy[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.agent_id) query.set("agent_id", params.agent_id);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    return this.get(`/policies${qs ? `?${qs}` : ""}`);
  }

  async getPolicy(policyId: string): Promise<ShatalePolicy> {
    return this.get<ShatalePolicy>(`/policies/${policyId}`);
  }

  async simulatePolicy(params: {
    policy_id: string;
    amount_cents: number;
    currency: string;
    mcc: string;
    merchant_name?: string;
  }): Promise<SimulatePolicyResult> {
    return this.post<SimulatePolicyResult>("/policies/simulate", params);
  }

  // ─── Authorizations ─────────────────────────────────────────────────────

  async listAuthorizations(params?: {
    agent_id?: string;
    card_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ShataleAuthorization[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.agent_id) query.set("agent_id", params.agent_id);
    if (params?.card_id) query.set("card_id", params.card_id);
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    return this.get(`/authorizations${qs ? `?${qs}` : ""}`);
  }

  async getAuthorization(authorizationId: string): Promise<ShataleAuthorization> {
    return this.get<ShataleAuthorization>(`/authorizations/${authorizationId}`);
  }

  // ─── Sandbox ─────────────────────────────────────────────────────────────

  async sandboxSimulate(params: {
    card_id: string;
    amount_cents: number;
    currency: string;
    merchant_name: string;
    mcc: string;
  }): Promise<SandboxSimulateResult> {
    return this.post<SandboxSimulateResult>("/sandbox/simulate", params);
  }
}
