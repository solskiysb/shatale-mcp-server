/**
 * Guest tools — work without an API key.
 * These provide documentation, demo scenarios, and code snippets.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatCurrency, formatRuleTraces } from "./shared.js";

// ─── MCC Code Database ──────────────────────────────────────────────────────

interface MccCode {
  code: string;
  description: string;
  category: string;
}

const MCC_CODES: MccCode[] = [
  // Shopping
  { code: "5411", description: "Grocery stores & supermarkets", category: "shopping" },
  { code: "5311", description: "Department stores", category: "shopping" },
  { code: "5691", description: "Clothing stores", category: "shopping" },
  { code: "5944", description: "Jewelry & watch stores", category: "shopping" },
  { code: "5945", description: "Toy & game stores", category: "shopping" },
  { code: "5999", description: "Miscellaneous retail", category: "shopping" },
  // Travel
  { code: "4511", description: "Airlines & air carriers", category: "travel" },
  { code: "7011", description: "Hotels & lodging", category: "travel" },
  { code: "4121", description: "Taxis & rideshare", category: "travel" },
  { code: "7512", description: "Car rental", category: "travel" },
  { code: "4722", description: "Travel agencies & tour operators", category: "travel" },
  // Food
  { code: "5812", description: "Restaurants", category: "food" },
  { code: "5814", description: "Fast food", category: "food" },
  { code: "5813", description: "Bars & drinking places", category: "food" },
  // Services
  { code: "7230", description: "Beauty & barber shops", category: "services" },
  { code: "7298", description: "Health spas", category: "services" },
  { code: "8011", description: "Doctors & physicians", category: "services" },
  { code: "8021", description: "Dentists & orthodontists", category: "services" },
  { code: "8099", description: "Medical services (other)", category: "services" },
  // Restricted
  { code: "7995", description: "Gambling & betting", category: "restricted" },
  { code: "5921", description: "Package liquor stores", category: "restricted" },
  { code: "5993", description: "Tobacco & cigars", category: "restricted" },
  { code: "6211", description: "Securities & brokers", category: "restricted" },
];

// ─── Demo Scenarios ─────────────────────────────────────────────────────────

interface DemoScenario {
  title: string;
  decision: "APPROVED" | "DECLINED";
  amount_cents: number;
  currency: string;
  merchant: string;
  mcc: string;
  reason: string;
  rule_traces: Array<{ rule: string; passed: boolean; detail?: string }>;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    title: "Normal clothing purchase",
    decision: "APPROVED",
    amount_cents: 15000,
    currency: "EUR",
    merchant: "Nike Store",
    mcc: "5691",
    reason: "All policy rules pass",
    rule_traces: [
      { rule: "spend_limit", passed: true, detail: "150.00 <= 500.00 per-transaction limit" },
      { rule: "mcc_allowlist", passed: true, detail: "MCC 5691 (Clothing) is allowed" },
      { rule: "balance_check", passed: true, detail: "Balance 850.00 >= 150.00" },
    ],
  },
  {
    title: "Over per-transaction limit",
    decision: "DECLINED",
    amount_cents: 80000,
    currency: "EUR",
    merchant: "Luxury Watch Boutique",
    mcc: "5944",
    reason: "Exceeds per-transaction spend limit",
    rule_traces: [
      { rule: "spend_limit", passed: false, detail: "800.00 > 500.00 per-transaction limit" },
      { rule: "mcc_allowlist", passed: true, detail: "MCC 5944 (Jewelry) is allowed" },
      { rule: "balance_check", passed: true, detail: "Balance 850.00 >= 800.00" },
    ],
  },
  {
    title: "Blocked merchant category",
    decision: "DECLINED",
    amount_cents: 5000,
    currency: "EUR",
    merchant: "Online Casino",
    mcc: "7995",
    reason: "MCC blocked by policy",
    rule_traces: [
      { rule: "spend_limit", passed: true, detail: "50.00 <= 500.00 per-transaction limit" },
      { rule: "mcc_allowlist", passed: false, detail: "MCC 7995 (Gambling) is blocked" },
    ],
  },
  {
    title: "Insufficient balance",
    decision: "DECLINED",
    amount_cents: 20000,
    currency: "EUR",
    merchant: "Le Petit Bistro",
    mcc: "5812",
    reason: "Balance below minimum threshold",
    rule_traces: [
      { rule: "spend_limit", passed: true, detail: "200.00 <= 500.00 per-transaction limit" },
      { rule: "mcc_allowlist", passed: true, detail: "MCC 5812 (Restaurants) is allowed" },
      { rule: "balance_check", passed: false, detail: "Balance 80.00 < 100.00 minimum threshold" },
    ],
  },
  {
    title: "Travel purchase within limits",
    decision: "APPROVED",
    amount_cents: 35000,
    currency: "EUR",
    merchant: "British Airways",
    mcc: "4511",
    reason: "Travel MCC allowed, within all limits",
    rule_traces: [
      { rule: "spend_limit", passed: true, detail: "350.00 <= 500.00 per-transaction limit" },
      { rule: "mcc_allowlist", passed: true, detail: "MCC 4511 (Airlines) is allowed" },
      { rule: "balance_check", passed: true, detail: "Balance 1200.00 >= 350.00" },
    ],
  },
];

// ─── Code Snippets ──────────────────────────────────────────────────────────

function generateTypescriptSnippet(vertical: string): string {
  return `import { ShataleClient } from "@shatale/sdk";

const client = new ShataleClient({
  apiKey: process.env.SHATALE_API_KEY!,
});

// 1. Create a ${vertical} agent
const agent = await client.createAgent({
  name: "my-${vertical}-agent",
  metadata: { vertical: "${vertical}" },
});
console.log("Agent created:", agent.id);

// 2. Issue a virtual card
const card = await client.issueCard({
  agent_id: agent.id,
  currency: "EUR",
  spend_limit_cents: 100000, // \u20ac1,000
});
console.log("Card issued:", card.last_four);

// 3. Simulate a payment (sandbox only)
const result = await client.sandboxSimulate({
  card_id: card.id,
  amount_cents: 4999,
  currency: "EUR",
  merchant_name: "Test Merchant",
  mcc: "5999",
});
console.log("Decision:", result.decision);
console.log("Rule traces:", result.rule_traces);`;
}

function generateCurlSnippet(vertical: string): string {
  return `# 1. Create a ${vertical} agent
curl -X POST https://sandbox.api.shatale.com/v1/agents \\
  -H "Authorization: Bearer $SHATALE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-${vertical}-agent", "metadata": {"vertical": "${vertical}"}}'

# 2. Issue a virtual card
curl -X POST https://sandbox.api.shatale.com/v1/cards \\
  -H "Authorization: Bearer $SHATALE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "AGENT_ID", "currency": "EUR", "spend_limit_cents": 100000}'

# 3. Simulate a payment (sandbox only)
curl -X POST https://sandbox.api.shatale.com/v1/sandbox/simulate \\
  -H "Authorization: Bearer $SHATALE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"card_id": "CARD_ID", "amount_cents": 4999, "currency": "EUR", "merchant_name": "Test Merchant", "mcc": "5999"}'`;
}

// ─── Tool Registration ──────────────────────────────────────────────────────

export function registerGuestTools(server: McpServer): void {
  // ── shatale_list_mcc_codes ──────────────────────────────────────────────

  server.tool(
    "shatale_list_mcc_codes",
    "List popular Merchant Category Codes (MCC) grouped by category. Useful for understanding which merchant types can be allowed or blocked by policy rules.",
    {
      category: z
        .enum(["all", "shopping", "travel", "food", "services", "restricted"])
        .default("all")
        .describe("Filter by category, or 'all' to see every category"),
    },
    { readOnlyHint: true },
    async ({ category }) => {
      const filtered =
        category === "all" ? MCC_CODES : MCC_CODES.filter((c) => c.category === category);

      const grouped = new Map<string, MccCode[]>();
      for (const code of filtered) {
        const list = grouped.get(code.category) ?? [];
        list.push(code);
        grouped.set(code.category, list);
      }

      const lines: string[] = ["Merchant Category Codes (MCC)", ""];
      for (const [cat, codes] of grouped) {
        lines.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)}`);
        for (const c of codes) {
          lines.push(`  ${c.code}  ${c.description}`);
        }
        lines.push("");
      }

      lines.push(`Total: ${filtered.length} codes`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── shatale_demo_scenarios ──────────────────────────────────────────────

  server.tool(
    "shatale_demo_scenarios",
    "Show 5 demo scenarios illustrating how the Shatale policy engine evaluates payment authorizations. No API key required.",
    { readOnlyHint: true },
    async () => {
      const lines: string[] = [
        "Shatale Policy Engine \u2014 Demo Scenarios",
        "=======================================",
        "",
      ];

      for (let i = 0; i < DEMO_SCENARIOS.length; i++) {
        const s = DEMO_SCENARIOS[i];
        const icon = s.decision === "APPROVED" ? "\u2705" : "\u274c";
        lines.push(`${i + 1}. ${icon} ${s.decision}: ${s.title}`);
        lines.push(`   ${formatCurrency(s.amount_cents, s.currency)} at ${s.merchant} (MCC ${s.mcc})`);
        lines.push(`   Reason: ${s.reason}`);
        lines.push(`   Rule traces:`);
        lines.push(formatRuleTraces(s.rule_traces));
        lines.push("");
      }

      lines.push(
        "These scenarios demonstrate spend limits, MCC blocking, and balance checks.",
        "Use shatale_simulate_payment with a sandbox API key to run real simulations."
      );

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // ── shatale_generate_snippet ────────────────────────────────────────────

  server.tool(
    "shatale_generate_snippet",
    "Generate a code snippet showing how to integrate the Shatale API for a specific business vertical.",
    {
      language: z
        .enum(["typescript", "curl"])
        .describe("Programming language for the snippet"),
      vertical: z
        .enum(["shopping", "travel", "procurement", "expense"])
        .default("shopping")
        .describe("Business vertical for the example"),
    },
    { readOnlyHint: true },
    async ({ language, vertical }) => {
      const snippet =
        language === "typescript"
          ? generateTypescriptSnippet(vertical)
          : generateCurlSnippet(vertical);

      const header =
        language === "typescript"
          ? `TypeScript integration example (${vertical} vertical)`
          : `cURL integration example (${vertical} vertical)`;

      const text = [
        header,
        "=".repeat(header.length),
        "",
        snippet,
        "",
        "---",
        "Docs: https://shatale.com/mcp",
        "Dashboard: https://admin.shatale.com/dashboard",
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // ── shatale_get_started ─────────────────────────────────────────────────

  server.tool(
    "shatale_get_started",
    "Get instructions for setting up Shatale and connecting this MCP server to your sandbox account.",
    { readOnlyHint: true },
    async () => {
      const text = [
        "Getting Started with Shatale MCP Server",
        "========================================",
        "",
        "1. Sign up at https://admin.shatale.com/register?ref=mcp",
        "   Create a free account to access the sandbox environment.",
        "",
        "2. Get your sandbox API key",
        "   Go to https://admin.shatale.com/dashboard",
        "   Create a new key \u2014 it will start with sh_test_ or sh_sandbox_.",
        "",
        "3. Set the SHATALE_API_KEY environment variable",
        "   Add to your MCP server configuration:",
        '   { "env": { "SHATALE_API_KEY": "sh_test_..." } }',
        "",
        "4. Restart the MCP server",
        "   The sandbox tools will become available automatically.",
        "",
        "Useful links:",
        "  Docs:      https://shatale.com/mcp",
        "  API Ref:   https://shatale.com/mcp",
        "  GitHub:    https://github.com/shatale/mcp-server",
        "  Dashboard: https://admin.shatale.com/dashboard",
        "",
        "While you wait, try the guest tools:",
        "  - shatale_demo_scenarios    \u2014 see how the policy engine works",
        "  - shatale_list_mcc_codes    \u2014 browse merchant category codes",
        "  - shatale_generate_snippet  \u2014 get integration code examples",
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );
}
