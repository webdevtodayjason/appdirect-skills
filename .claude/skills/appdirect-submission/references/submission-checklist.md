# AppDirect App Submission Runbook

**Owner:** Jason Brashear · Titanium Computing
**Purpose:** Repeatable, verified process to take any SaaS product (CallScrub, AMP Cortex, ClientSync, LION Report, HoLaCe, …) from zero to **published on an AppDirect marketplace** with a 100% profile-completion score and first-pass approval.
**Sources:** All items verified against developer.appdirect.com docs (fetched 2026-07-08). Doc links at the bottom of each section.

---

## 0. Mental model (read once)

- **Two catalogs.** Products live in the **staging catalog** as a `WORKING` version. Publishing creates a `PUBLISHED` snapshot. Adding to the **production catalog** (the marketplace) is a *separate* distribution step.
- **Two-step publication.** (1) **Publish** = snapshot + validation. (2) **Add to marketplace** = distribute with visibility settings. The UI currently does both as one synchronous action; the async GraphQL APIs split them.
- **You don't publish — you request.** Only a **Marketplace Manager** can publish. As a vendor you submit a publication request; the manager approves or rejects, and you're notified either way.
- **Gate to submit:** the product profile must reach a **100% completion score** before you can request publication.
- **Roles matter.** Product creation via GraphQL requires the **Developer** role + an API client with `ROLE_DEVELOPER` scope. Marketplace product settings require `ROLE_CHANNEL_ADMIN` or `ROLE_CHANNEL_PRODUCT_SUPPORT` (not `ROLE_PARTNER`).
- **EA caveat.** The Product GraphQL APIs and async publication flow are **Early Availability**. The publish API requires contacting your AppDirect technical representative. UI publication remains the default path.
- **Terminology:** "Application" is legacy; "Product" is the current term.

Docs: [Understanding product publication](https://developer.appdirect.com/user-guides/product-information/gettingstarted/understanding-publication) · [Product API guide](https://developer.appdirect.com/user-guides/product-information/graphql-api/)

---

## Phase 1 — Account, access, and API setup (once per marketplace)

- [ ] Join the marketplace company; confirm you have the **Developer** role (ask the Company Administrator if not).
- [ ] Obtain an **API client** from the Marketplace Manager. OAuth 2.0 only (OAuth 1.0 deprecated Dec 2020). All calls HTTPS.
- [ ] Choose grant type per use case: **Client Credentials** for system-to-system product management; Authorization Code for user-context flows. Confirm the client has the scopes you need (`ROLE_DEVELOPER` for product creation).
- [ ] Get a token and verify auth with a trivial call (Postman or the hosted **GraphQL Explorer** — the Explorer must be enabled per marketplace).
- [ ] Store client ID/secret in your secrets manager. Never in client-side code or repos.
- [ ] Verify scope-vs-mutation alignment before writing code — GraphQL calls fail on scope mismatch, and errors are opaque unless you request `userErrors` in the mutation (see Phase 6 gotchas).

Docs: [API authentication](https://developer.appdirect.com/user-guides/api-usage/api-auth/) · [Practical guidelines](https://developer.appdirect.com/user-guides/product-information/practical-guidelines/)

---

## Phase 2 — Build the integration in YOUR app (before touching the catalog)

This is what the heaviest-weighted part of the completion score validates. Build and deploy these in the SaaS product first.

### 2a. Event notification endpoints (inbound to your app)

Expose HTTPS endpoints for marketplace events. One URL for everything or one per event — both are supported:

- [ ] `createUrl` — subscription create (purchase) notifications
- [ ] `cancelUrl` — subscription cancel notifications
- [ ] `upgradeUrl` — subscription change/upgrade
- [ ] `notifyUrl` / `eventStatusUrl` — general notices, event status
- [ ] `assignUrl` / `unassignUrl` — **only if** the product is `MULTI_USER` (seat assignment)
- [ ] Endpoints answer the **ping test** (`SUBSCRIPTION_ORDER` etc.) with a success response — this is validated before publication.

### 2b. Credentials (both directions)

- [ ] **Outbound credentials** — how AppDirect authenticates TO you (e.g., OAuth2 `client_credentials` against your token URI). Configured in `createProductIntegration.outboundCredentials`.
- [ ] **Inbound client** — how YOU call AppDirect back to respond to events. Generate with `generateProductIntegrationInboundClient`; store the returned `clientId`/`clientSecret`.

### 2c. SSO / user authentication (pick one)

- [ ] **OpenID Connect** (preferred for real SSO): `addProductIntegrationOpenIdConnectConfiguration` — redirect URLs, initiate-login URL, logout URL, grant types.
- [ ] **SAML**: `addProductIntegrationSamlConfiguration`.
- [ ] **Bookmark** (no SSO — static link into the product): `addProductIntegrationBookmarkConfiguration`. Valid fallback if your product doesn't support SSO.
- [ ] Note: credentials + auth config don't add score points directly, but they're **required to unlock the steps that do**.

Docs: [Create an integration configuration](https://developer.appdirect.com/user-guides/product-information/graphql-api/create-integration-config) · [Profile completion §6](https://developer.appdirect.com/user-guides/product-information/profile/profile-completion)

---

## Phase 3 — Create the product (GraphQL sequence)

Order matters. All mutations are EA; test in the GraphQL Explorer first.

1. [ ] **Product shell** — `createProduct` with core data. **Immutable after creation — decide carefully:**
   - `type` (e.g., `WEB_APP`), `usageType` (`SINGLE_USER` vs `MULTI_USER`), `allowMultiplePurchases` (stackable?), `referable`, `addon`
   - Capture returned `id` and `vendorId` for every later call.
   - As a vendor you don't pass a vendor ID (auto-associated); partner role must pass one.
2. [ ] **Listing & profile (branding)** — name, description, overview, features, benefits, media via `createProduct`/`updateProduct` fields.
   - Localized strings: match marketplace locales exactly (`en` ≠ `en-US`; IETF BCP 47). A missing default-language value is a common `userErrors` failure.
3. [ ] **Editions** — at least one edition (`name`, `code`) — **cannot publish without one**.
4. [ ] **Pricing plans** — per edition: strategy (tiered/volume/unit), billing frequency, fee types (setup/termination/unit fees), units of measure, contract terms.
5. [ ] **Integration configuration** — `createProductIntegration` with the Phase 2 URLs + outbound credentials → add SSO config → `generateProductIntegrationInboundClient` → `triggerProductIntegrationPingTest` (version `WORKING`) → `publishProductIntegration` → `linkProductIntegration` to the product.
   - One integration config can be linked to **multiple products** (perfect for the Titanium portfolio) — but once linked to 2+, it becomes **read-only in the UI**, API-only edits.
6. [ ] Query the product's `lastTest` object to confirm ping-test results before proceeding.

Docs: [Create product shell](https://developer.appdirect.com/user-guides/product-information/graphql-api/create-product-shell) · [Product model](https://developer.appdirect.com/user-guides/product-information/gettingstarted/product-model)

---

## Phase 4 — 100% profile-completion checklist (the submission gate)

Weights vary by product type and marketplace config; these are the fields the docs list as required to reach 100%. Optional fields don't add score.

### 1. Listing
- [ ] Company name (`vendorName`)
- [ ] Product name (`name`)
- [ ] Categories (`productGroup.categories`) — required **if** the marketplace config requires them
- [ ] 5-word description (`shortDescription` / REST `blurb`)
- [ ] Brief overview + SEO description (`description` / REST `overview`)

### 2. Profile
- [ ] Splash title (`overview.splashTitle`)
- [ ] Splash description (`overview.splashDescription`)
- [ ] Overview image (`overview.image`)

### 3. Features
- [ ] At least one feature with **both** title AND description (`features[x].title` + `features[x].description`) — one without the other doesn't count.

### 4. Support (only if marketplace requires it)
- [ ] ONE of: support phone (`support.phoneNumber`), support email (`support.emailAddress`), or knowledge base URL (`support.helpCenterUrl`). Adding more than one doesn't increase the score.

### 5. Editions (lowest weight, but mandatory)
- [ ] Edition name + edition code
- [ ] Pricing plan attached to each edition
- [ ] (Physical products: variants auto-generated)

### 6. Integration (heaviest weight — over half the score)
- [ ] Subscription create notification URL set
- [ ] Subscription cancel notification URL set
- [ ] Assign/unassign URLs set (multi-user products only)
- [ ] Credentials + authentication configured (prereq for the scoring steps)
- [ ] **Ping tests pass** (`triggerProductIntegrationPingTest`)
- [ ] **Integration report completed** — UI-only, manual step; not supported for physical products. *Don't forget this one — it can't be automated.*
- [ ] (Manual/non-integrated web apps: integration fields not required)

Docs: [Profile completion](https://developer.appdirect.com/user-guides/product-information/profile/profile-completion)

---

## Phase 5 — Submit, publish, distribute

### Path A — UI (default, recommended today)
- [ ] Confirm the completion meter shows **100%**.
- [ ] Submit the publication request from the product page.
- [ ] Marketplace Manager approves (you're notified on approval/rejection). UI publish + add-to-marketplace happen as one synchronous workflow.

### Path B — Async GraphQL (EA — requires AppDirect technical rep sign-off)
- [ ] `triggerProductPublicationProcess(input:{productIds:[…]})` → capture process `id`.
- [ ] Poll `productPublicationProcess(id)` until `status: PUBLISHED`; check `errors` (e.g., `DuplicatePublicationTriggeredError`, `EditionIdMismatchError`).
- [ ] Add to marketplace + configure via `PUT /api/v3/marketplaceProduct/productSettings/{productId}` (needs `ROLE_CHANNEL_ADMIN` / `ROLE_CHANNEL_PRODUCT_SUPPORT`):
  - Billing: tax code, self-serve on/off, per-edition self-service restrictions
  - General: visibility (marketplace/network), coming-soon flag, hide pricing, lead collection, ToS URL, sorting rank, API health maintenance toggles
  - Product groups: categories, attributes, customer groups, merchandising

### Post-publish lifecycle (know before you need it)
- **Update:** edit the `WORKING` copy → re-publish to replace the marketplace version. Published snapshot is immune to working-copy edits until then.
- **Remove from marketplace:** pulls it from production catalog; staging `WORKING` + `PUBLISHED` stay intact.
- **Delete:** must unpublish first; delete is a hard, unrecoverable delete; **purchased products can never be deleted**.

Docs: [Publish](https://developer.appdirect.com/user-guides/product-information/graphql-api/publish) · [Understanding publication](https://developer.appdirect.com/user-guides/product-information/gettingstarted/understanding-publication)

---

## Phase 6 — Verification pass (run before every submission)

- [ ] Ping test green on every configured event URL (query `lastTest`).
- [ ] Test SSO login end-to-end from a marketplace user account.
- [ ] Dry-run a purchase in staging: create event received → subscription provisioned in your app → success response returned.
- [ ] Dry-run a cancel: cancel event received → deprovision logic fires.
- [ ] Multi-user apps: assign + unassign a seat.
- [ ] Webhooks (if used): destination URL receives JSON POSTs; remember webhooks are **one-way** (AppDirect → you) and fire **after** events; `REMOVED`/`DELETED` payloads exclude the deleted resource.
- [ ] Completion score = 100%, Integration report completed (UI).
- [ ] Screenshot the listing preview; sanity-check images, short description, pricing display.

---

## Gotchas that cause rejections and stalls

1. **Core data is immutable.** Wrong `usageType` or `allowMultiplePurchases` = recreate the product from scratch.
2. **Locale mismatches** silently fail scoring — `MissingDefaultLanguageError` means your default-locale string is missing. Always request `userErrors` in mutations; GraphQL won't volunteer error detail.
3. **The Integration report is manual and UI-only.** Everything else can be scripted; this can't.
4. **Feature = title + description.** Half-filled features contribute nothing.
5. **Scope mismatches**: product creation needs `ROLE_DEVELOPER`; marketplace settings need `ROLE_CHANNEL_ADMIN`/`ROLE_CHANNEL_PRODUCT_SUPPORT`. `ROLE_PARTNER` is explicitly unsupported for product settings.
6. **Shared integration configs go UI-read-only** once linked to 2+ products. Plan API-first management if you share one config across the portfolio.
7. **EA features need a human at AppDirect.** Async publication requires your technical rep. Budget the outreach into the timeline; don't block a launch on API access you haven't been granted.
8. **Approval is human.** The Marketplace Manager decides. Ask each marketplace for their listing/content standards beyond the 100% score (image sizes, copy tone, category rules configured per marketplace).

---

## Go-to workflow per product (the short version)

```
1. Deploy event endpoints + SSO in the app        (Phase 2)
2. createProduct (get id, vendorId)               — core data is FINAL
3. updateProduct: listing, profile, features
4. createEdition + pricing plans (≥1)
5. createProductIntegration → SSO cfg → inbound client
   → ping test → publishProductIntegration → link
6. UI: complete Integration report, verify 100%
7. Phase 6 verification pass
8. Submit publication request → MM approval
9. Add to marketplace + configure visibility/billing
10. Post-launch: edit WORKING copy → re-publish to ship changes
```

## Key links

| What | URL |
|---|---|
| User guides index | https://developer.appdirect.com/user-guides/ |
| Profile completion (the gate) | https://developer.appdirect.com/user-guides/product-information/profile/profile-completion |
| Publication concepts | https://developer.appdirect.com/user-guides/product-information/gettingstarted/understanding-publication |
| Product API guide (EA) | https://developer.appdirect.com/user-guides/product-information/graphql-api/ |
| Integration config how-to | https://developer.appdirect.com/user-guides/product-information/graphql-api/create-integration-config |
| Publish APIs (EA) | https://developer.appdirect.com/user-guides/product-information/graphql-api/publish |
| API auth / scopes | https://developer.appdirect.com/user-guides/api-usage/api-auth/ |
| REST reference | https://developer.appdirect.com/rest |
| GraphQL reference | https://developer.appdirect.com/graphql-docs/docs |
| Webhooks | https://developer.appdirect.com/webhooks/webhookintro |
| Reseller APIs | https://developer.appdirect.com/user-guides/reseller/ |
