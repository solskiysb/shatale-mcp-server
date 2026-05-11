import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { ShataleClient } from './client.js'
import { createGuestTools } from './tools/guest.js'
import { createPurchaseTools } from './tools/purchase.js'
import { createCredentialTools } from './tools/credentials.js'
import { createSandboxTools } from './tools/sandbox.js'
import { createOnboardingTools } from './tools/onboarding.js'
import { createCatalogTools } from './tools/catalog.js'
import { createCommonTools } from './tools/common.js'
import type { ToolDefinition, ToolHandler } from './types.js'
import { textResult } from './types.js'

const apiKey = process.env.SHATALE_API_KEY ?? ''

// F-001/F-010: Reject production keys
if (apiKey.startsWith('sh_live_') || apiKey.startsWith('sk_live_')) {
  console.error('ERROR: Production keys are not allowed. Use a sandbox key (sk_test_*).')
  process.exit(1)
}

// F-005: Whitelist API URL
const ALLOWED_HOSTS = ['api.shatale.com', 'localhost', '127.0.0.1', 'api-production-bad6.up.railway.app']
const apiBaseUrl = new URL(process.env.SHATALE_API_URL ?? 'https://api.shatale.com')
if (!ALLOWED_HOSTS.some(h => apiBaseUrl.hostname === h || apiBaseUrl.hostname.endsWith('.shatale.com'))) {
  console.error(`ERROR: Untrusted API URL: ${apiBaseUrl.hostname}. Only *.shatale.com and localhost are allowed.`)
  process.exit(1)
}
const apiBase = apiBaseUrl.toString().replace(/\/$/, '')

const isGuest = !apiKey
const isSandbox = apiKey.startsWith('sk_test_') || apiKey.startsWith('sh_test_')

const client = new ShataleClient(apiBase, apiKey)

// Collect all tool definitions and handlers
const allTools: ToolDefinition[] = []
const allHandlers: Record<string, ToolHandler> = {}

function registerModule(mod: { tools: ToolDefinition[]; handlers: Record<string, ToolHandler> }) {
  allTools.push(...mod.tools)
  Object.assign(allHandlers, mod.handlers)
}

// Always register guest + common + catalog tools
registerModule(createGuestTools())
registerModule(createCommonTools(client))
registerModule(createCatalogTools(client))

// Register authenticated tools if API key provided
if (!isGuest) {
  registerModule(createPurchaseTools(client))
  registerModule(createCredentialTools(client))
  registerModule(createOnboardingTools(client))
  if (isSandbox) {
    registerModule(createSandboxTools(client))
  }
}

// Create server
const server = new Server(
  { name: 'shatale-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

// Register list_tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools }
})

// Register call_tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const handler = allHandlers[name]

  if (!handler) {
    return textResult(`Unknown tool: ${name}`, true)
  }

  return handler(args ?? {})
})

// F-009: Process-level error handling for JSON-RPC edge cases
process.on('uncaughtException', (err) => {
  console.error('MCP server error:', err.message)
  process.exit(1)
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Log mode to stderr so it does not interfere with stdio transport
  const mode = isGuest ? 'guest' : isSandbox ? 'sandbox' : 'production'
  const toolCount = allTools.length
  process.stderr.write(`Shatale MCP server started (${mode} mode, ${toolCount} tools)\n`)
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`)
  process.exit(1)
})
