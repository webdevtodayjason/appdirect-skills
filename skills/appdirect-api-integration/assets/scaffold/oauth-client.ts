/**
 * AppDirect inbound-client token helper (client_credentials).
 *
 * Uses the credentials from generateProductIntegrationInboundClient to call
 * AppDirect back (respond to events, query subscriptions, etc.).
 * Tokens are opaque; cache until near expiry and include as Bearer on every call.
 */
type Token = { accessToken: string; expiresAt: number };

export class AppDirectClient {
  private token: Token | null = null;

  constructor(
    private readonly baseUrl: string, // e.g. https://marketplace.example.com
    private readonly clientId: string, // inbound client id
    private readonly clientSecret: string, // inbound client secret — from secrets manager
  ) {}

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) {
      return this.token.accessToken;
    }
    const res = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      accessToken: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    return this.token.accessToken;
  }

  /** GraphQL call. Always include userErrors fragments in mutations. */
  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { data?: T; errors?: unknown[] };
    if (body.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
    return body.data as T;
  }

  /** REST call (e.g. PUT /api/v3/marketplaceProduct/productSettings/{id}). */
  async rest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`REST ${method} ${path} → ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }
}
