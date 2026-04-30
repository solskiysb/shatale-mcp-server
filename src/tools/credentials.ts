import type { ShataleClient } from '../client.js'
import type { ToolModule } from '../types.js'
import { jsonResult, textResult } from '../types.js'

export function createCredentialTools(client: ShataleClient): ToolModule {
  return {
    tools: [
      {
        name: 'request_temporary_credentials',
        description:
          'Request temporary payment credentials for a merchant that requires card details. Returns short-lived virtual card numbers.',
        inputSchema: {
          type: 'object',
          properties: {
            publisher_user_id: {
              type: 'string',
              description: 'The publisher-side user ID',
            },
            merchant_domain: {
              type: 'string',
              description: 'The merchant domain these credentials will be used for (e.g. "aws.amazon.com")',
            },
            purpose: {
              type: 'string',
              description: 'Why temporary credentials are needed (e.g. "Add payment method for AWS account")',
            },
          },
          required: ['publisher_user_id', 'merchant_domain', 'purpose'],
        },
      },
      {
        name: 'get_credential_status',
        description: 'Check the status of a temporary credential request.',
        inputSchema: {
          type: 'object',
          properties: {
            credential_request_id: {
              type: 'string',
              description: 'The credential request ID',
            },
          },
          required: ['credential_request_id'],
        },
      },
    ],
    handlers: {
      request_temporary_credentials: async (args) => {
        try {
          const result = await client.requestCredentials({
            publisher_user_id: String(args.publisher_user_id),
            merchant_domain: String(args.merchant_domain),
            purpose: String(args.purpose),
          })
          return jsonResult(result)
        } catch (err) {
          return textResult(`Credentials API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },

      get_credential_status: async (args) => {
        try {
          const result = await client.getCredentialStatus(String(args.credential_request_id))
          return jsonResult(result)
        } catch (err) {
          return textResult(`Credentials API error: ${err instanceof Error ? err.message : String(err)}`, true)
        }
      },
    },
  }
}
