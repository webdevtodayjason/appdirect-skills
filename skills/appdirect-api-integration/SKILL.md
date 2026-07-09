---
name: appdirect-api-integration
description: Build and debug AppDirect platform API integrations — OAuth clients and scopes, GraphQL product/edition/pricing mutations, product integration configurations (event notification endpoints, SSO, inbound/outbound credentials, ping tests), and webhooks. Use this skill whenever the user is writing code that talks to AppDirect APIs, scaffolding marketplace event endpoints (subscription create/cancel/upgrade, user assign/unassign) in their SaaS, wiring SSO (OIDC/SAML/bookmark) for a marketplace product, calling mutations like createProduct or createProductIntegration, debugging failed ping tests or scope errors, or asking how their app should respond to AppDirect provisioning events.
---

# AppDirect API Integration

Build the code that connects a SaaS product to the AppDirect platform: the endpoints AppDirect calls, the credentials in both directions, and the GraphQL calls that define the product.

## Before writing code

1. Confirm the OAuth setup: an API client issued by the Marketplace Manager, OAuth 2.0 only, HTTPS only. Product-catalog mutations require the **`ROLE_DEVELOPER`** scope; marketplace product settings require `ROLE_CHANNEL_ADMIN`/`ROLE_CHANNEL_PRODUCT_SUPPORT`. Scope-vs-mutation mismatch is the #1 source of opaque GraphQL failures — check it first when debugging.
2. Confirm the five immutable core-data decisions (`type`, `usageType`, `allowMultiplePurchases`, `referable`, `addon`) before calling `createProduct` — they cannot be changed later.
3. Note which APIs are Early Availability (product GraphQL APIs, async publication). EA publication requires an AppDirect technical rep; don't design a pipeline around access the user doesn't have yet.

## Building the integration layer in the user's app

The marketplace notifies the product host at configured event URLs. Scaffold HTTPS endpoints for: `createUrl` (purchase), `cancelUrl`, `upgradeUrl`, `notifyUrl`/`eventStatusUrl`, and — only for `MULTI_USER` products — `assignUrl`/`unassignUrl`. One shared URL for all events is valid and often simpler.

Adapt `assets/scaffold/event-handlers.ts` (Express + TypeScript event endpoints with ping-test handling) and `assets/scaffold/oauth-client.ts` (client-credentials token helper for calling AppDirect back). Match the user's stack — the scaffolds show the contract, not a required framework.

Credentials flow in both directions and are commonly confused:
- **Outbound credentials** (`outboundCredentials` on the integration config): how AppDirect authenticates to YOUR endpoints — e.g., OAuth2 client_credentials against your token URI.
- **Inbound client** (`generateProductIntegrationInboundClient`): how YOUR app authenticates back to AppDirect to respond to events.

For SSO, pick one: OpenID Connect (`addProductIntegrationOpenIdConnectConfiguration`), SAML (`addProductIntegrationSamlConfiguration`), or Bookmark (`addProductIntegrationBookmarkConfiguration` — a static link, the valid fallback when the product has no SSO).

## GraphQL call sequence

The verified mutation order, with working examples in `references/graphql-mutations.md` (read it before writing any mutation — field names are exact):

1. `createProduct` → capture `id` and `vendorId`
2. `updateProduct` — listing/profile/branding (localized strings must match marketplace locales exactly; `en` ≠ `en-US`)
3. Create editions + pricing plans (≥1 edition required for publication)
4. `createProductIntegration` → SSO config → `generateProductIntegrationInboundClient` → `triggerProductIntegrationPingTest` (version `WORKING`) → `publishProductIntegration` → `linkProductIntegration`
5. (EA, rep-gated) `triggerProductPublicationProcess` → poll `productPublicationProcess(id)` until `PUBLISHED` → `PUT /api/v3/marketplaceProduct/productSettings/{productId}`

Always request `userErrors` inline fragments in mutations — GraphQL returns generic failures otherwise. `MissingDefaultLanguageError` means a missing default-locale string.

## Debugging quick table

| Symptom | First check |
|---|---|
| Mutation fails, no detail | Add `userErrors` fragments to the mutation |
| Auth error on valid token | Token scope vs. mutation's required scope (`ROLE_DEVELOPER` for catalog) |
| Ping test fails | Endpoint reachable over HTTPS, responds success to `SUBSCRIPTION_ORDER` event type; query the product's `lastTest` object for results |
| Can't edit integration in UI | Config is linked to 2+ products — API-only edits from then on |
| Webhook payload missing resource | Expected for `REMOVED`/`DELETED` events — resource existence isn't guaranteed post-deletion |
| Webhook never sends data back | Webhooks are one-way (AppDirect → you), fire after events; use the inbound client to act on AppDirect |

## References

- `references/graphql-mutations.md` — verified copy-paste mutation examples for every step
- `references/auth-and-scopes.md` — grant types, scopes, roles, token handling
- `assets/scaffold/` — TypeScript endpoint and OAuth scaffolding

## Live documentation (verify before asserting)

Product APIs are Early Availability and change; exact input field names can vary by marketplace version. Before running mutations against a real marketplace, verify against current docs — and prefer schema introspection or these AI-readable dumps over memory:

- `https://developer.appdirect.com/llms.txt` — index of all doc pages; fetch first to locate the right page
- `https://developer.appdirect.com/llms-full.txt` — full documentation dump (large)
- `https://developer.appdirect.com/schema/llms-full.txt` — GraphQL schema dump; the authoritative source for input/field names
