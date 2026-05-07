import type { ShataleClient } from '../client.js'
import type { ToolModule } from '../types.js'
import { jsonResult, textResult } from '../types.js'

export function createSandboxTools(client: ShataleClient): ToolModule {
  return {
    tools: [
      {
        name: 'sandbox_create_test_user',
        description: 'Create a test user in the sandbox environment. Only available with sandbox API keys.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Test user email (optional, auto-generated if omitted)',
            },
            name: {
              type: 'string',
              description: 'Test user display name (optional)',
            },
          },
        },
      },
      {
        name: 'sandbox_complete_onboarding',
        description:
          'Mark a sandbox test user as fully onboarded (KYC passed, wallet funded). Skips real verification steps.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The test user ID to complete onboarding for',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'sandbox_approve_request',
        description:
          'Manually approve a pending purchase or credential request in sandbox. Simulates user/admin approval.',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: {
              type: 'string',
              description: 'The purchase or credential request ID to approve',
            },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'sandbox_decline_request',
        description: 'Manually decline a pending request in sandbox. Simulates user/admin rejection.',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: {
              type: 'string',
              description: 'The request ID to decline',
            },
            reason: {
              type: 'string',
              description: 'Reason for declining (optional)',
            },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'sandbox_reset',
        description:
          'Reset the entire sandbox environment — deletes all test users, purchases, and credentials. Use with caution.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
    handlers: {
      sandbox_create_test_user: async (args) => {
        try {
          const result = await client.sandboxCreateTestUser({
            email: args.email ? String(args.email) : undefined,
            name: args.name ? String(args.name) : undefined,
          })
          return jsonResult(result)
        } catch (err) {
          return textResult(`Sandbox API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },

      sandbox_complete_onboarding: async (args) => {
        try {
          const result = await client.sandboxCompleteOnboarding(String(args.user_id))
          return jsonResult(result)
        } catch (err) {
          return textResult(`Sandbox API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },

      sandbox_approve_request: async (args) => {
        try {
          const result = await client.sandboxApproveRequest(String(args.request_id))
          return jsonResult(result)
        } catch (err) {
          return textResult(`Sandbox API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },

      sandbox_decline_request: async (args) => {
        try {
          const result = await client.sandboxDeclineRequest(
            String(args.request_id),
            args.reason ? String(args.reason) : undefined,
          )
          return jsonResult(result)
        } catch (err) {
          return textResult(`Sandbox API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },

      sandbox_reset: async () => {
        try {
          const result = await client.sandboxReset()
          return jsonResult(result)
        } catch (err) {
          return textResult(`Sandbox API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },
    },
  }
}
