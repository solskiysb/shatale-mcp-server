import { z } from 'zod'
import type { ShataleClient } from '../client.js'
import type { ToolModule } from '../types.js'
import { jsonResult, textResult } from '../types.js'

// F-003: Zod input validation schemas
const requestPurchaseSchema = z.object({
  publisher_user_id: z.string().min(1, 'publisher_user_id is required'),
  agent_id: z.string().min(1, 'agent_id is required'),
  merchant_ref: z.string().min(1, 'merchant_ref is required'),
  amount_cents: z.number().int('amount_cents must be an integer').positive('amount_cents must be positive').max(10_000_000, 'amount_cents exceeds maximum (10,000,000)'),
  currency: z.string().length(3, 'currency must be a 3-letter ISO code').default('EUR'),
  description: z.string().min(1, 'description is required'),
  user_hint: z.object({
    email: z.string().email().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    country: z.string().length(2).optional(),
  }).optional(),
  idempotency_key: z.string().optional(),
})

export function createPurchaseTools(client: ShataleClient): ToolModule {
  return {
    tools: [
      {
        name: 'request_purchase',
        description:
          'Request a purchase on behalf of a user. Shatale validates against spending policies and executes the payment.',
        inputSchema: {
          type: 'object',
          properties: {
            publisher_user_id: {
              type: 'string',
              description: 'The publisher-side user ID who is making the purchase',
            },
            agent_id: {
              type: 'string',
              description: 'Identifier for the AI agent making the request',
            },
            merchant_ref: {
              type: 'string',
              description: 'Merchant reference — name or domain (e.g. "amazon.com")',
            },
            amount_cents: {
              type: 'number',
              description: 'Purchase amount in cents (e.g. 4999 for $49.99)',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. "USD", "EUR")',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of what is being purchased',
            },
            user_hint: {
              type: 'object',
              description: 'Optional user data to pre-fill registration (unverified — user must confirm)',
              properties: {
                email: { type: 'string', description: 'User email address' },
                name: { type: 'string', description: 'User full name' },
                phone: { type: 'string', description: 'User phone number' },
                country: { type: 'string', description: 'User country (ISO 3166-1 alpha-2)' },
              },
            },
            idempotency_key: {
              type: 'string',
              description: 'Unique key for idempotent requests (prevents duplicate purchases). Auto-generated if omitted.',
            },
          },
          required: ['publisher_user_id', 'agent_id', 'merchant_ref', 'amount_cents', 'currency', 'description'],
        },
      },
      {
        name: 'preview_purchase',
        description:
          'Preview a purchase without executing it. Returns policy check results and estimated fees.',
        inputSchema: {
          type: 'object',
          properties: {
            publisher_user_id: {
              type: 'string',
              description: 'The publisher-side user ID',
            },
            agent_id: {
              type: 'string',
              description: 'Identifier for the AI agent',
            },
            merchant_ref: {
              type: 'string',
              description: 'Merchant reference — name or domain',
            },
            amount_cents: {
              type: 'number',
              description: 'Purchase amount in cents',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code',
            },
            description: {
              type: 'string',
              description: 'Description of the purchase',
            },
          },
          required: ['publisher_user_id', 'agent_id', 'merchant_ref', 'amount_cents', 'currency', 'description'],
        },
      },
      {
        name: 'get_purchase_status',
        description: 'Get the current status of a purchase request by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_id: {
              type: 'string',
              description: 'The purchase request ID returned by request_purchase',
            },
          },
          required: ['purchase_id'],
        },
      },
      {
        name: 'cancel_purchase',
        description: 'Cancel a pending purchase request. Only works for purchases not yet executed.',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_id: {
              type: 'string',
              description: 'The purchase request ID to cancel',
            },
            reason: {
              type: 'string',
              description: 'Reason for cancellation (optional but recommended)',
            },
          },
          required: ['purchase_id'],
        },
      },
    ],
    handlers: {
      request_purchase: async (args) => {
        // F-003: Validate input with zod
        const parsed = requestPurchaseSchema.safeParse(args)
        if (!parsed.success) {
          return textResult(`Invalid input: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`, true)
        }
        try {
          const input = parsed.data
          const idempotencyKey = input.idempotency_key
            ?? `sha-${Date.now()}-${Math.random().toString(36).slice(2)}`
          const result = await client.requestPurchase({
            publisher_user_id: input.publisher_user_id,
            agent_id: input.agent_id,
            merchant_ref: input.merchant_ref,
            amount_cents: input.amount_cents,
            currency: input.currency,
            description: input.description,
            user_hint: input.user_hint,
            idempotency_key: idempotencyKey,
          })
          return jsonResult(result)
        } catch (err) {
          return textResult(`Purchase request failed: ${err instanceof Error ? err.message : 'unexpected error'}`, true)
        }
      },

      preview_purchase: async (_args) => {
        // F-013: Preview endpoint returns 405 — mark as coming soon
        return textResult(
          'Purchase preview is not yet available via the API. Use request_purchase to create a purchase, ' +
          'or use simulate_purchase_flow (no API key required) to walk through the flow step by step.',
        )
      },

      get_purchase_status: async (args) => {
        try {
          const result = await client.getPurchaseStatus(String(args.purchase_id))
          return jsonResult(result)
        } catch (err) {
          return textResult(`Purchase API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },

      cancel_purchase: async (args) => {
        try {
          const result = await client.cancelPurchase(
            String(args.purchase_id),
            args.reason ? String(args.reason) : undefined,
          )
          return jsonResult(result)
        } catch (err) {
          return textResult(`Purchase API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },
    },
  }
}
