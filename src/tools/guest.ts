import type { ToolModule } from '../types.js'
import { textResult } from '../types.js'

function handleExplainShatale() {
  return textResult(`# What is Shatale?

Shatale enables AI agents to make real purchases on the internet — safely and with full control.

## How it works

1. **Publisher** integrates Shatale SDK into their AI agent platform
2. **End user** sets spending policies (budgets, allowed merchants, categories)
3. **AI agent** requests a purchase via the Shatale API
4. **Shatale** validates the request against policies, handles payment, and returns confirmation
5. **End user** gets notified and can review/approve purchases

## Key concepts

- **Purchase request**: Agent asks to buy something — Shatale checks policies and executes
- **Temporary credentials**: For merchants that need login, Shatale issues short-lived card credentials
- **Spending policies**: Per-user rules — budget limits, allowed MCC codes, merchant allowlists
- **Sandbox mode**: Test everything with \`sh_test_\` API keys before going live

## Modes

- **Guest mode** (no API key): Explore capabilities, simulate flows, generate policy templates
- **Sandbox mode** (\`sh_test_*\` key): Full API access with test data, no real money
- **Production mode** (\`sh_live_*\` key): Real purchases, real money

## Getting started

Set the \`SHATALE_API_KEY\` environment variable and restart the MCP server.
Get your API key at https://dashboard.shatale.com`)
}

function handleSimulatePurchase(args: Record<string, unknown>) {
  const merchant = String(args.merchant ?? 'example.com')
  const amount = Number(args.amount ?? 0)
  const currency = String(args.currency ?? 'USD')
  const description = String(args.description ?? 'a purchase')

  return textResult(`# Simulated Purchase Flow

## Request
- **Merchant**: ${merchant}
- **Amount**: ${amount} ${currency}
- **Description**: ${description}

## Step-by-step flow

### 1. Request validation
The agent calls \`request_purchase\` with the details above.
Shatale validates:
- API key is valid and active
- Publisher account is in good standing
- Request fields are complete

### 2. Policy check
Shatale checks the end user's spending policy:
- Is ${merchant} in the allowed merchant list?
- Does the amount (${amount} ${currency}) fit within the remaining budget?
- Is the merchant's MCC code in the allowed categories?
- Are there any time-of-day or frequency restrictions?

### 3. Payment execution
If all checks pass:
- Shatale reserves the amount from the user's wallet
- Generates a virtual card or uses card-on-file for the merchant
- Completes the payment with the merchant

### 4. Confirmation
- Purchase ID is returned to the agent
- User receives a notification (push/email based on preferences)
- Transaction appears in the user's dashboard

### 5. Post-purchase
- Agent can check status via \`get_purchase_status\`
- User can dispute within 24 hours
- Refunds are handled automatically if the merchant initiates one

## What could block this purchase?
- Insufficient budget remaining
- Merchant not in allowlist
- MCC code blocked by policy
- Daily/weekly transaction limit reached
- Account requires re-verification`)
}

function inferCategories(useCase: string): string[] {
  const lc = useCase.toLowerCase()
  if (lc.includes('saas') || lc.includes('software') || lc.includes('subscription')) {
    return ['5734 — Computer Software Stores', '5817 — Digital Goods', '5818 — Digital Goods: Large Seller']
  }
  if (lc.includes('cloud') || lc.includes('infrastructure') || lc.includes('hosting')) {
    return ['4816 — Computer Network Services', '7372 — Computer Programming', '5734 — Computer Software Stores']
  }
  if (lc.includes('office') || lc.includes('supplies')) {
    return ['5111 — Stationery Stores', '5943 — Office Supplies', '5944 — Jewelry & Watch Shops']
  }
  if (lc.includes('travel') || lc.includes('trip')) {
    return ['4511 — Airlines', '7011 — Hotels & Motels', '7512 — Car Rental']
  }
  return ['5411 — Grocery Stores', '5812 — Restaurants', '5999 — Miscellaneous Retail']
}

function handleGeneratePolicy(args: Record<string, unknown>) {
  const useCase = String(args.use_case ?? 'general')
  const budget = Number(args.monthly_budget ?? 1000)
  const categories = (args.allowed_categories as string[] | undefined) ?? inferCategories(useCase)

  return textResult(`# Spending Policy Template

## Use case: ${useCase}

\`\`\`json
{
  "name": "${useCase} policy",
  "version": "1.0",
  "limits": {
    "monthly_budget": ${budget},
    "currency": "USD",
    "single_transaction_max": ${Math.round(budget * 0.25)},
    "daily_transaction_count": 10,
    "daily_amount_max": ${Math.round(budget * 0.5)}
  },
  "allowed_categories": ${JSON.stringify(categories, null, 4)},
  "merchant_rules": {
    "mode": "allowlist",
    "merchants": []
  },
  "approval_rules": {
    "auto_approve_below": ${Math.round(budget * 0.05)},
    "require_human_approval_above": ${Math.round(budget * 0.5)},
    "notify_on_every_purchase": true
  },
  "time_restrictions": {
    "allowed_days": ["mon", "tue", "wed", "thu", "fri"],
    "allowed_hours": { "start": "08:00", "end": "20:00", "timezone": "UTC" }
  }
}
\`\`\`

## Notes
- Adjust \`single_transaction_max\` based on typical purchase sizes
- Start with \`allowlist\` mode and add merchants as needed
- Set \`auto_approve_below\` to a comfortable threshold for hands-off operation
- Review and adjust after the first month of usage`)
}

export function createGuestTools(): ToolModule {
  return {
    tools: [
      {
        name: 'explain_shatale',
        description:
          'Explains what Shatale is and how AI agent payments work. No API key required.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'simulate_purchase_flow',
        description:
          'Simulates what would happen during a purchase flow — step by step. No API key required.',
        inputSchema: {
          type: 'object',
          properties: {
            merchant: {
              type: 'string',
              description: 'Merchant name or domain (e.g. "amazon.com")',
            },
            amount: {
              type: 'number',
              description: 'Purchase amount',
            },
            currency: {
              type: 'string',
              description: 'Currency code (e.g. "USD", "EUR")',
            },
            description: {
              type: 'string',
              description: 'What is being purchased',
            },
          },
          required: ['merchant', 'amount', 'description'],
        },
      },
      {
        name: 'generate_policy_template',
        description:
          'Generates a spending policy template based on a use case. No API key required.',
        inputSchema: {
          type: 'object',
          properties: {
            use_case: {
              type: 'string',
              description:
                'The use case for the policy (e.g. "SaaS subscriptions", "cloud infrastructure", "office supplies")',
            },
            monthly_budget: {
              type: 'number',
              description: 'Monthly budget limit in USD',
            },
            allowed_categories: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of allowed spending categories',
            },
          },
          required: ['use_case'],
        },
      },
    ],
    handlers: {
      explain_shatale: async () => handleExplainShatale(),
      simulate_purchase_flow: async (args) => handleSimulatePurchase(args),
      generate_policy_template: async (args) => handleGeneratePolicy(args),
    },
  }
}
