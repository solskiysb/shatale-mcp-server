# Shatale MCP Server

MCP server for [Shatale](https://shatale.eu) — AI-native payment infrastructure. Give your AI agents the ability to spend money within delegated budgets and policy controls.

**Sandbox only.** This server connects to the Shatale sandbox environment for testing and development.

## Quick Start

### 1. Install and run

```bash
npx shatale-mcp-server
```

The server starts in **guest mode** with 4 demo tools. No API key needed to explore.

### 2. Get full access

Sign up at [shatale.eu/signup](https://shatale.eu/signup?ref=mcp) (free, no credit card) and set your sandbox key:

```bash
export SHATALE_API_KEY=sh_test_your_key_here
npx shatale-mcp-server
```

Now you have **9 tools** — create agents, simulate payments, test policies.

## Configure Your IDE

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shatale": {
      "command": "npx",
      "args": ["shatale-mcp-server"],
      "env": {
        "SHATALE_API_KEY": "sh_test_your_key_here"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add shatale -- npx shatale-mcp-server
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shatale": {
      "command": "npx",
      "args": ["shatale-mcp-server"],
      "env": {
        "SHATALE_API_KEY": "sh_test_your_key_here"
      }
    }
  }
}
```

### Windsurf

Add to `~/.windsurf/mcp.json` (same format as Cursor).

## Tools

### Guest Mode (no API key)

| Tool | Description |
|------|-------------|
| `shatale_list_mcc_codes` | Browse merchant category codes for policy design |
| `shatale_demo_scenarios` | See 5 demo scenarios showing how the policy engine works |
| `shatale_generate_snippet` | Get TypeScript/curl code for your integration |
| `shatale_get_started` | Setup instructions and signup link |

### Sandbox Mode (with API key)

| Tool | Description |
|------|-------------|
| `shatale_create_demo_agent` | Create an agent + card + policy in one step |
| `shatale_simulate_payment` | Simulate a transaction and see approve/decline with rule traces |
| `shatale_explain_decision` | Get a detailed explanation of why a payment was approved or declined |
| `shatale_test_scenarios` | Run 4 test transactions to verify your policy setup |
| `shatale_get_agent_status` | Check agent status and recent transactions |

## Example Prompts

Try these with your AI assistant:

- *"Create a shopping agent with a budget of 1000 EUR, block gambling and alcohol"*
- *"Simulate buying sneakers for 150 EUR at Nike Store"*
- *"Why was the last payment declined?"*
- *"Design a travel policy that allows flights and hotels but blocks everything else"*
- *"Test my setup with 5 different transactions"*

## Resources

The server provides built-in documentation:

- `shatale://guides/quickstart` — 5-minute quickstart guide
- `shatale://guides/policies` — Policy engine and skills reference
- `shatale://guides/verticals` — Use case examples (shopping, travel, procurement, expense)

## Security

- Only sandbox keys (`sh_test_*`) are accepted — production keys are rejected
- No card data (PAN/CVV) is ever exposed
- Local stdio transport — no network server
- See [SECURITY.md](SECURITY.md) for vulnerability reporting

## Links

- [Shatale Website](https://shatale.eu)
- [Documentation](https://docs.shatale.eu)
- [Sign Up](https://shatale.eu/signup?ref=mcp)
- [GitHub](https://github.com/shatale/mcp-server)

## License

MIT
