/**
 * Sandbox tools — require a valid Shatale API key.
 * These interact with the Shatale sandbox API for real simulations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ShataleClient, ShataleApiError } from "../client.js";
import type { SandboxSimulateResult } from "../client.js";
import { formatCurrency, formatRuleTraces } from "./shared.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function apiErrorMessage(err: ShataleApiError): string {
  return `Shatale API error (${err.status}): ${err.message}${err.code !== "unknown_error" ? ` [${err.code}]` : ""}`;
}

function formatDecision(result: SandboxSimulateResult): string {
  const icon = result.decision === "approved" ? "\u2705" : "\u274c";
  const lines = [
    `${icon} Decision: ${result.decision.toUpperCase()}`,
    `Amount: ${formatCurrency(result.amount_cents, result.currency)}`,
    `Merchant: ${result.merchant_name} (MCC ${result.mcc})`,
    "",
    "Rule traces:",
    formatRuleTraces(result.rule_traces),
  ];
  return lines.join("\n");
}

// ─── Vertical configs ────────────────────────────────────────────────────────

interface VerticalConfig {
  agentName: string;
  spendLimitCents: number;
  suggestedMccs: string[];
  description: string;
}

const VERTICAL_CONFIGS: Record<string, VerticalConfig> = {
  shopping: {
    agentName: "Shopping Agent",
    spendLimitCents: 100000,
    suggestedMccs: ["5411", "5311", "5691", "5944", "5945", "5999"],
    description: "General retail and e-commerce purchases",
  },
  travel: {
    agentName: "Travel Agent",
    spendLimitCents: 500000,
    suggestedMccs: ["4511", "7011", "4121", "7512", "4722"],
    description: "Flights, hotels, car rentals, and travel bookings",
  },
  procurement: {
    agentName: "Procurement Agent",
    spendLimitCents: 1000000,
    suggestedMccs: ["5999", "5411", "5311"],
    description: "B2B purchasing and vendor payments",
  },
  expense: {
    agentName: "Expense Agent",
    spendLimitCents: 50000,
    suggestedMccs: ["5812", "5814", "4121", "7011"],
    description: "Employee expense management (meals, transport, lodging)",
  },
};

// ─── Tool Registration ──────────────────────────────────────────────────────

export function registerSandboxTools(server: McpServer, client: ShataleClient): void {
  // ── shatale_create_demo_agent ───────────────────────────────────────────

  server.tool(
    "shatale_create_demo_agent",
    "Create a demo agent with a virtual card for a specific business vertical. The agent is created in the sandbox environment.",
    {
      vertical: z
        .enum(["shopping", "travel", "procurement", "expense"])
        .describe("Business vertical for policy template"),
      budget_eur: z
        .number()
        .min(100)
        .max(50000)
        .default(1000)
        .describe("Monthly budget in EUR"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ vertical, budget_eur }) => {
      try {
        const config = VERTICAL_CONFIGS[vertical];
        const spendLimitCents = budget_eur * 100;

        // Create agent
        const agent = await client.createAgent({
          name: config.agentName,
          metadata: {
            vertical,
            created_by: "mcp-server",
            description: config.description,
          },
        });

        // Issue card
        const card = await client.issueCard({
          agent_id: agent.id,
          currency: "EUR",
          spend_limit_cents: spendLimitCents,
        });

        const text = [
          `Demo ${vertical} agent created successfully!`,
          "",
          "Agent:",
          `  ID:     ${agent.id}`,
          `  Name:   ${agent.name}`,
          `  Status: ${agent.status}`,
          "",
          "Virtual Card:",
          `  ID:          ${card.id}`,
          `  Last four:   ${card.last_four}`,
          `  Status:      ${card.status}`,
          `  Spend limit: ${formatCurrency(card.spend_limit_cents, card.currency)}`,
          `  Balance:     ${formatCurrency(card.balance_cents, card.currency)}`,
          "",
          "Suggested policy configuration:",
          `  Vertical:       ${vertical}`,
          `  Monthly budget: ${formatCurrency(spendLimitCents, "EUR")}`,
          `  Allowed MCCs:   ${config.suggestedMccs.join(", ")}`,
          `  Description:    ${config.description}`,
          "",
          "Next steps:",
          `  - Use shatale_simulate_payment to test transactions`,
          `  - Use shatale_test_scenarios with agent_id="${agent.id}" to run test suite`,
          `  - Use shatale_explain_decision to understand policy decisions`,
        ].join("\n");

        return { content: [{ type: "text", text }] };
      } catch (err) {
        if (err instanceof ShataleApiError) {
          return { content: [{ type: "text", text: apiErrorMessage(err) }] };
        }
        return {
          content: [{ type: "text", text: `Error creating demo agent: ${(err as Error).message}` }],
        };
      }
    }
  );

  // ── shatale_simulate_payment ────────────────────────────────────────────

  server.tool(
    "shatale_simulate_payment",
    "Simulate a payment authorization in the Shatale sandbox. Shows the policy engine decision and rule traces.",
    {
      amount_cents: z
        .number()
        .int()
        .min(1)
        .describe("Amount in cents, e.g. 4999 for \u20ac49.99"),
      currency: z.string().default("EUR").describe("ISO 4217 currency code"),
      merchant_name: z
        .string()
        .describe("Merchant name, e.g. 'Nike Store'"),
      mcc: z
        .string()
        .regex(/^\d{4}$/)
        .default("5999")
        .describe("4-digit Merchant Category Code"),
    },
    { readOnlyHint: true },
    async ({ amount_cents, currency, merchant_name, mcc }) => {
      try {
        // Get first available card to simulate against
        const agents = await client.listAgents({ limit: 1 });
        if (agents.data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No agents found. Create one first with shatale_create_demo_agent.",
              },
            ],
          };
        }

        const agent = agents.data[0];

        // Issue a card for simulation
        let cardId: string;
        try {
          const card = await client.issueCard({
            agent_id: agent.id,
            currency,
            spend_limit_cents: 100000,
          });
          cardId = card.id;
        } catch {
          return {
            content: [
              {
                type: "text",
                text: "Could not create a card for simulation. Try shatale_create_demo_agent first.",
              },
            ],
          };
        }

        const result = await client.sandboxSimulate({
          card_id: cardId,
          amount_cents,
          currency,
          merchant_name,
          mcc,
        });

        return { content: [{ type: "text", text: formatDecision(result) }] };
      } catch (err) {
        if (err instanceof ShataleApiError) {
          return { content: [{ type: "text", text: apiErrorMessage(err) }] };
        }
        return {
          content: [{ type: "text", text: `Simulation error: ${(err as Error).message}` }],
        };
      }
    }
  );

  // ── shatale_explain_decision ────────────────────────────────────────────

  server.tool(
    "shatale_explain_decision",
    "Simulate a payment and provide a detailed human-readable explanation of why it was approved or declined, including suggestions.",
    {
      amount_cents: z
        .number()
        .int()
        .min(1)
        .describe("Amount in cents, e.g. 4999 for \u20ac49.99"),
      currency: z.string().default("EUR").describe("ISO 4217 currency code"),
      merchant_name: z.string().describe("Merchant name"),
      mcc: z
        .string()
        .regex(/^\d{4}$/)
        .default("5999")
        .describe("4-digit Merchant Category Code"),
    },
    { readOnlyHint: true },
    async ({ amount_cents, currency, merchant_name, mcc }) => {
      try {
        // Get first agent and card
        const agents = await client.listAgents({ limit: 1 });
        if (agents.data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No agents found. Create one first with shatale_create_demo_agent.",
              },
            ],
          };
        }

        const agent = agents.data[0];
        let cardId: string;
        try {
          const card = await client.issueCard({
            agent_id: agent.id,
            currency,
            spend_limit_cents: 100000,
          });
          cardId = card.id;
        } catch {
          return {
            content: [
              {
                type: "text",
                text: "Could not create a card. Try shatale_create_demo_agent first.",
              },
            ],
          };
        }

        const result = await client.sandboxSimulate({
          card_id: cardId,
          amount_cents,
          currency,
          merchant_name,
          mcc,
        });

        const failedRules = result.rule_traces.filter((t) => !t.passed);
        const passedRules = result.rule_traces.filter((t) => t.passed);

        const lines: string[] = [
          "Payment Decision Explanation",
          "============================",
          "",
          `Transaction: ${formatCurrency(amount_cents, currency)} at ${merchant_name} (MCC ${mcc})`,
          "",
        ];

        if (result.decision === "approved") {
          lines.push("\u2705 APPROVED \u2014 All policy rules passed.");
        } else {
          lines.push(`\u274c DECLINED \u2014 ${failedRules.length} rule(s) failed.`);
        }

        lines.push("", "Rule-by-rule breakdown:", "");

        for (const trace of result.rule_traces) {
          const icon = trace.passed ? "\u2713 PASS" : "\u2717 FAIL";
          lines.push(`  ${icon}: ${trace.rule}`);
          if (trace.detail) {
            lines.push(`         ${trace.detail}`);
          }
        }

        if (failedRules.length > 0) {
          lines.push("", "Suggestions to get this approved:");
          for (const rule of failedRules) {
            switch (true) {
              case rule.rule.includes("spend_limit"):
                lines.push(`  - Reduce the amount below the per-transaction limit`);
                break;
              case rule.rule.includes("mcc"):
                lines.push(`  - Add MCC ${mcc} to the policy allowlist, or use a different merchant category`);
                break;
              case rule.rule.includes("balance"):
                lines.push(`  - Top up the card balance or reduce the transaction amount`);
                break;
              default:
                lines.push(`  - Review and adjust the "${rule.rule}" policy rule`);
            }
          }
        }

        lines.push(
          "",
          `Passed: ${passedRules.length}  |  Failed: ${failedRules.length}  |  Total rules: ${result.rule_traces.length}`
        );

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        if (err instanceof ShataleApiError) {
          return { content: [{ type: "text", text: apiErrorMessage(err) }] };
        }
        return {
          content: [{ type: "text", text: `Error explaining decision: ${(err as Error).message}` }],
        };
      }
    }
  );

  // ── shatale_test_scenarios ──────────────────────────────────────────────

  server.tool(
    "shatale_test_scenarios",
    "Run a suite of 4 test payment simulations against the sandbox to verify policy behavior: normal purchase, over-limit, blocked MCC, and small purchase.",
    {
      agent_id: z
        .string()
        .optional()
        .describe("Agent ID to test against (uses first available agent if omitted)"),
    },
    { readOnlyHint: true },
    async ({ agent_id }) => {
      try {
        // Resolve agent
        let resolvedAgentId: string;
        if (agent_id) {
          resolvedAgentId = agent_id;
        } else {
          const agents = await client.listAgents({ limit: 1 });
          if (agents.data.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No agents found. Create one first with shatale_create_demo_agent.",
                },
              ],
            };
          }
          resolvedAgentId = agents.data[0].id;
        }

        // Issue a card for testing
        let cardId: string;
        try {
          const card = await client.issueCard({
            agent_id: resolvedAgentId,
            currency: "EUR",
            spend_limit_cents: 100000,
          });
          cardId = card.id;
        } catch {
          return {
            content: [
              {
                type: "text",
                text: "Could not create a test card. Verify the agent exists and try again.",
              },
            ],
          };
        }

        // Define test scenarios
        const scenarios = [
          { label: "Normal purchase", amount_cents: 15000, mcc: "5691", merchant: "Clothing Store" },
          { label: "Over-limit purchase", amount_cents: 500000, mcc: "5999", merchant: "Luxury Retailer" },
          { label: "Blocked MCC (gambling)", amount_cents: 5000, mcc: "7995", merchant: "Online Casino" },
          { label: "Small purchase", amount_cents: 2500, mcc: "5812", merchant: "Coffee Shop" },
        ];

        const lines: string[] = [
          "Shatale Test Scenarios",
          "======================",
          `Agent: ${resolvedAgentId}`,
          `Card: ${cardId}`,
          "",
          "| # | Scenario              | Amount      | MCC  | Decision |",
          "|---|----------------------|-------------|------|----------|",
        ];

        for (let i = 0; i < scenarios.length; i++) {
          const s = scenarios[i];
          try {
            const result = await client.sandboxSimulate({
              card_id: cardId,
              amount_cents: s.amount_cents,
              currency: "EUR",
              merchant_name: s.merchant,
              mcc: s.mcc,
            });

            const icon = result.decision === "approved" ? "\u2705" : "\u274c";
            const amount = formatCurrency(s.amount_cents, "EUR").padEnd(11);
            const label = s.label.padEnd(21);
            lines.push(`| ${i + 1} | ${label} | ${amount} | ${s.mcc} | ${icon} ${result.decision.toUpperCase().padEnd(8)} |`);
          } catch (err) {
            const label = s.label.padEnd(21);
            const amount = formatCurrency(s.amount_cents, "EUR").padEnd(11);
            const errMsg = err instanceof ShataleApiError ? err.code : "error";
            lines.push(`| ${i + 1} | ${label} | ${amount} | ${s.mcc} | \u26a0\ufe0f ${errMsg.padEnd(8)} |`);
          }
        }

        lines.push(
          "",
          "Use shatale_explain_decision for detailed breakdown of any scenario."
        );

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        if (err instanceof ShataleApiError) {
          return { content: [{ type: "text", text: apiErrorMessage(err) }] };
        }
        return {
          content: [{ type: "text", text: `Test scenarios error: ${(err as Error).message}` }],
        };
      }
    }
  );

  // ── shatale_get_agent_status ────────────────────────────────────────────

  server.tool(
    "shatale_get_agent_status",
    "Get the current status of a Shatale agent, including recent authorization history.",
    {
      agent_id: z.string().describe("Agent ULID"),
    },
    { readOnlyHint: true },
    async ({ agent_id }) => {
      try {
        const [agent, authResult] = await Promise.all([
          client.getAgent(agent_id),
          client.listAuthorizations({ agent_id, limit: 10 }),
        ]);

        const lines: string[] = [
          "Agent Status",
          "============",
          "",
          `ID:      ${agent.id}`,
          `Name:    ${agent.name}`,
          `Status:  ${agent.status}`,
          `Created: ${agent.created_at}`,
          `Updated: ${agent.updated_at}`,
        ];

        if (agent.metadata && Object.keys(agent.metadata).length > 0) {
          lines.push("", "Metadata:");
          for (const [key, value] of Object.entries(agent.metadata)) {
            lines.push(`  ${key}: ${String(value)}`);
          }
        }

        lines.push("", `Recent Authorizations (${authResult.total} total):`);

        if (authResult.data.length === 0) {
          lines.push("  No authorizations yet.");
        } else {
          lines.push(
            "",
            "  | Date       | Merchant              | Amount      | Status   |",
            "  |------------|----------------------|-------------|----------|"
          );

          for (const auth of authResult.data) {
            const date = auth.created_at.slice(0, 10);
            const merchant = auth.merchant_name.padEnd(21).slice(0, 21);
            const amount = formatCurrency(auth.amount_cents, auth.currency).padEnd(11);
            const icon = auth.status === "approved" ? "\u2705" : auth.status === "declined" ? "\u274c" : "\u21a9\ufe0f";
            lines.push(`  | ${date} | ${merchant} | ${amount} | ${icon} ${auth.status.padEnd(8)} |`);
          }
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        if (err instanceof ShataleApiError) {
          return { content: [{ type: "text", text: apiErrorMessage(err) }] };
        }
        return {
          content: [{ type: "text", text: `Error fetching agent status: ${(err as Error).message}` }],
        };
      }
    }
  );
}
