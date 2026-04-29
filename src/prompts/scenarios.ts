import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "shopping-agent",
    {
      description:
        "Create a shopping agent with budget and category restrictions",
      argsSchema: {
        budget: z
          .string()
          .optional()
          .describe("Monthly budget in EUR (default: 1000)"),
      },
    },
    async ({ budget }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Create a shopping agent with a monthly budget of ${budget ?? "1000"} EUR. Block gambling, alcohol, and tobacco categories. Set per-transaction limit to 500 EUR. Then simulate buying sneakers for 150 EUR at Nike Store to test the setup.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "travel-agent",
    {
      description: "Create a travel booking agent for hotels and flights",
      argsSchema: {
        budget: z
          .string()
          .optional()
          .describe("Monthly budget in EUR (default: 5000)"),
      },
    },
    async ({ budget }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Create a travel agent with budget ${budget ?? "5000"} EUR. Allow only airlines (MCC 4511), hotels (MCC 7011), car rental (MCC 7512), and travel agencies (MCC 4722). Set per-transaction limit to 2000 EUR. Simulate booking a flight for 350 EUR on British Airways.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "policy-designer",
    {
      description: "Design a spending policy for an AI agent",
      argsSchema: {
        use_case: z
          .string()
          .describe("What the agent will be used for"),
      },
    },
    async ({ use_case }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I need to design a spending policy for an AI agent that will be used for: ${use_case}. Help me choose: 1) Monthly budget limit 2) Per-transaction limit 3) Which MCC categories to allow or block 4) Minimum balance reserve. Then test the policy with 5 different simulated transactions to verify it works correctly.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "test-my-setup",
    {
      description:
        "Test an existing agent setup with various transaction scenarios",
      argsSchema: {
        agent_id: z
          .string()
          .optional()
          .describe("Agent ID to test"),
      },
    },
    async ({ agent_id }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Run a comprehensive test of my Shatale setup${agent_id ? ` for agent ${agent_id}` : ""}. Simulate these transactions: 1) Normal €100 retail purchase 2) Large €2000 electronics purchase 3) €50 at a gambling site 4) €30 at a restaurant 5) €500 airline ticket. Explain each result — which rules passed, which failed, and why.`,
          },
        },
      ],
    }),
  );
}
