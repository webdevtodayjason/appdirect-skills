---
name: appdirect-submission
description: Guide an AppDirect marketplace app submission from zero to approved publication with a 100% profile-completion score. Use this skill whenever the user mentions submitting, listing, publishing, or distributing a SaaS product on AppDirect or an AppDirect-powered marketplace — including phrases like "profile completion", "publication request", "marketplace manager approval", "add to marketplace", "app got rejected", or "why can't I submit my product". Also use it when auditing a product's submission readiness, diagnosing a stuck completion score, or planning a multi-product catalog rollout on AppDirect.
---

# AppDirect App Submission

Take a SaaS product from nothing to published on an AppDirect marketplace, passing approval on the first attempt.

## The mental model (internalize before advising)

- Products live in the **staging catalog** as a `WORKING` version. **Publishing** creates a validated `PUBLISHED` snapshot. **Adding to the marketplace** (production catalog) is a separate distribution step with its own visibility settings. The UI currently runs both as one synchronous action; the Early-Availability GraphQL APIs split them.
- **Vendors cannot publish.** A vendor submits a *publication request*; only a Marketplace Manager approves or rejects it (the vendor is notified either way). This means a human reviews the listing — quality of copy, images, and pricing presentation matters beyond the score.
- The gate to even request publication is a **100% profile-completion score**. The score has weighted segments; Integration alone is worth over half.
- Core product data (`type`, `usageType`, `allowMultiplePurchases`, `referable`, `addon`) is **immutable after creation**. A wrong choice means recreating the product. Confirm these five decisions with the user before anything is created.
- "Application" is legacy terminology; say "product".

## Workflow

When the user asks for submission help, determine where they are and act accordingly:

1. **New submission** → run the readiness interview, then produce a phased gap checklist from `references/submission-checklist.md`. Ask which fields/integrations already exist; mark each checklist item done/missing/blocked.
2. **Stuck completion score** → walk the six scoring segments in order of weight (Integration → Listing/Profile → Features → Support → Editions) and identify unmet items. The most commonly missed: features need BOTH title and description to count; the Integration report is a manual UI-only step; ping tests must pass; support info is required only if the marketplace mandates it.
3. **Rejection recovery** → publication rejections come from the Marketplace Manager, not an automated system. Review listing quality, then recommend asking that marketplace for its content standards (image sizes, category rules, copy tone) since these are configured per marketplace and sit outside the score.
4. **Post-publish changes** → edits go to the `WORKING` copy and do nothing until re-published. Deleting requires unpublishing first, is unrecoverable, and is impossible for ever-purchased products.

Read `references/submission-checklist.md` for the full phase-by-phase checklist with exact field names (GraphQL and REST) — use it verbatim when producing gap analyses or tracking documents.

## Live documentation (verify before asserting)

AppDirect publishes AI-readable doc indexes. When a claim matters (field names, current API status, EA flags) or the user's marketplace behaves differently than expected, fetch the current docs rather than trusting memory:

- `https://developer.appdirect.com/llms.txt` — index of all doc pages; fetch this first to find the right page URL
- `https://developer.appdirect.com/llms-full.txt` — full documentation dump (large)
- `https://developer.appdirect.com/schema/llms-full.txt` — GraphQL schema reference dump

## Output format

When producing a submission plan or gap analysis, use a phased markdown checklist with `- [ ]` items, exact API field names in backticks, and a final "Blockers requiring humans" section (Marketplace Manager approval, AppDirect technical rep for EA APIs, the manual UI Integration report).

## Hard-won rules

- The **Integration report** can only be completed manually in the UI. Never present a fully-automated submission plan; call this step out explicitly.
- Localized strings must match marketplace locales exactly (`en` ≠ `en-US`, IETF BCP 47). A missing default-locale value fails silently unless mutations request `userErrors`.
- The async publication API (`triggerProductPublicationProcess`) is Early Availability and requires an AppDirect technical representative to enable — treat the UI as the default path and flag the dependency early.
- Product-settings APIs (`PUT /api/v3/marketplaceProduct/productSettings/{id}`) need `ROLE_CHANNEL_ADMIN` or `ROLE_CHANNEL_PRODUCT_SUPPORT`; `ROLE_PARTNER` is not supported.
- An integration configuration linked to 2+ products becomes read-only in the UI — API-only edits from then on. Recommend this deliberately for multi-product portfolios, never accidentally.
