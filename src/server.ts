import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGuestTools } from "./tools/guest.js";
import { registerSandboxTools } from "./tools/sandbox.js";
import { registerResources } from "./resources/guides.js";
import { registerPrompts } from "./prompts/scenarios.js";
import { ShataleClient } from "./client.js";

export function createServer(apiKey?: string): McpServer {
  const server = new McpServer({
    name: "shatale-mcp-server",
    version: "0.1.0",
  });

  // Always register guest tools, resources, and prompts
  registerGuestTools(server);
  registerResources(server);
  registerPrompts(server);

  // If API key provided, register sandbox tools
  if (apiKey) {
    const baseUrl = "https://sandbox.shatale.eu/v1";
    const client = new ShataleClient({ baseUrl, apiKey });
    registerSandboxTools(server, client);
  }

  return server;
}
