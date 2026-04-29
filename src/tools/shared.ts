/**
 * Shared helper functions for Shatale MCP tools.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
  CHF: "CHF ",
  PLN: "z\u0142",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  CZK: "K\u010d",
};

/**
 * Format an amount in cents to a human-readable currency string.
 * Example: formatCurrency(4999, "EUR") => "€49.99"
 */
export function formatCurrency(amountCents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency} `;
  const whole = Math.floor(amountCents / 100);
  const cents = String(amountCents % 100).padStart(2, "0");
  return `${symbol}${whole}.${cents}`;
}

/**
 * Format rule traces into a readable multi-line string.
 */
export function formatRuleTraces(
  traces: Array<{ rule: string; passed: boolean; detail?: string }>
): string {
  if (traces.length === 0) return "  (no rules evaluated)";

  return traces
    .map((t) => {
      const icon = t.passed ? "\u2713" : "\u2717";
      const detail = t.detail ? ` \u2014 ${t.detail}` : "";
      return `  ${icon} ${t.rule}${detail}`;
    })
    .join("\n");
}

/**
 * Return an MCP-formatted error response indicating that an API key is required.
 */
export function requireApiKey(): { content: [{ type: "text"; text: string }] } {
  return {
    content: [
      {
        type: "text",
        text: [
          "Shatale API key is required for this tool.",
          "",
          "To get started:",
          "1. Sign up at https://admin.shatale.com/register?ref=mcp",
          "2. Get your sandbox API key from the dashboard",
          "3. Set SHATALE_API_KEY in your environment",
          "4. Restart the MCP server",
          "",
          "Use the shatale_get_started tool for more details.",
        ].join("\n"),
      },
    ],
  };
}
