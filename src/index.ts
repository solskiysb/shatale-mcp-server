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
const apiBase = process.env.SHATALE_API_URL ?? 'https://api.shatale.com'
const isGuest = !apiKey
const isSandbox = apiKey.startsWith('sh_test_')

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
