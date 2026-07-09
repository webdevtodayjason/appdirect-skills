# AppDirect Auth, Grant Types, and Scopes

## Ground rules

- OAuth 2.0 only (OAuth 1.0 deprecated 1 Dec 2020). All calls HTTPS — HTTP fails outright.
- API clients are created by **Marketplace Managers** — request one; you can't self-serve.
- Access tokens are opaque strings carrying the requested scopes; include one on every request.
- Never commit client secrets; never put them in client-side code.

## Grant types (pick per use case)

| Grant type | Use for |
|---|---|
| Client Credentials | System-to-system: product management pipelines, catalog automation, backend jobs |
| Authorization Code | Acting on behalf of a logged-in user |
| Implicit / Password | Legacy; avoid for new integrations |

Different APIs support different grant types — check the reference doc for the specific API before assuming.

## Scopes ↔ roles

Scopes roughly map to AppDirect user roles. The ones that matter for ISV work:

| Scope | Unlocks |
|---|---|
| `ROLE_DEVELOPER` | Product GraphQL APIs (create/update products, editions, pricing, integration configs). Prereq: your user has the Developer role in the marketplace company. |
| `ROLE_CHANNEL_ADMIN` / `ROLE_CHANNEL_PRODUCT_SUPPORT` | Marketplace product settings API (`PUT /api/v3/marketplaceProduct/productSettings/{id}`) |
| `ROLE_PARTNER` | Explicitly NOT supported for product settings |

Debugging rule: when a call fails with an authorization error despite a fresh token, compare the token's scopes against the mutation/endpoint's required scope before touching anything else. The GraphQL schema docs list scope requirements per query/mutation.

## Credential directions in product integrations

Two separate credential sets exist per integration config — don't conflate them:

1. **Outbound** (AppDirect → your app): set in `createProductIntegration.outboundCredentials` (e.g., OAuth2 client_credentials against YOUR token endpoint). AppDirect uses these to call your event URLs.
2. **Inbound** (your app → AppDirect): generated via `generateProductIntegrationInboundClient`. Your app uses these to respond to integration events and call AppDirect back.
