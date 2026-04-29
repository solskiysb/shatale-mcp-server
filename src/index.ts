#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const apiKey = process.env.SHATALE_API_KEY;

// Validate key format if provided
if (apiKey) {
  if (apiKey.startsWith("sh_live_")) {
    console.error(
      "Error: Shatale MCP server works only with sandbox keys (sh_test_*).",
    );
    console.error(
      "Production keys are not supported for security reasons.",
    );
    console.error(
      "Get a sandbox key at: https://shatale.eu/signup?ref=mcp",
    );
    process.exit(1);
  }
  if (!apiKey.startsWith("sh_test_")) {
    console.error(
      "Error: Invalid API key format. Expected sh_test_* prefix.",
    );
    console.error(
      "Get a sandbox key at: https://shatale.eu/signup?ref=mcp",
    );
    process.exit(1);
  }
  console.error("Shatale MCP Server started (sandbox mode)");
} else {
  console.error(
    "Shatale MCP Server started (guest mode — limited tools)",
  );
  console.error(
    "Set SHATALE_API_KEY for full access: https://shatale.eu/signup?ref=mcp",
  );
}

const server = createServer(apiKey);
const transport = new StdioServerTransport();
await server.connect(transport);
