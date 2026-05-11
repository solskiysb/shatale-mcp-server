import type { ShataleClient } from '../client.js'
import type { ToolModule } from '../types.js'
import { jsonResult, textResult } from '../types.js'

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
        try {
          const idempotencyKey = args.idempotency_key
            ? String(args.idempotency_key)
            : `sha-${Date.now()}-${Math.random().toString(36).slice(2)}`
          const result = await client.requestPurchase({
            publisher_user_id: String(args.publisher_user_id),
            agent_id: String(args.agent_id),
            merchant_ref: String(args.merchant_ref),
            amount_cents: Number(args.amount_cents),
            currency: String(args.currency),
            description: String(args.description),
            user_hint: args.user_hint as any,
            idempotency_key: idempotencyKey,
          })
          return jsonResult(result)
        } catch (err) {
          return textResult(`Purchase API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },

      preview_purchase: async (args) => {
        try {
          const result = await client.previewPurchase({
            publisher_user_id: String(args.publisher_user_id),
            agent_id: String(args.agent_id),
            merchant_ref: String(args.merchant_ref),
            amount_cents: Number(args.amount_cents),
            currency: String(args.currency),
            description: String(args.description),
            idempotency_key: `sha-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          })
          return jsonResult(result)
        } catch (err) {
          return textResult(`Purchase API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
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
