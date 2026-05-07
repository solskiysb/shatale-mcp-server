import type { ShataleClient } from '../client.js'
import type { ToolModule } from '../types.js'
import { jsonResult, textResult } from '../types.js'

export function createOnboardingTools(client: ShataleClient): ToolModule {
  return {
    tools: [
      {
        name: 'register_user_profile',
        description:
          'Submit user profile data to Shatale for a new user. The user will receive a verification link ' +
          'to confirm their identity and data. This does NOT create an active account — the user must verify. ' +
          'Use this when you have user details but no immediate purchase intent, or to pre-register before purchasing.',
        inputSchema: {
          type: 'object',
          properties: {
            publisher_user_id: {
              type: 'string',
              description: 'Your publisher-side user identifier',
            },
            user_claims: {
              type: 'object',
              description: 'User data to submit (unverified — user must confirm)',
              properties: {
                email: { type: 'string', description: 'User email address (required)' },
                name: { type: 'string', description: 'User full name' },
                phone: { type: 'string', description: 'User phone number' },
                country: { type: 'string', description: 'User country code (ISO 3166-1 alpha-2, e.g. "FR", "US")' },
              },
              required: ['email'],
            },
            intended_use: {
              type: 'string',
              enum: ['purchase', 'credentials', 'general'],
              description: 'What this registration is for (helps optimize the flow)',
            },
            idempotency_key: {
              type: 'string',
              description: 'Unique key to prevent duplicate submissions',
            },
          },
          required: ['publisher_user_id', 'user_claims'],
        },
      },
      {
        name: 'get_onboarding_status',
        description:
          'Check the status of a user onboarding/registration session. ' +
          'Returns whether the user has verified their email, completed their profile, and granted any required consents.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The onboarding session ID returned by register_user_profile or request_purchase',
            },
          },
          required: ['session_id'],
        },
      },
    ],
    handlers: {
      register_user_profile: async (args) => {
        try {
          const result = await client.registerUserProfile({
            publisher_user_id: String(args.publisher_user_id),
            user_claims: args.user_claims as any,
            intended_use: args.intended_use ? String(args.intended_use) : 'general',
            idempotency_key: args.idempotency_key ? String(args.idempotency_key) : undefined,
          })
          return jsonResult(result)
        } catch (err) {
          return textResult(`Onboarding API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },

      get_onboarding_status: async (args) => {
        try {
          const result = await client.getOnboardingStatus(String(args.session_id))
          return jsonResult(result)
        } catch (err) {
          return textResult(`Onboarding API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },
    },
  }
}
