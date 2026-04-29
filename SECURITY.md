# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

- **Email:** security@shatale.com
- **Do not** open a public GitHub issue for security vulnerabilities
- We will acknowledge receipt within 48 hours
- We will provide a detailed response within 7 days

## Security Design

This MCP server is designed with the following security principles:

- **Sandbox only:** Production API keys (`sh_live_*`) are rejected at startup
- **No card data:** PAN, CVV, and card details are never exposed through MCP tools
- **No credentials:** Email aliases and credential vault are not accessible
- **Local transport:** Runs as a local stdio process, no network server exposed
- **Rate limited:** API calls are throttled to prevent abuse
- **Scoped access:** Only safe, non-destructive sandbox operations are available
